from core.periods import build_period_index


def test_period_index_is_recent_first_and_marks_current():
    result = build_period_index(
        ["2026-08-17", "not-a-date", "2026-08-18"],
        "2026-08-19",
    )

    assert [entry["id"] for entry in result["weeks"]] == [
        "2026-08-19", "2026-08-18", "2026-08-17",
    ]
    assert result["weeks"][0] == {
        "id": "2026-08-19",
        "label": "19 AUG",
        "year": 2026,
        "dateRange": "19.08",
        "current": True,
        "periodType": "day",
        "days": [],
    }
