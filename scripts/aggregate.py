"""Collect one source group into the private candidate pool."""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path

from collectors.sources import collect_group, known_source_keys
from core.curation import retain_video_candidates
from core.dedup import deduplicate
from core.models import Item
from core.scoring import rank_items
from core.storage import read_json, write_json


CANDIDATE_RETENTION_DAYS = 7


def _published_at(item: dict) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(str(item.get("published") or "").replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--group", choices=("fast", "medium", "slow"), required=True)
    parser.add_argument("--output", type=Path, required=True, help="Private raw-state directory")
    args = parser.parse_args()

    root = args.output.expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    found, health = collect_group(args.group)
    incoming = [item.to_dict() if isinstance(item, Item) else item for item in found]
    existing = read_json(root / "candidates.json", {"items": []}) or {"items": []}
    cutoff = datetime.now(timezone.utc) - timedelta(days=CANDIDATE_RETENTION_DAYS)
    merged = deduplicate(
        [
            item
            for item in incoming + existing.get("items", [])
            if (published := _published_at(item)) is not None and published >= cutoff
        ]
    )
    merged = retain_video_candidates(rank_items(merged))
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    write_json(
        root / "candidates.json",
        {"date": now[:10], "updated_at": now, "items": merged},
    )

    meta = read_json(root / "meta.json", {}) or {}
    meta.setdefault("last_runs", {})[args.group] = now
    source_health = meta.setdefault("source_health", {})
    source_health.update(health)
    for stale in set(source_health) - known_source_keys() - set(health):
        del source_health[stale]
    meta.setdefault("items_collected", {})[args.group] = len(incoming)
    meta["candidate_count"] = len(merged)
    write_json(root / "meta.json", meta)


if __name__ == "__main__":
    main()
