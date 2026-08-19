from __future__ import annotations

from datetime import date


def build_period_index(period_ids: list[str], current_id: str, limit: int = 60) -> dict:
    """Build the navigation index from canonical daily/archive identifiers."""
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
            }
            for period_id, day in parsed[:limit]
        ]
    }
