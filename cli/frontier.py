from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen


REPO_DATA_DIR = Path(__file__).resolve().parents[1] / "web" / "public" / "data"
DEFAULT_BASE = os.environ.get("FRONTIER_DATA_URL", str(REPO_DATA_DIR)).rstrip("/")
CACHE_DIR = Path(os.environ.get("FRONTIER_CACHE_DIR", Path.home() / ".cache" / "frontier"))


def read_source(name: str) -> dict:
    scheme = urlparse(DEFAULT_BASE).scheme
    if scheme in {"http", "https", "file"}:
        with urlopen(f"{DEFAULT_BASE}/{name}", timeout=15) as response:
            return json.load(response)
    return json.loads((Path(DEFAULT_BASE).expanduser() / name).read_text(encoding="utf-8"))


def load(name: str, ttl: int = 600) -> dict:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    target = CACHE_DIR / name
    if target.exists() and time.time() - target.stat().st_mtime < ttl:
        return json.loads(target.read_text(encoding="utf-8"))
    try:
        value = read_source(name)
        target.parent.mkdir(parents=True, exist_ok=True); target.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
        return value
    except Exception as error:
        if target.exists():
            value = json.loads(target.read_text(encoding="utf-8")); print(f"offline · cached {name}", file=sys.stderr); return value
        raise RuntimeError(f"Could not load {name}: {error}") from error


def item_text(item: dict, lang: str) -> str:
    if lang == "zh":
        return item.get("title_zh") or item.get("title") or ""
    return item.get("title_en") or item.get("title") or ""


def print_items(items: list[dict], lang: str = "en") -> None:
    for item in items:
        metrics = []
        if item.get("points") is not None: metrics.append(f"{item['points']}pt")
        if item.get("comments") is not None: metrics.append(f"{item['comments']}c")
        print(f"{item.get('published', '')[11:16]}  {item.get('source_name', item.get('source', '')):<22}  {item_text(item, lang)}")
        print(f"       {item.get('url', '')}  {' · '.join(metrics)}")


def main() -> None:
    parser = argparse.ArgumentParser(prog="frontier")
    parser.add_argument("command", choices=["today", "hot", "search", "sync", "status"])
    parser.add_argument("query", nargs="?")
    parser.add_argument("--lang", choices=["en", "zh"], default="en")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    if args.command == "today": data = load("daily.json", 600); items = data.get("items", [])
    elif args.command == "hot": data = load("hot.json", 30); items = data.get("items", [])
    elif args.command == "status":
        print(json.dumps(load("meta.json", 30), ensure_ascii=False, indent=2)); return
    elif args.command == "sync":
        for name in ("daily.json", "hot.json", "medium.json", "meta.json"): load(name, 0)
        print(f"synced to {CACHE_DIR}"); return
    else:
        data = load("daily.json", 600); query = (args.query or "").lower(); items = [item for item in data.get("items", []) if query in json.dumps(item, ensure_ascii=False).lower()]
    if args.json: print(json.dumps(items, ensure_ascii=False, indent=2))
    else: print_items(items, args.lang)


if __name__ == "__main__":
    main()
