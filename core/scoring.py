from __future__ import annotations

from datetime import datetime, timezone
import re


SOURCE_WEIGHT = {
    "openai": 30, "deepmind": 30, "huggingface": 27, "arxiv": 26,
    "simon_willison": 27, "hacker_news": 20, "the_decoder": 22,
    "venturebeat": 19, "verge_ai": 18, "qbitai": 19, "technode": 17,
}
HIGH_SIGNAL = {
    "release": 5, "launch": 5, "open source": 4, "model": 3,
    "funding": 5, "acquire": 5, "benchmark": 3, "research": 3,
    "security": 4, "vulnerability": 5, "agent": 3, "inference": 3,
    "发布": 5, "开源": 4, "融资": 5, "收购": 5, "模型": 3, "研究": 3,
}
INVESTMENT_WORDS = ("funding", "raises", "raised", "series a", "series b", "acquire", "acquisition", "merger", "valuation", "融资", "收购", "并购", "估值")
TIPS_WORDS = ("how to", "tutorial", "step-by-step", "guide", "workflow", "playbook", "cookbook", "hands-on", "教程", "指南", "工作流", "实战")


def section_for_item(item: dict) -> str:
    # Summaries often mention funding, prompts, or workflows incidentally.
    # Classify from the headline and explicit source tags to avoid cross-feed noise.
    text = f"{item.get('title', '')} {' '.join(item.get('tags') or [])}".lower()
    def mentions(word: str) -> bool:
        return re.search(rf"(?<![a-z]){re.escape(word)}(?![a-z])", text) is not None

    if any(mentions(word) for word in INVESTMENT_WORDS):
        return "investment"
    title = item.get("title", "").strip().lower()
    is_how_to = title.startswith("how to ") or title.startswith("a guide to ") or title.startswith("the guide to ")
    is_practical = any(mentions(word) for word in ("tutorial", "step-by-step", "workflow", "playbook", "cookbook", "hands-on", "教程", "指南", "工作流", "实战"))
    if is_how_to or is_practical:
        return "tips"
    return "tech"


def score_item(item: dict, now: datetime | None = None) -> int:
    now = now or datetime.now(timezone.utc)
    source = SOURCE_WEIGHT.get(item.get("source", ""), 15)
    points = int(item.get("points") or 0)
    comments = int(item.get("comments") or 0)
    popularity = min(25, points // 20 + comments // 15)
    try:
        published = datetime.fromisoformat(item.get("published", "").replace("Z", "+00:00"))
        age_hours = max(0, (now - published).total_seconds() / 3600)
        freshness = max(0, 25 - int(age_hours / 4))
    except (TypeError, ValueError):
        freshness = 8
    text = f"{item.get('title', '')} {item.get('summary', '')}".lower()
    signal = min(20, sum(weight for keyword, weight in HIGH_SIGNAL.items() if keyword in text))
    relevance = item.get("relevance")
    llm_bonus = round(float(relevance) * 15) if relevance is not None else 0
    return max(0, min(100, source + popularity + freshness + signal + llm_bonus))


def impact_for_score(score: int) -> str:
    if score >= 75:
        return "critical"
    if score >= 55:
        return "high"
    if score >= 35:
        return "medium"
    return "low"


# Absolute thresholds collapse as a feed ages: `freshness` contributes up to 25
# of the score and decays to 0 after ~4 days, so a file of week-old items lands
# almost entirely under 35 and reads as uniformly "low" (measured: 206 of 300).
# Ranking within the batch keeps all four bands populated regardless of age,
# which is what the UI needs to draw a hierarchy at all.
IMPACT_BANDS = (("critical", 0.05), ("high", 0.20), ("medium", 0.60))


def impact_by_rank(position: int, total: int) -> str:
    if total <= 1:
        return "high"
    quantile = position / (total - 1)
    for label, ceiling in IMPACT_BANDS:
        if quantile <= ceiling:
            return label
    return "low"


# The three render tiers are positional, not qualitative: the layout needs
# exactly one lead and a handful of standard rows per section to have a shape.
# Deriving them from `impact` cannot guarantee that (a batch may hold zero
# critical items, or ninety), so tier comes from rank within the section.
TIER_LEAD_COUNT = 1
TIER_STANDARD_COUNT = 3


def assign_tiers(items: list[dict]) -> list[dict]:
    by_section: dict[str, list[dict]] = {}
    for item in items:
        by_section.setdefault(item.get("section") or "tech", []).append(item)
    for section_items in by_section.values():
        for position, item in enumerate(section_items):
            if position < TIER_LEAD_COUNT:
                item["tier"] = "lead"
            elif position < TIER_LEAD_COUNT + TIER_STANDARD_COUNT:
                item["tier"] = "standard"
            else:
                item["tier"] = "brief"
    return items


def rank_items(items: list[dict]) -> list[dict]:
    for item in items:
        item["score"] = score_item(item)
        if item.get("classification_source") != "llm":
            item["section"] = section_for_item(item)
    ranked = sorted(items, key=lambda item: (item.get("score", 0), item.get("published", "")), reverse=True)
    total = len(ranked)
    for position, item in enumerate(ranked):
        if item.get("classification_source") != "llm":
            item["impact"] = impact_by_rank(position, total)
    return assign_tiers(ranked)
