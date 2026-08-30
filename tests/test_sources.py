from pathlib import Path

import pytest
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


def test_disabled_manifest_sources_are_not_collected():
    """A source disabled in the manifest must not still be in the RSS registry.

    36kr was removed from the code while the manifest still declared it enabled,
    so the repo documented a source it no longer collected.
    """
    from collectors.sources import RSS_SOURCES

    config = yaml.safe_load(Path("config/sources.yaml").read_text(encoding="utf-8"))
    disabled = {
        source["id"]
        for source in config["sources"]
        if source["kind"] == "rss" and not source["enabled"]
    }

    assert "36kr" in disabled
    assert disabled.isdisjoint({entry[0] for entry in RSS_SOURCES})


def test_videos_collect_on_the_medium_cadence_not_the_daily_one():
    """collect-slow runs at 01:30 UTC, when the new day holds no videos yet, so a
    same-day video was arithmetically impossible however the filter was tuned.
    Medium runs every 6 hours, so a morning upload is collected the same morning."""
    import collectors.sources as sources

    calls = []
    for group in ("fast", "medium", "slow"):
        def record(channels, _group=group):
            calls.append(_group)
            return []

        with pytest.MonkeyPatch.context() as patch:
            patch.setattr(sources, "collect_youtube", record)
            patch.setattr(sources, "collect_arxiv", lambda: [])
            patch.setattr(sources, "collect_hn", lambda: [])
            patch.setattr(sources, "collect_github", lambda: [])
            patch.setattr(sources, "collect_rss", lambda *a, **k: [])
            patch.setattr(sources, "collect_sitemap", lambda *a, **k: [])
            patch.setattr(sources.time, "sleep", lambda _s: None)
            sources.collect_group(group)

    assert calls == ["medium"]


def test_the_youtube_api_key_reaches_the_group_that_collects_videos():
    """The local runner passes the complete environment to every collection group."""
    local_runner = Path("scripts/local_collect.py").read_text(encoding="utf-8")

    assert "env = os.environ.copy()" in local_runner


def test_known_source_keys_covers_every_group():
    """The prune list must contain every key collect_group can emit.

    A key missing here would be deleted from meta.json on the next run of another
    group, so health would flicker instead of accumulating.
    """
    import collectors.sources as sources

    keys = sources.known_source_keys()

    assert {"hacker_news", "github_trending", "arxiv", "youtube"} <= keys
    assert {entry[0] for entry in sources.RSS_SOURCES} <= keys
    assert {entry[0] for entry in sources.FAST_RSS_SOURCES} <= keys
    assert {entry[0] for entry in sources.SITEMAP_SOURCES} <= keys
    assert "prime_intellect" in keys
    assert "36kr" not in keys


def test_prime_intellect_is_collected_as_a_first_party_research_source():
    import collectors.sources as sources

    assert any(entry[0] == "prime_intellect" and entry[3] == "/blog/" for entry in sources.SITEMAP_SOURCES)
