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


def rank_items(items: list[dict]) -> list[dict]:
    for item in items:
        item["score"] = score_item(item)
        if item.get("classification_source") != "llm":
            item["impact"] = impact_for_score(item["score"])
            item["section"] = section_for_item(item)
    return sorted(items, key=lambda item: (item.get("score", 0), item.get("published", "")), reverse=True)
