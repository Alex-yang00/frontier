from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser

from collectors.base import fetch_text, make_item


class _DescriptionParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.description = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "meta" or self.description:
            return
        values = {key.lower(): value or "" for key, value in attrs}
        if values.get("name", "").lower() == "description" or values.get("property", "").lower() == "og:description":
            self.description = values.get("content", "").strip()


def article_summary(url: str) -> str:
    if "news.ycombinator.com/" in url:
        return ""
    try:
        parser = _DescriptionParser()
        parser.feed(fetch_text(url, timeout=10, retries=1)[:250_000])
        return parser.description
    except Exception:
        return ""


def collect(limit: int = 50, min_points: int = 50) -> list:
    cutoff = int((datetime.now(timezone.utc) - timedelta(days=14)).timestamp())
    payload = json.loads(fetch_text(f"https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&numericFilters=created_at_i%3E{cutoff}&hitsPerPage={limit}"))
    results = []
    for hit in payload.get("hits", []):
        points = int(hit.get("points") or 0)
        url = hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID')}"
        if points < min_points or not hit.get("title") or int(hit.get("created_at_i") or 0) < cutoff:
            continue
        summary = str(hit.get("story_text") or "").strip() or article_summary(url)
        results.append(make_item(source="hacker_news", source_name="Hacker News", title=hit["title"], url=url, summary=summary, published=hit.get("created_at"), tags=["community"], points=points, comments=hit.get("num_comments")))
    return results
