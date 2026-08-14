from core.dedup import canonical_url, deduplicate


def test_canonical_url_removes_tracking_query():
    assert canonical_url("https://Example.com/story/?utm_source=x&id=3#comments") == "https://example.com/story?id=3"


def test_deduplicate_keeps_first_item():
    items = [{"url": "https://example.com/a/"}, {"url": "https://example.com/a?utm_campaign=x"}, {"url": "https://example.com/b"}]
    assert len(deduplicate(items)) == 2
