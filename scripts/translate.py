"""Populate Frontier English/Chinese title and summary fields.

Batched on purpose. An earlier version issued one request per field per item,
which is 4 calls per item and ~1200 for a 300-item file; at a 45s timeout that
never finished inside a workflow, and the committed sample data ended up with
Chinese on 3 of 300 items. Items are sent in groups and matched back by id.
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

from core.llm import api_key, complete, parse_json_array
from core.storage import read_json, write_json

# Same guard as enrich: this script writes the file only after every batch, so a
# job timeout throws the whole run away along with the commit and publish steps.
# Stopping early keeps what is finished; the pending filter re-queues the rest.
TRANSLATE_BUDGET_SECONDS = int(os.environ.get("FRONTIER_TRANSLATE_BUDGET_SECONDS", "0") or 0)
_STARTED_AT = time.monotonic()


# Translations from this process, keyed by (id, target). The same two-file overlap
# enrich has applies here, and each file holds its own dict for a shared item, so
# without this the same item is translated once per file in one run.
_TRANSLATION_CACHE: dict[tuple[str, str], dict] = {}


def _budget_exhausted() -> bool:
    return bool(TRANSLATE_BUDGET_SECONDS) and time.monotonic() - _STARTED_AT >= TRANSLATE_BUDGET_SECONDS


TARGETS = {"en": "English", "zh": "Simplified Chinese"}

# The web client renders at most ~360 characters of summary (see
# compactSummary in web/lib/frontier-adapter.ts), but raw abstracts run to a
# measured 23,861 characters. Translating them whole made a 6-item batch ship
# ~38k characters and ask for as much back, which closed the connection before
# any reply arrived. Clipping to a little over what is displayed keeps the
# request small and loses nothing a reader would see.
SOURCE_CLIP = 420


def clip_source(text: str) -> str:
    value = " ".join((text or "").split())
    if len(value) <= SOURCE_CLIP:
        return value
    cut = value.rfind(" ", 0, SOURCE_CLIP)
    return value[: cut if cut > SOURCE_CLIP // 2 else SOURCE_CLIP].rstrip()


def translate_batch(rows: list[dict], target: str) -> dict[str, dict]:
    """Translate a batch of {id,title,summary} into `target`, keyed by id."""
    prompt = (
        f"Translate each item's title and summary into {TARGETS[target]}. "
        "Return ONLY a JSON array, one object per input, with exactly these fields: "
        "id, title, summary. Translate faithfully and keep proper nouns, product "
        "names and numbers unchanged. If an input summary is empty, return an empty "
        "string for it. Keep the input order.\n\nINPUT:\n"
        + json.dumps(rows, ensure_ascii=False)
    )
    # Every zh batch of run 32341638589 came back empty or truncated at the shared
    # 4096 default, which this model's reasoning tokens can exhaust on their own
    # before any translation is emitted. A 12-item batch needs roughly 1500 tokens
    # of reply; the ceiling has to cover reasoning as well.
    results = parse_json_array(
        complete(
            prompt,
            "You translate technical AI news precisely.",
            timeout=120,
            max_tokens=16384,
        )
    )
    out: dict[str, dict] = {}
    for entry in results:
        if isinstance(entry, dict) and entry.get("id"):
            out[str(entry["id"])] = entry
    return out


def _pending(item: dict, target: str) -> bool:
    if not item.get(f"title_{target}"):
        return True
    return bool(item.get("summary")) and not item.get(f"summary_{target}")


def _apply_translation(item: dict, entry: dict, target: str) -> int:
    """Fill the target-language fields this item is still missing. Returns the count."""
    title = str(entry.get("title") or "").strip()
    summary = str(entry.get("summary") or "").strip()
    filled = 0
    if title and not item.get(f"title_{target}"):
        item[f"title_{target}"] = title
        filled += 1
    if summary and item.get("summary") and not item.get(f"summary_{target}"):
        item[f"summary_{target}"] = summary
        filled += 1
    return filled


def _ordered_scope(path: Path, data: dict, items: list[dict]) -> list[dict]:
    """Order today's items first so a bounded run always advances the homepage."""
    if path.name != "daily.json" or not data.get("date"):
        return items
    current_day = str(data["date"])
    current = [item for item in items if str(item.get("published", "")).startswith(current_day)]
    # Identity, not equality: two distinct items can carry equal field values,
    # and dict __eq__ over the whole file is quadratic.
    current_ids = {id(item) for item in current}
    older = [item for item in items if id(item) not in current_ids]
    return current + older


def translate_file(path: Path, limit: int | None = None, batch_size: int = 12) -> int:
    data = read_json(path, {}) or {}
    items = data.get("items", [])
    ordered = _ordered_scope(path, data, items)
    changed = 0

    for target in TARGETS:
        # Filter before applying the limit. Slicing first let already-translated
        # items consume the whole budget, so a small --limit stalled the queue
        # at zero progress per run instead of translating `limit` new items.
        todo = [item for item in ordered if _pending(item, target)]
        # Apply anything the other file in this run already paid for.
        cached = [item for item in todo if (str(item.get("id")), target) in _TRANSLATION_CACHE]
        for item in cached:
            changed += _apply_translation(item, _TRANSLATION_CACHE[(str(item.get("id")), target)], target)
        if cached:
            print(f"  reused {len(cached)} {target} translation(s) from earlier in this run")
            todo = [item for item in todo if _pending(item, target)]
        if limit is not None:
            todo = todo[:limit]
        if target == "en":
            # Collection titles and summaries are canonical English unless the
            # source explicitly declares another language. Do not spend an LLM
            # request translating English into English.
            for item in todo:
                if not item.get("title_en") and item.get("title"):
                    item["title_en"] = item["title"]
                    changed += 1
                if item.get("summary") and not item.get("summary_en"):
                    item["summary_en"] = item["summary"]
                    changed += 1
            continue
        for start in range(0, len(todo), batch_size):
            if _budget_exhausted():
                print(f"  budget reached; stopping {target} at {start} of {len(todo)}")
                break
            batch = todo[start : start + batch_size]
            # Items already in the target language need no model call.
            passthrough = [item for item in batch if item.get("lang") == target]
            for item in passthrough:
                if not item.get(f"title_{target}") and item.get("title"):
                    item[f"title_{target}"] = item["title"]
                    changed += 1
                if item.get("summary") and not item.get(f"summary_{target}"):
                    item[f"summary_{target}"] = item["summary"]
                    changed += 1

            remaining = [item for item in batch if item.get("lang") != target]
            if not remaining:
                continue
            rows = [
                {"id": item.get("id"), "title": item.get("title", ""), "summary": clip_source(item.get("summary", ""))}
                for item in remaining
            ]
            try:
                translated = translate_batch(rows, target)
            except Exception as error:
                # One bad batch must not cost the whole file; the next run retries
                # whatever is still missing because _pending() drives the queue.
                print(f"  batch failed ({target}): {error}")
                # Providers occasionally truncate a multi-row JSON response.
                # Retry the small visible batch item-by-item so one malformed
                # response cannot erase translation coverage for the homepage.
                translated = {}
                for row in rows:
                    try:
                        translated.update(translate_batch([row], target))
                    except Exception as item_error:
                        print(f"  item failed ({target}/{row.get('id')}): {item_error}")
                if not translated:
                    continue
            missing_rows = [row for row in rows if str(row.get("id")) not in translated]
            for row in missing_rows:
                try:
                    translated.update(translate_batch([row], target))
                except Exception as item_error:
                    print(f"  item failed ({target}/{row.get('id')}): {item_error}")
            for item in remaining:
                entry = translated.get(str(item.get("id")))
                if not entry:
                    continue
                filled = _apply_translation(item, entry, target)
                if filled:
                    _TRANSLATION_CACHE[(str(item.get("id")), target)] = entry
                    changed += filled

    if changed:
        write_json(path, data)
    return changed


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Populate Frontier English/Chinese translation fields")
    parser.add_argument("files", nargs="*", type=Path)
    parser.add_argument("--limit", type=int, default=None, help="Translate only the first N items per file")
    parser.add_argument("--batch-size", type=int, default=12)
    args = parser.parse_args()
    files = args.files or [Path("data/daily.json"), Path("data/hot.json")]
    if not api_key():
        print("translation skipped: translation API key is not set")
    else:
        print(f"translated {sum(translate_file(path, args.limit, args.batch_size) for path in files if path.exists())} fields")
