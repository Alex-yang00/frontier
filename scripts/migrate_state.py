"""Import the legacy web/public data directories into standalone pipeline state."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
import shutil

from core.storage import read_json, write_json
from scripts.local_collect import DEFAULT_STATE, MANIFEST_VERSION, public_meta, sync_json_files


def migrate(published: Path, state_root: Path) -> None:
    raw_source = published.with_name(published.name + ".raw")
    raw_target = state_root / "raw"
    raw_target.mkdir(parents=True, exist_ok=True)
    candidates = read_json(raw_source / "daily.json", {}) or read_json(published / "daily.json", {}) or {}
    if not candidates.get("items"):
        raise RuntimeError("legacy candidate data is missing or empty")
    write_json(raw_target / "candidates.json", candidates)
    if (raw_source / "meta.json").exists():
        shutil.copy2(raw_source / "meta.json", raw_target / "meta.json")
    private_meta = read_json(raw_target / "meta.json", {}) or {}

    preview = state_root / "preview"
    if preview.exists():
        shutil.rmtree(preview)
    sync_json_files(published, preview)
    for legacy_group in ("hot.json", "medium.json", "slow.json"):
        (preview / legacy_group).unlink(missing_ok=True)
    weeks = read_json(published / "weeks.json", {}) or {}
    archives = {}
    for period in weeks.get("weeks", []):
        period_id = str(period.get("id") or "")
        if period_id and (published / "archive" / f"{period_id}.json").exists():
            archives[period_id] = {
                "key": f"archive/{period_id}.json",
                "itemCount": int(period.get("itemCount") or 0),
            }
    daily = read_json(published / "daily.json", {}) or {}
    migrated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    write_json(preview / "meta.json", public_meta(daily, private_meta, migrated_at))
    manifest = {
        "schema_version": MANIFEST_VERSION,
        "release_id": "legacy",
        "edition_date": daily.get("date"),
        "published_at": migrated_at,
        "files": {"daily.json": "daily.json", "weeks.json": "weeks.json", "meta.json": "meta.json"},
        "archives": archives,
    }
    write_json(state_root / "state" / "current.json", manifest)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from", dest="source", type=Path, required=True)
    parser.add_argument("--state-dir", type=Path, default=DEFAULT_STATE)
    args = parser.parse_args()
    migrate(args.source.expanduser().resolve(), args.state_dir.expanduser().resolve())


if __name__ == "__main__":
    main()
