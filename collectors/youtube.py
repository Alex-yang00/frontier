from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
import logging
import os
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from collectors.base import clean_text, item_id, parse_date, USER_AGENT
from core.models import Item, utc_now


API_ROOT = "https://www.googleapis.com/youtube/v3"
DISCOVERY_QUERIES = ("AI news today", "AI breakthrough explained")
logger = logging.getLogger(__name__)


def _request(resource: str, api_key: str, **params) -> dict:
    query = urlencode({**params, "key": api_key})
    request = Request(
        f"{API_ROOT}/{resource}?{query}",
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    try:
        with urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        # HTTPError includes the full request URL, including the API key.
        raise RuntimeError(f"YouTube {resource} request failed with HTTP {error.code}") from None
    except URLError as error:
        raise RuntimeError(f"YouTube {resource} request failed: {error.reason}") from None


def _duration(value: str) -> tuple[int, str]:
    match = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", value)
    if not match:
        return 0, ""
    hours, minutes, seconds = (int(part or 0) for part in match.groups())
    total = hours * 3600 + minutes * 60 + seconds
    formatted = f"{hours}:{minutes:02d}:{seconds:02d}" if hours else f"{minutes}:{seconds:02d}"
    return total, formatted


def _view_count(value: int) -> str:
    if value >= 1_000_000:
        return f"{value / 1_000_000:.1f}M"
    if value >= 1_000:
        return f"{value / 1_000:.1f}K"
    return str(value)


# A fixed view floor is really an age filter: a video needs days to reach 10k, so
# the day it publishes it cannot pass one. Measured on the live file 2026-08-23,
# that left 0 videos for both 08-22 and 08-23 while 08-19/08-20 held five each, so
# the homepage rail could only ever show videos from days earlier. Scale the floor
# by age instead: same-day videos qualify on a tenth of the full bar and reach it
# by the end of the window, which keeps the popularity test without making it a
# proxy for "not today".
def _view_floor(published: str, min_view_count: int, days: int) -> int:
    try:
        age_days = (datetime.now(timezone.utc) - datetime.fromisoformat(published.replace("Z", "+00:00"))).total_seconds() / 86_400
    except ValueError:
        return min_view_count
    ramp = min(max(age_days, 0.0) / max(days, 1), 1.0)
    return max(int(min_view_count * (0.1 + 0.9 * ramp)), 1)


def _video_items(video_ids: list[str], api_key: str, min_view_count: int, days: int) -> list[Item]:
    results: list[Item] = []
    for start in range(0, len(video_ids), 50):
        chunk = video_ids[start : start + 50]
        if not chunk:
            continue
        try:
            response = _request(
                "videos",
                api_key,
                id=",".join(chunk),
                part="snippet,contentDetails,statistics",
            )
        except RuntimeError as error:
            logger.warning("%s", error)
            continue
        for video in response.get("items", []):
            snippet = video.get("snippet", {})
            statistics = video.get("statistics", {})
            views = int(statistics.get("viewCount", 0))
            seconds, duration = _duration(video.get("contentDetails", {}).get("duration", ""))
            published = snippet.get("publishedAt", "")
            if views < _view_floor(published, min_view_count, days) or seconds < 60 or seconds > 3600:
                continue
            video_id = video.get("id", "")
            url = f"https://www.youtube.com/watch?v={video_id}"
            thumbnails = snippet.get("thumbnails", {})
            thumbnail = (thumbnails.get("high") or thumbnails.get("medium") or thumbnails.get("default") or {}).get("url", "")
            channel_id = snippet.get("channelId", "")
            results.append(Item(
                id=item_id(f"youtube_{channel_id}", url),
                title=clean_text(snippet.get("title", "")),
                url=url,
                source=f"youtube_{channel_id}",
                source_name=clean_text(snippet.get("channelTitle", "YouTube")),
                summary=clean_text(snippet.get("description", ""))[:500],
                published=parse_date(snippet.get("publishedAt", "")),
                fetched_at=utc_now(),
                tags=["video", "youtube"],
                section="tech",
                is_video=True,
                video_id=video_id,
                video_duration=duration,
                video_view_count=_view_count(views),
                video_thumbnail_url=thumbnail,
            ))
    return results


def collect(
    channels: list[tuple[str, str, str]],
    *,
    api_key: str | None = None,
    days: int = 7,
    min_view_count: int = 10_000,
    discovery_queries: tuple[str, ...] = DISCOVERY_QUERIES,
) -> list[Item]:
    """Collect recent videos from curated upload playlists and a small discovery net."""
    api_key = api_key or os.environ.get("FRONTIER_YOUTUBE_API_KEY", "")
    if not api_key:
        return []

    published_after = (datetime.now(timezone.utc) - timedelta(days=days)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    video_ids: list[str] = []
    successful_calls = 0
    for _source_id, _name, handle in channels:
        try:
            channel = _request("channels", api_key, forHandle=handle, part="contentDetails").get("items", [])
            successful_calls += 1
        except RuntimeError as error:
            logger.warning("Skipping YouTube @%s: %s", handle, error)
            continue
        if not channel:
            logger.warning("Skipping unknown YouTube handle @%s", handle)
            continue
        playlist_id = channel[0].get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads")
        if not playlist_id:
            continue
        try:
            uploads = _request("playlistItems", api_key, playlistId=playlist_id, part="contentDetails", maxResults=5)
            successful_calls += 1
        except RuntimeError as error:
            logger.warning("Skipping YouTube @%s uploads: %s", handle, error)
            continue
        for upload in uploads.get("items", []):
            details = upload.get("contentDetails", {})
            if details.get("videoId") and details.get("videoPublishedAt", "") >= published_after:
                video_ids.append(details["videoId"])

    for query in discovery_queries:
        try:
            response = _request(
                "search",
                api_key,
                q=query,
                part="id",
                type="video",
                order="viewCount",
                publishedAfter=published_after,
                maxResults=10,
                relevanceLanguage="en",
            )
            successful_calls += 1
        except RuntimeError as error:
            logger.warning("Skipping YouTube discovery query %r: %s", query, error)
            continue
        video_ids.extend(
            item.get("id", {}).get("videoId", "")
            for item in response.get("items", [])
        )

    if not successful_calls:
        raise RuntimeError("All YouTube API requests failed")

    unique_ids = list(dict.fromkeys(video_id for video_id in video_ids if video_id))
    return sorted(
        _video_items(unique_ids, api_key, min_view_count, days),
        key=lambda item: item.published,
        reverse=True,
    )
