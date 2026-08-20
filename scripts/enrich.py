"""Classify Frontier items with an OpenAI-compatible LLM endpoint.

The script is intentionally separate from collection and translation so a
failed or expensive LLM call never prevents raw data from being stored.
"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path

from core.llm import api_key, complete, parse_json_array, parse_json_object
from core.curation import (
    CURATION_LIMITS,
    curated_candidates,
    deduplicated_selection,
    fallback_curated_ids,
    validated_event_groups,
)
from core.scoring import rank_items
from core.storage import read_json, write_json


ALLOWED_SECTIONS = {"tech", "investment", "tips"}
ALLOWED_IMPACTS = {"critical", "high", "medium", "low"}
THROUGHLINE_LANGS = {"en": "English", "zh": "Simplified Chinese"}
# Enough items to spot a pattern without paying to send the whole section.
THROUGHLINE_SAMPLE = 12


def _clip(text: str, limit: int = 300) -> str:
    value = " ".join((text or "").split())
    return value[:limit]


# The classifier already reads every item, so the editorial fields ride along on
# the same request rather than paying for a second pass. Raised from 300: the
# model has to write a standalone summary now, not just judge relevance, and the
# reference feed feeds its editor 500 characters for the same job.
CLASSIFY_CLIP = 500

# Bounds on the rewritten summary. The homepage clamps its deck at 260, and the
# reference feed's own items measure 181-439 (median 299), so a 2-3 sentence
# instruction lands inside the deck without the "..." that raw feed prose earns:
# 110 of 149 English summaries exceeded the clamp and were cut mid-sentence.
SUMMARY_SENTENCES = "2-3 sentences, at most 260 characters"
TAGS_PER_ITEM = (3, 4)


def classify_batch(items: list[dict]) -> list[dict]:
    compact = [
        {"id": item.get("id"), "title": item.get("title", ""), "summary": _clip(item.get("summary", ""), CLASSIFY_CLIP), "source": item.get("source_name", "")}
        for item in items
    ]
    prompt = (
        "Classify and edit each AI information item. Return ONLY a JSON array, one "
        "object per input, with exactly these fields: id, relevance, section, impact, "
        "summary, tags, tags_zh, category, category_zh.\n"
        "- relevance is a number from 0 to 1 measuring usefulness to an AI intelligence feed.\n"
        "- section must be tech, investment, or tips.\n"
        "- impact must be critical, high, medium, or low.\n"
        f"- summary: rewrite the item as {SUMMARY_SENTENCES}. Lead with what happened, "
        "then why it matters. Include concrete numbers, model names and company names "
        "when the input has them. It must stand alone without the headline, and must "
        "not end mid-sentence. No hype, no marketing language, no rhetorical questions. "
        "Write it in English.\n"
        f"- tags: {TAGS_PER_ITEM[0]}-{TAGS_PER_ITEM[1]} specific tags naming the actual "
        "entities and topics in this item -- companies, models, techniques, domains "
        "(e.g. \"OpenAI\", \"Inference\", \"Cybersecurity\"). Title Case. Do not emit "
        "generic feed labels like \"industry\", \"community\" or \"official\".\n"
        "- tags_zh: the same tags in Simplified Chinese, same count and order. Keep "
        "company, product and model names in their original form (OpenAI, GPT-5, "
        "Llama); translate the topic words.\n"
        "- category: a short topical label for the item (e.g. \"AI Infrastructure\").\n"
        "- category_zh: that label in Simplified Chinese.\n"
        "Reject memes, generic opinions, duplicate-like items, and non-AI noise with "
        "relevance below 0.35. Investment requires a real funding, acquisition, valuation, "
        "or market event. Tips requires a practical tutorial or workflow. Keep the input "
        "order.\n\nINPUT:\n"
        + json.dumps(compact, ensure_ascii=False)
    )
    # 120s, matching translate: the reply now carries a written summary per item
    # (~115 output tokens vs ~30 for bare classification), and a timeout discards
    # the whole batch rather than degrading it.
    return parse_json_array(complete(prompt, "You are a strict AI news editor.", timeout=120))


def throughline_for_section(section: str, items: list[dict]) -> dict[str, str]:
    """One paragraph on why a section's items hang together, per language.

    The rail treats this as the one thing the feed structurally cannot say. The
    design wraps a single clause in <em> for the accent underline, so the model
    is asked for exactly one; the web layer must render it as markup, which is
    why nothing else in the string may contain angle brackets.
    """
    sample = [
        {"title": item.get("title", ""), "summary": _clip(item.get("summary", ""), 200), "source": item.get("source_name", "")}
        for item in items[:THROUGHLINE_SAMPLE]
    ]
    out: dict[str, str] = {}
    for code, name in THROUGHLINE_LANGS.items():
        prompt = (
            f"These are the highest-ranked items in the '{section}' section of an AI "
            f"intelligence digest. Write a compact section briefing in {name}: in 2 "
            f"sentences, first synthesize the most important developments or direction "
            f"visible across the items, then explain why that movement matters to an AI "
            f"reader. Prefer concrete subjects, products, organisations, and actions "
            f"that are actually present in the items. Do not call it 'today' or imply a "
            f"single-day window. Do not merely restate the section name, list or number "
            f"items, use generic filler, or invent facts. Wrap the key phrase that names "
            f"the development in <em>...</em> — exactly one pair, and no other HTML. "
            f"Return ONLY a JSON object of the form {{\"throughline\": \"...\"}}.\n\nITEMS:\n"
            + json.dumps(sample, ensure_ascii=False)
        )
        try:
            text = str(parse_json_object(complete(prompt, "You are a concise editorial writer.", timeout=90)).get("throughline") or "").strip()
        except Exception as error:
            print(f"  throughline failed ({section}/{code}): {error}")
            continue
        # A stray tag would be injected as markup by the rail, so reject anything
        # carrying angle brackets beyond the single <em> pair that was asked for.
        if text.count("<em>") != 1 or text.count("</em>") != 1:
            print(f"  throughline rejected ({section}/{code}): expected exactly one <em> pair")
            continue
        if text.replace("<em>", "").replace("</em>", "").count("<") or text.replace("<em>", "").replace("</em>", "").count(">"):
            print(f"  throughline rejected ({section}/{code}): unexpected markup")
            continue
        out[code] = text
    return out


def verify_and_fuse_event_group(group: dict, candidates: list[dict]) -> dict | None:
    """Independently verify a proposed cluster and fuse only shared event facts."""
    by_id = {str(item.get("id")): item for item in candidates}
    members = [by_id[value] for value in group.get("member_ids", []) if value in by_id]
    if len(members) < 2:
        return None
    compact = [
        {
            "id": item.get("id"),
            "title": item.get("title", ""),
            "summary": _clip(item.get("summary", ""), 500),
            "source": item.get("source_name", ""),
            "source_key": item.get("source", ""),
            "published": item.get("published", ""),
        }
        for item in members
    ]
    prompt = (
        "Independently audit this proposed duplicate-news group. Keep together only items whose "
        "primary subject is the same concrete announcement or occurrence. An item that merely "
        "mentions the event as background must be excluded. Same company, product family, or broad "
        "topic is not sufficient. Return same_event=false if fewer than two items remain. If an "
        "official primary source is among the retained items, it MUST be canonical_id. Otherwise "
        "choose the most authoritative and complete report. For a valid group, write a short, "
        "specific event_anchor and factual summaries in English and Simplified Chinese. Add only "
        "facts stated in the retained items; preserve uncertainty and conflicting claims. Return "
        "ONLY JSON with: same_event, canonical_id, member_ids, event_anchor, reason, summary_en, "
        "summary_zh.\n\nPROPOSED ITEMS:\n"
        + json.dumps(compact, ensure_ascii=False)
    )
    response = parse_json_object(
        complete(prompt, "You are a conservative duplicate-news auditor.", timeout=90)
    )
    if response.get("same_event") is not True:
        return None
    checked = validated_event_groups([response], members)
    if not checked:
        return None
    refined = checked[0]
    refined["event_anchor"] = str(response.get("event_anchor") or "").strip()[:200]
    return refined


def add_throughlines(data: dict) -> int:
    """Write per-section throughline prose into the file's top-level metadata."""
    items = data.get("items", [])
    by_id = {str(item.get("id")): item for item in items}
    curated = data.get("curated_ids") if isinstance(data.get("curated_ids"), dict) else {}
    by_section: dict[str, list[dict]] = {}
    for section in ALLOWED_SECTIONS:
        selected = [by_id[value] for value in curated.get(section, []) if value in by_id]
        by_section[section] = selected or curated_candidates(items, section)
    result: dict[str, dict[str, str]] = {}
    for section, section_items in by_section.items():
        text = throughline_for_section(section, section_items)
        if text:
            result[section] = {**text, "count": len(section_items)}
    if result:
        data["throughlines"] = result
    return len(result)


def add_daily_throughlines(data: dict) -> int:
    """Write AI briefings for the file's current publication date only."""
    date = str(data.get("date") or "")[:10]
    if not date:
        return 0
    items = [item for item in data.get("items", []) if str(item.get("published") or "")[:10] == date]
    result: dict[str, dict[str, str]] = {}
    for section in ALLOWED_SECTIONS:
        section_items = [item for item in items if (item.get("section") or "tech") == section]
        if not section_items:
            continue
        text = throughline_for_section(section, section_items)
        if text:
            result[section] = {**text, "count": len(section_items)}
    if result:
        daily = data.get("daily_throughlines") if isinstance(data.get("daily_throughlines"), dict) else {}
        daily[date] = result
        data["daily_throughlines"] = daily
    return len(result)


def add_curation(data: dict) -> int:
    """Ask the editor model for DataCube-style fixed-size section shortlists."""
    items = data.get("items", [])
    fallback = fallback_curated_ids(items)
    existing = data.get("curated_ids") if isinstance(data.get("curated_ids"), dict) else {}
    existing_clusters = data.get("event_clusters") if isinstance(data.get("event_clusters"), list) else []
    result: dict[str, list[str]] = {}
    clusters: list[dict] = []
    for section, count in CURATION_LIMITS.items():
        candidates = curated_candidates(items, section)
        candidate_limit = 20 if section == "videos" else 40
        compact = [
            {
                "id": item.get("id"),
                "title": item.get("title", ""),
                "summary": _clip(item.get("summary", ""), 220),
                "source": item.get("source_name", ""),
                "published": item.get("published", ""),
                "relevance": item.get("relevance"),
                "impact": item.get("impact"),
                "views": item.get("video_view_count") if section == "videos" else None,
            }
            for item in candidates[:candidate_limit]
        ]
        if not compact:
            result[section] = []
            continue
        quantity = (
            f"Select exactly {min(count, len(compact))} items."
            if section == "videos"
            else f"Select up to {count} items; fewer is fine when the pool is thin."
        )
        event_instructions = ""
        if section != "videos":
            event_instructions = (
                " Also identify strict same-event duplicates. Two items are duplicates only when "
                "they cover the same concrete announcement or occurrence; sharing a company or topic "
                "is not enough. For each suspected duplicate event return one event_groups entry with "
                "canonical_id, member_ids, and reason. Omit singleton groups. A separate conservative "
                "audit will verify every proposed group."
            )
        section_gate = {
            "investment": " Investment items must describe a real funding, acquisition, valuation, IPO, or public-market event.",
            "tips": " Tips must contain an actionable method, tutorial, reproducible workflow, or concrete practice.",
        }.get(section, "")
        prompt = (
            f"{quantity} Choose the most important and useful items for the "
            f"'{section}' section of a concise AI intelligence briefing. "
            "Balance importance with freshness and source diversity; normally use no more than "
            "30% of the section from one source. Reject marginal, repetitive, sensational, or "
            "off-topic items. Preserve the desired display order."
            + section_gate
            + event_instructions
            + " Return ONLY JSON in the form "
            + '{"ids": ["exact-input-id"], "event_groups": []}.\n\nCANDIDATES:\n'
            + json.dumps(compact, ensure_ascii=False)
        )
        try:
            response = parse_json_object(
                complete(prompt, "You are a strict briefing editor.", timeout=90)
            )
            proposed_groups = validated_event_groups(response.get("event_groups"), candidates)
            section_groups = []
            for proposed in proposed_groups[:8]:
                try:
                    verified = verify_and_fuse_event_group(proposed, candidates)
                except Exception as error:
                    print(f"  event verification failed ({section}): {error}")
                    continue
                if verified:
                    section_groups.append(verified)
            ids = deduplicated_selection(response.get("ids"), candidates, section_groups, count)
            if section == "videos" and len(ids) < min(count, len(candidates)):
                ids.extend(value for value in fallback[section] if value not in ids)
            result[section] = ids[:count] or fallback[section]
            clusters.extend({**group, "section": section} for group in section_groups)
        except Exception as error:
            print(f"  curation failed ({section}): {error}")
            result[section] = existing.get(section) or fallback[section]
            clusters.extend(group for group in existing_clusters if group.get("section") == section)
    data["curated_ids"] = result
    data["event_clusters"] = clusters

    # Rebuild denormalized display fields from the auditable top-level groups.
    # This also removes stale fusion data when a later run no longer groups an event.
    by_id = {str(item.get("id")): item for item in items}
    for item in items:
        for field in ("event_summary_en", "event_summary_zh", "event_sources"):
            item.pop(field, None)
    selected_ids = {value for values in result.values() for value in values}
    for group in clusters:
        canonical_id = group.get("canonical_id")
        canonical = by_id.get(canonical_id)
        if canonical is None or canonical_id not in selected_ids:
            continue
        sources = [
            {
                "id": member_id,
                "title": by_id[member_id].get("title", ""),
                "url": by_id[member_id].get("url", ""),
                "source_name": by_id[member_id].get("source_name", ""),
                "published": by_id[member_id].get("published", ""),
            }
            for member_id in group.get("member_ids", [])
            if member_id in by_id
        ]
        if len(sources) < 2:
            continue
        canonical["event_sources"] = sources
        for language in ("en", "zh"):
            summary = group.get(f"summary_{language}")
            if summary:
                canonical[f"event_summary_{language}"] = summary
    return sum(len(ids) for ids in result.values())


# Share of a bounded run reserved for videos. They are ~7% of a day file, so a
# plain head-of-queue slice under-serves them badly; a fifth of the budget keeps
# the classifier reaching them without starving the article feed.
VIDEO_BUDGET_SHARE = 0.2


def _select_pending(pending: list[dict], limit: int | None) -> list[dict]:
    """Split a bounded run between articles and videos.

    The day file is written in score-descending order, so `pending[:limit]` is a
    slice off the high-scoring head. Videos used to sit at the tail -- they could
    not earn a view-count score yet -- which meant a bounded run never reached
    them: 1 of 20 videos carried `relevance` against 229 of 280 articles, a
    systematic 15-point llm_bonus deficit. That fed back on itself, since a video
    without relevance keeps the low score that buried it. Reserving a slice
    breaks the loop regardless of where ranking puts videos on any given day.
    """
    if limit is None or len(pending) <= limit:
        return pending
    videos = [item for item in pending if item.get("is_video")]
    articles = [item for item in pending if not item.get("is_video")]
    video_take = min(len(videos), round(limit * VIDEO_BUDGET_SHARE))
    # Hand any unused video budget back rather than shrinking the run.
    article_take = min(len(articles), limit - video_take)
    video_take = min(len(videos), limit - article_take)
    # Keep score order within the run so batches stay topically coherent.
    chosen = {id(item) for item in articles[:article_take] + videos[:video_take]}
    return [item for item in pending if id(item) in chosen]


# Reject an edited summary that is too short to say anything or long enough to be
# clamped again. The point of rewriting was to stop the homepage cutting prose
# mid-sentence; a 900-character reply would just move the cut.
SUMMARY_MIN = 60
# Kept equal to STORY_DECK_LIMIT in web/components/editorial-home.tsx.
SUMMARY_MAX = 320
TAG_MAX_LEN = 28
# Tags the source config already stamps on every item from a feed. The model is
# told not to emit them; this drops them if it does, so a content tag never gets
# crowded out by the label it was meant to replace.
GENERIC_TAGS = {"industry", "community", "official", "video", "youtube", "paper"}


def _editorial_fields(result: dict, item: dict) -> dict:
    """Take the model's summary and tags only when they are usable.

    The originals are real publisher prose. Overwriting them with a malformed or
    truncated reply would be a downgrade, so each field is validated on its own
    and a bad one leaves the existing value untouched.
    """
    out: dict = {}
    summary = " ".join(str(result.get("summary") or "").split())
    if SUMMARY_MIN <= len(summary) <= SUMMARY_MAX and "<" not in summary:
        out["summary_en"] = summary
        # The translator keys off `summary`; leaving the raw feed text there would
        # send the un-edited version to zh and split the two languages.
        out["summary"] = summary
        if summary != " ".join(str(item.get("summary") or "").split()):
            # Any existing zh belongs to the text we just replaced. Clearing it
            # re-queues the item: _pending() in translate.py drives off the
            # missing field, and enrich runs before translate in both workflows
            # that call it, so the new text gets its zh in the same run.
            out["summary_zh"] = ""
    tags = _clean_tags(result.get("tags"))
    if len(tags) >= 2:
        out["tags"] = tags
        # Kept positional: the prompt asks for the same tags in the same order, so
        # a zh list of a different length is a malformed reply and is dropped
        # rather than paired up wrongly. The UI falls back to `tags` when absent.
        tags_zh = _clean_tags(result.get("tags_zh"))
        if len(tags_zh) == len(tags):
            out["tags_zh"] = tags_zh
    category = " ".join(str(result.get("category") or "").split())
    if 2 < len(category) <= 40:
        out["category"] = category
        category_zh = " ".join(str(result.get("category_zh") or "").split())
        if 2 < len(category_zh) <= 40:
            out["category_zh"] = category_zh
    return out


def _clean_tags(value: object) -> list[str]:
    tags = [" ".join(str(tag).split()) for tag in (value or []) if isinstance(tag, str)]
    tags = [tag for tag in tags if 1 < len(tag) <= TAG_MAX_LEN and tag.lower() not in GENERIC_TAGS]
    seen: set[str] = set()
    unique = [tag for tag in tags if not (tag.lower() in seen or seen.add(tag.lower()))]
    return unique[:4]


# Bumping this re-queues every already-classified item for one more pass, so the
# standing file picks up fields added after it was first enriched. Bump it only
# for a change worth re-spending the whole file's tokens on.
EDITORIAL_VERSION = 1


def _is_enriched(item: dict) -> bool:
    return (
        item.get("classification_source") == "llm"
        and int(item.get("editorial_version") or 0) >= EDITORIAL_VERSION
    )


# A job timeout kills the steps that commit and publish, so every LLM call in
# that run is thrown away -- the per-batch checkpoint below writes to the runner's
# scratch dir, which dies with it. Stopping early instead keeps a partial run
# worth something, and the resume filter means the rest is picked up next time.
ENRICH_BUDGET_SECONDS = int(os.environ.get("FRONTIER_ENRICH_BUDGET_SECONDS", "0") or 0)
# Measured from import, not from each call: enrich_file runs once per file on the
# command line, and a per-call budget would let two files spend it twice.
_STARTED_AT = time.monotonic()


def _budget_exhausted() -> bool:
    return bool(ENRICH_BUDGET_SECONDS) and time.monotonic() - _STARTED_AT >= ENRICH_BUDGET_SECONDS


def enrich_file(path: Path, limit: int | None, batch_size: int) -> int:
    data = read_json(path, {}) or {}
    items = data.get("items", [])
    # Resume: an item already carrying llm provenance was classified by an
    # earlier run, so a re-run after a partial failure only pays for the rest.
    # The version gate re-opens items classified before the editorial fields
    # existed -- without it the whole standing file keeps its raw feed prose
    # forever, since provenance alone marks them done.
    pending = [item for item in items if not _is_enriched(item)]
    selected = _select_pending(pending, limit)
    changed = 0
    for start in range(0, len(selected), batch_size):
        if _budget_exhausted():
            print(f"  budget reached; stopping at {start} of {len(selected)}")
            break
        batch = selected[start : start + batch_size]
        try:
            results = classify_batch(batch)
        except Exception as error:
            # A single bad batch used to abort the run and discard every batch
            # before it, because the file is written only at the end. Skipping
            # leaves those items unclassified, which the next run picks up.
            print(f"  batch failed at {start}: {error}")
            continue
        for result in results:
            item = next((value for value in batch if value.get("id") == result.get("id")), None)
            if item is None:
                continue
            try:
                relevance = max(0.0, min(1.0, float(result.get("relevance", 0))))
            except (TypeError, ValueError):
                continue
            # An unusable section used to fall back to "tech", which quietly filed
            # every unparsed reply under one heading. Leaving the field alone lets
            # the keyword pass in rank_items() decide instead of asserting a wrong
            # answer with llm provenance attached.
            update = {"relevance": relevance, "classification_source": "llm", "editorial_version": EDITORIAL_VERSION}
            if result.get("section") in ALLOWED_SECTIONS:
                update["section"] = result["section"]
            if result.get("impact") in ALLOWED_IMPACTS:
                update["impact"] = result["impact"]
            update.update(_editorial_fields(result, item))
            item.update(update)
            changed += 1
        # Checkpoint after each batch. Ranking and the relevance cut are applied
        # once at the end, so an interrupted run leaves classified-but-unranked
        # items that the resume filter above will not pay for again.
        write_json(path, data)
    if changed:
        items = [item for item in items if not (item.get("classification_source") == "llm" and float(item.get("relevance", 0)) < 0.35)]
        data["items"] = rank_items(items)
        write_json(path, data)
    return changed


def enrich_and_summarise(path: Path, limit: int | None, batch_size: int, skip_throughlines: bool) -> int:
    changed = enrich_file(path, limit, batch_size)
    if skip_throughlines:
        return changed
    # Re-read so the throughline sees the ranked, filtered items enrich_file wrote.
    data = read_json(path, {}) or {}
    add_curation(data)
    if data.get("items"):
        add_throughlines(data)
        add_daily_throughlines(data)
        write_json(path, data)
    else:
        write_json(path, data)
    return changed


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="*", type=Path)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--skip-throughlines", action="store_true", help="Classify only; do not write section throughline prose")
    parser.add_argument("--throughlines-only", action="store_true", help="Write section throughline prose without reclassifying")
    parser.add_argument("--curation-only", action="store_true", help="Write fixed-size editorial shortlists without reclassifying")
    args = parser.parse_args()
    files = args.files or [Path("data/daily.json")]
    if not api_key():
        print("classification skipped: translation/classification API key is not set")
        for path in files:
            if not path.exists():
                continue
            data = read_json(path, {}) or {}
            data["curated_ids"] = fallback_curated_ids(data.get("items", []))
            write_json(path, data)
    elif args.curation_only:
        written = 0
        for path in files:
            if not path.exists():
                continue
            data = read_json(path, {}) or {}
            add_curation(data)
            write_json(path, data)
            written += 1
        print(f"wrote curation for {written} file(s)")
    elif args.throughlines_only:
        written = 0
        for path in files:
            if not path.exists():
                continue
            data = read_json(path, {}) or {}
            if data.get("items"):
                add_throughlines(data)
                add_daily_throughlines(data)
                write_json(path, data)
                written += 1
        print(f"wrote throughlines for {written} file(s)")
    else:
        print(f"classified {sum(enrich_and_summarise(path, args.limit, args.batch_size, args.skip_throughlines) for path in files if path.exists())} items")
