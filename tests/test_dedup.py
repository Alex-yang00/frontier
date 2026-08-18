from core.dedup import canonical_url, deduplicate


def test_canonical_url_removes_tracking_query():
    assert canonical_url("https://Example.com/story/?utm_source=x&id=3#comments") == "https://example.com/story?id=3"


def test_deduplicate_keeps_first_item():
    items = [{"url": "https://example.com/a/"}, {"url": "https://example.com/a?utm_campaign=x"}, {"url": "https://example.com/b"}]
    assert len(deduplicate(items)) == 2


def test_deduplicate_preserves_existing_enrichment():
    items = [
        {"url": "https://example.com/story", "title": "Story", "title_zh": "故事"},
        {"url": "https://example.com/story", "title": "Story updated", "title_zh": ""},
    ]
    result = deduplicate(items)
    assert result[0]["title"] == "Story updated"
    assert result[0]["title_zh"] == "故事"
