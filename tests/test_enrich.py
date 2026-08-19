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
