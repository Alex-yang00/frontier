from __future__ import annotations

import os
from pathlib import Path
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import yaml

from collectors.arxiv import collect as collect_arxiv
from collectors.github import collect as collect_github
from collectors.hn import collect as collect_hn
from collectors.rss import collect as collect_rss
from collectors.sitemap import collect as collect_sitemap
from collectors.youtube import collect as collect_youtube


SOURCE_CONFIG = Path(__file__).resolve().parents[1] / "config" / "sources.yaml"
REDDIT_SPACING_SECONDS = 75
REDDIT_RETRY_DELAY_SECONDS = 120
RSS_WORKERS = 6


def load_sources(path: Path = SOURCE_CONFIG) -> list[dict]:
    value = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    rows = value.get("sources") if isinstance(value, dict) else None
    if not isinstance(rows, list):
        raise ValueError(f"source registry must contain a sources list: {path}")
    return [dict(row) for row in rows if isinstance(row, dict)]


def enabled_sources(group: str | None = None) -> list[dict]:
    rows = [row for row in load_sources() if row.get("enabled") is True]
    return [row for row in rows if row.get("group") == group] if group else rows


def _tags(row: dict) -> list[str]:
    tags = row.get("tags")
    return [str(value) for value in tags] if isinstance(tags, list) else []


def _rss_tuple(row: dict) -> tuple[str, str, str, list[str]]:
    return str(row["id"]), str(row["name"]), str(row["url"]), _tags(row)


# Compatibility views are derived from the manifest rather than maintained as a
# second registry. Existing collector tests and downstream imports can inspect them.
RSS_SOURCES = [
    _rss_tuple(row)
    for row in enabled_sources("medium")
    if row.get("kind") == "rss" and not str(row.get("id", "")).startswith("reddit_")
]
FAST_RSS_SOURCES = [
    _rss_tuple(row)
    for row in enabled_sources("fast")
    if row.get("kind") == "rss" and str(row.get("id", "")).startswith("reddit_")
]
SITEMAP_SOURCES = [
    (str(row["id"]), str(row["name"]), str(row["url"]), str(row.get("path_prefix") or "/"), _tags(row))
    for row in enabled_sources("medium")
    if row.get("kind") == "sitemap"
]
YOUTUBE_CHANNELS = [
    (str(row["id"]), str(row["name"]), str(row["handle"]))
    for row in enabled_sources("medium")
    if row.get("kind") == "youtube"
]


def _collect_rss_entry(entry: tuple[str, str, str, list[str]]) -> tuple[str, list]:
    source, name, url, tags = entry
    found = collect_rss(url, source, name, tags)
    if source == "qbitai":
        for item in found:
            item.lang = "zh"
    return source, found


def known_source_keys() -> set[str]:
    keys = {str(row["id"]) for row in enabled_sources() if row.get("kind") != "youtube"}
    if any(row.get("kind") == "youtube" for row in enabled_sources()):
        keys.add("youtube")
    return keys


def _record(health: dict[str, dict], source: str, callback) -> list:
    try:
        found = callback()
        health[source] = {"ok": True, "items": len(found)}
        return found
    except Exception as error:
        health[source] = {"ok": False, "error": str(error)[:180]}
        return []


def collect_group(group: str) -> tuple[list, dict[str, dict]]:
    if group not in {"fast", "medium", "slow"}:
        raise ValueError(f"unknown source group: {group}")
    rows = enabled_sources(group)
    items: list = []
    health: dict[str, dict] = {}

    regular_rss = [row for row in rows if row.get("kind") == "rss" and not str(row["id"]).startswith("reddit_") and row["id"] != "arxiv"]
    if regular_rss:
        with ThreadPoolExecutor(max_workers=RSS_WORKERS) as executor:
            futures = {executor.submit(_collect_rss_entry, _rss_tuple(row)): row for row in regular_rss}
            for future in as_completed(futures):
                source = str(futures[future]["id"])
                try:
                    _, found = future.result()
                    items.extend(found)
                    health[source] = {"ok": True, "items": len(found)}
                except Exception as error:
                    health[source] = {"ok": False, "error": str(error)[:180]}

    for row in [value for value in rows if value.get("kind") == "sitemap"]:
        source = str(row["id"])
        items.extend(
            _record(
                health,
                source,
                lambda row=row: collect_sitemap(
                    str(row["url"]), source, str(row["name"]), str(row.get("path_prefix") or "/"), _tags(row)
                ),
            )
        )

    if any(row.get("kind") == "algolia" for row in rows):
        items.extend(_record(health, "hacker_news", collect_hn))
    if any(row.get("id") == "github_trending" for row in rows):
        items.extend(_record(health, "github_trending", collect_github))
    if any(row.get("id") == "arxiv" for row in rows):
        items.extend(_record(health, "arxiv", collect_arxiv))

    reddit = [row for row in rows if str(row.get("id", "")).startswith("reddit_")]
    failed_reddit: list[dict] = []
    for index, row in enumerate(reddit):
        if index:
            time.sleep(REDDIT_SPACING_SECONDS)
        source = str(row["id"])
        try:
            found = collect_rss(str(row["url"]), source, str(row["name"]), _tags(row), limit=15)
            items.extend(found)
            health[source] = {"ok": True, "items": len(found)}
        except Exception as error:
            failed_reddit.append(row)
            health[source] = {"ok": False, "error": str(error)[:180]}
    if failed_reddit:
        time.sleep(REDDIT_RETRY_DELAY_SECONDS)
        for index, row in enumerate(failed_reddit):
            if index:
                time.sleep(REDDIT_SPACING_SECONDS)
            source = str(row["id"])
            try:
                found = collect_rss(str(row["url"]), source, str(row["name"]), _tags(row), limit=15)
                items.extend(found)
                health[source] = {"ok": True, "items": len(found), "retried": True}
            except Exception as error:
                health[source] = {"ok": False, "error": str(error)[:180], "retried": True}

    youtube_rows = [row for row in rows if row.get("kind") == "youtube"]
    if youtube_rows:
        found = _record(health, "youtube", lambda: collect_youtube(YOUTUBE_CHANNELS))
        items.extend(found)
        if health.get("youtube", {}).get("ok") and not os.environ.get("FRONTIER_YOUTUBE_API_KEY"):
            health["youtube"]["skipped"] = "FRONTIER_YOUTUBE_API_KEY not set"
    return items, health
