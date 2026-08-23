import json
from datetime import datetime, timezone

import pytest

import scripts.aggregate as aggregate


def _run(tmp_path, group, found, health, monkeypatch):
    monkeypatch.setattr(aggregate, "collect_group", lambda _group: (found, health))
    monkeypatch.setattr(
        "sys.argv", ["aggregate", "--group", group, "--output", str(tmp_path)]
    )
    aggregate.main()


def _item(item_id, **overrides):
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    row = {
        "id": item_id,
        "title": f"Headline {item_id}",
        "url": f"https://example.com/{item_id}",
        "source": "example",
        "source_name": "Example",
        "published": now,
        "summary": "A summary.",
        "section": "tech",
    }
    row.update(overrides)
    return row


@pytest.mark.parametrize("group", ["fast", "medium", "slow"])
def test_every_group_writes_the_day_archive(tmp_path, group, monkeypatch):
    """The archive used to be written only by the slow run, so a day whose slow run
    failed lost its archive permanently and the date became unreachable."""
    _run(tmp_path, group, [_item("a"), _item("b")], {"example": {"ok": True}}, monkeypatch)

    today = datetime.now(timezone.utc).date().isoformat()
    archive = tmp_path / "archive" / f"{today}.json"
    assert archive.exists()
    written = json.loads(archive.read_text(encoding="utf-8"))
    assert written["date"] == today
    assert {row["id"] for row in written["items"]} == {"a", "b"}

    rail = json.loads((tmp_path / "weeks.json").read_text(encoding="utf-8"))
    assert today in {week["id"] for week in rail["weeks"]}


def test_stale_source_health_is_pruned(tmp_path, monkeypatch):
    """A source removed from the registry kept its last failure in meta.json
    forever, so the audit went on reporting it as a failing source."""
    (tmp_path / "meta.json").write_text(
        json.dumps({"source_health": {"36kr": {"ok": False, "error": "gone"}}}),
        encoding="utf-8",
    )

    _run(tmp_path, "medium", [_item("a")], {"hacker_news": {"ok": True}}, monkeypatch)

    health = json.loads((tmp_path / "meta.json").read_text(encoding="utf-8"))["source_health"]
    assert "36kr" not in health
    assert health["hacker_news"] == {"ok": True}


def test_health_reported_by_this_run_is_never_pruned(tmp_path, monkeypatch):
    """The run is evidence the source exists, so its keys survive the prune even if
    the registry does not list them -- otherwise the prune deletes the health the
    run just collected."""
    _run(tmp_path, "medium", [_item("a")], {"not_in_registry": {"ok": True}}, monkeypatch)

    health = json.loads((tmp_path / "meta.json").read_text(encoding="utf-8"))["source_health"]
    assert health["not_in_registry"] == {"ok": True}


def test_health_from_other_groups_survives(tmp_path, monkeypatch):
    """Each group reports only its own sources, so the merge must keep the rest."""
    (tmp_path / "meta.json").write_text(
        json.dumps({"source_health": {"arxiv": {"ok": True, "items": 4}}}),
        encoding="utf-8",
    )

    _run(tmp_path, "fast", [_item("a")], {"hacker_news": {"ok": True}}, monkeypatch)

    health = json.loads((tmp_path / "meta.json").read_text(encoding="utf-8"))["source_health"]
    assert health["arxiv"] == {"ok": True, "items": 4}
    assert health["hacker_news"] == {"ok": True}
