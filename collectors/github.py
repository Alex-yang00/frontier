from __future__ import annotations

import re

from collectors.base import fetch_text, make_item


def collect(limit: int = 20) -> list:
    html = fetch_text("https://github.com/trending?since=daily")
    results = []
    pattern = re.compile(r'<h2[^>]*>\s*<a[^>]+href="/([^"?#]+/[^"?#]+)"[^>]*>(.*?)</a>', re.S)
    for match in pattern.finditer(html):
        path, raw_name = match.groups()
        name = re.sub(r"<[^>]+>", " ", raw_name)
        name = re.sub(r"\s+", " ", name).strip().replace(" / ", "/")
        if not name or "/" not in path:
            continue
        url = f"https://github.com/{path}"
        results.append(make_item(source="github_trending", source_name="GitHub Trending", title=name, url=url, tags=["open-source", "developer-tools"]))
        if len(results) >= limit:
            break
    return results
