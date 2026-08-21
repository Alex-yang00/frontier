from __future__ import annotations

import math
from typing import Any


# policy gets a small share: measured 2026-08-21, roughly 3 of 213 items are
# genuinely legal or regulatory, so a tech-sized slot would sit half empty.
CURATION_LIMITS = {"tech": 10, "investment": 5, "tips": 5, "policy": 4, "videos": 2}
VIDEO_CANDIDATE_RESERVE = 20
EVENT_SUMMARY_LIMIT = 600


def retain_video_candidates(items: list[dict], limit: int = 300) -> list[dict]:
    """Cap a ranked pool without letting articles evict the video candidate set."""
    videos = [item for item in items if item.get("is_video")][:VIDEO_CANDIDATE_RESERVE]
    articles = [item for item in items if not item.get("is_video")][: max(0, limit - len(videos))]
    selected_ids = {id(item) for item in videos + articles}
    return [item for item in items if id(item) in selected_ids]


def curated_candidates(items: list[dict], section: str) -> list[dict]:
    if section == "videos":
        return [item for item in items if item.get("is_video")]
    return [
        item for item in items
        if not item.get("is_video") and (item.get("section") or "tech") == section
    ]


def fallback_curated_ids(items: list[dict]) -> dict[str, list[str]]:
    return {
        section: [str(item.get("id")) for item in curated_candidates(items, section)[:limit]]
        for section, limit in CURATION_LIMITS.items()
    }


def validated_event_groups(raw_groups: Any, candidates: list[dict]) -> list[dict]:
    """Validate model-produced same-event groups against the exact candidate set."""
    if not isinstance(raw_groups, list):
        return []
    valid_ids = {str(item.get("id")) for item in candidates}
    claimed: set[str] = set()
    groups: list[dict] = []
    for raw in raw_groups:
        if not isinstance(raw, dict):
            continue
        canonical_id = str(raw.get("canonical_id") or "")
        members = raw.get("member_ids")
        if canonical_id not in valid_ids or not isinstance(members, list):
            continue
        member_ids = list(dict.fromkeys(str(value) for value in members if str(value) in valid_ids))
        if canonical_id not in member_ids:
            member_ids.insert(0, canonical_id)
        # A singleton is not a merged event, and overlapping clusters make the
        # representative ambiguous. Reject both rather than guessing.
        if len(member_ids) < 2 or claimed.intersection(member_ids):
            continue
        claimed.update(member_ids)
        groups.append({
            "canonical_id": canonical_id,
            "member_ids": member_ids,
            "reason": str(raw.get("reason") or "").strip()[:300],
            "summary_en": str(raw.get("summary_en") or "").strip()[:EVENT_SUMMARY_LIMIT],
            "summary_zh": str(raw.get("summary_zh") or "").strip()[:EVENT_SUMMARY_LIMIT],
        })
    return groups


def deduplicated_selection(
    selected: Any,
    candidates: list[dict],
    groups: list[dict],
    limit: int,
) -> list[str]:
    """Map duplicate members to representatives, diversify, then refill."""
    candidate_ids = [str(item.get("id")) for item in candidates]
    by_id = {str(item.get("id")): item for item in candidates}
    valid = set(candidate_ids)
    representative = {
        member_id: group["canonical_id"]
        for group in groups
        for member_id in group["member_ids"]
    }
    ordered = selected if isinstance(selected, list) else []
    ordered = [str(value) for value in ordered if str(value) in valid] + candidate_ids
    resolved_order: list[str] = []
    for value in ordered:
        resolved = representative.get(value, value)
        if resolved not in resolved_order:
            resolved_order.append(resolved)

    # A model prompt alone did not prevent one aggregator taking 4/5 slots.
    # Enforce the editorial rule while alternatives exist, then relax it so a
    # genuinely thin section still reaches its requested size.
    source_cap = max(1, math.ceil(limit * 0.3))
    source_counts: dict[str, int] = {}
    result: list[str] = []
    for resolved in resolved_order:
        item = by_id[resolved]
        source = str(item.get("source") or item.get("source_name") or resolved)
        if source_counts.get(source, 0) >= source_cap:
            continue
        result.append(resolved)
        source_counts[source] = source_counts.get(source, 0) + 1
        if len(result) == limit:
            break
    if len(result) < limit:
        refill = [value for value in resolved_order if value not in result]
        result.extend(refill[: limit - len(result)])
    return result
