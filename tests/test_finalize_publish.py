from scripts.finalize_publish import finalize, quality_failures
from scripts.enrich import _needs_headline_rewrite


def _item(item_id: str, section: str, complete: bool = True) -> dict:
    item = {
        "id": item_id,
        "section": section,
        "title": item_id,
        "summary": "summary",
        "title_zh": "标题",
        "summary_zh": "摘要",
        "editorial_version": 1,
    }
    if not complete:
        item["summary_zh"] = ""
    return item


def test_finalize_drops_incomplete_rows_and_rebuilds_section_ids():
    result = finalize({"items": [_item("a", "tech"), _item("b", "tips"), _item("c", "tech", False)]})

    assert [item["id"] for item in result["items"]] == ["a", "b"]
    assert result["curated_ids"]["tech"] == ["a"]
    assert result["curated_ids"]["tips"] == ["b"]


def test_finalize_keeps_bilingual_video_after_video_editorial_review():
    video = _item("video", "tech")
    video.update({
        "is_video": True,
        "video_id": "abc123",
        "classification_source": "llm",
        "specialized_editorial_version": 1,
        "specialized_quality_pass": True,
    })

    result = finalize({"items": [video], "curated_ids": {"videos": ["video"]}})

    assert [item["id"] for item in result["items"]] == ["video"]
    assert result["curated_ids"]["videos"] == ["video"]


def test_finalize_clips_long_video_summaries_to_the_render_budget():
    video = _item("video", "tech")
    video.update({
        "is_video": True,
        "classification_source": "llm",
        "specialized_editorial_version": 1,
        "specialized_quality_pass": True,
        "summary_en": "Sentence one. " * 40,
        "summary_zh": "这是中文摘要。" * 100,
    })

    result = finalize({"items": [video], "curated_ids": {"videos": ["video"]}})

    assert len(result["items"][0]["summary_en"]) <= 320
    assert len(result["items"][0]["summary_zh"]) <= 320


def test_finalize_rejects_placeholder_titles_and_deduplicates_product_releases():
    first = _item("a", "tech")
    first["title"] = "Wan3.0 video model launches"
    duplicate = _item("b", "tech")
    duplicate["title"] = "Alibaba releases Wan3.0"
    placeholder = _item("c", "tech")
    placeholder["title"] = "llm 0.33"

    result = finalize({"items": [first, duplicate, placeholder]})

    assert [item["id"] for item in result["items"]] == ["a"]


def test_editor_rewrites_overlong_and_truncated_headlines():
    assert _needs_headline_rewrite("Source: " + "long wire headline " * 8)
    assert _needs_headline_rewrite("Disable artifacts + Chrome MCP Server +")
    assert not _needs_headline_rewrite("Alibaba raises funds for AI infrastructure")


def test_finalize_respects_editor_order_and_skips_stale_section_ids():
    low = _item("low", "tech")
    low["score"] = 1
    high = _item("high", "tech")
    high["score"] = 99
    moved = _item("moved", "policy")

    result = finalize({
        "items": [high, low, moved],
        "curated_ids": {"tech": ["moved", "low", "high"]},
    })

    assert result["curated_ids"]["tech"] == ["low", "high"]


def test_product_deduplication_keeps_the_more_concrete_report():
    vague = _item("vague", "tech")
    vague["title"] = "Wan3.0 video model launches"
    vague["summary"] = "Alibaba launched Wan3.0 with improved video quality."
    detailed = _item("detailed", "tech")
    detailed["title"] = "Alibaba releases Wan3.0"
    detailed["summary"] = "Wan3.0 generates 30-second clips and accepts 5 document formats."

    result = finalize({"items": [vague, detailed]})

    assert result["curated_ids"]["tech"] == ["detailed"]


def test_daily_quality_gate_accepts_diverse_reviewed_bilingual_edition():
    items = []
    for index in range(7):
        item = _item(f"Story {index}", "tech")
        item.update({
            "source": f"source-{index % 4}",
            "tags": [f"Company {index}"],
            "specialized_editorial_version": 1,
            "headline_editorial_version": 1,
        })
        items.append(item)
    data = {
        "items": items,
        "edition_window": {"start": "2026-08-23T00:00:00Z", "end": "2026-08-24T00:00:00Z"},
        "curation_review": {
            section: {"status": "pass", "major_issues": []}
            for section in ("tech", "investment", "tips", "policy")
        },
    }
    meta = {"source_health": {f"source-{index}": {"ok": True} for index in range(20)}}

    assert quality_failures(data, meta) == []


def test_daily_quality_gate_rejects_missing_published_section_briefing():
    items = []
    for index in range(4):
        item = _item(f"Tech {index}", "tech")
        item.update({
            "source": f"source-{index}",
            "specialized_editorial_version": 1,
            "headline_editorial_version": 1,
        })
        items.append(item)
    tip = _item("Tip 1", "tips")
    tip.update({
        "source": "tips-source",
        "specialized_editorial_version": 1,
        "headline_editorial_version": 1,
    })
    items.append(tip)
    data = {
        "date": "2026-09-01",
        "publication_complete": True,
        "items": items,
        "edition_window": {"start": "2026-09-01T00:00:00Z", "end": "2026-09-01T12:00:00Z"},
        "daily_throughlines": {
            "2026-09-01": {
                "tech": {"en": "English briefing.", "zh": "中文简报。", "supporting_ids": ["Tech 0", "Tech 1"]},
            },
        },
        "curation_review": {
            section: {"status": "pass", "major_issues": []}
            for section in ("tech", "investment", "tips", "policy")
        },
    }
    meta = {"source_health": {f"source-{index}": {"ok": True} for index in range(20)}}

    failures = quality_failures(data, meta)

    assert "tips briefing is not fully bilingual" in failures
    assert "tips briefing has 0 valid source ids; 1 required" in failures


def test_daily_quality_gate_allows_a_shorter_high_quality_tech_section():
    items = []
    for index in range(5):
        item = _item(f"Story {index}", "tech")
        item.update({
            "source": f"source-{index}",
            "tags": [f"Company {index}"],
            "specialized_editorial_version": 1,
            "headline_editorial_version": 1,
        })
        items.append(item)
    data = {
        "items": items,
        "edition_window": {"start": "2026-08-23T00:00:00Z", "end": "2026-08-24T00:00:00Z"},
        "curation_review": {
            section: {"status": "pass", "major_issues": []}
            for section in ("tech", "investment", "tips", "policy")
        },
    }
    meta = {"source_health": {f"source-{index}": {"ok": True} for index in range(20)}}

    assert quality_failures(data, meta) == []


def test_daily_quality_gate_does_not_require_a_weak_fifth_tech_story():
    items = []
    for index in range(4):
        item = _item(f"Strong {index}", "tech")
        item.update({
            "source": f"source-{index}",
            "tags": [f"Company {index}"],
            "specialized_editorial_version": 1,
            "headline_editorial_version": 1,
        })
        items.append(item)
    data = {
        "items": items,
        "edition_window": {"start": "2026-08-23T00:00:00Z", "end": "2026-08-24T00:00:00Z"},
        "curation_review": {
            section: {"status": "pass", "major_issues": []}
            for section in ("tech", "investment", "tips", "policy")
        },
    }
    meta = {"source_health": {f"source-{index}": {"ok": True} for index in range(20)}}

    assert quality_failures(data, meta) == []


def test_generic_topic_tags_do_not_count_as_company_concentration():
    items = []
    for index in range(5):
        item = _item(f"Tip {index}", "tips")
        item.update({
            "source": f"source-{index}",
            "tags": ["Prompt Engineering"],
            "specialized_editorial_version": 1,
            "headline_editorial_version": 1,
        })
        items.append(item)
    for index in range(4):
        item = _item(f"Tech {index}", "tech")
        item.update({
            "source": f"tech-source-{index}",
            "specialized_editorial_version": 1,
            "headline_editorial_version": 1,
        })
        items.append(item)
    data = {
        "items": items,
        "edition_window": {"start": "2026-08-29T00:00:00Z", "end": "2026-08-30T00:00:00Z"},
        "curation_review": {
            section: {"status": "pass", "major_issues": []}
            for section in ("tech", "investment", "tips", "policy")
        },
    }
    meta = {"source_health": {f"source-{index}": {"ok": True} for index in range(20)}}

    assert quality_failures(data, meta) == []
