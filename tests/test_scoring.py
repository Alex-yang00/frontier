from datetime import datetime, timezone

from core.scoring import impact_for_score, rank_items, score_item


NOW = datetime(2026, 8, 13, 9, tzinfo=timezone.utc)


def test_popular_official_release_scores_above_old_generic_story():
    official = {"source": "openai", "title": "New model release", "published": "2026-08-13T08:00:00Z", "points": 200, "comments": 30}
    generic = {"source": "unknown", "title": "AI opinion", "published": "2026-08-01T08:00:00Z"}
    assert score_item(official, NOW) > score_item(generic, NOW)


def test_rank_items_sets_score_and_impact():
    items = rank_items([{"source": "openai", "title": "Model release", "published": "2026-08-13T08:00:00Z"}])
    assert items[0]["score"] > 0
    assert items[0]["impact"] == impact_for_score(items[0]["score"])
