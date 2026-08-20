from __future__ import annotations

import html as html_lib
import re

from collectors.base import fetch_text, make_item

# Each trending entry is one <article class="Box-row">, holding the repo link in
# an <h2> and the blurb in a <p class="col-9 ...">. Scoping both to the row keeps
# a repo from picking up its neighbour's description when a row omits one -- 2 of
# 13 rows do, and a page-wide scan would silently shift every later pairing.
ROW_RE = re.compile(r'<article class="Box-row[^"]*">(.*?)</article>', re.S)
NAME_RE = re.compile(r'<h2[^>]*>\s*<a[^>]+href="/([^"?#]+/[^"?#]+)"[^>]*>(.*?)</a>', re.S)
DESC_RE = re.compile(r'<p[^>]*class="[^"]*col-9[^"]*"[^>]*>(.*?)</p>', re.S)


def _text(fragment: str) -> str:
    return re.sub(r"\s+", " ", html_lib.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def collect(limit: int = 20) -> list:
    html = fetch_text("https://github.com/trending?since=daily")
    results = []
    for row in ROW_RE.finditer(html):
        block = row.group(1)
        name_match = NAME_RE.search(block)
        if not name_match:
            continue
        path, raw_name = name_match.groups()
        name = _text(raw_name).replace(" / ", "/")
        if not name or "/" not in path:
            continue
        # The blurb is what makes these rows readable; without it the homepage
        # renders a bare repo path and no summary at all.
        desc_match = DESC_RE.search(block)
        summary = _text(desc_match.group(1)) if desc_match else ""
        results.append(make_item(
            source="github_trending", source_name="GitHub Trending",
            title=name, url=f"https://github.com/{path}", summary=summary,
            tags=["open-source", "developer-tools"],
        ))
        if len(results) >= limit:
            break
    return results
