from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path

from collectors.sources import collect_group
from core.dedup import deduplicate
from core.models import Item
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
    write_json(root / f"{output_name}.json", {"updated_at": now, "items": merged[:300]})
    daily = read_json(root / "daily.json", {"date": now[:10], "items": []}) or {"date": now[:10], "items": []}
    daily["date"], daily["updated_at"] = now[:10], now
    daily["items"] = rank_items(deduplicate([item for item in incoming + daily.get("items", []) if recent(item)]))[:300]
    write_json(root / "daily.json", daily)
    meta = read_json(root / "meta.json", {}) or {}
    meta.setdefault("last_runs", {})[args.group] = now
    meta.setdefault("source_health", {}).update(health)
    if not isinstance(meta.get("items_collected"), dict):
        meta["items_collected"] = {}
    meta["items_collected"][args.group] = len(incoming)
    write_json(root / "meta.json", meta)
    if args.group == "slow":
        write_json(root / "archive" / f"{now[:10]}.json", daily)


if __name__ == "__main__":
    main()
