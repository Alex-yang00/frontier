import json
import os
from datetime import datetime, timedelta, timezone

from scripts.local_collect import (
    ARCHIVE_RETENTION_DAYS,
    StatePaths,
    build_manifest,
    build_release,
    can_resume_stage,
    cleanup_failed_work,
    cleanup_slice_state,
    collection_freshness_failures,
    discard_rejected_stage,
    merge_processed_snapshot,
    merge_slices,
    exclude_published_candidates,
    publish_local_snapshot,
    publish_release,
    recoverable_morning_slice,
    sync_json_files,
)
from scripts.migrate_state import migrate


def test_exclude_published_candidates_removes_old_ids_and_urls(tmp_path):
    paths = StatePaths(tmp_path)
    archive = paths.preview / "archive"
    archive.mkdir(parents=True)
    (archive / "2026-09-01.json").write_text(
        json.dumps({"items": [{"id": "old", "url": "https://example.com/story?utm_source=x"}]}),
        encoding="utf-8",
    )
    candidates = paths.raw / "candidates.json"
    candidates.parent.mkdir(parents=True)
    candidates.write_text(json.dumps({"items": [
        {"id": "old", "url": "https://example.com/story"},
        {"id": "new", "url": "https://example.com/new"},
    ]}), encoding="utf-8")

    exclude_published_candidates(candidates, paths)

    assert [item["id"] for item in json.loads(candidates.read_text())["items"]] == ["new"]


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


def test_collection_freshness_requires_all_groups_within_their_windows():
    now = datetime(2026, 8, 31, 0, 30, tzinfo=timezone.utc)
    meta = {
        "last_runs": {
            "fast": (now - timedelta(minutes=20)).isoformat(),
            "medium": (now - timedelta(hours=3)).isoformat(),
            "slow": (now - timedelta(hours=5)).isoformat(),
        }
    }

    assert collection_freshness_failures(meta, now) == [
        "slow collection is missing or older than 240 minutes"
    ]


def test_manifest_keeps_only_60_days_and_repoints_current_day():
    previous = {"archives": {}}
    start = datetime(2026, 6, 1, tzinfo=timezone.utc).date()
    for offset in range(91):
        day = (start + timedelta(days=offset)).isoformat()
        previous["archives"][day] = {"key": f"archive/{day}.json", "itemCount": offset}

    manifest = build_manifest(
        previous,
        "20260831T003000Z",
        {"date": "2026-08-31", "items": [{"id": "a"}]},
        "2026-08-31T00:30:00Z",
    )

    assert len(manifest["archives"]) == ARCHIVE_RETENTION_DAYS
    assert "2026-07-03" in manifest["archives"]
    assert "2026-07-02" not in manifest["archives"]
    assert manifest["archives"]["2026-08-31"] == {
        "key": "releases/20260831T003000Z/daily.json",
        "itemCount": 1,
    }


def test_build_release_contains_only_canonical_public_files(tmp_path):
    paths = StatePaths(tmp_path)
    paths.outbox.mkdir()
    daily = {"date": "2026-08-31", "updated_at": "now", "publication_complete": True, "items": []}

    release, manifest = build_release(paths, daily, {"source_health": {}}, {"archives": {}})

    assert {path.name for path in release.iterdir()} == {
        "daily.json", "weeks.json", "meta.json", "current.json"
    }
    assert set(manifest["files"]) == {"daily.json", "weeks.json", "meta.json"}


def test_failed_work_older_than_48_hours_is_removed(tmp_path):
    old = tmp_path / "old"
    recent = tmp_path / "recent"
    old.mkdir()
    recent.mkdir()
    now = datetime.now(timezone.utc)
    old_timestamp = (now - timedelta(hours=49)).timestamp()
    os.utime(old, (old_timestamp, old_timestamp))

    cleanup_failed_work(tmp_path, now)

    assert not old.exists()
    assert recent.exists()


def test_slice_state_removes_consumed_and_expired_am_files(tmp_path):
    consumed = tmp_path / "2026-09-01-am.json"
    expired = tmp_path / "2026-08-30-am.json"
    recent = tmp_path / "2026-08-31-am.json"
    unrelated = tmp_path / "releases.json"
    for path in (consumed, expired, recent, unrelated):
        path.write_text("{}", encoding="utf-8")
    now = datetime.now(timezone.utc)
    expired_timestamp = (now - timedelta(hours=49)).timestamp()
    os.utime(expired, (expired_timestamp, expired_timestamp))

    cleanup_slice_state(tmp_path, now, consumed_date="2026-09-01")

    assert not consumed.exists()
    assert not expired.exists()
    assert recent.exists()
    assert unrelated.exists()


def test_publish_uploads_pointer_last_and_records_verified_release(tmp_path, monkeypatch):
    paths = StatePaths(tmp_path)
    paths.outbox.mkdir()
    paths.state.mkdir()
    release = paths.outbox / "release"
    release.mkdir()
    for name in ("daily.json", "weeks.json", "meta.json", "current.json"):
        (release / name).write_text("{}", encoding="utf-8")
    manifest = {
        "release_id": "r1",
        "published_at": "2026-08-31T00:30:00Z",
        "files": {
            "daily.json": "releases/r1/daily.json",
            "weeks.json": "releases/r1/weeks.json",
            "meta.json": "releases/r1/meta.json",
        },
        "archives": {"2026-08-31": {"key": "releases/r1/daily.json", "itemCount": 1}},
    }
    uploaded = []
    monkeypatch.setattr("scripts.local_collect.put_and_verify", lambda key, path, env: uploaded.append(key))
    monkeypatch.setattr("scripts.local_collect.cleanup_remote_releases", lambda *args, **kwargs: None)

    publish_release(paths, release, manifest, {"CLOUDFLARE_API_TOKEN": "x", "CLOUDFLARE_ACCOUNT_ID": "y"})

    assert uploaded == [
        "releases/r1/daily.json",
        "releases/r1/weeks.json",
        "releases/r1/meta.json",
        "current.json",
    ]
    assert json.loads((paths.state / "current.json").read_text(encoding="utf-8"))["release_id"] == "r1"


def test_publish_registers_cleanup_ledger_before_upload(tmp_path, monkeypatch):
    paths = StatePaths(tmp_path)
    paths.outbox.mkdir()
    release = paths.outbox / "release"
    release.mkdir()
    for name in ("daily.json", "weeks.json", "meta.json", "current.json"):
        (release / name).write_text("{}", encoding="utf-8")
    manifest = {
        "release_id": "partial",
        "published_at": "2026-08-31T00:30:00Z",
        "files": {
            "daily.json": "releases/partial/daily.json",
            "weeks.json": "releases/partial/weeks.json",
            "meta.json": "releases/partial/meta.json",
        },
        "archives": {},
    }

    def fail_first_upload(*_args):
        ledger = json.loads((paths.state / "releases.json").read_text(encoding="utf-8"))
        assert ledger["partial"]["keys"] == [
            "releases/partial/daily.json",
            "releases/partial/weeks.json",
            "releases/partial/meta.json",
        ]
        raise RuntimeError("upload failed")

    monkeypatch.setattr("scripts.local_collect.put_and_verify", fail_first_upload)

    try:
        publish_release(
            paths,
            release,
            manifest,
            {"CLOUDFLARE_API_TOKEN": "x", "CLOUDFLARE_ACCOUNT_ID": "y"},
        )
    except RuntimeError as error:
        assert str(error) == "upload failed"
    else:
        raise AssertionError("expected upload failure")


def test_legacy_migration_copies_candidates_preview_and_manifest_without_deleting_source(tmp_path):
    published = tmp_path / "data"
    raw = tmp_path / "data.raw"
    state = tmp_path / "state-root"
    (published / "archive").mkdir(parents=True)
    raw.mkdir()
    (published / "daily.json").write_text('{"date":"2026-08-31","items":[{"id":"public"}]}', encoding="utf-8")
    (published / "meta.json").write_text('{"source_health":{}}', encoding="utf-8")
    (published / "weeks.json").write_text(
        '{"weeks":[{"id":"2026-08-31","itemCount":1}]}', encoding="utf-8"
    )
    (published / "archive" / "2026-08-31.json").write_text('{"items":[{"id":"public"}]}', encoding="utf-8")
    (raw / "daily.json").write_text('{"date":"2026-08-31","items":[{"id":"raw"}]}', encoding="utf-8")
    (raw / "meta.json").write_text('{"last_runs":{}}', encoding="utf-8")

    migrate(published, state)

    candidates = json.loads((state / "raw" / "candidates.json").read_text(encoding="utf-8"))
    manifest = json.loads((state / "state" / "current.json").read_text(encoding="utf-8"))
    assert candidates["items"][0]["id"] == "raw"
    assert manifest["archives"]["2026-08-31"]["key"] == "archive/2026-08-31.json"
    assert (state / "preview" / "daily.json").exists()
    assert not (state / "preview" / "hot.json").exists()
    public_meta_value = json.loads((state / "preview" / "meta.json").read_text(encoding="utf-8"))
    assert "source_health" not in public_meta_value
    assert public_meta_value["source_status"] == {"healthy": 0, "total": 0}
    assert (published / "daily.json").exists()


def test_local_preview_preserves_manifest_archives_and_writes_current_archive(tmp_path):
    source = tmp_path / "release"
    target = tmp_path / "preview"
    source.mkdir()
    (target / "archive").mkdir(parents=True)
    (source / "daily.json").write_text('{"date":"2026-09-01","items":[{"id":"new"}]}', encoding="utf-8")
    (source / "meta.json").write_text("{}", encoding="utf-8")
    (target / "archive" / "2026-08-31.json").write_text('{"items":[{"id":"old"}]}', encoding="utf-8")

    publish_local_snapshot(
        source,
        target,
        {"edition_date": "2026-09-01", "archives": {"2026-09-01": {}, "2026-08-31": {}}},
    )

    assert json.loads((target / "archive" / "2026-09-01.json").read_text())["items"][0]["id"] == "new"
    assert json.loads((target / "archive" / "2026-08-31.json").read_text())["items"][0]["id"] == "old"


def test_merge_slices_unions_items_and_marks_edition_complete():
    morning = {
        "date": "2026-09-01",
        "edition_status": "partial",
        "items": [{"id": "overnight", "title": "Night"}],
        "slices": {"am": {"slice_id": "2026-09-01-am"}},
    }
    evening = {
        "date": "2026-09-01",
        "items": [{"id": "day", "title": "Day"}, {"id": "overnight", "title": "Updated"}],
        "edition_window": {"slice_id": "2026-09-01-pm"},
    }

    merged = merge_slices(morning, evening)

    assert [item["id"] for item in merged["items"]] == ["overnight", "day"]
    assert merged["items"][0]["title"] == "Updated"
    assert merged["edition_status"] == "complete"
    assert merged["publication_complete"] is True
    assert merged["slices"]["am"]["slice_id"] == "2026-09-01-am"
    assert merged["slices"]["pm"]["slice_id"] == "2026-09-01-pm"


def _recoverable_am_data() -> dict:
    items = []
    for index in range(3):
        items.append({
            "id": f"tech-{index}",
            "section": "tech",
            "source": f"source-{index}",
            "title": f"Story {index}",
            "summary": "A reviewed summary.",
            "title_zh": f"标题 {index}",
            "summary_zh": "已审核摘要。",
            "editorial_version": 1,
            "specialized_editorial_version": 1,
            "headline_editorial_version": 1,
        })
    return {
        "date": "2026-09-19",
        "publication_complete": False,
        "edition_window": {
            "slice": "am",
            "slice_id": "2026-09-19-am",
            "start": "2026-09-18T12:00:00Z",
            "end": "2026-09-19T00:00:00Z",
        },
        "items": items,
        "curation_review": {
            section: {"status": "pass", "major_issues": []}
            for section in ("tech", "investment", "tips", "policy")
        },
    }


def test_pm_can_recover_quality_passing_am_work_without_throughlines(tmp_path):
    paths = StatePaths(tmp_path)
    staged = paths.work / "2026-09-19-am" / "daily.json"
    staged.parent.mkdir(parents=True)
    staged.write_text(json.dumps(_recoverable_am_data()), encoding="utf-8")
    meta = {"source_health": {f"source-{index}": {"ok": True} for index in range(20)}}

    recovered = recoverable_morning_slice(paths, "2026-09-19", meta)

    assert recovered is not None
    assert [item["id"] for item in recovered["items"]] == ["tech-0", "tech-1", "tech-2"]


def test_pm_does_not_recover_am_work_that_fails_core_quality(tmp_path):
    paths = StatePaths(tmp_path)
    staged = paths.work / "2026-09-19-am" / "daily.json"
    staged.parent.mkdir(parents=True)
    data = _recoverable_am_data()
    data["items"][0]["summary_zh"] = ""
    staged.write_text(json.dumps(data), encoding="utf-8")
    meta = {"source_health": {f"source-{index}": {"ok": True} for index in range(20)}}

    assert recoverable_morning_slice(paths, "2026-09-19", meta) is None


def test_rejected_stage_is_rebuilt_instead_of_resumed(tmp_path):
    work = tmp_path / "2026-10-07-am"
    work.mkdir()
    # An interrupted run left an unfinished stage: the next run resumes it.
    (work / "daily.json").write_text(
        json.dumps({"date": "2026-10-07", "publication_complete": False, "items": [{"id": "a"}]}),
        encoding="utf-8",
    )
    assert can_resume_stage(work, "2026-10-07")
    assert not can_resume_stage(work, "2026-10-08")

    # A gate-rejected stage was already pruned by finalize; retrying it can only fail again.
    discard_rejected_stage(work)

    assert not can_resume_stage(work, "2026-10-07")
    assert json.loads((work / "daily.rejected.json").read_text(encoding="utf-8"))["items"] == [{"id": "a"}]
    discard_rejected_stage(work)  # idempotent when the stage is already gone
