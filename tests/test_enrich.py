import json

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


def _fields(result: dict, item: dict | None = None) -> dict:
    return enrich._editorial_fields(result, item or {"summary": "raw feed prose"})


def test_a_usable_rewrite_replaces_the_feed_prose_in_both_places():
    summary = "OpenAI shipped a smaller model. " * 3

    out = _fields({"summary": summary})

    assert out["summary"] == out["summary_en"] == summary.strip()
    # Cleared so translate.py re-queues the item for Chinese.
    assert out["summary_zh"] == ""


def test_an_unchanged_rewrite_keeps_the_existing_translation():
    summary = "OpenAI shipped a smaller model. " * 3
    item = {"summary": summary, "summary_zh": "OpenAI 发布了一个更小的模型。"}

    assert "summary_zh" not in _fields({"summary": summary}, item)


def test_a_summary_that_would_be_clamped_again_is_refused():
    assert "summary" not in _fields({"summary": "x " * 200})
    assert "summary" not in _fields({"summary": "Too short."})


def test_generic_feed_labels_are_dropped_from_the_tags():
    out = _fields({"tags": ["OpenAI", "industry", "Inference", "official", "OPENAI"]})

    assert out["tags"] == ["OpenAI", "Inference"]


def test_a_thin_tag_list_leaves_the_source_tags_alone():
    assert "tags" not in _fields({"tags": ["industry", "community"]})


def test_the_budget_stops_the_run_and_keeps_what_it_finished(tmp_path, monkeypatch):
    path = tmp_path / "daily.json"
    path.write_text(json.dumps({"items": [
        {"id": f"i{n}", "title": f"Item {n}", "summary": "Feed prose.", "published": "2026-08-20T00:00:00Z"}
        for n in range(6)
    ]}))
    calls = []

    def fake_classify(batch):
        calls.append(len(batch))
        return [{"id": item["id"], "relevance": 0.9, "section": "tech"} for item in batch]

    monkeypatch.setattr(enrich, "classify_batch", fake_classify)
    monkeypatch.setattr(enrich, "ENRICH_BUDGET_SECONDS", 30)
    # The budget runs from process start, so a second file in the same run
    # inherits what is left of it rather than getting a fresh allowance.
    monkeypatch.setattr(enrich, "_STARTED_AT", 0.0)
    ticks = iter([0.0])
    monkeypatch.setattr(enrich.time, "monotonic", lambda: next(ticks, 999.0))

    changed = enrich.enrich_file(path, limit=None, batch_size=2)

    assert calls == [2]
    assert changed == 2
    # The finished batch is on disk, so the next run does not pay for it again.
    saved = json.loads(path.read_text())["items"]
    assert sum(1 for item in saved if enrich._is_enriched(item)) == 2


def test_chinese_tags_ride_along_when_the_count_matches():
    out = _fields({"tags": ["OpenAI", "Inference"], "tags_zh": ["OpenAI", "推理"]})

    assert out["tags"] == ["OpenAI", "Inference"]
    assert out["tags_zh"] == ["OpenAI", "推理"]


def test_a_mismatched_chinese_list_is_dropped_rather_than_paired_wrongly():
    out = _fields({"tags": ["OpenAI", "Inference", "Agents"], "tags_zh": ["OpenAI", "推理"]})

    assert out["tags"] == ["OpenAI", "Inference", "Agents"]
    assert "tags_zh" not in out


def test_the_chinese_category_needs_an_english_one():
    assert _fields({"category_zh": "人工智能基础设施"}) == {}
    out = _fields({"category": "AI Infrastructure", "category_zh": "人工智能基础设施"})
    assert out["category_zh"] == "人工智能基础设施"


def test_arxiv_boilerplate_does_not_eat_the_prompt_budget():
    body = "arXiv:2608.14580v1 Announce Type: new Abstract: OGX is an application server."

    assert enrich._clip_body(body, 500) == "OGX is an application server."
    # Ordinary prose is untouched.
    assert enrich._clip_body("A model shipped today.", 500) == "A model shipped today."


def test_the_classify_loop_stops_while_budget_remains_for_curation(monkeypatch):
    """The loop gets a share; the stages after it must still have time."""
    monkeypatch.setattr(enrich, "ENRICH_BUDGET_SECONDS", 100)
    monkeypatch.setattr(enrich, "_STARTED_AT", 0.0)
    # 70s spent: past the classify share (60), inside the whole budget (100).
    monkeypatch.setattr(enrich.time, "monotonic", lambda: 70.0)

    assert enrich._budget_exhausted(enrich.CLASSIFY_BUDGET_SHARE) is True
    assert enrich._budget_exhausted() is False


def test_no_budget_configured_never_stops_anything(monkeypatch):
    monkeypatch.setattr(enrich, "ENRICH_BUDGET_SECONDS", 0)

    assert enrich._budget_exhausted(enrich.CLASSIFY_BUDGET_SHARE) is False
    assert enrich._budget_exhausted() is False
