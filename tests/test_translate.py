import json

import pytest

from scripts import translate


def _daily(items, date="2026-08-20"):
    return {"date": date, "items": items}


@pytest.fixture(autouse=True)
def _clear_translation_cache():
    """The cache is process-scoped, so it would leak between tests."""
    translate._TRANSLATION_CACHE.clear()
    yield
    translate._TRANSLATION_CACHE.clear()


def _item(idx, day, translated):
    """An item whose zh fields are either filled or pending."""
    return {
        "id": f"item-{idx}",
        "title": f"Title {idx}",
        "summary": f"Summary {idx}.",
        "published": f"{day}T08:00:00Z",
        "title_en": f"Title {idx}",
        "summary_en": f"Summary {idx}.",
        "title_zh": f"标题 {idx}" if translated else "",
        "summary_zh": f"摘要 {idx}。" if translated else "",
    }


def test_limit_counts_only_pending_items(tmp_path, monkeypatch):
    """A bounded run must advance the queue by `limit` pending items.

    Regression: the scope was sliced before the pending filter, so a day whose
    newest items were already translated consumed the whole budget and every
    run translated nothing.
    """
    # 20 already-translated items from today, then 5 pending from yesterday.
    items = [_item(i, "2026-08-20", True) for i in range(20)]
    items += [_item(100 + i, "2026-08-19", False) for i in range(5)]
    path = tmp_path / "daily.json"
    path.write_text(json.dumps(_daily(items)), encoding="utf-8")

    seen = []

    def fake_translate_batch(rows, target):
        seen.extend(row["id"] for row in rows)
        return {row["id"]: {"title": "译标题", "summary": "译摘要"} for row in rows}

    monkeypatch.setattr(translate, "translate_batch", fake_translate_batch)

    changed = translate.translate_file(path, limit=20, batch_size=8)

    assert seen == [f"item-{100 + i}" for i in range(5)], "pending items must be picked up"
    assert changed == 10, "5 items x (title_zh + summary_zh)"
    written = json.loads(path.read_text(encoding="utf-8"))
    assert all(i["summary_zh"] for i in written["items"]), "no item left untranslated"


def test_today_is_translated_before_the_backlog(tmp_path, monkeypatch):
    """Today's items outrank older ones inside one bounded run."""
    items = [_item(1, "2026-08-14", False), _item(2, "2026-08-20", False)]
    path = tmp_path / "daily.json"
    path.write_text(json.dumps(_daily(items)), encoding="utf-8")

    seen = []

    def fake_translate_batch(rows, target):
        seen.extend(row["id"] for row in rows)
        return {row["id"]: {"title": "译标题", "summary": "译摘要"} for row in rows}

    monkeypatch.setattr(translate, "translate_batch", fake_translate_batch)
    translate.translate_file(path, limit=1, batch_size=8)

    assert seen == ["item-2"], "today's item must be translated first"


def test_ordered_scope_keeps_every_item_once():
    """Items with identical field values must not collapse into one another."""
    twin_a = {"id": "a", "title": "Same", "published": "2026-08-14T08:00:00Z"}
    twin_b = {"id": "b", "title": "Same", "published": "2026-08-14T08:00:00Z"}
    twin_b["title"] = "Same"
    items = [twin_a, twin_b, {"id": "c", "published": "2026-08-20T08:00:00Z"}]
    data = _daily(items)

    from pathlib import Path

    ordered = translate._ordered_scope(Path("daily.json"), data, items)

    assert len(ordered) == 3
    assert ordered[0]["id"] == "c", "today first"
    assert {i["id"] for i in ordered} == {"a", "b", "c"}


def test_the_budget_stops_translation_and_keeps_finished_batches(tmp_path, monkeypatch):
    path = tmp_path / "daily.json"
    path.write_text(json.dumps({"items": [
        {"id": f"i{n}", "title": f"Item {n}", "summary": "Prose.", "published": "2026-08-20T00:00:00Z"}
        for n in range(6)
    ]}))
    calls = []

    def fake_batch(rows, target):
        calls.append(len(rows))
        return {row["id"]: {"id": row["id"], "title": "标题", "summary": "摘要"} for row in rows}

    monkeypatch.setattr(translate, "translate_batch", fake_batch)
    monkeypatch.setattr(translate, "TRANSLATE_BUDGET_SECONDS", 30)
    monkeypatch.setattr(translate, "_STARTED_AT", 0.0)
    ticks = iter([0.0])
    monkeypatch.setattr(translate.time, "monotonic", lambda: next(ticks, 999.0))

    translate.translate_file(path, limit=None, batch_size=2)

    assert calls == [2]
    saved = json.loads(path.read_text())["items"]
    assert sum(1 for item in saved if item.get("title_zh")) == 2


def test_an_item_in_two_files_is_translated_once(tmp_path, monkeypatch):
    """translate is invoked with daily.json and a group file, which overlap heavily.

    Each file holds its own dict for a shared item, so without the cache the same
    item is sent to the model once per file in a single run.
    """
    item = _item(1, "2026-08-20", False)
    daily = tmp_path / "daily.json"
    group = tmp_path / "medium.json"
    for path in (daily, group):
        path.write_text(json.dumps(_daily([dict(item)])), encoding="utf-8")
    calls = []

    def fake_translate_batch(rows, target):
        calls.append([row["id"] for row in rows])
        return {row["id"]: {"title": "译标题", "summary": "译摘要"} for row in rows}

    monkeypatch.setattr(translate, "translate_batch", fake_translate_batch)

    assert translate.translate_file(daily, limit=None, batch_size=8) == 2
    assert translate.translate_file(group, limit=None, batch_size=8) == 2

    # One request total, not one per file.
    assert calls == [["item-1"]]
    for path in (daily, group):
        saved = json.loads(path.read_text(encoding="utf-8"))["items"][0]
        assert saved["title_zh"] == "译标题"
        assert saved["summary_zh"] == "译摘要"
