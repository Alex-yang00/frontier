import json

from core.periods import archive_item_counts, build_period_index


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
        "itemCount": 0,
    }


def test_period_index_carries_item_counts_for_the_archive_heatmap():
    result = build_period_index(
        ["2026-08-17", "2026-08-18"],
        "2026-08-19",
        counts={"2026-08-18": 142, "2026-08-17": 0},
    )

    by_id = {entry["id"]: entry["itemCount"] for entry in result["weeks"]}
    assert by_id["2026-08-18"] == 142
    # A day the caller supplied no count for reports 0, which the grid draws as
    # its empty level rather than as a gap.
    assert by_id["2026-08-17"] == 0
    assert by_id["2026-08-19"] == 0


def test_archive_item_counts_reads_each_file_and_survives_a_broken_one(tmp_path):
    (tmp_path / "2026-08-18.json").write_text(
        json.dumps({"items": [{"id": "a"}, {"id": "b"}]}), encoding="utf-8"
    )
    (tmp_path / "2026-08-19.json").write_text("{not json", encoding="utf-8")

    counts = archive_item_counts(sorted(tmp_path.glob("*.json")))

    assert counts == {"2026-08-18": 2, "2026-08-19": 0}
