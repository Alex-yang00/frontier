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


ALLOWED_SECTIONS = ("tech", "investment", "tips", "policy")
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
THROUGHLINE_MAX = {"zh": 100, "en": 280}
THROUGHLINE_MIN = {"zh": 24, "en": 60}
THROUGHLINE_MULTI_MIN = {"zh": 60, "en": 120}
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
SECTION_CANDIDATE_LIMITS = {
    "tech": 40,
    "investment": 30,
    "tips": 25,
    "policy": 20,
    "videos": 15,
}
CRITIC_REJECTED_SAMPLE = 15
SPECIALIZED_EDITORIAL_VERSION = 1
HEADLINE_EDITORIAL_VERSION = 1
HEADLINE_EN_MIN = 28
HEADLINE_EN_MAX = 100
HEADLINE_ZH_MIN = 10
HEADLINE_ZH_MAX = 42
HEADLINE_BANNED = (
    "world first", "and more", "it's complicated", "you won't believe",
    "game changer", "must-see", "breaking:", "重磅", "全球首次", "震惊",
    "一文看懂", "太强了", "等更多",
)


def editor_models() -> list[str] | None:
    configured = os.environ.get("FRONTIER_EDITOR_MODELS", "")
    values = [value.strip() for value in configured.split(",") if value.strip()]
    return values or None


def editor_complete(prompt: str, system: str, timeout: int = 90, max_tokens: int = 8192) -> str:
    return complete(
        prompt,
        system,
        timeout=timeout,
        max_tokens=max_tokens,
        models=editor_models(),
    )
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


CLASSIFICATION_VERSION = 1


def classify_batch(items: list[dict]) -> list[dict]:
    compact = [
        {"id": item.get("id"), "title": item.get("title", ""), "summary": _clip_body(item.get("summary", ""), CLASSIFY_CLIP), "source": item.get("source_name", "")}
        for item in items
    ]
    prompt = (
        "Classify each AI information item. Return ONLY a JSON array, one object per "
        "input, with exactly these fields: id, relevance, section, impact, importance, "
        "novelty, evidence, global_relevance, practical_value, source_credibility.\n"
        "- relevance is a number from 0 to 1 measuring usefulness to an AI intelligence feed.\n"
        "- section must be tech, investment, tips, or policy.\n"
        "  tech is models, research, and engineering releases -- something built or\n"
        "  measured. policy is law, regulation, courts, and government action: a\n"
        "  copyright ruling, a lawsuit, an antitrust probe, an agency requirement.\n"
        "  A story about what a government or court did belongs in policy even when\n"
        "  its subject is a model. investment is funding, acquisitions, valuations and\n"
        "  market events; tips is a practical tutorial or workflow.\n"
        "- impact must be critical, high, medium, or low.\n"
        "- importance, novelty, evidence, global_relevance, practical_value, and "
        "source_credibility are independent numbers from 0 to 1. Judge only facts present "
        "in the input; a prestigious source does not make a thin item complete.\n"
        "Reject memes, generic opinions, duplicate-like items, and non-AI noise with "
        "relevance below 0.35. Investment requires a real funding, acquisition, valuation, "
        "or market event. Tips requires a practical tutorial or workflow. Keep the input "
        "order.\n\nINPUT:\n"
        + json.dumps(compact, ensure_ascii=False)
    )
    return parse_json_array(
        complete(prompt, "You are a strict AI news classifier.", timeout=120, max_tokens=16384)
    )


# A Chinese government body is named with a suffix that marks it as one, so the
# names can be found without segmenting the sentence. A policy briefing must never
# introduce an agency the source did not name: measured 2026-08-21 over two runs,
# the 量子位 filing item says only "完成生成式人工智能服务备案", and both runs wrote
# "该模型已通过国家网信办备案" -- the CAC is the plausible agency, and supplying it is
# still inventing a fact. Latin-script names are left to the prompt: capitalised
# words carry no comparable marker, and testing them rejected honest paraphrase.
_CN_ORG_RE = re.compile(
    r"[\u4e00-\u9fff]{2,10}(?:网信办|信息办|管理局|监管局|委员会|法院|检察院|工信部|发改委|市监局)"
)


# "亿" is 10^8, so an English "RMB67.68 billion" is 676.8亿 -- and the prompt carries
# only the English fields, which is how a briefing came back saying 67.6亿元 for that
# figure (measured 2026-08-21). Off by 10x on a public page, and every digit in it
# appears in the source, so no substring check sees it. Compare magnitudes instead:
# each 亿 figure must land within rounding distance of one the items state, which
# lets 676亿 stand for 676.8亿 and still rejects 67.6亿.
_YI_RE = re.compile(r"(\d+(?:\.\d+)?)\s*亿")
_YI_TOLERANCE = 0.02


def _misscaled_figure(text: str, corpus: str) -> str | None:
    """Name a 亿 figure whose magnitude no figure in the source items supports."""
    stated = [float(value) for value in _YI_RE.findall(corpus)]
    if not stated:
        return None
    for raw in _YI_RE.findall(text):
        value = float(raw)
        if not any(abs(value - known) <= _YI_TOLERANCE * max(known, 1.0) for known in stated):
            return f"{raw}亿"
    return None


def _invented_organisation(text: str, corpus: str) -> str | None:
    """Name an organisation the briefing asserts but the source items never do."""
    for name in _CN_ORG_RE.findall(text):
        if name and name not in corpus:
            return name
    return None


def _throughline_rejection(
    text: str,
    code: str,
    corpus: str = "",
    min_length: int | None = None,
) -> str | None:
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
    floor = THROUGHLINE_MIN[code] if min_length is None else min_length
    if len(bare) < floor:
        return f"{len(bare)} chars under the {floor} floor"
    lowered = bare.lower()
    for phrase in THROUGHLINE_BANNED:
        if phrase in lowered:
            return f"template phrase {phrase!r}"
    # Commas are counted per sentence: two short sentences with one comma each
    # read fine, while the same two commas inside one sentence are the run-on.
    for sentence in _SENTENCE_SPLIT_RE.split(bare):
        if len(_COMMA_RE.findall(sentence)) > THROUGHLINE_MAX_COMMAS[code]:
            return "one sentence chains too many clauses"
    invented = _invented_organisation(bare, corpus)
    if invented:
        return f"names {invented}, which no source item mentions"
    misscaled = _misscaled_figure(bare, corpus)
    if misscaled:
        return f"states {misscaled}, which no source figure supports"
    return None


def throughline_for_section(section: str, items: list[dict]) -> dict[str, str | list[str]]:
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
    sampled = (reportable or items)[:THROUGHLINE_SAMPLE]
    sample = [
        {
            "id": item.get("id"),
            "title": item.get("title", ""),
            "summary": _clip(item.get("summary", ""), 200),
            "source": item.get("source_name", ""),
        }
        for item in sampled
    ]
    # Checked against the sampled items, not the whole file: the briefing may only
    # assert what the items it was shown actually say. Both languages of each item
    # go in even though the prompt carries only English -- an item whose English
    # summary says "Cyberspace Administration" and whose Chinese one says 网信办 has
    # named that agency, and a zh briefing calling it 网信办 is translating, not
    # inventing. Checking English alone would reject that.
    corpus = " ".join(
        f"{item.get('title','')} {item.get('summary','')}"
        f"{item.get('title_zh','')} {item.get('summary_zh','')} {item.get('source_name','')}"
        for item in sampled
    )
    minimums = {
        code: THROUGHLINE_MULTI_MIN[code] if len(sampled) >= 2 else THROUGHLINE_MIN[code]
        for code in THROUGHLINE_LANGS
    }
    prompt = (
        f"These are the highest-ranked items in the '{section}' section of an AI intelligence digest. "
        "Write the same factual briefing in English and Simplified Chinese. Generate both languages "
        "from one shared fact outline: they must name the same developments, companies, products, and numbers.\n"
        f"Write TWO or THREE short declarative sentences. English must be {minimums['en']}-"
        f"{THROUGHLINE_MAX['en']} characters; Chinese must be {minimums['zh']}-{THROUGHLINE_MAX['zh']} characters.\n"
        "When two or more inputs are available, cover at least two distinct developments from different "
        "input ids. Do not spend both sentences restating one story. Sentence 1 synthesizes the dominant "
        "pattern shared by at least two stories. Sentences 2 and 3 give concrete examples from different ids.\n"
        "Prefer facts reported by identifiable organisations over anecdotes. Preserve uncertainty and do not "
        "invent attribution. Do not explain why it matters, address the reader, mention this digest, call the "
        "window 'today', use generic filler, or use significance phrases such as 'this means', 'worth watching', "
        "'意味着', or '值得关注'.\n"
        "In each language wrap the same key development in exactly one <em>...</em> pair and use no other HTML. "
        f"Keep each English sentence under {THROUGHLINE_MAX_COMMAS['en'] + 1} clauses and each Chinese sentence "
        f"under {THROUGHLINE_MAX_COMMAS['zh'] + 1} clauses.\n"
        "Return ONLY JSON with en, zh, and supporting_ids. supporting_ids must contain 2-3 exact input ids whose "
        "facts appear in both language versions, or the sole id when only one input exists.\n\nITEMS:\n"
        + json.dumps(sample, ensure_ascii=False)
    )
    followup = ""
    # Four attempts leave room for a formatting retry and a factual validation
    # retry without preserving stale prose from a previous run.
    valid_ids = {str(item.get("id")) for item in sampled}
    required_support = min(2, len(valid_ids))
    for _ in range(4):
        try:
            response = parse_json_object(editor_complete(
                prompt + followup,
                "You are a concise bilingual editorial writer. Keep both languages factually aligned.",
                timeout=90,
                max_tokens=REASONING_MAX_TOKENS,
            ))
        except Exception as error:
            print(f"  throughline failed ({section}): {error}")
            break
        texts = {code: str(response.get(code) or "").strip() for code in THROUGHLINE_LANGS}
        supporting = list(dict.fromkeys(
            str(value) for value in (response.get("supporting_ids") or []) if str(value) in valid_ids
        ))[:3]
        rejections = [
            f"{code}: {reason}"
            for code, text in texts.items()
            if (reason := _throughline_rejection(text, code, corpus, minimums[code]))
        ]
        if len(supporting) < required_support:
            rejections.append(f"supporting_ids has {len(supporting)} valid ids; expected {required_support}")
        if not rejections:
            return {**texts, "supporting_ids": supporting}
        print(f"  throughline rejected ({section}): {'; '.join(rejections)}")
        followup = (
            "\n\nYour previous JSON was rejected: " + "; ".join(rejections) + ". "
            "Rewrite both languages from the same fact outline and obey every rule above."
        )
    return {}


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
        editor_complete(prompt, "You are a conservative duplicate-news auditor.",
                        timeout=60, max_tokens=8192)
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
    all_items = data.get("items", [])
    by_id = {str(item.get("id")): item for item in all_items}
    curated = data.get("curated_ids") if isinstance(data.get("curated_ids"), dict) else {}
    selected_ids = [
        str(value)
        for section in ALLOWED_SECTIONS
        for value in curated.get(section, [])
    ]
    selected = [by_id[value] for value in selected_ids if value in by_id]
    scope = selected or all_items
    items = [
        item for item in scope
        if str(item.get("edition_date") or item.get("published") or "")[:10] == date
    ]
    existing = data.get("throughlines") if isinstance(data.get("throughlines"), dict) else {}
    all_in_edition = bool(selected) or len(items) == len(all_items)
    result: dict[str, dict[str, str]] = {}
    for section in ALLOWED_SECTIONS:
        section_items = [item for item in items if (item.get("section") or "tech") == section]
        if not section_items:
            continue
        text = existing.get(section) if all_in_edition else None
        if not isinstance(text, dict) or not (text.get("en") or text.get("zh")):
            text = throughline_for_section(section, section_items)
        if text:
            result[section] = {
                key: value for key, value in text.items() if key in THROUGHLINE_LANGS or key == "supporting_ids"
            }
            result[section]["count"] = len(section_items)
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
        candidate_limit = SECTION_CANDIDATE_LIMITS[section]
        compact = [
            {
                "id": item.get("id"),
                "title": item.get("title", ""),
                "summary": _clip(item.get("summary", ""), 220),
                "source": item.get("source_name", ""),
                "published": item.get("published", ""),
                "window_member": item.get("edition_window_member", "strict"),
                "relevance": item.get("relevance"),
                "impact": item.get("impact"),
                "quality_scores": {
                    key: item.get(key)
                    for key in ("importance", "novelty", "evidence", "global_relevance", "practical_value", "source_credibility")
                },
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
            "tech": (
                " Technology items must contain a consequential release, measured capability, reproducible "
                "research result, material infrastructure change, or well-sourced industry finding. Reject "
                "newsletter roundups, spectacle-only demos without a measured advance, anonymous model "
                "lineage guesses without primary evidence, and cute anecdotes even when they mention AI."
            ),
        }.get(section, "")
        prompt = (
            f"{quantity} Choose the most important and useful items for the "
            f"'{section}' section of a concise AI intelligence briefing. "
            "Score candidates comparatively using this rubric: importance 30%, novelty 20%, "
            "evidence and completeness 20%, global relevance 15%, practical value 10%, and "
            "source credibility 5%. Prefer strict-window items; use extension items only when they are "
            "materially stronger or needed to avoid a thin section. Balance freshness and source diversity; normally use no more than "
            "30% of the section from one source. Reject marginal, repetitive, sensational, or "
            "off-topic items. A weak item must not be selected merely to approach the quota; for tech, "
            "seven strong stories are better than ten mixed-quality stories. Preserve the desired display order."
            + section_gate
            + event_instructions
            + " Return ONLY JSON in the form "
            + '{"ids": ["exact-input-id"], "event_groups": []}.\n\nCANDIDATES:\n'
            + json.dumps(compact, ensure_ascii=False)
        )
        try:
            response = parse_json_object(
                editor_complete(prompt, "You are a strict briefing editor.",
                                timeout=60, max_tokens=4096)
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
            ids = deduplicated_selection(
                response.get("ids"), candidates, section_groups, count,
                fill=section == "videos",
            )
            if section == "videos" and len(ids) < min(count, len(candidates)):
                ids.extend(value for value in fallback[section] if value not in ids)
            if section == "videos" and not ids:
                result[section] = fallback[section]
            elif isinstance(response.get("ids"), list):
                result[section] = ids[:count]
            else:
                result[section] = fallback[section]
            clusters.extend({**group, "section": section} for group in section_groups)
        except Exception as error:
            print(f"  curation failed ({section}): {error}")
            result[section] = existing.get(section) or fallback[section]
            clusters.extend(group for group in existing_clusters if group.get("section") == section)

    reviews: dict[str, dict] = {}
    for section in ALLOWED_SECTIONS:
        candidates = curated_candidates(items, section)[: SECTION_CANDIDATE_LIMITS[section]]
        selected = result.get(section, [])
        if not candidates or not selected:
            reviews[section] = {"status": "pass", "ids": selected, "major_issues": []}
            continue
        compact = [
            {
                "id": item.get("id"),
                "selected": str(item.get("id")) in selected,
                "title": item.get("title_en") or item.get("title", ""),
                "summary": _clip(item.get("summary_en") or item.get("summary", ""), 260),
                "source": item.get("source_name", ""),
                "published": item.get("published", ""),
                "relevance": item.get("relevance"),
                "impact": item.get("impact"),
            }
            for item in candidates
            if str(item.get("id")) in selected
        ]
        rejected = [
            {
                "id": item.get("id"),
                "selected": False,
                "title": item.get("title_en") or item.get("title", ""),
                "summary": _clip(item.get("summary_en") or item.get("summary", ""), 260),
                "source": item.get("source_name", ""),
                "published": item.get("published", ""),
                "relevance": item.get("relevance"),
                "impact": item.get("impact"),
            }
            for item in candidates
            if str(item.get("id")) not in selected
        ][:CRITIC_REJECTED_SAMPLE]
        compact.extend(rejected)
        prompt = (
            f"Independently audit the proposed '{section}' briefing selection. Compare every "
            "selected row with the strongest rejected rows. Find major omissions, strict same-event "
            "duplicates, weak or incomplete evidence, sensational items, and topic/source/company "
            "concentration. Apply this rubric: importance 30%, novelty 20%, evidence 20%, global "
            "relevance 15%, practical value 10%, source credibility 5%. Return a complete revised "
            f"ordered list of at most {CURATION_LIMITS[section]} ids. Do not force the quota when "
            "quality is thin. Remove newsletter roundups, spectacle-only product demos, anonymous speculation, "
            "and anecdotal stories unless they contain unusually strong primary evidence and a material result. "
            "Return ONLY JSON with ids, decisions, findings, changes, and unresolved_major_issues. "
            "decisions must contain one object for EVERY row in AUDIT POOL with id, verdict (keep or drop), "
            "and reason. ids must exactly equal the kept ids in display order; never describe removing an "
            "item while leaving it in ids. "
            "findings describe defects in the original selection; unresolved_major_issues must contain "
            "only defects that still remain in your revised ids, and should normally be empty.\n\nAUDIT POOL:\n"
            + json.dumps(compact, ensure_ascii=False)
        )
        try:
            response = parse_json_object(
                editor_complete(prompt, "You are the independent critic for an AI intelligence desk.",
                                timeout=90, max_tokens=REASONING_MAX_TOKENS)
            )
            valid = {str(item.get("id")) for item in candidates}
            audited = {str(row.get("id")) for row in compact}
            decisions = response.get("decisions") if isinstance(response.get("decisions"), list) else []
            verdicts = {
                str(decision.get("id")): str(decision.get("verdict") or "").lower()
                for decision in decisions
                if isinstance(decision, dict) and str(decision.get("id")) in audited
            }
            if set(verdicts) != audited or any(value not in {"keep", "drop"} for value in verdicts.values()):
                raise ValueError("critic omitted a keep/drop decision for one or more audited rows")
            proposed = response.get("ids") if isinstance(response.get("ids"), list) else []
            revised = list(dict.fromkeys(str(value) for value in proposed if str(value) in valid))
            kept = {item_id for item_id, verdict in verdicts.items() if verdict == "keep"}
            if set(revised) != kept:
                raise ValueError("critic ids contradict its keep/drop decisions")
            # The critic can improve relevance while still concentrating on one
            # prolific feed. Re-apply the deterministic source cap after review;
            # do not refill, because every omitted row was explicitly rejected.
            result[section] = deduplicated_selection(
                revised,
                candidates,
                [],
                CURATION_LIMITS[section],
                fill=False,
            )
            findings = response.get("findings") if isinstance(response.get("findings"), list) else []
            issues = response.get("unresolved_major_issues") if isinstance(response.get("unresolved_major_issues"), list) else []
            reviews[section] = {
                "status": "pass" if not issues else "issues",
                "ids": result[section],
                "major_issues": [str(value)[:300] for value in issues[:8]],
                "findings": [str(value)[:300] for value in findings[:8]],
                "changes": response.get("changes") if isinstance(response.get("changes"), list) else [],
            }
        except Exception as error:
            print(f"  critic failed ({section}): {error}")
            reviews[section] = {"status": "failed", "ids": selected, "major_issues": [str(error)[:300]]}
    data["curated_ids"] = result
    data["event_clusters"] = clusters
    data["curation_review"] = reviews

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


def _specialized_prompt(section: str, rows: list[dict]) -> str:
    common = (
        "Edit only the supplied selected stories. Return ONLY a JSON array with one object per "
        "input in the same order. Every object needs id, headline, summary, tags, tags_zh, category, "
        "and category_zh. headline must be a complete factual English headline of 28-100 characters. "
        "summary must be 2-3 factual English sentences under 300 characters, lead with the event, "
        "preserve names, numbers and uncertainty, and contain no hype or generic 'why it matters' filler. "
        "Always return quality_pass as true or false. "
    )
    special = {
        "investment": (
            "Also return investment_details with event_type, company, amount, round, valuation, acquirer, "
            "investors, and evidence. event_type must be funding, acquisition, valuation, ipo, public_market, "
            "pricing, or market_usage. Use empty strings/lists when the source does not state a value; never "
            "infer one. Return quality_pass=false for commentary, product adoption anecdotes, gray-market "
            "access, or any story without a concrete and quantifiable capital or market event."
        ),
        "tips": (
            "Also return action_steps as 2-4 short, concrete steps that a reader can perform. Reject the "
            "item by returning quality_pass=false when the source lacks a reproducible method or action."
        ),
        "policy": (
            "State the jurisdiction, authority, action, affected party and effective date when supplied. "
            "Return quality_pass=false for evergreen explainers or debate without a new legislative, "
            "regulatory, judicial, or government action."
        ),
        "tech": "Prioritize the actual capability, benchmark, release condition, limitation and availability.",
        "videos": (
            "Treat the publisher description as promotional source material, not finished copy. Remove sponsor "
            "messages, subscription requests, social links, hashtags, first-person framing, and unsupported hype. "
            "Summarize the concrete subject demonstrated or explained and retain important limitations. Return "
            "quality_pass=false for clickbait, rumor-only commentary, roundups without a primary topic, or a video "
            "whose description does not support a factual 2-3 sentence summary."
        ),
    }[section]
    return common + special + "\n\nSELECTED STORIES:\n" + json.dumps(rows, ensure_ascii=False)


def _headline_rejection(value: object, language: str) -> str | None:
    """Return why a final display headline is unusable, or None when it passes."""
    headline = " ".join(str(value or "").split()).strip()
    minimum = HEADLINE_ZH_MIN if language == "zh" else HEADLINE_EN_MIN
    maximum = HEADLINE_ZH_MAX if language == "zh" else HEADLINE_EN_MAX
    if len(headline) < minimum or len(headline) > maximum:
        return f"length {len(headline)} is outside {minimum}-{maximum}"
    if "<" in headline or ">" in headline:
        return "contains markup"
    if headline.endswith(("?", "？", "+", "...", "…")):
        return "is a question or looks truncated"
    lowered = headline.lower()
    if any(phrase in lowered for phrase in HEADLINE_BANNED):
        return "contains clickbait or roundup language"
    if re.search(r"(^|\W)(i|we|my|our|you|your)(\W|$)", lowered):
        return "uses first- or second-person framing"
    if headline.count(";") + headline.count("；") > 0:
        return "joins multiple claims with a semicolon"
    if language == "zh":
        cjk = sum(1 for char in headline if "\u4e00" <= char <= "\u9fff")
        if cjk < 6:
            return "is not a native Chinese headline"
    return None


def _headline_prompt(rows: list[dict], feedback: str = "") -> str:
    return (
        "Write the final display headlines for these already-selected AI briefing stories. "
        "Return ONLY a JSON array in input order with id, headline_en, headline_zh, and "
        "facts_supported. facts_supported must be true only when every claim and number in both "
        "headlines is explicitly supported by the supplied title or summary.\n"
        "Use the DataCube editorial strength without copying its wording: lead with the concrete "
        "event, name the entity and action/result, then include the single most useful number or "
        "qualification when present. Compress the edited summary; do not reuse publisher hype.\n"
        "English: a direct declarative headline, 28-100 characters. "
        "Simplified Chinese: write independently as a native Chinese news editor, 10-42 characters; "
        "do not translate English syntax or add spaces around Chinese words.\n"
        "Use one factual spine. No questions, first person, rhetorical framing, vague significance, "
        "semicolon chains, 'World First', 'And More', or unsupported superlatives. Preserve uncertainty "
        "with 'analysis links', 'reportedly', '据报道', or '分析显示' when the evidence is inferential. "
        "Do not add a fact that appears only plausible from background knowledge."
        + feedback
        + "\n\nSTORIES:\n"
        + json.dumps(rows, ensure_ascii=False)
    )


def add_headline_editorial(data: dict, batch_size: int = 4) -> int:
    """Rewrite both display languages from selected, fact-checked summaries."""
    items = data.get("items", [])
    by_id = {str(item.get("id")): item for item in items}
    curated = data.get("curated_ids") if isinstance(data.get("curated_ids"), dict) else {}
    selected_ids = list(dict.fromkeys(
        str(value)
        for section in ALLOWED_SECTIONS
        for value in curated.get(section, [])
    ))
    pending = [
        by_id[value] for value in selected_ids
        if value in by_id
        and int(by_id[value].get("headline_editorial_version") or 0) < HEADLINE_EDITORIAL_VERSION
        and by_id[value].get("specialized_quality_pass") is not False
    ]
    changed = 0
    for start in range(0, len(pending), batch_size):
        batch = pending[start:start + batch_size]
        rows = [{
            "id": item.get("id"),
            "source_title": item.get("source_title") or item.get("title_en") or item.get("title", ""),
            "edited_summary": _clip_body(item.get("summary_en") or item.get("summary", ""), 500),
            "source": item.get("source_name", ""),
            "section": item.get("section", "tech"),
        } for item in batch]
        feedback = ""
        accepted: set[str] = set()
        for attempt in range(3):
            try:
                response = parse_json_array(editor_complete(
                    _headline_prompt(rows, feedback),
                    "You are the bilingual headline desk for a factual AI intelligence briefing. Never invent facts.",
                    timeout=90,
                    max_tokens=REASONING_MAX_TOKENS,
                ))
            except Exception as error:
                print(f"  headline desk failed ({start}/{attempt + 1}): {error}")
                break
            rejected: list[str] = []
            for item, result in _pair_results(batch, response):
                item_id = str(item.get("id"))
                if item_id in accepted:
                    continue
                en = " ".join(str(result.get("headline_en") or "").split()).strip()
                zh = " ".join(str(result.get("headline_zh") or "").split()).strip()
                reasons = [reason for reason in (
                    _headline_rejection(en, "en"),
                    _headline_rejection(zh, "zh"),
                    None if result.get("facts_supported") is True else "facts_supported is not true",
                ) if reason]
                if reasons:
                    rejected.append(f"{item_id}: {', '.join(reasons)}")
                    continue
                if not item.get("source_title"):
                    item["source_title"] = item.get("title_en") or item.get("title", "")
                item["title"] = en
                item["title_en"] = en
                item["title_zh"] = zh
                item["headline_editorial_version"] = HEADLINE_EDITORIAL_VERSION
                accepted.add(item_id)
                changed += 1
            if len(accepted) == len(batch):
                break
            rows = [row for row in rows if str(row.get("id")) not in accepted]
            batch = [item for item in batch if str(item.get("id")) not in accepted]
            feedback = "\nThe previous reply was rejected for: " + "; ".join(rejected) + ". Rewrite those rows only."
    return changed


def _fit_specialized_summary(result: dict) -> dict:
    """Fit a model-written deck by whole sentences before generic validation."""
    summary = " ".join(str(result.get("summary") or "").split())
    if len(summary) <= SUMMARY_MAX:
        return result
    sentences = re.findall(r".+?[.!?。！？](?=\s|$)", summary)
    fitted = ""
    for sentence in sentences:
        candidate = f"{fitted} {sentence}".strip()
        if len(candidate) > SUMMARY_MAX:
            break
        fitted = candidate
    if len(fitted) >= SUMMARY_MIN:
        return {**result, "summary": fitted}
    return result


def add_specialized_editorial(data: dict, batch_size: int = 2) -> int:
    """Apply section-specific editing only after global selection and critic review."""
    items = data.get("items", [])
    by_id = {str(item.get("id")): item for item in items}
    curated = data.get("curated_ids") if isinstance(data.get("curated_ids"), dict) else {}
    changed = 0
    for section in (*ALLOWED_SECTIONS, "videos"):
        selected = [by_id[value] for value in curated.get(section, []) if value in by_id]
        pending = [
            item for item in selected
            if int(item.get("specialized_editorial_version") or 0) < SPECIALIZED_EDITORIAL_VERSION
        ]
        for start in range(0, len(pending), batch_size):
            batch = pending[start : start + batch_size]
            rows = [
                {
                    "id": item.get("id"),
                    "title": item.get("title_en") or item.get("title", ""),
                    "summary": _clip_body(item.get("summary_en") or item.get("summary", ""), 700),
                    "source": item.get("source_name", ""),
                    "published": item.get("published", ""),
                }
                for item in batch
            ]
            try:
                response = parse_json_array(
                    editor_complete(_specialized_prompt(section, rows),
                                    "You are a precise section editor. Never invent missing facts.",
                                    timeout=90, max_tokens=16384)
                )
            except Exception as error:
                print(f"  specialized editorial failed ({section}/{start}): {error}")
                continue
            for item, result in _pair_results(batch, response):
                if result.get("quality_pass") is not True:
                    item["specialized_quality_pass"] = False
                    item["specialized_editorial_version"] = SPECIALIZED_EDITORIAL_VERSION
                    changed += 1
                    continue
                result = _fit_specialized_summary(result)
                editorial = _editorial_fields(result, item)
                if "summary" not in editorial:
                    print(f"  specialized editorial rejected ({section}/{item.get('id')}): unusable summary")
                    continue
                item.update(editorial)
                item["editorial_version"] = EDITORIAL_VERSION
                item["specialized_editorial_version"] = SPECIALIZED_EDITORIAL_VERSION
                item["specialized_quality_pass"] = True
                if section == "investment" and isinstance(result.get("investment_details"), dict):
                    details = result["investment_details"]
                    clean = {
                        key: details.get(key, [] if key == "investors" else "")
                        for key in ("event_type", "company", "amount", "round", "valuation", "acquirer", "investors", "evidence")
                    }
                    item["investment_details"] = clean
                if section == "tips" and isinstance(result.get("action_steps"), list):
                    item["action_steps"] = [str(step).strip()[:240] for step in result["action_steps"] if str(step).strip()][:4]
                changed += 1
            # A batch can parse while omitting a row or returning prose outside
            # the summary bounds. Retry only those rows once, so one malformed
            # sibling cannot leave a selected public story unedited.
            for item in batch:
                if int(item.get("specialized_editorial_version") or 0) >= SPECIALIZED_EDITORIAL_VERSION:
                    continue
                row = {
                    "id": item.get("id"),
                    "title": item.get("title_en") or item.get("title", ""),
                    "summary": _clip_body(item.get("summary_en") or item.get("summary", ""), 700),
                    "source": item.get("source_name", ""),
                    "published": item.get("published", ""),
                }
                try:
                    retry = parse_json_array(
                        editor_complete(_specialized_prompt(section, [row]),
                                        "You are a precise section editor. Never invent missing facts.",
                                        timeout=90, max_tokens=16384)
                    )
                except Exception as error:
                    print(f"  specialized retry failed ({section}/{item.get('id')}): {error}")
                    continue
                if not retry:
                    continue
                result = _fit_specialized_summary(retry[0])
                editorial = _editorial_fields(result, item)
                if "summary" not in editorial:
                    continue
                item.update(editorial)
                item["editorial_version"] = EDITORIAL_VERSION
                item["specialized_editorial_version"] = SPECIALIZED_EDITORIAL_VERSION
                item["specialized_quality_pass"] = result.get("quality_pass") is True
                if section == "investment" and isinstance(result.get("investment_details"), dict):
                    item["investment_details"] = result["investment_details"]
                if section == "tips" and isinstance(result.get("action_steps"), list):
                    item["action_steps"] = [str(step).strip()[:240] for step in result["action_steps"] if str(step).strip()][:4]
                changed += 1
    return changed


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


def _needs_headline_rewrite(title: str) -> bool:
    title = " ".join((title or "").split())
    return bool(
        _is_slug_title(title)
        or len(title) > HEADLINE_MAX
        or title.endswith(("+", "...", "…"))
    )


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
        and _needs_headline_rewrite(item.get("title_en") or item.get("title") or "")
        and not _is_slug_title(headline)
    ):
        out["title"] = headline
        # Both fields, the way the summary above sets `summary` and `summary_en`.
        # Setting only `title` left the rewritten headline unread: the page and the
        # feeds resolve `title_en` first and fall back to `title`, so 23 measured
        # GitHub Trending rows kept rendering "microsoft/onnxruntime" while
        # "ONNX Runtime accelerates ML inference and training" sat unused in the
        # same record.
        out["title_en"] = headline
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
    if not (
        item.get("classification_source") == "llm"
        and int(item.get("editorial_version") or 0) >= EDITORIAL_VERSION
        and len(" ".join(str(item.get("summary") or "").split())) <= SUMMARY_MAX
    ):
        return False
    # Same shape of problem for the headline. 4 of 9 GitHub Trending rows were
    # already stamped by a run that predates the headline field, so they were
    # retired rendering "jundot/omlx" and only a version bump would revisit them.
    # Re-opening them asks once; `headline_checked` records that the question was
    # put, so an item the model declines to retitle -- a legitimate answer -- does
    # not come back every run the way an unstamped item would.
    if _needs_headline_rewrite(item.get("title_en") or item.get("title") or "") and not item.get("headline_checked"):
        return False
    return True


def _is_classified(item: dict) -> bool:
    return (
        item.get("classification_source") == "llm"
        and int(item.get("classification_version") or 0) >= CLASSIFICATION_VERSION
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
# that overlap heavily -- measured in published data, medium.json shares 145 of
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
    update = {
        "relevance": relevance,
        "classification_source": "llm",
        "classification_version": CLASSIFICATION_VERSION,
    }
    if result.get("section") in ALLOWED_SECTIONS:
        update["section"] = result["section"]
    if result.get("impact") in ALLOWED_IMPACTS:
        update["impact"] = result["impact"]
    for field in ("importance", "novelty", "evidence", "global_relevance", "practical_value", "source_credibility"):
        try:
            update[field] = max(0.0, min(1.0, float(result[field])))
        except (KeyError, TypeError, ValueError):
            pass
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
    # Set whether or not a headline came back: "this title needs no rewrite" is a
    # real answer, and re-asking it every run would bill for the same refusal.
    if _needs_headline_rewrite(item.get("title_en") or item.get("title") or ""):
        update["headline_checked"] = True
    item.update(update)
    return True


def _repair_slug_title_en(items: list[dict]) -> int:
    """Copy a rewritten headline into `title_en` where only `title` received it.

    Items enriched before `title_en` was written kept the slug in the field the
    page reads first, so the rewritten headline in `title` was never displayed and
    the resume filter would not revisit them -- it sees a good `title` and treats
    the item as done. Deterministic, so it costs no model call.
    """
    repaired = 0
    for item in items:
        title = " ".join(str(item.get("title") or "").split())
        title_en = " ".join(str(item.get("title_en") or "").split())
        if title and title_en and _is_slug_title(title_en) and not _is_slug_title(title):
            item["title_en"] = title
            repaired += 1
    return repaired


def enrich_file(path: Path, limit: int | None, batch_size: int) -> int:
    data = read_json(path, {}) or {}
    items = data.get("items", [])
    repaired = _repair_slug_title_en(items)
    if repaired:
        print(f"  repaired {repaired} title_en still holding a slug")
        write_json(path, data)
    # Resume: an item already carrying llm provenance was classified by an
    # earlier run, so a re-run after a partial failure only pays for the rest.
    # The version gate re-opens items classified before the editorial fields
    # existed -- without it the whole standing file keeps its raw feed prose
    # forever, since provenance alone marks them done.
    pending = [item for item in items if not _is_classified(item)]
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
        data["items"] = rank_items(items)
        write_json(path, data)
        # Coverage, not just the change count: a run where every reply omitted the
        # editorial fields still reports changes, because relevance and section
        # applied. That is the failure worth seeing in the log rather than having
        # to diff the data to find it.
        classified = sum(1 for item in items if _is_classified(item))
        print(f"  {path.name}: {classified} of {len(items)} items classified")
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
        add_specialized_editorial(data, batch_size=2)
        add_headline_editorial(data)
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
    parser.add_argument("--specialized-only", action="store_true", help="Edit only the current curated shortlist")
    parser.add_argument("--headlines-only", action="store_true", help="Rewrite bilingual headlines for the current curated shortlist")
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
    elif args.headlines_only:
        written = 0
        for path in files:
            if not path.exists():
                continue
            data = read_json(path, {}) or {}
            written += add_headline_editorial(data)
            write_json(path, data)
        print(f"rewrote {written} bilingual headline(s)")
    elif args.specialized_only:
        written = 0
        for path in files:
            if not path.exists():
                continue
            data = read_json(path, {}) or {}
            written += add_specialized_editorial(data, batch_size=2)
            write_json(path, data)
        print(f"specialized {written} item(s)")
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
