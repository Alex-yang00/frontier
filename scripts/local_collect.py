"""Collect, process, and atomically publish Frontier data from local state."""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
import fcntl
import hashlib
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from core.periods import build_period_index
from core.storage import read_json, write_json
from scripts.finalize_publish import quality_failures
from scripts.prepare_publish import edition_window, slice_name


DEFAULT_STATE = Path.home() / ".local" / "share" / "frontier"
DEFAULT_ENV_FILE = Path.home() / ".config" / "frontier" / "frontier.env"
WRANGLER = "wrangler@4.124.0"
R2_BUCKET = "frontier-data"
MANIFEST_VERSION = 1
ARCHIVE_RETENTION_DAYS = 60
FAILED_WORK_RETENTION_HOURS = 48
COLLECTION_MAX_AGE = {"fast": timedelta(hours=1), "medium": timedelta(hours=4), "slow": timedelta(hours=4)}


@dataclass(frozen=True)
class StatePaths:
    root: Path

    @property
    def raw(self) -> Path:
        return self.root / "raw"

    @property
    def work(self) -> Path:
        return self.root / "work"

    @property
    def outbox(self) -> Path:
        return self.root / "outbox"

    @property
    def state(self) -> Path:
        return self.root / "state"

    @property
    def preview(self) -> Path:
        return self.root / "preview"


def run(command: list[str], env: dict[str, str]) -> None:
    print("+", " ".join(command), flush=True)
    subprocess.run(command, check=True, env=env)


def load_local_env(path: Path = DEFAULT_ENV_FILE) -> None:
    """Load simple KEY=VALUE entries without replacing explicit shell values."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def sync_json_files(source: Path, target: Path) -> None:
    """Copy JSON files without copying locks or other runtime state."""
    target.mkdir(parents=True, exist_ok=True)
    for path in source.rglob("*.json"):
        destination = target / path.relative_to(source)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, destination)


def publish_local_snapshot(source: Path, target: Path, manifest: dict | None = None) -> None:
    """Replace the small local preview after the full release passes."""
    preserved: dict[str, bytes] = {}
    archive_ids = set((manifest or {}).get("archives", {}))
    existing_archive = target / "archive"
    if existing_archive.exists():
        for path in existing_archive.glob("*.json"):
            if path.stem in archive_ids:
                preserved[path.stem] = path.read_bytes()
    if target.exists():
        shutil.rmtree(target)
    sync_json_files(source, target)
    archive_target = target / "archive"
    archive_target.mkdir(parents=True, exist_ok=True)
    current_date = str((manifest or {}).get("edition_date") or "")
    if current_date and (source / "daily.json").exists() and (manifest or {}).get("edition_complete", True):
        shutil.copy2(source / "daily.json", archive_target / f"{current_date}.json")
    for period_id, content in preserved.items():
        destination = archive_target / f"{period_id}.json"
        if not destination.exists():
            destination.write_bytes(content)


def merge_processed_snapshot(processed_path: Path, raw_path: Path) -> None:
    """Backfill editorial state without discarding unselected candidates."""
    processed = read_json(processed_path, {}) or {}
    raw = read_json(raw_path, {}) or {}
    by_id = {str(item.get("id")): item for item in processed.get("items", [])}
    for item in raw.get("items", []):
        edited = by_id.get(str(item.get("id")))
        if edited:
            item.update(edited)
    for field in (
        "date",
        "edition_window",
        "curated_ids",
        "curation_review",
        "event_clusters",
        "throughlines",
        "daily_throughlines",
    ):
        if field in processed:
            raw[field] = processed[field]
    write_json(raw_path, raw)


def merge_slices(previous: dict, current: dict) -> dict:
    """Union adjacent half-day slices by stable id, preserving newest fields."""
    merged = dict(current)
    by_id = {str(item.get("id")): dict(item) for item in previous.get("items", [])}
    for item in current.get("items", []):
        by_id[str(item.get("id"))] = dict(item)
    merged["items"] = list(by_id.values())
    merged["edition_status"] = "complete"
    merged["publication_complete"] = True
    merged["slices"] = {
        **(previous.get("slices") or {}),
        "pm": current.get("edition_window", {}),
    }
    return merged


def _parse_timestamp(value: object) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def collection_freshness_failures(meta: dict, now: datetime | None = None) -> list[str]:
    current = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    last_runs = meta.get("last_runs") if isinstance(meta.get("last_runs"), dict) else {}
    failures: list[str] = []
    for group, max_age in COLLECTION_MAX_AGE.items():
        last_run = _parse_timestamp(last_runs.get(group))
        if last_run is None or current - last_run > max_age:
            failures.append(f"{group} collection is missing or older than {int(max_age.total_seconds() // 60)} minutes")
    return failures


def cleanup_failed_work(work_root: Path, now: datetime | None = None) -> None:
    if not work_root.exists():
        return
    cutoff = (now or datetime.now(timezone.utc)).timestamp() - FAILED_WORK_RETENTION_HOURS * 3600
    for path in work_root.iterdir():
        if path.is_dir() and path.stat().st_mtime < cutoff:
            shutil.rmtree(path)


def _empty_manifest() -> dict:
    return {"schema_version": MANIFEST_VERSION, "archives": {}, "files": {}}


def load_manifest(path: Path) -> dict:
    value = read_json(path, {}) or {}
    if int(value.get("schema_version") or 0) != MANIFEST_VERSION:
        return _empty_manifest()
    value.setdefault("archives", {})
    value.setdefault("files", {})
    return value


def _archive_cutoff(edition_date: str) -> date:
    return date.fromisoformat(edition_date) - timedelta(days=ARCHIVE_RETENTION_DAYS - 1)


def build_manifest(previous: dict, release_id: str, daily: dict, published_at: str) -> dict:
    edition_date = str(daily["date"])
    cutoff = _archive_cutoff(edition_date)
    archives = {
        period_id: row
        for period_id, row in (previous.get("archives") or {}).items()
        if isinstance(row, dict)
        and _valid_period_on_or_after(period_id, cutoff)
    }
    daily_key = f"releases/{release_id}/daily.json"
    if bool(daily.get("publication_complete", True)):
        archives[edition_date] = {"key": daily_key, "itemCount": len(daily.get("items") or [])}
    return {
        "schema_version": MANIFEST_VERSION,
        "release_id": release_id,
        "edition_date": edition_date,
        "published_at": published_at,
        "files": {
            "daily.json": daily_key,
            "weeks.json": f"releases/{release_id}/weeks.json",
            "meta.json": f"releases/{release_id}/meta.json",
        },
        "archives": dict(sorted(archives.items(), reverse=True)),
        "edition_complete": bool(daily.get("publication_complete", True)),
    }


def _valid_period_on_or_after(period_id: str, cutoff: date) -> bool:
    try:
        return date.fromisoformat(period_id) >= cutoff
    except ValueError:
        return False


def public_meta(daily: dict, private_meta: dict, published_at: str) -> dict:
    health = private_meta.get("source_health") if isinstance(private_meta.get("source_health"), dict) else {}
    healthy = sum(1 for row in health.values() if isinstance(row, dict) and row.get("ok"))
    return {
        "updated_at": daily.get("updated_at"),
        "published_at": published_at,
        "edition_date": daily.get("date"),
        "publication_complete": bool(daily.get("publication_complete")),
        "source_status": {"healthy": healthy, "total": len(health)},
        "last_runs": private_meta.get("last_runs") or {},
    }


def build_release(paths: StatePaths, daily: dict, private_meta: dict, previous: dict) -> tuple[Path, dict]:
    now = datetime.now(timezone.utc).replace(microsecond=0)
    published_at = now.isoformat().replace("+00:00", "Z")
    release_id = now.strftime("%Y%m%dT%H%M%SZ")
    release = paths.outbox / release_id
    if release.exists():
        shutil.rmtree(release)
    release.mkdir(parents=True)
    manifest = build_manifest(previous, release_id, daily, published_at)
    counts = {period_id: int(row.get("itemCount") or 0) for period_id, row in manifest["archives"].items()}
    write_json(release / "daily.json", daily)
    write_json(
        release / "weeks.json",
        build_period_index(list(manifest["archives"]), str(daily["date"]), limit=ARCHIVE_RETENTION_DAYS, counts=counts),
    )
    write_json(release / "meta.json", public_meta(daily, private_meta, published_at))
    write_json(release / "current.json", manifest)
    return release, manifest


def _require_r2_env(env: dict[str, str]) -> None:
    if not env.get("CLOUDFLARE_API_TOKEN") or not env.get("CLOUDFLARE_ACCOUNT_ID"):
        raise RuntimeError("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required")


def _r2_command(action: str, key: str, path: Path | None = None) -> list[str]:
    command = ["npx", "--yes", WRANGLER, "r2", "object", action, f"{R2_BUCKET}/{key}"]
    if path is not None:
        command.append(f"--file={path}")
    command.append("--remote")
    return command


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def put_and_verify(key: str, path: Path, env: dict[str, str]) -> None:
    run(_r2_command("put", key, path), env)
    with tempfile.TemporaryDirectory(prefix="frontier-r2-") as temp:
        downloaded = Path(temp) / path.name
        run(_r2_command("get", key, downloaded), env)
        if _sha256(downloaded) != _sha256(path):
            raise RuntimeError(f"R2 verification failed for {key}")


def fetch_remote_manifest(env: dict[str, str]) -> dict | None:
    """Read the active pointer when it exists; legacy buckets have no pointer."""
    _require_r2_env(env)
    with tempfile.TemporaryDirectory(prefix="frontier-current-") as temp:
        target = Path(temp) / "current.json"
        result = subprocess.run(
            _r2_command("get", "current.json", target),
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        if result.returncode != 0 or not target.exists():
            return None
        manifest = load_manifest(target)
        return manifest if manifest.get("release_id") else None


def _release_ledger(path: Path) -> dict:
    value = read_json(path, {}) or {}
    return value if isinstance(value, dict) else {}


def cleanup_remote_releases(paths: StatePaths, manifest: dict, env: dict[str, str], now: datetime | None = None) -> None:
    ledger_path = paths.state / "releases.json"
    ledger = _release_ledger(ledger_path)
    referenced = {str(manifest.get("release_id") or "")}
    for row in manifest.get("archives", {}).values():
        key = str(row.get("key") or "") if isinstance(row, dict) else ""
        parts = key.split("/")
        if len(parts) >= 3 and parts[0] == "releases":
            referenced.add(parts[1])
    cutoff = (now or datetime.now(timezone.utc)) - timedelta(hours=FAILED_WORK_RETENTION_HOURS)
    for release_id, row in list(ledger.items()):
        created = _parse_timestamp(row.get("published_at") if isinstance(row, dict) else None)
        if release_id in referenced or created is None or created >= cutoff:
            continue
        for key in row.get("keys", []):
            run(_r2_command("delete", str(key)), env)
        del ledger[release_id]
    write_json(ledger_path, ledger)


def publish_release(paths: StatePaths, release: Path, manifest: dict, env: dict[str, str]) -> None:
    _require_r2_env(env)
    release_id = str(manifest["release_id"])
    keys = [str(manifest["files"][name]) for name in ("daily.json", "weeks.json", "meta.json")]
    paths.state.mkdir(parents=True, exist_ok=True)
    ledger_path = paths.state / "releases.json"
    ledger = _release_ledger(ledger_path)
    # Register every expected object before the first upload. If the process
    # stops halfway through a release, later cleanup can still remove any
    # objects that reached R2 without ever becoming active.
    ledger[release_id] = {"published_at": manifest["published_at"], "keys": keys}
    write_json(ledger_path, ledger)
    for name in ("daily.json", "weeks.json", "meta.json"):
        key = str(manifest["files"][name])
        put_and_verify(key, release / name, env)
    put_and_verify("current.json", release / "current.json", env)
    write_json(paths.state / "current.json", manifest)
    cleanup_remote_releases(paths, manifest, env)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--group", choices=("fast", "medium", "slow"))
    parser.add_argument("--state-dir", type=Path, default=Path(os.environ.get("FRONTIER_STATE_DIR", DEFAULT_STATE)))
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--collect-only", action="store_true")
    mode.add_argument("--process-only", action="store_true")
    parser.add_argument("--skip-throughlines", action="store_true")
    parser.add_argument("--ignore-stale-collection", action="store_true")
    parser.add_argument("--no-publish", action="store_true")
    args = parser.parse_args()
    if args.collect_only and not args.group:
        parser.error("--group is required with --collect-only")

    root = args.state_dir.expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    with (root / ".pipeline.lock").open("w", encoding="utf-8") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise SystemExit(f"Frontier pipeline already running: {root}") from error
        _run_pipeline(args, StatePaths(root))


def _run_pipeline(args: argparse.Namespace, paths: StatePaths) -> None:
    load_local_env()
    env = os.environ.copy()
    python = sys.executable
    for directory in (paths.raw, paths.work, paths.outbox, paths.state):
        directory.mkdir(parents=True, exist_ok=True)
    cleanup_failed_work(paths.work)

    if args.collect_only:
        run([python, "-m", "scripts.aggregate", "--group", args.group, "--output", str(paths.raw)], env)
        return

    raw_candidates = paths.raw / "candidates.json"
    private_meta = read_json(paths.raw / "meta.json", {}) or {}
    if not raw_candidates.exists():
        raise RuntimeError(f"private candidate pool is missing: {raw_candidates}")
    freshness = [] if args.ignore_stale_collection else collection_freshness_failures(private_meta)
    if freshness:
        raise RuntimeError("publication blocked: " + "; ".join(freshness))

    window_start, window_end, edition_date = edition_window()
    current_slice = slice_name()
    work = paths.work / f"{edition_date}-{current_slice}"
    staged = read_json(work / "daily.json", {}) if work.exists() else {}
    can_resume = bool(staged and staged.get("date") == edition_date and staged.get("publication_complete") is not True)
    if not can_resume:
        if work.exists():
            shutil.rmtree(work)
        work.mkdir(parents=True)
        run([python, "-m", "scripts.prepare_publish", str(raw_candidates), str(work / "daily.json")], env)
        if current_slice == "pm":
            morning = paths.state / "slices" / f"{edition_date}-am.json"
            if not morning.exists():
                raise RuntimeError(
                    f"publication blocked: AM slice is missing for {edition_date}; "
                    "run the AM publish before the PM complete edition"
                )
            morning_data = read_json(morning, {}) or {}
            evening_data = read_json(work / "daily.json", {}) or {}
            write_json(work / "daily.json", merge_slices(morning_data, evening_data))
    else:
        print(f"resuming staged edition {edition_date}")

    env["FRONTIER_ENRICH_BUDGET_SECONDS"] = "1800"
    enrich = [python, "-m", "scripts.enrich", "--limit", "130", "--batch-size", "2"]
    if args.skip_throughlines:
        enrich.append("--skip-throughlines")
    run(enrich + [str(work / "daily.json")], env)
    env["FRONTIER_TRANSLATE_BUDGET_SECONDS"] = "600"
    run([python, "-m", "scripts.translate", "--limit", "30", "--batch-size", "3", str(work / "daily.json")], env)
    merge_processed_snapshot(work / "daily.json", raw_candidates)
    run([python, "-m", "scripts.finalize_publish", str(work / "daily.json")], env)

    daily = read_json(work / "daily.json", {}) or {}
    daily["edition_status"] = "complete" if current_slice == "pm" else "partial"
    daily["publication_complete"] = current_slice == "pm"
    daily.setdefault("slices", {})[current_slice] = daily.get("edition_window", {})
    write_json(work / "daily.json", daily)
    failures = quality_failures(daily, private_meta)
    if failures:
        raise RuntimeError("daily edition failed publication quality gates: " + "; ".join(failures))

    previous = load_manifest(paths.state / "current.json")
    if not args.no_publish:
        previous = fetch_remote_manifest(env) or previous
    release, manifest = build_release(paths, daily, private_meta, previous)
    manifest["edition_complete"] = current_slice == "pm"
    publish_local_snapshot(release, paths.preview, manifest)
    paths.state.joinpath("slices").mkdir(parents=True, exist_ok=True)
    if current_slice == "am":
        write_json(paths.state / "slices" / f"{edition_date}-am.json", daily)
    if not args.no_publish:
        publish_release(paths, release, manifest, env)
        shutil.rmtree(release)
        shutil.rmtree(work)
    else:
        shutil.rmtree(release)


if __name__ == "__main__":
    main()
