"""Classify Frontier items with an OpenAI-compatible LLM endpoint.

The script is intentionally separate from collection and translation so a
failed or expensive LLM call never prevents raw data from being stored.
"""
from __future__ import annotations

import argparse
import json
import os
import re
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
# Measured on the page (daily_throughlines, which is what renders): with no cap
# the briefings ran 178-252 characters of Chinese and 426-565 of English, mostly
# as one comma-chained sentence -- the form the user flagged as unreadable.
# Chinese carries roughly twice the content per character, so the two caps
# describe about the same amount of prose. The English figure is the looser of
# the two on purpose: at 220 the investment section, which names the most
# parties, failed every attempt, and a failure leaves the old text standing.
THROUGHLINE_MAX = {"zh": 90, "en": 260}
THROUGHLINE_MIN = {"zh": 24, "en": 60}
# A Chinese clause chain reads as one breathless run-on well before an English one
# does, because it needs no conjunctions to keep going.
THROUGHLINE_MAX_COMMAS = {"zh": 2, "en": 3}
# A briefing states what happened, so its supporting fact has to be something an
# identifiable party reported. Forum posts carry neither: the top tips candidate
# on 2026-08-20 was a Reddit joke ("Claude says I used 54.9 BILLION tokens ... i
# am not user. i am a workload"), and three successive prompt wordings each
# reached for it as the section's one concrete number, twice restating it as a
# figure Anthropic had reported. Excluding these sources from the *briefing
# sample* fixes it at the source; they remain fully eligible as ranked items,
# which is where a community signal belongs.
THROUGHLINE_EXCLUDED_SOURCES = ("reddit_", "hacker_news")
# `complete` defaults to 4096, which bounds hidden reasoning and the reply
# *together* -- and on this provider reasoning is the larger half. Measured in run
# 32354668108: curation, event verification and the throughline all fell back to
# that default and every one of them died with completion_tokens=4096
# reasoning_tokens=4096, so the investment section published no briefing at all
# on the file the page renders. Only classify (32768) and translate (16384) had
# ever set it. The ceiling is a bound, not a charge, so it costs nothing to keep
# clear of it.
REASONING_MAX_TOKENS = 16384
_SENTENCE_SPLIT_RE = re.compile(r"[。！？.!?]+")
_COMMA_RE = re.compile(r"[，,、；;]")
# The prompt asked for "why this matters to an AI reader", and the model answered
# it literally every time: 7 of 9 measured entries opened the second half with
# 「这意味着」 and 5 addressed 「对AI读者而言」. Naming the developments is the job;
# lecturing the reader about their significance is filler that reads as a template.
THROUGHLINE_BANNED = (
    "对ai读者", "对读者", "意味着", "值得关注", "标志着一个",
    "for ai readers", "for readers", "this means", "signals that",
    "worth watching", "worth noting", "underscores", "highlights the importance",
    # The reader is looking at a page, not at a list of inputs. Naming the list
    # leaks the prompt: one measured reply opened "The most items share a
    # direction of ...", which is the instruction read back verbatim.
    "the items", "these items", "the most items", "items share", "across the list",
    "本期内容", "跨条目", "上述条目", "这些条目",
)


def _clip(text: str, limit: int = 300) -> str:
    value = " ".join((text or "").split())
    return value[:limit]


# arXiv bodies open with "arXiv:2608.14580v1 Announce Type: new Abstract: ".
# 88 of 300 items in the standing file carry it -- 48 characters, about a tenth of
# the classify clip -- and it says nothing the model needs. The UI strips the same
# prefix at render; this strips it before it costs prompt budget.
FEED_PREFIX_RE = re.compile(
    r"^(?:arXiv:\S+\s+)?(?:announce type:\s*(?:new|replace|cross)\s+)?(?:abstract:\s*)?",
    re.IGNORECASE,
)


def _clip_body(text: str, limit: int) -> str:
    return _clip(FEED_PREFIX_RE.sub("", " ".join((text or "").split()), count=1), limit)


# The classifier already reads every item, so the editorial fields ride along on
# the same request rather than paying for a second pass. Raised from 300: the
# model has to write a standalone summary now, not just judge relevance, and the
# reference feed feeds its editor 500 characters for the same job.
CLASSIFY_CLIP = 500

# Bounds on the rewritten summary. Asked at 300 rather than 260: the reference
# feed's own items measure 181-439 with a median of 299, and STORY_DECK_LIMIT now
# renders 320, so 260 would have asked for bodies shorter than the feed being
# matched while leaving deck space unused. The instruction exists at all because
# raw feed prose earns a mid-sentence "..." -- 207 of 300 English summaries in the
# standing file exceed the clamp, at a median of 500 characters.
SUMMARY_SENTENCES = "2-3 sentences, at most 300 characters"
TAGS_PER_ITEM = (3, 4)


def classify_batch(items: list[dict]) -> list[dict]:
    compact = [
        {"id": item.get("id"), "title": item.get("title", ""), "summary": _clip_body(item.get("summary", ""), CLASSIFY_CLIP), "source": item.get("source_name", "")}
        for item in items
    ]
    prompt = (
        "Classify and edit each AI information item. Return ONLY a JSON array, one "
        "object per input, with exactly these fields: id, relevance, section, impact, "
        "summary, tags, tags_zh, category, category_zh, headline.\n"
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
        "- headline: look at the title. If it is a bare repository path "
        "(\"owner/project\"), a filename, or a bare product name with no verb, then it "
        "is NOT a headline, and you must write one: a short English sentence from the "
        "summary saying what the thing does, 12-120 characters, naming the project "
        "without the owner prefix (e.g. for \"jundot/omlx\" write \"omlx runs LLM "
        "inference on Apple Silicon\"). Otherwise -- any title a publisher wrote as a "
        "sentence -- return an empty string and change nothing.\n"
        "Reject memes, generic opinions, duplicate-like items, and non-AI noise with "
        "relevance below 0.35. Investment requires a real funding, acquisition, valuation, "
        "or market event. Tips requires a practical tutorial or workflow. Keep the input "
        "order.\n\nINPUT:\n"
        + json.dumps(compact, ensure_ascii=False)
    )
    # 120s, matching translate: the reply now carries a written summary per item
    # (~115 output tokens vs ~30 for bare classification), and a timeout discards
    # the whole batch rather than degrading it.
    #
    # max_tokens has to clear the reasoning tokens, not just the reply. Run
    # 32341638589 truncated at roughly 1200 output tokens against an 8192 ceiling,
    # so reasoning had taken about 7000 of it -- the reply is the small half of
    # this budget. 32768 leaves room for both; the reply itself needs about 1300
    # for an 8-item batch. Truncation is not a short answer, it is a parse error
    # that discards the whole batch.
    return parse_json_array(
        complete(prompt, "You are a strict AI news editor.", timeout=180, max_tokens=32768)
    )


def _throughline_rejection(text: str, code: str) -> str | None:
    """Why this throughline is unusable, or None if it is fine.

    Every rule here is also stated in the prompt. Stating it twice is deliberate:
    a prompt-only constraint drifts silently as the section content changes, and
    the failure mode is prose the reader sees, not an exception anyone notices.
    """
    # A stray tag would be injected as markup by the rail, so reject anything
    # carrying angle brackets beyond the single <em> pair that was asked for.
    if text.count("<em>") != 1 or text.count("</em>") != 1:
        return "expected exactly one <em> pair"
    bare = text.replace("<em>", "").replace("</em>", "")
    if "<" in bare or ">" in bare:
        return "unexpected markup"
    if len(bare) > THROUGHLINE_MAX[code]:
        return f"{len(bare)} chars over the {THROUGHLINE_MAX[code]} cap"
    if len(bare) < THROUGHLINE_MIN[code]:
        return f"{len(bare)} chars under the {THROUGHLINE_MIN[code]} floor"
    lowered = bare.lower()
    for phrase in THROUGHLINE_BANNED:
        if phrase in lowered:
            return f"template phrase {phrase!r}"
    # Commas are counted per sentence: two short sentences with one comma each
    # read fine, while the same two commas inside one sentence are the run-on.
    for sentence in _SENTENCE_SPLIT_RE.split(bare):
        if len(_COMMA_RE.findall(sentence)) > THROUGHLINE_MAX_COMMAS[code]:
            return "one sentence chains too many clauses"
    return None


def throughline_for_section(section: str, items: list[dict]) -> dict[str, str]:
    """Two short sentences naming what a section's items add up to, per language.

    The rail treats this as the one thing the feed structurally cannot say: the
    items state facts, this states the pattern across them. It deliberately does
    *not* explain the significance -- asking for that produced the same template
    on every run, which is what `THROUGHLINE_BANNED` now keeps out.

    The design wraps a single clause in <em> for the accent underline, so the
    model is asked for exactly one; the web layer renders the string as markup,
    which is why nothing else in it may contain angle brackets.
    """
    reportable = [
        item for item in items
        if not str(item.get("source", "")).startswith(THROUGHLINE_EXCLUDED_SOURCES)
    ]
    # Falling back to the unfiltered list keeps a section that is genuinely all
    # community discussion from losing its briefing entirely.
    sample = [
        {"title": item.get("title", ""), "summary": _clip(item.get("summary", ""), 200), "source": item.get("source_name", "")}
        for item in (reportable or items)[:THROUGHLINE_SAMPLE]
    ]
    out: dict[str, str] = {}
    for code, name in THROUGHLINE_LANGS.items():
        prompt = (
            f"These are the highest-ranked items in the '{section}' section of an AI "
            f"intelligence digest. Write a section briefing in {name} as TWO short "
            f"declarative sentences, at most {THROUGHLINE_MAX[code]} characters in total.\n"
            f"Sentence 1: state the one development these stories point to, naming the "
            f"real products, organisations, and actions involved. Write it as a fact "
            f"about the world -- never mention \"the items\", \"the list\", or this "
            f"digest itself, which the reader cannot see.\n"
            f"Sentence 2: add the strongest concrete fact that supports it -- a number, "
            f"a price, a version, or a stated change -- naming the company, product, or "
            f"project it concerns. Prefer a fact an organisation reported over one "
            f"person's anecdote, and attribute it to whoever actually said it: never "
            f"restate an individual's or forum user's claim as a company's own figure.\n"
            f"Keep each sentence under {THROUGHLINE_MAX_COMMAS[code]+1} clauses; do not "
            f"chain clauses with commas into one long sentence.\n"
            f"Do NOT explain why it matters, do not address the reader, and do not use "
            f"any of these phrasings: significance framing such as \"this means\", "
            f"\"for AI readers\", \"worth watching\", \"意味着\", \"对AI读者而言\", "
            f"\"值得关注\". State what happened; the reader draws the conclusion.\n"
            f"Do not call it 'today' or imply a single-day window. Do not restate the "
            f"section name, list or number items, use generic filler, or invent facts.\n"
            f"Wrap the key phrase that names the development in <em>...</em> — exactly "
            f"one pair, and no other HTML.\n"
            f"Return ONLY a JSON object of the form {{\"throughline\": \"...\"}}.\n\nITEMS:\n"
            + json.dumps(sample, ensure_ascii=False)
        )
        # Retries are told what was wrong. Measured: two attempts left the
        # investment section -- the one that names the most parties, and so the
        # longest offender -- failing outright, and a failure leaves the previous
        # run's text standing, which is the very prose being replaced.
        followup = ""
        for _ in range(3):
            try:
                text = str(parse_json_object(complete(
                    prompt + followup, "You are a concise editorial writer.",
                    timeout=90, max_tokens=REASONING_MAX_TOKENS,
                )).get("throughline") or "").strip()
            except Exception as error:
                print(f"  throughline failed ({section}/{code}): {error}")
                break
            rejection = _throughline_rejection(text, code)
            if rejection is None:
                out[code] = text
                break
            print(f"  throughline rejected ({section}/{code}): {rejection}")
            followup = (
                f"\n\nYour previous answer was rejected: {rejection}. It was: {text}\n"
                f"Rewrite it shorter and plainer, obeying every rule above."
            )
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
        complete(prompt, "You are a conservative duplicate-news auditor.",
                 timeout=90, max_tokens=REASONING_MAX_TOKENS)
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
                complete(prompt, "You are a strict briefing editor.",
                         timeout=90, max_tokens=REASONING_MAX_TOKENS)
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


def _current_day_first(path: Path, data: dict, pending: list[dict]) -> list[dict]:
    """Put the file's own day at the head of the queue, keeping score order inside.

    The file is score-descending, so a bounded run took the highest-scoring items
    overall -- and freshness is only 25 of the score, so yesterday's well-signalled
    items outrank everything published today. Measured on the live file: the top 40
    by score were all from Aug 14-19, and today's 48 items got zero. The homepage
    defaults to the newest day, so every enriched item sat on a page nobody lands
    on. translate.py hit the same wall and fixed it the same way (0a28898).
    """
    day = str(data.get("date") or "")
    if not day:
        return pending
    current = [item for item in pending if str(item.get("published", "")).startswith(day)]
    if not current:
        return pending
    # Identity, not equality: two items can carry equal field values.
    current_ids = {id(item) for item in current}
    return current + [item for item in pending if id(item) not in current_ids]


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


# A title that is only "owner/project", a filename, or one bare token is not a
# headline: measured, 14 GitHub Trending items rendered as "jundot/omlx" on the
# homepage. The model is asked for a real one, but the decision to replace is made
# here -- trusting the model to judge would let it rewrite publisher headlines,
# which is the one thing this must not do. DataCube allows the same replacement
# ("English title (can match original or be improved)") but only for videos.
SLUG_TITLE_RE = re.compile(r"^[\w.-]+/[\w.-]+$|^[\w.-]+\.[a-z]{2,4}$")
HEADLINE_MIN = 12
HEADLINE_MAX = 120


def _is_slug_title(title: str) -> bool:
    title = " ".join((title or "").split())
    if not title:
        return False
    if SLUG_TITLE_RE.match(title):
        return True
    # The word-count test only means anything in a space-delimited script. Chinese
    # headlines carry no spaces at all, so testing them this way called 19 of 23
    # measured 量子位 headlines slugs -- and "replacing" one would have put
    # model-written English on the Chinese page in place of a real headline.
    if any("\u4e00" <= char <= "\u9fff" for char in title):
        return False
    return " " not in title


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
    headline = " ".join(str(result.get("headline") or "").split())
    if (
        headline
        and HEADLINE_MIN <= len(headline) <= HEADLINE_MAX
        and "<" not in headline
        and _is_slug_title(item.get("title") or "")
        and not _is_slug_title(headline)
    ):
        out["title"] = headline
        # The stored zh title is a copy of the slug, so it no longer matches.
        # Clearing it re-queues the item the way a replaced summary does.
        if item.get("title_zh"):
            out["title_zh"] = ""
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
    # The stamp alone is not enough. bdf1679 stamped it unconditionally, so items
    # whose summary was rejected for length were retired holding raw feed prose --
    # measured: 3 of 15 in medium.json carry the stamp with a 6-18 KB summary, the
    # exact text the rewrite exists to replace. Re-opening anything still over the
    # cap repairs those without bumping EDITORIAL_VERSION, which would re-spend
    # tokens on the 12 items that came out correct. An absent or short summary is
    # not evidence of the defect, so it stays retired and cannot loop.
    return (
        item.get("classification_source") == "llm"
        and int(item.get("editorial_version") or 0) >= EDITORIAL_VERSION
        and len(" ".join(str(item.get("summary") or "").split())) <= SUMMARY_MAX
    )


# A job timeout kills the steps that commit and publish, so every LLM call in
# that run is thrown away -- the per-batch checkpoint below writes to the runner's
# scratch dir, which dies with it. Stopping early instead keeps a partial run
# worth something, and the resume filter means the rest is picked up next time.
ENRICH_BUDGET_SECONDS = int(os.environ.get("FRONTIER_ENRICH_BUDGET_SECONDS", "0") or 0)
# Measured from import, not from each call: enrich_file runs once per file on the
# command line, and a per-call budget would let two files spend it twice.
_STARTED_AT = time.monotonic()


# Share of the budget the classify loop may spend. The rest is held back for
# curation and the throughlines, which run after it and decide what the homepage
# shows: the first run on the editorial prompt spent all 14 minutes classifying,
# so those stages started with nothing left and would be skipped every run.
CLASSIFY_BUDGET_SHARE = 0.6


# Results from this process, keyed by item id. enrich is invoked with two files
# that overlap heavily -- measured on the data branch, medium.json shares 145 of
# its 292 items with daily.json -- and each file holds its own dict for a shared
# item, so without this the same item is sent to the model twice in one run. The
# cache is per process, so it never serves a result from an earlier run.
_RESULT_CACHE: dict[str, dict] = {}


def _budget_exhausted(share: float = 1.0) -> bool:
    if not ENRICH_BUDGET_SECONDS:
        return False
    return time.monotonic() - _STARTED_AT >= ENRICH_BUDGET_SECONDS * share


def _pair_results(batch: list[dict], results: list[dict]) -> list[tuple[dict, dict]]:
    """Match each result to its item, by id first and by position as a fallback.

    Measured: the model occasionally copies an id with a character inserted
    ("...573fe9b9deab3" for "...573fe9bdeab3") -- 1 of 20 in a sample. Exact-id
    matching alone silently discarded a fully usable reply, and because nothing
    is stamped the item stays pending forever. The prompt fixes the reply to the
    input order, so when the counts agree, position identifies the leftovers.
    """
    by_id = {str(item.get("id")): item for item in batch}
    paired: list[tuple[dict, dict]] = []
    claimed: set[int] = set()
    unmatched: list[tuple[int, dict]] = []
    for position, result in enumerate(results):
        item = by_id.get(str(result.get("id")))
        if item is None:
            unmatched.append((position, result))
            continue
        # A repeated id would otherwise write two results onto one item.
        if id(item) in claimed:
            continue
        paired.append((item, result))
        claimed.add(id(item))
    if unmatched and len(results) == len(batch):
        for position, result in unmatched:
            item = batch[position]
            if id(item) in claimed:
                continue
            print(f"  result {position} carried a bad id ({result.get('id')!r}); matched by position")
            paired.append((item, result))
            claimed.add(id(item))
    return paired


def _apply_result(item: dict, result: dict) -> bool:
    """Write one classify result onto an item. False if it was unusable."""
    try:
        relevance = max(0.0, min(1.0, float(result.get("relevance", 0))))
    except (TypeError, ValueError):
        return False
    # An unusable section used to fall back to "tech", which quietly filed every
    # unparsed reply under one heading. Leaving the field alone lets the keyword
    # pass in rank_items() decide instead of asserting a wrong answer with llm
    # provenance attached.
    update = {"relevance": relevance, "classification_source": "llm"}
    if result.get("section") in ALLOWED_SECTIONS:
        update["section"] = result["section"]
    if result.get("impact") in ALLOWED_IMPACTS:
        update["impact"] = result["impact"]
    editorial = _editorial_fields(result, item)
    update.update(editorial)
    # Stamp the version only when a usable summary actually arrived. Marking the
    # item done on a reply that ignored the editorial instruction would retire it
    # with its raw feed prose permanently, silently, and only a version bump would
    # ever revisit it. Leaving it unstamped means the next run retries -- if
    # replies never comply that repeats, which is wasteful but shows up in the
    # logs instead of hiding in the data.
    if "summary" in editorial:
        update["editorial_version"] = EDITORIAL_VERSION
    item.update(update)
    return True


def enrich_file(path: Path, limit: int | None, batch_size: int) -> int:
    data = read_json(path, {}) or {}
    items = data.get("items", [])
    # Resume: an item already carrying llm provenance was classified by an
    # earlier run, so a re-run after a partial failure only pays for the rest.
    # The version gate re-opens items classified before the editorial fields
    # existed -- without it the whole standing file keeps its raw feed prose
    # forever, since provenance alone marks them done.
    pending = [item for item in items if not _is_enriched(item)]
    changed = 0
    # Apply anything the other file in this run already paid for.
    reused = [item for item in pending if str(item.get("id")) in _RESULT_CACHE]
    for item in reused:
        if _apply_result(item, _RESULT_CACHE[str(item.get("id"))]):
            changed += 1
    if reused:
        print(f"  reused {len(reused)} result(s) from earlier in this run")
        pending = [item for item in pending if str(item.get("id")) not in _RESULT_CACHE]
    selected = _select_pending(_current_day_first(path, data, pending), limit)
    for start in range(0, len(selected), batch_size):
        if _budget_exhausted(CLASSIFY_BUDGET_SHARE):
            print(f"  classify budget reached; stopping at {start} of {len(selected)}")
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
        for item, result in _pair_results(batch, results):
            if _apply_result(item, result):
                _RESULT_CACHE[str(item.get("id"))] = result
                changed += 1
        # Checkpoint after each batch. Ranking and the relevance cut are applied
        # once at the end, so an interrupted run leaves classified-but-unranked
        # items that the resume filter above will not pay for again.
        write_json(path, data)
    if changed:
        items = [item for item in items if not (item.get("classification_source") == "llm" and float(item.get("relevance", 0)) < 0.35)]
        data["items"] = rank_items(items)
        write_json(path, data)
        # Coverage, not just the change count: a run where every reply omitted the
        # editorial fields still reports changes, because relevance and section
        # applied. That is the failure worth seeing in the log rather than having
        # to diff the data to find it.
        edited = sum(1 for item in items if _is_enriched(item))
        print(f"  {path.name}: {edited} of {len(items)} items carry editorial fields")
    return changed


def enrich_and_summarise(path: Path, limit: int | None, batch_size: int, skip_throughlines: bool) -> int:
    changed = enrich_file(path, limit, batch_size)
    if skip_throughlines:
        return changed
    # The stages below are roughly 14 further requests -- curation, then a
    # throughline per section, then the daily ones. The budget has to cover them
    # too, or it bounds only the classify loop and the step overruns anyway: the
    # first run on the new prompt spent its whole 14 minutes classifying and then
    # started this work on top. Skipping leaves the previous run's throughlines
    # and curation in place, which is stale but coherent, and the classified items
    # are already written.
    if _budget_exhausted():
        print("  budget reached; skipping curation and throughlines")
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
