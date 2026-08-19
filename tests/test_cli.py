import json

from cli import forager


def test_read_source_accepts_local_directory(tmp_path, monkeypatch):
    expected = {"items": [{"id": "local-item"}]}
    (tmp_path / "daily.json").write_text(json.dumps(expected), encoding="utf-8")
    monkeypatch.setattr(forager, "DEFAULT_BASE", str(tmp_path))

    assert forager.read_source("daily.json") == expected


def test_load_caches_local_source(tmp_path, monkeypatch):
    source = tmp_path / "source"
    cache = tmp_path / "cache"
    source.mkdir()
    (source / "meta.json").write_text('{"ok": true}', encoding="utf-8")
    monkeypatch.setattr(forager, "DEFAULT_BASE", str(source))
    monkeypatch.setattr(forager, "CACHE_DIR", cache)

    assert forager.load("meta.json", ttl=0) == {"ok": True}
    assert json.loads((cache / "meta.json").read_text(encoding="utf-8")) == {"ok": True}
