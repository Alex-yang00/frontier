from datetime import datetime, timedelta, timezone

from scripts import audit


def _stamp(hours_ago: float = 0) -> str:
    moment = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
    return moment.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _item(**overrides) -> dict:
    item = {
        "id": "src-1",
        "title": "A real headline about model releases",
        "summary": "A finished deck that says what happened and who reported it.",
        "published": _stamp(),
        "fetched_at": _stamp(),
        "section": "tech",
        "editorial_version": 3,
        "summary_en": "A finished deck that says what happened and who reported it.",
        "summary_zh": "一段写完的中文摘要。",
    }
    item.update(overrides)
    return item


def _day(days_ago: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).date().isoformat()


def test_presentable_rejects_slug_titles_and_empty_decks():
    assert audit._presentable(_item(), "en")
    assert not audit._presentable(_item(title="microsoft/onnxruntime", title_en="microsoft/onnxruntime"), "en")
    assert not audit._presentable(_item(summary="", summary_en=""), "en")


def test_presentable_keeps_chinese_headlines():
    # A headline with no spaces is normal in Chinese; calling it a slug would drop
    # the language's own real headlines.
    assert audit._presentable(_item(title_zh="国产模型开源发布", summary_zh="中文摘要内容。"), "zh")


def test_newest_day_fails_when_most_rows_would_not_render():
    items = [_item(id=f"ok-{n}") for n in range(1)] + [
        _item(id=f"raw-{n}", title=f"owner/repo{n}", summary="") for n in range(6)
    ]
    report = audit.Report()
    audit.check_newest_day(items, report)
    assert report.failures
    assert "render as finished rows" in report.failures[0]


def test_newest_day_passes_on_a_short_but_finished_day():
    """Few items is not a defect; unfinished items are. The user wants fewer, current."""
    items = [_item(id=f"ok-{n}") for n in range(5)]
    report = audit.Report()
    audit.check_newest_day(items, report)
    assert not report.failures


def test_newest_day_does_not_rate_a_day_that_just_began():
    items = [_item(id="ok-1"), _item(id="raw-1", title="owner/repo", summary="")]
    report = audit.Report()
    audit.check_newest_day(items, report)
    assert not report.failures


def test_completed_day_fails_on_missing_enrichment():
    old = _day(2)
    items = [
        _item(id=f"old-{n}", published=f"{old}T04:00:00Z", fetched_at=_stamp(hours_ago=48), editorial_version=None)
        for n in range(10)
    ]
    report = audit.Report()
    audit.check_completed_days(items, report)
    assert any("enriched" in failure for failure in report.failures)


def test_day_inside_grace_window_is_not_judged():
    items = [_item(id=f"new-{n}", editorial_version=None) for n in range(10)]
    report = audit.Report()
    audit.check_completed_days(items, report)
    assert not report.failures


def test_freshness_fails_on_a_stale_write():
    data = {"date": datetime.now(timezone.utc).date().isoformat(), "updated_at": _stamp(hours_ago=5)}
    report = audit.Report()
    audit.check_freshness(data, report)
    assert any("last write" in failure for failure in report.failures)


def test_freshness_fails_when_the_file_is_about_a_past_day():
    data = {"date": _day(1), "updated_at": _stamp()}
    report = audit.Report()
    audit.check_freshness(data, report)
    assert any("expected" in failure for failure in report.failures)


def test_video_freshness_fails_when_the_newest_video_is_outside_the_window():
    items = [
        _item(id="article", published=f"{_day(0)}T04:00:00Z"),
        _item(id="video", is_video=True, published=f"{_day(5)}T04:00:00Z"),
    ]
    report = audit.Report()
    audit.check_video_freshness(items, report)
    assert any("no video can render" in failure for failure in report.failures)


def test_video_freshness_accepts_a_video_inside_the_window():
    items = [
        _item(id="article", published=f"{_day(0)}T04:00:00Z"),
        _item(id="video", is_video=True, published=f"{_day(1)}T04:00:00Z"),
    ]
    report = audit.Report()
    audit.check_video_freshness(items, report)
    assert not report.failures


def test_rendered_text_warns_on_over_length_and_untranslated_summaries():
    long_summary = "x" * (audit.SUMMARY_MAX + 1)
    items = [
        _item(id="long", summary=long_summary, summary_en=long_summary),
        _item(id="same", summary_zh="A finished deck that says what happened and who reported it."),
    ]
    report = audit.Report()
    audit.check_rendered_text(items, report)
    assert any("exceed" in warning for warning in report.warnings)
    assert any("identical" in warning for warning in report.warnings)


def test_sources_fail_only_when_many_feeds_are_down():
    healthy = {"source_health": {f"s{n}": {"ok": True} for n in range(35)} | {"a": {"ok": False, "error": "x"}}}
    report = audit.Report()
    audit.check_sources(healthy, report)
    assert not report.failures
    assert any("failing" in warning for warning in report.warnings)

    broken = {"source_health": {f"s{n}": {"ok": n > 20} for n in range(40)}}
    report = audit.Report()
    audit.check_sources(broken, report)
    assert report.failures


def test_briefings_warn_when_a_language_is_missing():
    today = datetime.now(timezone.utc).date().isoformat()
    data = {
        "date": today,
        "daily_throughlines": {today: {"tech": {"en": "A briefing.", "zh": ""}}},
    }
    report = audit.Report()
    audit.check_briefings(data, [_item()], report)
    assert any("zh" in warning for warning in report.warnings)


def test_an_enriched_slug_title_fails_but_a_raw_one_only_warns():
    """The bug this guards shipped as a warning nobody had to act on.

    `_editorial_fields` set `title` but not `title_en`, so 23 rows rendered
    "microsoft/onnxruntime" while the rewritten headline sat unused in the same
    record. The resume filter then retires those items, so it never self-heals.
    """
    items = [
        _item(id="paid", title="microsoft/onnxruntime", title_en="microsoft/onnxruntime"),
        _item(id="queued", title="owner/repo", title_en="owner/repo", editorial_version=None),
    ]
    report = audit.Report()
    audit.check_rendered_text(items, report)

    assert any("title_en" in failure for failure in report.failures)
    assert any("unenriched" in warning for warning in report.warnings)


def test_a_completed_day_fails_when_chinese_headlines_are_missing():
    """Only summaries were rated, so a Chinese deck could sit under an English slug."""
    old = _day(2)
    items = [
        _item(
            id=f"old-{n}",
            published=f"{old}T04:00:00Z",
            fetched_at=_stamp(hours_ago=48),
            title="owner/repo",
            title_en="owner/repo",
            title_zh="",
        )
        for n in range(10)
    ]
    report = audit.Report()
    audit.check_completed_days(items, report)

    assert any("Chinese rows" in failure for failure in report.failures)


def test_the_newest_day_reports_chinese_separately_from_english():
    """A row that renders in English but not in Chinese warns without failing.

    `title_en` carries a headline while the base `title` is a slug, so English
    renders and Chinese -- which falls back to the base field -- does not.
    """
    items = [
        _item(id=f"ok-{n}", title="owner/repo", title_en="A real headline about releases", title_zh="")
        for n in range(5)
    ]
    report = audit.Report()
    audit.check_newest_day(items, report)

    assert not report.failures
    assert any("zh is behind" in warning for warning in report.warnings)


def test_english_fallback_counts_as_rendering_in_chinese():
    """Untranslated text that still renders is not this check's defect: the page
    shows the English, and check_rendered_text warns on identical summaries."""
    items = [_item(id=f"ok-{n}", title_zh="", summary_zh="") for n in range(5)]
    report = audit.Report()
    audit.check_newest_day(items, report)

    assert not report.failures
    assert not any("zh is behind" in warning for warning in report.warnings)


def test_a_rail_date_with_no_archive_behind_it_fails(tmp_path):
    """The rail is built from the data branch but the site reads R2, so a date could
    reach the rail while its file was never published -- 2026-08-18 opened to a
    failed fetch that way."""
    (tmp_path / "weeks.json").write_text(
        '{"weeks": [{"id": "2026-08-20"}, {"id": "2026-08-19"}]}', encoding="utf-8"
    )
    archive = tmp_path / "archive"
    archive.mkdir()
    (archive / "2026-08-20.json").write_text('{"items": [{"id": "a"}]}', encoding="utf-8")

    report = audit.Report()
    audit.check_archive_coverage(tmp_path, report)

    assert any("2026-08-19 (no file)" in failure for failure in report.failures)


def test_an_empty_or_unparseable_archive_counts_as_missing(tmp_path):
    """A truncated upload fetches with a 200 and renders as a blank day."""
    (tmp_path / "weeks.json").write_text(
        '{"weeks": [{"id": "2026-08-20"}, {"id": "2026-08-19"}]}', encoding="utf-8"
    )
    archive = tmp_path / "archive"
    archive.mkdir()
    (archive / "2026-08-20.json").write_text('{"items": []}', encoding="utf-8")
    (archive / "2026-08-19.json").write_text("{truncated", encoding="utf-8")

    report = audit.Report()
    audit.check_archive_coverage(tmp_path, report)

    assert any("holds no items" in failure for failure in report.failures)
    assert any("does not parse" in failure for failure in report.failures)


def test_a_complete_rail_passes(tmp_path):
    (tmp_path / "weeks.json").write_text('{"weeks": [{"id": "2026-08-20"}]}', encoding="utf-8")
    archive = tmp_path / "archive"
    archive.mkdir()
    (archive / "2026-08-20.json").write_text('{"items": [{"id": "a"}]}', encoding="utf-8")

    report = audit.Report()
    audit.check_archive_coverage(tmp_path, report)

    assert not report.failures
