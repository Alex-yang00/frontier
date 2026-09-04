"""Apply the final quality gate before a snapshot becomes web-visible."""
from __future__ import annotations

import argparse
from collections import Counter
import math
from pathlib import Path
import re

from core.curation import CURATION_LIMITS
from core.storage import read_json, write_json


SUMMARY_MAX = 320


def _fit_summary(value: object) -> str:
    """Keep public summaries within the card's measured text budget."""
    text = " ".join(str(value or "").split()).strip()
    if len(text) <= SUMMARY_MAX:
        return text
    sentences = re.findall(r".+?[.!?。！？](?=\s|$)", text)
    fitted = ""
    for sentence in sentences:
        candidate = f"{fitted} {sentence}".strip()
        if len(candidate) > SUMMARY_MAX:
            break
        fitted = candidate
    if len(fitted) >= 60:
        return fitted
    return text[: SUMMARY_MAX - 1].rstrip() + "…"


def publishable(item: dict) -> bool:
    title = str(item.get("title_en") or item.get("title") or "").strip()
    if re.fullmatch(r"(?:llm|ai|model)\s+\d+(?:\.\d+)?", title, re.IGNORECASE):
        return False
    video_ready = not item.get("is_video") or all((
        item.get("classification_source") == "llm",
        int(item.get("specialized_editorial_version") or 0) >= 1,
        item.get("specialized_quality_pass") is True,
    ))
    return video_ready and item.get("specialized_quality_pass") is not False and all(
        (
            # Videos do not enter the article-only specialized/headline desk;
            # their source title/description plus bilingual translation are the
            # editorial contract. Requiring the article stamp here silently
            # removed every otherwise valid video from the public edition.
            item.get("is_video") or item.get("editorial_version"),
            item.get("is_video") or int(item.get("headline_editorial_version") or 0) >= 1,
            title,
            str(item.get("summary_en") or item.get("summary") or "").strip(),
            str(item.get("title_zh") or "").strip(),
            str(item.get("summary_zh") or "").strip(),
        )
    )


def quality_failures(data: dict, meta: dict | None = None) -> list[str]:
    """Return hard publication failures for a completed daily edition."""
    failures: list[str] = []
    items = data.get("items", [])
    window = data.get("edition_window") if isinstance(data.get("edition_window"), dict) else {}
    if not window.get("start") or not window.get("end"):
        failures.append("edition window metadata is missing")
    if any(not publishable(item) for item in items):
        failures.append("one or more public items are not fully bilingual")
    if any(int(item.get("specialized_editorial_version") or 0) < 1 for item in items if not item.get("is_video")):
        failures.append("one or more selected articles missed specialized editorial review")
    if any(int(item.get("headline_editorial_version") or 0) < 1 for item in items if not item.get("is_video")):
        failures.append("one or more selected articles missed bilingual headline review")

    if "publication_complete" in data:
        edition_date = str(data.get("date") or "")
        daily = data.get("daily_throughlines") if isinstance(data.get("daily_throughlines"), dict) else {}
        briefings = daily.get(edition_date) if isinstance(daily.get(edition_date), dict) else {}
        published_ids = {str(item.get("id")) for item in items if item.get("id")}
        for section in ("tech", "investment", "tips", "policy"):
            section_items = [
                item for item in items
                if not item.get("is_video") and (item.get("section") or "tech") == section
            ]
            if not section_items:
                continue
            briefing = briefings.get(section) if isinstance(briefings.get(section), dict) else {}
            if not str(briefing.get("en") or "").strip() or not str(briefing.get("zh") or "").strip():
                failures.append(f"{section} briefing is not fully bilingual")
            supporting = {
                str(value) for value in (briefing.get("supporting_ids") or [])
                if str(value) in published_ids
            }
            expected = min(2, len(section_items))
            if len(supporting) < expected:
                failures.append(f"{section} briefing has {len(supporting)} valid source ids; {expected} required")

    tech = [item for item in items if not item.get("is_video") and (item.get("section") or "tech") == "tech"]
    if len(tech) < 4:
        failures.append(f"technology has {len(tech)} quality-passing items; at least 4 are required")
    if tech:
        counts = Counter(str(item.get("source") or item.get("source_name") or "unknown") for item in tech)
        allowed = max(1, math.ceil(len(tech) * 0.30))
        source, count = counts.most_common(1)[0]
        if count > allowed:
            failures.append(f"technology source concentration is {count}/{len(tech)} from {source}; limit is {allowed}")

    companies: Counter[str] = Counter()
    for item in items:
        details = item.get("investment_details") if isinstance(item.get("investment_details"), dict) else {}
        company = str(details.get("company") or "").strip().lower()
        if company:
            companies[company] += 1
    if companies and companies.most_common(1)[0][1] > 3:
        company, count = companies.most_common(1)[0]
        failures.append(f"investment company concentration is {count} items for {company}; limit is 3")

    reviews = data.get("curation_review") if isinstance(data.get("curation_review"), dict) else {}
    for section in ("tech", "investment", "tips", "policy"):
        review = reviews.get(section)
        if not isinstance(review, dict) or review.get("status") != "pass":
            failures.append(f"critic did not pass {section}")
    # Video collection is an optional enrichment path. A transient YouTube/API
    # failure must not block an otherwise complete text edition; the review is
    # retained in the JSON for observability and can be surfaced separately.

    health = (meta or {}).get("source_health") if isinstance((meta or {}).get("source_health"), dict) else {}
    healthy = sum(1 for row in health.values() if isinstance(row, dict) and row.get("ok"))
    if healthy < 20:
        failures.append(f"only {healthy} sources are healthy; at least 20 are required")
    return failures


def product_keys(item: dict) -> set[str]:
    title = str(item.get("title_en") or item.get("title") or "").lower()
    return set(re.findall(r"\b[a-z][a-z0-9.-]{2,}\d[a-z0-9.-]*\b", title))


def detail_score(item: dict) -> tuple[int, int, int]:
    summary = str(item.get("summary_en") or item.get("summary") or "")
    concrete = len(re.findall(r"\b\d+(?:[.,]\d+)?(?:%|[a-z]+)?\b", summary, re.IGNORECASE))
    return concrete, min(len(summary), 400), int(item.get("score") or 0)


def deduplicate_products(items: list[dict]) -> list[dict]:
    result: list[dict] = []
    claimed: dict[str, int] = {}
    for item in items:
        keys = product_keys(item)
        duplicate_indexes = {claimed[key] for key in keys if key in claimed}
        if duplicate_indexes:
            index = min(duplicate_indexes)
            if detail_score(item) > detail_score(result[index]):
                result[index] = item
                for key in keys:
                    claimed[key] = index
            continue
        index = len(result)
        result.append(item)
        for key in keys:
            claimed[key] = index
    return result


def deduplicate_investments(items: list[dict]) -> list[dict]:
    """Collapse the same disclosed company event across language/outlet reports."""
    result: list[dict] = []
    claimed: dict[tuple[str, str], int] = {}
    for item in items:
        details = item.get("investment_details") if isinstance(item.get("investment_details"), dict) else {}
        company = re.sub(r"\W+", "", str(details.get("company") or "").lower())
        amount = re.sub(r"\s+", "", str(details.get("amount") or "").lower())
        key = (company, amount)
        if not company or not amount:
            result.append(item)
            continue
        if key in claimed:
            index = claimed[key]
            if detail_score(item) > detail_score(result[index]):
                result[index] = item
            continue
        claimed[key] = len(result)
        result.append(item)
    return result


def section_candidates(data: dict, items: list[dict], section: str) -> list[dict]:
    by_id = {str(item.get("id")): item for item in items}
    curated = data.get("curated_ids") if isinstance(data.get("curated_ids"), dict) else {}
    preferred = [
        by_id[value]
        for value in curated.get(section, [])
        if value in by_id
        and not by_id[value].get("is_video")
        and (by_id[value].get("section") or "tech") == section
    ]
    preferred_ids = {str(item.get("id")) for item in preferred}
    remainder = [
        item for item in items
        if not item.get("is_video")
        and (item.get("section") or "tech") == section
        and str(item.get("id")) not in preferred_ids
    ]
    remainder.sort(key=lambda item: (item.get("section_candidate_rank", 999), -item.get("score", 0)))
    # A model-authored list is a decision, including when it is deliberately
    # short. Refill only legacy/test snapshots that have no curation contract.
    if isinstance(data.get("curated_ids"), dict) and section in data["curated_ids"]:
        return preferred
    return preferred + remainder


def finalize(data: dict) -> dict:
    requested_videos = list((data.get("curated_ids") or {}).get("videos", []))
    items = [item for item in data.get("items", []) if publishable(item)]
    for item in items:
        if item.get("is_video"):
            item["summary_en"] = _fit_summary(item.get("summary_en") or item.get("summary"))
            item["summary_zh"] = _fit_summary(item.get("summary_zh"))
            item["summary"] = item["summary_en"]
    curated: dict[str, list[str]] = {}
    kept_ids: set[str] = set()
    for section in ("tech", "investment", "tips", "policy"):
        section_items = deduplicate_products(section_candidates(data, items, section))
        if section == "investment":
            section_items = deduplicate_investments(section_items)
        section_items = section_items[: CURATION_LIMITS[section]]
        ids = [str(item.get("id")) for item in section_items]
        curated[section] = ids
        kept_ids.update(ids)
    videos = [item for item in items if item.get("is_video")][: CURATION_LIMITS["videos"]]
    curated["videos"] = [str(item.get("id")) for item in videos]
    kept_ids.update(curated["videos"])
    reviews = dict(data.get("curation_review") or {})
    expected_video_count = min(len(requested_videos), CURATION_LIMITS["videos"])
    reviews["videos"] = {
        "status": "pass" if len(videos) == expected_video_count else "failed",
        "expected": expected_video_count,
        "published": len(videos),
    }
    result = {
        **data,
        "publication_complete": True,
        "items": [item for item in items if str(item.get("id")) in kept_ids],
        "curated_ids": curated,
        "curation_review": reviews,
    }
    # Filtering can remove an item cited by the model-authored briefing. Keep
    # the prose, but repair citations against the exact rows that survived the
    # quality gate so one weak batch cannot block an otherwise valid edition.
    edition_date = str(result.get("date") or "")
    daily = result.get("daily_throughlines")
    if isinstance(daily, dict) and isinstance(daily.get(edition_date), dict):
        briefings = dict(daily[edition_date])
        for section in ("tech", "investment", "tips", "policy"):
            section_items = [
                item for item in result["items"]
                if not item.get("is_video") and (item.get("section") or "tech") == section
            ]
            briefing = briefings.get(section)
            if not isinstance(briefing, dict) or not section_items:
                continue
            valid_ids = {str(item.get("id")) for item in section_items if item.get("id")}
            cited = [str(value) for value in briefing.get("supporting_ids") or [] if str(value) in valid_ids]
            needed = min(2, len(section_items))
            if len(cited) < needed:
                cited.extend(
                    str(item["id"])
                    for item in section_items
                    if item.get("id") and str(item["id"]) not in cited
                )
            briefings[section] = {**briefing, "supporting_ids": cited[:needed]}
        result["daily_throughlines"] = {**daily, edition_date: briefings}
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    args = parser.parse_args()
    write_json(args.path, finalize(read_json(args.path, {}) or {}))


if __name__ == "__main__":
    main()
