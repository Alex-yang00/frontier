"""Classify Forager items with an OpenAI-compatible LLM endpoint.

The script is intentionally separate from collection and translation so a
failed or expensive LLM call never prevents raw data from being stored.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

from core.scoring import rank_items
from core.storage import read_json, write_json


ALLOWED_SECTIONS = {"tech", "investment", "tips"}
ALLOWED_IMPACTS = {"critical", "high", "medium", "low"}


def classify_batch(items: list[dict]) -> list[dict]:
    key = os.environ.get("FORAGER_TRANSLATION_API_KEY") or os.environ.get("NOVITA_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError("translation/classification API key is not set")
    endpoint = os.environ.get("FORAGER_TRANSLATION_ENDPOINT", "https://api.novita.ai/openai/v1/chat/completions").rstrip("/")
    if endpoint.endswith("/v1"):
        endpoint = f"{endpoint}/chat/completions"
    model = os.environ.get("FORAGER_TRANSLATION_MODEL", "deepseek/deepseek-v4-flash-0731")
    compact = [{"id": item.get("id"), "title": item.get("title", ""), "summary": item.get("summary", ""), "source": item.get("source_name", "")} for item in items]
    prompt = """Classify each AI information item. Return ONLY a JSON array, one object per input, with exactly these fields: id, relevance, section, impact. relevance is a number from 0 to 1 measuring usefulness to an AI intelligence feed. section must be tech, investment, or tips. impact must be critical, high, medium, or low. Reject memes, generic opinions, duplicate-like items, and non-AI noise with relevance below 0.35. Investment requires a real funding, acquisition, valuation, or market event. Tips requires a practical tutorial or workflow. Keep the input order.\n\nINPUT:\n""" + json.dumps(compact, ensure_ascii=False)
    payload = {"model": model, "temperature": 0, "messages": [{"role": "system", "content": "You are a strict AI news editor."}, {"role": "user", "content": prompt}]}
    request = Request(endpoint, data=json.dumps(payload).encode(), headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, method="POST")
    with urlopen(request, timeout=90) as response:
        content = json.load(response)["choices"][0]["message"]["content"].strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    parsed = json.loads(content)
    if isinstance(parsed, dict):
        parsed = parsed.get("items", [])
    if not isinstance(parsed, list):
        raise ValueError("classifier did not return a JSON array")
    return parsed


def enrich_file(path: Path, limit: int | None, batch_size: int) -> int:
    data = read_json(path, {}) or {}
    items = data.get("items", [])
    selected = items[:limit] if limit is not None else items
    changed = 0
    for start in range(0, len(selected), batch_size):
        batch = selected[start : start + batch_size]
        for result in classify_batch(batch):
            item = next((value for value in batch if value.get("id") == result.get("id")), None)
            if item is None:
                continue
            try:
                relevance = max(0.0, min(1.0, float(result.get("relevance", 0))))
            except (TypeError, ValueError):
                continue
            section = result.get("section") if result.get("section") in ALLOWED_SECTIONS else "tech"
            impact = result.get("impact") if result.get("impact") in ALLOWED_IMPACTS else "medium"
            item.update({"relevance": relevance, "section": section, "impact": impact, "classification_source": "llm"})
            changed += 1
    if changed:
        items = [item for item in items if not (item.get("classification_source") == "llm" and float(item.get("relevance", 0)) < 0.35)]
        data["items"] = rank_items(items)
        write_json(path, data)
    return changed


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="*", type=Path)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=8)
    args = parser.parse_args()
    files = args.files or [Path("data/daily.json")]
    if not (os.environ.get("FORAGER_TRANSLATION_API_KEY") or os.environ.get("NOVITA_API_KEY") or os.environ.get("OPENROUTER_API_KEY")):
        print("classification skipped: translation/classification API key is not set")
    else:
        print(f"classified {sum(enrich_file(path, args.limit, args.batch_size) for path in files if path.exists())} items")
