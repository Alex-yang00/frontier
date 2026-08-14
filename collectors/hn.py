from __future__ import annotations

import json

from collectors.base import fetch_text, make_item


def collect(limit: int = 50, min_points: int = 50) -> list:
    payload = json.loads(fetch_text(f"https://hn.algolia.com/api/v1/search?query=AI&tags=story&hitsPerPage={limit}"))
    results = []
    for hit in payload.get("hits", []):
        points = int(hit.get("points") or 0)
        url = hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID')}"
        if points < min_points or not hit.get("title"):
            continue
        results.append(make_item(source="hacker_news", source_name="Hacker News", title=hit["title"], url=url, published=hit.get("created_at"), tags=["community"], points=points, comments=hit.get("num_comments")))
    return results
