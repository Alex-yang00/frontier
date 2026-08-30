from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path

from collectors.sources import collect_group, known_source_keys
from core.dedup import deduplicate
from core.models import Item
from core.curation import retain_video_candidates
from core.periods import build_period_index
from core.scoring import rank_items
from core.storage import read_json, write_json


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--group", choices=["fast", "medium", "slow"], required=True)
    parser.add_argument("--output", default="data")
    args = parser.parse_args()
    root = Path(args.output); root.mkdir(parents=True, exist_ok=True)
    found, health = collect_group(args.group)
    incoming = [item.to_dict() if isinstance(item, Item) else item for item in found]
    output_name = "hot" if args.group == "fast" else args.group
    existing = read_json(root / f"{output_name}.json", {"items": []}) or {"items": []}
    retention_days = 7 if args.group == "fast" else 30
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)

    def recent(item: dict) -> bool:
        try:
            published = datetime.fromisoformat(item.get("published", "").replace("Z", "+00:00"))
            if published.tzinfo is None:
                published = published.replace(tzinfo=timezone.utc)
            return published >= cutoff
        except (TypeError, ValueError):
            return False

    merged = deduplicate([item for item in incoming + existing.get("items", []) if recent(item)])
    merged = rank_items(merged)
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    write_json(root / f"{output_name}.json", {"updated_at": now, "items": retain_video_candidates(merged)})
    daily = read_json(root / "daily.json", {"date": now[:10], "items": []}) or {"date": now[:10], "items": []}
    daily["date"], daily["updated_at"] = now[:10], now
    daily["items"] = retain_video_candidates(
        rank_items(deduplicate([item for item in incoming + daily.get("items", []) if recent(item)]))
    )
    write_json(root / "daily.json", daily)
    meta = read_json(root / "meta.json", {}) or {}
    meta.setdefault("last_runs", {})[args.group] = now
    # Merge this group's results, then drop keys no source produces any more, so a
    # removed source stops being reported as a failing one. Keys this run reported
    # are kept whether or not the registry lists them: the run is evidence the
    # source exists, and pruning them would delete the health just collected.
    source_health = meta.setdefault("source_health", {})
    source_health.update(health)
    for stale in set(source_health) - known_source_keys() - set(health):
        del source_health[stale]
    if not isinstance(meta.get("items_collected"), dict):
        meta["items_collected"] = {}
    meta["items_collected"][args.group] = len(incoming)
    write_json(root / "meta.json", meta)
    # Every group archives, not just slow. The archive used to be written only by
    # the daily slow run, so a day whose slow run failed or was skipped lost its
    # archive permanently -- measured in published data, 2026-08-16 and 2026-08-18
    # have items in daily.json but no archive file, which also removed them from
    # weeks.json and made the date unreachable on the site. daily.json is already
    # the whole day, so writing it here is idempotent and any surviving run of the
    # day is enough to keep the date.
    write_json(root / "archive" / f"{now[:10]}.json", daily)
    archive_ids = [path.stem for path in (root / "archive").glob("*.json")]
    write_json(root / "weeks.json", build_period_index(archive_ids, now[:10]))


if __name__ == "__main__":
    main()
