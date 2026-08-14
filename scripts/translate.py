from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

from core.storage import read_json, write_json


def translate_text(text: str, target: str) -> str:
    key = os.environ.get("NOVITA_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
    if not key or not text:
        return ""
    payload = {"model": os.environ.get("FORAGER_TRANSLATION_MODEL", "deepseek/deepseek-v3.2"), "messages": [{"role": "system", "content": "Translate faithfully. Return only the translation."}, {"role": "user", "content": f"Translate to {target}:\n{text}"}]}
    request = Request("https://api.novita.ai/openai/v1/chat/completions", data=json.dumps(payload).encode(), headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, method="POST")
    with urlopen(request, timeout=45) as response:
        return json.load(response)["choices"][0]["message"]["content"].strip()


def translate_file(path: Path) -> int:
    data = read_json(path, {}) or {}; changed = 0
    for item in data.get("items", []):
        if not item.get("title_en"):
            value = item.get("title", "") if item.get("lang") == "en" else translate_text(item.get("title", ""), "English")
            if value: item["title_en"] = value; changed += 1
        if not item.get("title_zh"):
            value = item.get("title", "") if item.get("lang") == "zh" else translate_text(item.get("title", ""), "Simplified Chinese")
            if value: item["title_zh"] = value; changed += 1
        if item.get("summary") and not item.get("summary_en"):
            value = item["summary"] if item.get("lang") == "en" else translate_text(item["summary"], "English")
            if value: item["summary_en"] = value; changed += 1
        if item.get("summary") and not item.get("summary_zh"):
            value = item["summary"] if item.get("lang") == "zh" else translate_text(item["summary"], "Simplified Chinese")
            if value: item["summary_zh"] = value; changed += 1
    if changed: write_json(path, data)
    return changed


if __name__ == "__main__":
    import sys
    files = [Path(arg) for arg in sys.argv[1:]] or [Path("data/daily.json"), Path("data/hot.json")]
    if not (os.environ.get("NOVITA_API_KEY") or os.environ.get("OPENROUTER_API_KEY")):
        print("translation skipped: NOVITA_API_KEY/OPENROUTER_API_KEY is not set")
    else:
        print(f"translated {sum(translate_file(path) for path in files if path.exists())} fields")
