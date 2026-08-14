from __future__ import annotations

import xml.etree.ElementTree as ET

from collectors.base import fetch_text, make_item


def _text(element: ET.Element | None, *names: str) -> str:
    if element is None:
        return ""
    for child in list(element):
        if child.tag.rsplit("}", 1)[-1] in names:
            return child.text or ""
    return ""


def collect(url: str, source: str, source_name: str, tags: list[str] | None = None, limit: int = 30) -> list:
    root = ET.fromstring(fetch_text(url))
    results = []
    for entry in root.iter():
        kind = entry.tag.rsplit("}", 1)[-1]
        if kind not in {"item", "entry"}:
            continue
        title = _text(entry, "title")
        link = _text(entry, "link")
        if not link:
            for child in list(entry):
                if child.tag.rsplit("}", 1)[-1] == "link":
                    link = child.attrib.get("href", "")
                    break
        if not title or not link:
            continue
        results.append(make_item(source=source, source_name=source_name, title=title, url=link, summary=_text(entry, "description", "summary", "content"), published=_text(entry, "pubDate", "published", "updated"), tags=tags))
        if len(results) >= limit:
            break
    return results
