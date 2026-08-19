from pathlib import Path

import yaml


def test_reddit_feeds_request_top_posts_for_the_day():
    config = yaml.safe_load(Path("config/sources.yaml").read_text(encoding="utf-8"))
    reddit = [source for source in config["sources"] if source["id"].startswith("reddit_")]

    assert len(reddit) == 4
    assert all("/top/.rss?t=day" in source["url"] for source in reddit)


def test_datacube_sources_are_registered():
    config = yaml.safe_load(Path("config/sources.yaml").read_text(encoding="utf-8"))
    ids = {source["id"] for source in config["sources"]}

    assert {"techcrunch_ai", "tech_eu", "nates_newsletter"} <= ids


def test_datacube_youtube_channels_are_registered():
    from collectors.sources import YOUTUBE_CHANNELS
    from collectors.youtube import DISCOVERY_QUERIES

    config = yaml.safe_load(Path("config/sources.yaml").read_text(encoding="utf-8"))
    configured = {
        source["handle"]
        for source in config["sources"]
        if source["kind"] == "youtube" and source["enabled"]
    }

    assert configured == {handle for _source_id, _name, handle in YOUTUBE_CHANNELS}
    assert len(configured) == 15
    assert DISCOVERY_QUERIES == ("AI news today", "AI breakthrough explained")


def test_fast_reddit_sources_are_spaced(monkeypatch):
    import collectors.sources as sources

    sleeps = []
    monkeypatch.setattr(sources, "collect_hn", lambda: [])
    monkeypatch.setattr(sources, "collect_github", lambda: [])
    monkeypatch.setattr(sources, "collect_rss", lambda *args, **kwargs: [])
    monkeypatch.setattr(sources.time, "sleep", sleeps.append)

    _items, health = sources.collect_group("fast")

    assert sleeps == [75, 75, 75]
    assert all(health[source_id]["ok"] for source_id, *_rest in sources.FAST_RSS_SOURCES)
