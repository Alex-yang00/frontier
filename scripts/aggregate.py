from __future__ import annotations

import argparse
from datetime import datetime, timezone
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
    merged = deduplicate(incoming + existing.get("items", []))
    merged = rank_items(merged)
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    write_json(root / f"{output_name}.json", {"updated_at": now, "items": merged[:300]})
    daily = read_json(root / "daily.json", {"date": now[:10], "items": []}) or {"date": now[:10], "items": []}
    daily["date"], daily["updated_at"] = now[:10], now
    daily["items"] = rank_items(deduplicate(incoming + daily.get("items", [])))
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
