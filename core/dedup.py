from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def canonical_url(url: str) -> str:
    parts = urlsplit(url.strip())
    query = [(k, v) for k, v in parse_qsl(parts.query) if not k.lower().startswith(("utm_", "ref", "fbclid"))]
    path = parts.path.rstrip("/") or "/"
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, urlencode(query), ""))


def deduplicate(items: list[dict]) -> list[dict]:
    seen: dict[str, dict] = {}
    result: list[dict] = []
    for item in items:
        key = canonical_url(item.get("url", ""))
        if not key:
            continue
        previous = seen.get(key)
        if previous is not None:
            # Fresh collector records can omit enrichment fields from older runs.
            for field, value in previous.items():
                if not item.get(field) and value:
                    item[field] = value
            result[result.index(previous)] = item
            seen[key] = item
            continue
        seen[key] = item
        result.append(item)
    return result
