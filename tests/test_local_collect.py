import json

from scripts.local_collect import merge_processed_snapshot, sync_json_files


def test_sync_json_files_copies_snapshot_without_non_json_state(tmp_path):
    source = tmp_path / "raw"
    target = tmp_path / "published"
    (source / "archive").mkdir(parents=True)
    (source / "daily.json").write_text(json.dumps({"items": [{"id": "a"}]}), encoding="utf-8")
    (source / "archive" / "2026-08-24.json").write_text('{"items": []}', encoding="utf-8")
    (source / ".collect.lock").write_text("lock", encoding="utf-8")

    sync_json_files(source, target)

    assert (target / "daily.json").exists()
    assert (target / "archive" / "2026-08-24.json").exists()
    assert not (target / ".collect.lock").exists()


def test_merge_processed_snapshot_preserves_unselected_raw_items(tmp_path):
    raw = tmp_path / "raw.json"
    processed = tmp_path / "processed.json"
    raw.write_text('{"items": [{"id": "a"}, {"id": "b"}]}', encoding="utf-8")
    processed.write_text(
        '{"items": [{"id": "a", "summary_zh": "done"}], "curated_ids": {"tech": ["a"]}}',
        encoding="utf-8",
    )

    merge_processed_snapshot(processed, raw)

    data = json.loads(raw.read_text(encoding="utf-8"))
    assert [item["id"] for item in data["items"]] == ["a", "b"]
    assert data["items"][0]["summary_zh"] == "done"
    assert data["curated_ids"] == {"tech": ["a"]}
