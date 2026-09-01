"""Freeze the current editorial window from the private raw candidate pool."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, time, timedelta, timezone
from pathlib import Path

from core.scoring import rank_items
from core.storage import read_json, write_json


EDITION_TIMEZONE = "UTC"
SLICE_HOURS = 12
MORNING_SLICE_HOUR = 0
EVENING_SLICE_HOUR = 12
CANDIDATE_LIMITS = {
    "tech": 40,
    "investment": 30,
    "tips": 25,
    "policy": 20,
    "videos": 15,
}
TOTAL_CANDIDATE_LIMIT = sum(CANDIDATE_LIMITS.values())
SOURCE_CANDIDATE_CAP = 12
EXCLUDED_SOURCES = {"github_trending"}
COMMUNITY_PREFIXES = ("reddit_", "hacker_news")


def _published_at(item: dict) -> datetime | None:
    value = str(item.get("published") or "")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def edition_window(now: datetime | None = None) -> tuple[datetime, datetime, str]:
    """Return the current UTC slice's elapsed interval up to the refresh moment."""
    utc_now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    local_now = utc_now
    if local_now.hour < EVENING_SLICE_HOUR:
        slice_date = local_now.date()
        slice_name = "am"
        start_local = datetime.combine(slice_date - timedelta(days=1), time(EVENING_SLICE_HOUR), timezone.utc)
    else:
        slice_date = local_now.date()
        slice_name = "pm"
        start_local = datetime.combine(slice_date, time(MORNING_SLICE_HOUR), timezone.utc)
    return start_local.astimezone(timezone.utc), utc_now, slice_date.isoformat()


def slice_name(now: datetime | None = None) -> str:
    local_now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    return "am" if MORNING_SLICE_HOUR <= local_now.hour < EVENING_SLICE_HOUR else "pm"


def presentable(item: dict) -> bool:
    return bool(str(item.get("title") or "").strip() and str(item.get("summary") or "").strip())


def _source(item: dict) -> str:
    return str(item.get("source") or item.get("source_name") or "unknown")


def _section_hint(item: dict) -> str:
    if item.get("is_video"):
        return "videos"
    section = str(item.get("section") or "tech")
    return section if section in CANDIDATE_LIMITS else "tech"


def _take_diverse(candidates: list[dict], limit: int, selected_ids: set[str]) -> list[dict]:
    chosen: list[dict] = []
    source_counts: Counter[str] = Counter()
    for item in candidates:
        item_id = str(item.get("id"))
        source = _source(item)
        if item_id in selected_ids or source_counts[source] >= SOURCE_CANDIDATE_CAP:
            continue
        chosen.append(item)
        selected_ids.add(item_id)
        source_counts[source] += 1
        if len(chosen) >= limit:
            break
    return chosen


def build_snapshot(raw: dict, now: datetime | None = None) -> dict:
    """Build a broad candidate snapshot without stale padding or title heuristics."""
    start, end, edition_date = edition_window(now)
    current_slice = slice_name(now)
    ranked = rank_items([dict(item) for item in raw.get("items", [])])
    in_window = []
    for item in ranked:
        published = _published_at(item)
        if (
            published is not None
            and start <= published < end
            and presentable(item)
            and _source(item) not in EXCLUDED_SOURCES
            and not (published < start and _source(item).startswith(COMMUNITY_PREFIXES))
        ):
            in_window.append(item)

    selected: list[dict] = []
    selected_ids: set[str] = set()
    # Existing classifications are useful hints on resumed runs. The broad limits
    # prevent the heuristic score from deciding the final edition before the model
    # can compare the pool; unclassified rows naturally ride in the tech tranche.
    for section, limit in CANDIDATE_LIMITS.items():
        candidates = [item for item in in_window if _section_hint(item) == section]
        selected.extend(_take_diverse(candidates, limit, selected_ids))

    # Fill unused section capacity with the strongest remaining rows. This matters
    # on the first run, when collector records still carry the default tech label.
    selected.extend(_take_diverse(in_window, TOTAL_CANDIDATE_LIMIT - len(selected), selected_ids))
    selected.sort(key=lambda item: (item.get("score", 0), item.get("published", "")), reverse=True)
    for position, item in enumerate(selected):
        item["edition_date"] = edition_date
        item["slice_id"] = f"{edition_date}-{current_slice}"
        item["edition_window_member"] = "strict"
        item["pool_rank"] = position

    return {
        "date": edition_date,
        "updated_at": raw.get("updated_at"),
        "publication_complete": False,
        "edition_window": {
            "timezone": EDITION_TIMEZONE,
            "window_type": "fixed_slice",
            "slice": current_slice,
            "slice_id": f"{edition_date}-{current_slice}",
            "window_hours": SLICE_HOURS,
            "start": start.isoformat().replace("+00:00", "Z"),
            "end": end.isoformat().replace("+00:00", "Z"),
        },
        "items": selected,
        "curated_ids": {section: [] for section in CANDIDATE_LIMITS},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    write_json(args.output, build_snapshot(read_json(args.source, {}) or {}))


if __name__ == "__main__":
    main()
