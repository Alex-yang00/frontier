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

    assert result["date"] == "2026-08-25"
    assert all(not values for values in result["curated_ids"].values())
    assert len([item for item in result["items"] if item["section"] == "tech"]) <= CANDIDATE_LIMITS["tech"]
    assert all(item["edition_date"] == "2026-08-25" for item in result["items"])
    assert all(item["source"] != "github_trending" for item in result["items"])
    assert all(item["published"].startswith(new) for item in result["items"])


def test_edition_window_before_cutoff_uses_previous_complete_day():
    start, end, date = edition_window(datetime(2026, 8, 23, 21, tzinfo=timezone.utc))

    assert start.isoformat() == "2026-08-21T22:00:00+00:00"
    assert end.isoformat() == "2026-08-22T22:00:00+00:00"
    assert date == "2026-08-23"
