from __future__ import annotations

import json
from datetime import date
from pathlib import Path


def build_period_index(
    period_ids: list[str],
    current_id: str,
    limit: int = 60,
    counts: dict[str, int] | None = None,
) -> dict:
    """Build the navigation index from canonical daily/archive identifiers.

    `counts` maps a period id to how many items its archive holds. The archive
    heatmap on /archive shades a day by that number, and the caller already has
    every archive file open when it writes the index -- reading them again from the
    web app would mean fetching a year of ~1 MB objects to colour one grid. A day
    with no entry reports 0, which the grid draws as its empty level.
    """
    counts = counts or {}
    parsed: list[tuple[str, date]] = []
    for period_id in set(period_ids + ([current_id] if current_id else [])):
        try:
            parsed.append((period_id, date.fromisoformat(period_id)))
        except ValueError:
            continue
    parsed.sort(key=lambda value: value[1], reverse=True)
    return {
        "weeks": [
            {
                "id": period_id,
                "label": day.strftime("%d %b").upper(),
                "year": day.year,
                "dateRange": day.strftime("%d.%m"),
                "current": period_id == current_id,
                "periodType": "day",
                "days": [],
                "itemCount": int(counts.get(period_id, 0)),
            }
            for period_id, day in parsed[:limit]
        ]
    }


def archive_item_counts(paths: list[Path]) -> dict[str, int]:
    """How many items each archive file holds, keyed by its period id.

    A file that will not parse counts as 0 rather than raising: the index is
    navigation, and one corrupt archive should leave that day unshaded, not stop
    the whole run from publishing an index. scripts/audit.py is what fails the
    build over an unreadable archive.
    """
    counts: dict[str, int] = {}
    for path in paths:
        try:
            data = json.loads(path.read_text(encoding="utf-8")) or {}
            counts[path.stem] = len(data.get("items") or [])
        except (OSError, json.JSONDecodeError, UnicodeDecodeError):
            counts[path.stem] = 0
    return counts
