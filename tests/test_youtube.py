from collectors import youtube


def test_collect_youtube_builds_video_items(monkeypatch):
    responses = {
        "channels": {"items": [{"contentDetails": {"relatedPlaylists": {"uploads": "UU1"}}}]},
        "playlistItems": {"items": [{"contentDetails": {"videoId": "curated", "videoPublishedAt": "2099-01-01T00:00:00Z"}}]},
        "search": {"items": [{"id": {"videoId": "discovered"}}]},
        "videos": {"items": [{
            "id": "curated",
            "snippet": {
                "title": "Useful &amp; current AI news",
                "description": "A practical explanation",
                "channelTitle": "Example Channel",
                "channelId": "UC1",
                "publishedAt": "2099-01-01T00:00:00Z",
                "thumbnails": {"high": {"url": "https://img.example/video.jpg"}},
            },
            "contentDetails": {"duration": "PT12M34S"},
            "statistics": {"viewCount": "12500"},
        }]},
    }

    monkeypatch.setattr(youtube, "_request", lambda resource, api_key, **params: responses[resource])
    items = youtube.collect(
        [("youtube_example", "Example", "example")],
        api_key="test-key",
        discovery_queries=("AI news",),
    )

    assert len(items) == 1
    assert items[0].title == "Useful & current AI news"
    assert items[0].is_video is True
    assert items[0].video_id == "curated"
    assert items[0].video_duration == "12:34"
    assert items[0].video_view_count == "12.5K"


def test_collect_youtube_skips_without_key(monkeypatch):
    monkeypatch.delenv("FRONTIER_YOUTUBE_API_KEY", raising=False)
    assert youtube.collect([]) == []


def test_duration_bounds_and_formatting():
    assert youtube._duration("PT1H2M3S") == (3723, "1:02:03")
    assert youtube._duration("not-a-duration") == (0, "")


def test_collect_youtube_continues_after_one_channel_fails(monkeypatch):
    def request(resource, api_key, **params):
        if resource == "channels" and params["forHandle"] == "broken":
            raise RuntimeError("request failed")
        if resource == "channels":
            return {"items": [{"contentDetails": {"relatedPlaylists": {"uploads": "UU1"}}}]}
        if resource == "playlistItems":
            return {"items": []}
        if resource == "videos":
            return {"items": []}
        raise AssertionError(resource)

    monkeypatch.setattr(youtube, "_request", request)
    assert youtube.collect(
        [("broken", "Broken", "broken"), ("working", "Working", "working")],
        api_key="test-key",
        discovery_queries=(),
    ) == []
