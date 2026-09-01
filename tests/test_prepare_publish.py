from datetime import datetime, timezone

from scripts.prepare_publish import CANDIDATE_LIMITS, build_snapshot, edition_window


def _item(item_id: str, day: str, source: str, section: str, score: int = 50) -> dict:
    return {
        "id": item_id,
        "title": (
            f"How to use an AI model in a practical workflow {item_id}"
            if section == "tips"
            else f"AI model headline {item_id}"
        ),
        "summary": f"Useful summary for {item_id}",
        "url": f"https://example.com/{item_id}",
        "source": source,
        "source_name": source,
        "published": f"{day}T12:00:00Z",
        "section": section,
        "classification_source": "llm",
        "score": score,
    }


def test_snapshot_uses_complete_window_and_excludes_github():
    old = "2026-08-23"
    new = "2026-08-24"
    items = []
    items += [_item(f"tech-{n}", old, f"news-{n % 5}", "tech") for n in range(10)]
    items += [_item(f"inv-{n}", old, f"investment-{n}", "investment") for n in range(5)]
    items += [_item(f"tip-{n}", old, f"reddit-{n}", "tips") for n in range(5)]
    items += [_item(f"github-{n}", old, "github_trending", "tech", 99) for n in range(5)]
    items += [_item(f"new-{n}", new, "news", "tech") for n in range(10)]

    result = build_snapshot(
        {"updated_at": "now", "items": items},
        now=datetime(2026, 8, 24, 23, tzinfo=timezone.utc),
    )

    assert result["date"] == "2026-08-24"
    assert all(not values for values in result["curated_ids"].values())
    assert len([item for item in result["items"] if item["section"] == "tech"]) <= CANDIDATE_LIMITS["tech"]
    assert all(item["edition_date"] == "2026-08-24" for item in result["items"])
    assert all(item["source"] != "github_trending" for item in result["items"])
    assert all(item["published"].startswith(new) for item in result["items"])


def test_edition_window_morning_slice_uses_previous_evening():
    start, end, date = edition_window(datetime(2026, 8, 24, 6, tzinfo=timezone.utc))

    assert start.isoformat() == "2026-08-23T12:00:00+00:00"
    assert end.isoformat() == "2026-08-24T06:00:00+00:00"
    assert date == "2026-08-24"


def test_edition_window_evening_slice_starts_at_utc_12():
    start, end, date = edition_window(datetime(2026, 8, 31, 12, 30, tzinfo=timezone.utc))

    assert start.isoformat() == "2026-08-31T00:00:00+00:00"
    assert end.isoformat() == "2026-08-31T12:30:00+00:00"
    assert date == "2026-08-31"


def test_snapshot_admits_items_published_in_the_morning_slice():
    # 00:30 UTC belongs to the AM slice, which starts at 12:00 the previous day.
    late = _item("late-1", "2026-08-30", "news", "tech")
    late["published"] = "2026-08-30T23:49:00Z"
    result = build_snapshot(
        {"updated_at": "now", "items": [late]},
        now=datetime(2026, 8, 31, 0, 30, tzinfo=timezone.utc),
    )

    assert result["date"] == "2026-08-31"
    assert [item["id"] for item in result["items"]] == ["late-1"]
    assert result["items"][0]["edition_window_member"] == "strict"
