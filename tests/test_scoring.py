from datetime import datetime, timezone

from core.scoring import impact_for_score, rank_items, score_item
from core.curation import (
    deduplicated_selection,
    fallback_curated_ids,
    retain_video_candidates,
    validated_event_groups,
)


NOW = datetime(2026, 8, 13, 9, tzinfo=timezone.utc)


def test_popular_official_release_scores_above_old_generic_story():
    official = {"source": "openai", "title": "New model release", "published": "2026-08-13T08:00:00Z", "points": 200, "comments": 30}
    generic = {"source": "unknown", "title": "AI opinion", "published": "2026-08-01T08:00:00Z"}
    assert score_item(official, NOW) > score_item(generic, NOW)


def test_rank_items_sets_score_and_impact():
    items = rank_items([{"source": "openai", "title": "Model release", "published": "2026-08-13T08:00:00Z"}])
    assert items[0]["score"] > 0
    assert items[0]["impact"] in {"critical", "high", "medium", "low"}


def test_impact_stays_banded_when_the_whole_batch_is_stale():
    # Absolute thresholds put every one of these under 35 ("low"), which left the
    # feed with no hierarchy to render. Ranking is relative, so the top of a stale
    # batch is still surfaced.
    stale = [
        {"source": "unknown", "title": f"Old story {n}", "published": "2026-01-01T08:00:00Z"}
        for n in range(20)
    ]
    ranked = rank_items(stale)
    assert all(score_item(item, NOW) < 35 for item in ranked)
    assert {item["impact"] for item in ranked} != {"low"}


def test_tier_gives_each_section_one_lead_and_three_standard():
    items = rank_items(
        [{"source": "openai", "title": f"Model release {n}", "published": "2026-08-13T08:00:00Z"} for n in range(6)]
        + [{"source": "unknown", "title": f"Startup raises Series B round {n}", "published": "2026-08-13T08:00:00Z"} for n in range(5)]
    )
    for section in ("tech", "investment"):
        tiers = [item["tier"] for item in items if item["section"] == section]
        assert tiers.count("lead") == 1
        assert tiers.count("standard") == 3
        assert tiers.count("brief") == len(tiers) - 4


def test_llm_classification_is_not_overwritten_by_the_keyword_pass():
    items = rank_items([
        {"source": "openai", "title": "A model release with no funding words", "published": "2026-08-13T08:00:00Z",
         "section": "tips", "impact": "critical", "relevance": 0.9, "classification_source": "llm"},
    ])
    assert items[0]["section"] == "tips"
    assert items[0]["impact"] == "critical"


def test_daily_cap_reserves_video_candidates():
    articles = [{"id": f"a-{n}", "section": "tech"} for n in range(320)]
    videos = [{"id": f"v-{n}", "is_video": True} for n in range(25)]
    kept = retain_video_candidates(articles + videos)

    assert len(kept) == 300
    assert sum(bool(item.get("is_video")) for item in kept) == 20


def test_fallback_curation_uses_datacube_quotas():
    items = (
        [{"id": f"t-{n}", "section": "tech"} for n in range(12)]
        + [{"id": f"i-{n}", "section": "investment"} for n in range(8)]
        + [{"id": f"p-{n}", "section": "tips"} for n in range(7)]
        + [{"id": f"v-{n}", "section": "tech", "is_video": True} for n in range(4)]
    )
    curated = fallback_curated_ids(items)

    assert {key: len(value) for key, value in curated.items()} == {
        "tech": 10, "investment": 5, "tips": 5, "videos": 2,
    }


def test_event_groups_are_strictly_validated_and_cannot_overlap():
    candidates = [{"id": value} for value in ("a", "b", "c")]
    groups = validated_event_groups([
        {"canonical_id": "a", "member_ids": ["a", "b"], "summary_en": "Combined"},
        {"canonical_id": "c", "member_ids": ["b", "c"]},
        {"canonical_id": "missing", "member_ids": ["missing", "c"]},
    ], candidates)

    assert groups == [{
        "canonical_id": "a", "member_ids": ["a", "b"], "reason": "",
        "summary_en": "Combined", "summary_zh": "",
    }]


def test_selection_replaces_duplicate_members_and_refills_to_limit():
    candidates = [{"id": value} for value in ("a", "b", "c", "d")]
    groups = [{"canonical_id": "a", "member_ids": ["a", "b"]}]

    assert deduplicated_selection(["b", "a", "c"], candidates, groups, 3) == ["a", "c", "d"]


def test_selection_enforces_source_diversity_when_alternatives_exist():
    candidates = (
        [{"id": f"wire-{n}", "source": "wire"} for n in range(4)]
        + [{"id": "official", "source": "official"}, {"id": "journal", "source": "journal"}]
    )

    selected = deduplicated_selection([item["id"] for item in candidates], candidates, [], 5)

    assert selected[:4] == ["wire-0", "wire-1", "official", "journal"]
    assert len(selected) == 5
