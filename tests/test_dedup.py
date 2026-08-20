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


def test_a_reissued_post_at_a_new_slug_collapses():
    """Measured on live data: OpenAI shipped one headline at two addresses and
    the homepage rendered it twice. URL keying alone cannot see this."""
    items = deduplicate([
        {"id": "a", "title": "Offering Zero Data Retention", "source": "openai",
         "url": "https://openai.com/index/offering-zero-data-retention-for-frontier-models"},
        {"id": "b", "title": "Offering Zero Data Retention", "source": "openai",
         "url": "https://openai.com/index/our-commitment-to-zero-data-retention"},
    ])

    assert len(items) == 1


def test_two_outlets_on_one_story_are_both_kept():
    """Cross-source agreement is corroboration, not duplication -- collapsing it
    here would throw away the second report and pre-empt the event clustering in
    scripts/enrich.py, which exists to relate them without discarding either."""
    items = deduplicate([
        {"id": "a", "title": "Model released", "source": "openai",
         "url": "https://openai.com/index/model-released"},
        {"id": "b", "title": "Model released", "source": "the_decoder",
         "url": "https://the-decoder.com/model-released"},
    ])

    assert len(items) == 2


def test_titles_differing_only_in_whitespace_and_case_collapse():
    items = deduplicate([
        {"id": "a", "title": "GPT-6  Ships", "source": "openai", "url": "https://openai.com/a"},
        {"id": "b", "title": "gpt-6 ships", "source": "openai", "url": "https://openai.com/b"},
    ])

    assert len(items) == 1


def test_an_item_with_no_title_still_dedupes_by_url():
    items = deduplicate([
        {"id": "a", "title": "", "source": "openai", "url": "https://openai.com/a?utm_source=x"},
        {"id": "b", "title": "", "source": "openai", "url": "https://openai.com/a"},
    ])

    assert len(items) == 1
