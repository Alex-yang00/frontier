from __future__ import annotations

from html import unescape
import re
import xml.etree.ElementTree as ET

from collectors.base import fetch_text, make_item


META_RE = re.compile(
    r'<meta\s+(?:name|property)=["\'](?P<key>[^"\']+)["\'][^>]*content=["\'](?P<value>.*?)["\'][^>]*>',
    re.IGNORECASE,
)


def _metadata(html: str) -> dict[str, str]:
    return {match.group("key").lower(): unescape(match.group("value")) for match in META_RE.finditer(html)}


def collect(
    sitemap_url: str,
    source: str,
    source_name: str,
    path_prefix: str,
    tags: list[str] | None = None,
    limit: int = 12,
) -> list:
    """Collect recent first-party posts from a sitemap and their Open Graph metadata."""
    root = ET.fromstring(fetch_text(sitemap_url))
    rows: list[tuple[str, str]] = []
    for node in root:
        values = {child.tag.rsplit("}", 1)[-1]: (child.text or "").strip() for child in node}
        url = values.get("loc", "")
        if path_prefix not in url:
            continue
        rows.append((values.get("lastmod", ""), url))
    rows.sort(reverse=True)

    results = []
    for published, url in rows[:limit]:
        meta = _metadata(fetch_text(url))
        title = meta.get("og:title") or meta.get("twitter:title")
        description = meta.get("og:description") or meta.get("description", "")
        if not title:
            continue
        results.append(make_item(
            source=source,
            source_name=source_name,
            title=title,
            url=url,
            summary=description,
            published=published,
            tags=tags,
        ))
    return results
