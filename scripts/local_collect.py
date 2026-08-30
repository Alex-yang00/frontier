"""Run one Frontier collection group locally and publish its JSON to R2."""
from __future__ import annotations

import argparse
import fcntl
import os
import shutil
import subprocess
import sys
from pathlib import Path

from core.periods import build_period_index
from core.storage import read_json, write_json
from scripts.finalize_publish import quality_failures
from scripts.prepare_publish import edition_window


DEFAULT_STATE = Path.home() / ".local" / "share" / "frontier" / "data"
DEFAULT_ENV_FILE = Path.home() / ".config" / "frontier" / "frontier.env"
WRANGLER = "wrangler@4.124.0"


def run(command: list[str], env: dict[str, str]) -> None:
    print("+", " ".join(command), flush=True)
    subprocess.run(command, check=True, env=env)


def publish(root: Path, env: dict[str, str]) -> None:
    if not env.get("CLOUDFLARE_API_TOKEN") or not env.get("CLOUDFLARE_ACCOUNT_ID"):
        raise RuntimeError("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required")
    for path in sorted(root.rglob("*.json")):
        key = path.relative_to(root).as_posix()
        run(
            [
                "npx",
                "--yes",
                WRANGLER,
                "r2",
                "object",
                "put",
                f"frontier-data/{key}",
                f"--file={path}",
                "--remote",
            ],
            env,
        )


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
    """Copy the JSON snapshot between the private raw pool and published tree."""
    target.mkdir(parents=True, exist_ok=True)
    for path in source.rglob("*.json"):
        relative = path.relative_to(source)
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, destination)


def publish_local_snapshot(source: Path, target: Path) -> None:
    """Atomically replace each visible JSON file after the whole edition passes."""
    target.mkdir(parents=True, exist_ok=True)
    for path in source.rglob("*.json"):
        relative = path.relative_to(source)
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(destination.suffix + ".next")
        shutil.copy2(path, temporary)
        os.replace(temporary, destination)


def raw_directory(root: Path) -> Path:
    configured = os.environ.get("FRONTIER_RAW_DATA_DIR")
    return Path(configured).expanduser().resolve() if configured else root.with_name(root.name + ".raw")


def merge_processed_snapshot(processed_path: Path, raw_path: Path) -> None:
    """Backfill editorial fields without replacing the full private candidate pool."""
    processed = read_json(processed_path, {}) or {}
    raw = read_json(raw_path, {}) or {}
    by_id = {str(item.get("id")): item for item in processed.get("items", [])}
    for item in raw.get("items", []):
        edited = by_id.get(str(item.get("id")))
        if edited:
            item.update(edited)
    for field in (
        "date", "edition_window", "curated_ids", "curation_review",
        "event_clusters", "throughlines", "daily_throughlines",
    ):
        if field in processed:
            raw[field] = processed[field]
    write_json(raw_path, raw)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--group", choices=("fast", "medium", "slow"), required=True)
    parser.add_argument("--output", type=Path, default=Path(os.environ.get("FRONTIER_LOCAL_DATA_DIR", DEFAULT_STATE)))
    parser.add_argument("--skip-throughlines", action="store_true")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--collect-only", action="store_true", help="Fetch raw data only; make no LLM calls")
    mode.add_argument("--process-only", action="store_true", help="Process the existing raw pool without fetching")
    parser.add_argument("--no-publish", action="store_true")
    args = parser.parse_args()

    root = args.output.expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    lock_path = root / ".collect.lock"
    with lock_path.open("w", encoding="utf-8") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise SystemExit(f"collection already running: {root}") from error
        _collect(args, root)


def _collect(args: argparse.Namespace, root: Path) -> None:
    load_local_env()
    env = os.environ.copy()
    python = sys.executable
    raw = raw_directory(root)
    raw.mkdir(parents=True, exist_ok=True)
    # Published JSON is the durable state until the private raw pool exists.
    # This preserves prior enrichment and translations across the migration.
    if not any(raw.rglob("*.json")):
        sync_json_files(root, raw)
    if not args.process_only:
        run([python, "-m", "scripts.aggregate", "--group", args.group, "--output", str(raw)], env)
    if args.collect_only:
        return

    staging = root.with_name(root.name + ".staging")
    expected_date = edition_window()[2]
    staged = read_json(staging / "daily.json", {}) if staging.exists() else {}
    can_resume = bool(
        args.process_only
        and staged
        and staged.get("date") == expected_date
        and staged.get("publication_complete") is not True
    )
    if not can_resume:
        if staging.exists():
            shutil.rmtree(staging)
        sync_json_files(root, staging)
    if (raw / "meta.json").exists():
        shutil.copy2(raw / "meta.json", staging / "meta.json")
    output_name = "hot" if args.group == "fast" else args.group
    if not can_resume:
        for name in ("daily", output_name):
            source = raw / f"{name}.json"
            if source.exists():
                run([python, "-m", "scripts.prepare_publish", str(source), str(staging / f"{name}.json")], env)
    else:
        print(f"resuming staged edition {expected_date}")

    # The local v4-flash endpoint handles small translation batches reliably;
    # larger JSON batches can spend the entire request timeout reasoning.
    limits = {"fast": (130, 2, 900, 30, 3), "medium": (130, 2, 1800, 30, 3), "slow": (130, 2, 1800, 30, 3)}
    enrich_limit, batch_size, enrich_budget, translate_limit, translate_batch = limits[args.group]
    env["FRONTIER_ENRICH_BUDGET_SECONDS"] = str(enrich_budget)
    files = [staging / "daily.json", staging / f"{output_name}.json"]
    enrich = [python, "-m", "scripts.enrich", "--limit", str(enrich_limit), "--batch-size", str(batch_size)]
    if args.skip_throughlines or args.group == "fast":
        enrich.append("--skip-throughlines")
    run(enrich + [str(path) for path in files], env)

    env["FRONTIER_TRANSLATE_BUDGET_SECONDS"] = str(480 if args.group == "slow" else 600)
    run(
        [python, "-m", "scripts.translate", "--limit", str(translate_limit), "--batch-size", str(translate_batch)]
        + [str(path) for path in files],
        env,
    )
    # Persist every classification and rejection before finalization shrinks the
    # candidate file to the public shortlist. Otherwise rejected rows re-enter
    # tomorrow's pending queue and incur the same model cost again.
    for path in files:
        merge_processed_snapshot(path, raw / path.name)
    for path in files:
        run([python, "-m", "scripts.finalize_publish", str(path)], env)
    daily = read_json(staging / "daily.json", {}) or {}
    if daily.get("date") and daily.get("items"):
        write_json(staging / "archive" / f"{daily['date']}.json", daily)
        archive_ids = [path.stem for path in (staging / "archive").glob("*.json")]
        write_json(staging / "weeks.json", build_period_index(archive_ids, str(daily["date"])))
    meta = read_json(staging / "meta.json", {}) or {}
    failures = quality_failures(daily, meta)
    if failures:
        print("publication retained the previous local edition:")
        for failure in failures:
            print(f"  - {failure}")
        raise RuntimeError("daily edition failed publication quality gates")
    publish_local_snapshot(staging, root)
    if not args.no_publish:
        publish(root, env)


if __name__ == "__main__":
    main()
