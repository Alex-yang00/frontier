from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def canonical_url(url: str) -> str:
    parts = urlsplit(url.strip())
    query = [(k, v) for k, v in parse_qsl(parts.query) if not k.lower().startswith(("utm_", "ref", "fbclid"))]
    path = parts.path.rstrip("/") or "/"
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, urlencode(query), ""))


def _title_key(item: dict) -> str | None:
    """Same source, same headline. Publishers re-issue a post under a new slug --
    OpenAI shipped "Offering Zero Data Retention for frontier models" at both
    /offering-zero-data-retention-... and /our-commitment-to-zero-data-..., which
    URL keying cannot catch, so the homepage showed it twice.

    Deliberately scoped to one source. Two outlets covering one event is not a
    duplicate; that is what the event clustering in scripts/enrich.py resolves,
    and collapsing it here would discard the corroborating report.
    """
    title = " ".join((item.get("title") or "").split()).lower()
    source = item.get("source") or ""
    return f"{source}\u0000{title}" if title and source else None


def deduplicate(items: list[dict]) -> list[dict]:
    seen: dict[str, dict] = {}
    # Headline key -> the url key that item was filed under, so a re-issue at a
    # new address resolves to the entry already in `result`.
    by_title: dict[str, str] = {}
    result: list[dict] = []
    for item in items:
        key = canonical_url(item.get("url", ""))
        if not key:
            continue
        title_key = _title_key(item)
        if key not in seen and title_key is not None:
            key = by_title.get(title_key, key)
        previous = seen.get(key)
        if previous is not None:
            # Fresh collector records can omit enrichment fields from older runs.
            for field, value in previous.items():
                if not item.get(field) and value:
                    item[field] = value
            result[result.index(previous)] = item
            seen[key] = item
            if title_key is not None:
                by_title[title_key] = key
            continue
        seen[key] = item
        if title_key is not None:
            by_title.setdefault(title_key, key)
        result.append(item)
    return result
