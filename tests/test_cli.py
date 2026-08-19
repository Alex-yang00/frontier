import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

from cli import frontier


def test_read_source_accepts_local_directory(tmp_path, monkeypatch):
    expected = {"items": [{"id": "local-item"}]}
    (tmp_path / "daily.json").write_text(json.dumps(expected), encoding="utf-8")
    monkeypatch.setattr(frontier, "DEFAULT_BASE", str(tmp_path))

    assert frontier.read_source("daily.json") == expected


def test_load_caches_local_source(tmp_path, monkeypatch):
    source = tmp_path / "source"
    cache = tmp_path / "cache"
    source.mkdir()
    (source / "meta.json").write_text('{"ok": true}', encoding="utf-8")
    monkeypatch.setattr(frontier, "DEFAULT_BASE", str(source))
    monkeypatch.setattr(frontier, "CACHE_DIR", cache)

    assert frontier.load("meta.json", ttl=0) == {"ok": True}
    assert json.loads((cache / "meta.json").read_text(encoding="utf-8")) == {"ok": True}


def test_read_source_sends_frontier_user_agent(monkeypatch):
    seen = {}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            seen["user_agent"] = self.headers.get("User-Agent")
            payload = b'{"items": []}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def log_message(self, *_args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    Thread(target=server.serve_forever, daemon=True).start()
    monkeypatch.setattr(frontier, "DEFAULT_BASE", f"http://127.0.0.1:{server.server_port}")
    try:
        assert frontier.read_source("daily.json") == {"items": []}
        assert seen["user_agent"].startswith("frontier-cli/")
    finally:
        server.shutdown()
