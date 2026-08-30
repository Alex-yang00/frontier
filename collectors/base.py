from __future__ import annotations

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from hashlib import sha1
from html import unescape
import re
import time
from urllib.error import URLError
from urllib.request import ProxyHandler, Request, build_opener, urlopen

from core.models import Item, utc_now


USER_AGENT = "Frontier/0.1 (+https://github.com/)"


def fetch_text(url: str, timeout: int = 20, retries: int = 2) -> str:
    """Fetch with bounded retries, then bypass a broken local proxy once."""
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json, application/xml, text/xml, text/html"})
    last_error: Exception | None = None
    openers = [urlopen, build_opener(ProxyHandler({})).open]
    for opener in openers:
        for attempt in range(max(1, retries)):
            try:
                with opener(request, timeout=timeout) as response:
                    return response.read().decode("utf-8", errors="replace")
            except (URLError, TimeoutError, OSError) as error:
                last_error = error
                if attempt + 1 < retries:
                    time.sleep(attempt + 1)
    raise RuntimeError(f"fetch failed after proxy and direct retries: {last_error}")


def clean_text(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", unescape(value or ""))
    return re.sub(r"\s+", " ", value).strip()


def parse_date(value: str) -> str:
    if not value:
        return utc_now()
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try:
            dt = parsedate_to_datetime(value)
        except (TypeError, ValueError):
            return utc_now()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def item_id(source: str, url: str) -> str:
    return f"{source}-{sha1(url.encode()).hexdigest()[:12]}"


def make_item(*, source: str, source_name: str, title: str, url: str, summary: str = "", published: str = "", tags: list[str] | None = None, lang: str = "en", points: int | None = None, comments: int | None = None) -> Item:
    return Item(id=item_id(source, url), title=clean_text(title), url=url, source=source, source_name=source_name, summary=clean_text(summary), published=parse_date(published), tags=tags or [], lang=lang, points=points, comments=comments, fetched_at=utc_now())
