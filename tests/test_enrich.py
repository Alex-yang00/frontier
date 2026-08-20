from scripts import enrich


def test_add_curation_attaches_fused_event_to_selected_representative(monkeypatch):
    items = [
        {
            "id": "official", "title": "Model released", "summary": "The model shipped.",
            "url": "https://example.com/official", "source_name": "Official", "section": "tech",
            "published": "2026-08-19T08:00:00Z",
        },
        {
            "id": "report", "title": "Company ships model", "summary": "It adds tool use.",
            "url": "https://example.com/report", "source_name": "Reporter", "section": "tech",
            "published": "2026-08-19T09:00:00Z",
        },
    ]

    def fake_complete(prompt, system, timeout=90):
        if "Independently audit" in prompt:
            return """{
              "same_event": true,
              "canonical_id": "official",
              "member_ids": ["official", "report"],
              "event_anchor": "The model release",
              "reason": "Same model release",
              "summary_en": "The model shipped with tool use.",
              "summary_zh": "该模型已发布，并支持工具调用。"
            }"""
        if "'tech' section" in prompt:
            return """{
              "ids": ["report"],
              "event_groups": [{
                "canonical_id": "official",
                "member_ids": ["official", "report"],
                "reason": "Same model release"
              }]
            }"""
        return '{"ids": [], "event_groups": []}'

    monkeypatch.setattr(enrich, "complete", fake_complete)
    data = {"items": items}

    assert enrich.add_curation(data) == 1
    assert data["curated_ids"]["tech"] == ["official"]
    assert data["event_clusters"][0]["member_ids"] == ["official", "report"]
    assert items[0]["event_summary_en"] == "The model shipped with tool use."
    assert [source["source_name"] for source in items[0]["event_sources"]] == ["Official", "Reporter"]
    assert "event_sources" not in items[1]


def _pending(articles: int, videos: int) -> list[dict]:
    """Videos at the tail, which is where score-descending order put them."""
    return (
        [{"id": f"a{n}"} for n in range(articles)]
        + [{"id": f"v{n}", "is_video": True} for n in range(videos)]
    )


def test_a_bounded_run_reaches_videos_at_the_tail_of_the_queue():
    selected = enrich._select_pending(_pending(280, 20), limit=40)

    assert len(selected) == 40
    assert sum(1 for item in selected if item.get("is_video")) == 8


def test_unused_video_budget_goes_back_to_articles():
    selected = enrich._select_pending(_pending(280, 2), limit=40)

    assert len(selected) == 40
    assert sum(1 for item in selected if item.get("is_video")) == 2


def test_a_run_that_fits_takes_everything():
    pending = _pending(5, 2)

    assert enrich._select_pending(pending, limit=40) == pending
    assert enrich._select_pending(pending, limit=None) == pending


def test_selection_keeps_score_order_within_the_run():
    pending = _pending(10, 10)
    selected = enrich._select_pending(pending, limit=10)

    assert [item["id"] for item in selected] == [item["id"] for item in pending if item in selected]
