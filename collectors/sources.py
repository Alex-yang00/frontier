from __future__ import annotations

import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from collectors.arxiv import collect as collect_arxiv
from collectors.github import collect as collect_github
from collectors.hn import collect as collect_hn
from collectors.rss import collect as collect_rss
from collectors.sitemap import collect as collect_sitemap
from collectors.youtube import collect as collect_youtube


RSS_SOURCES = [
    ("simon_willison", "Simon Willison", "https://simonwillison.net/atom/everything/", ["developer-tools"]),
    ("the_decoder", "The Decoder", "https://the-decoder.com/feed", ["industry"]),
    ("huggingface", "Hugging Face", "https://huggingface.co/blog/feed.xml", ["open-source"]),
    ("openai", "OpenAI Blog", "https://openai.com/news/rss.xml", ["official"]),
    ("deepmind", "Google DeepMind", "https://deepmind.google/blog/rss.xml", ["official", "research"]),
    ("venturebeat", "VentureBeat", "https://venturebeat.com/feed", ["industry"]),
    ("verge_ai", "The Verge AI", "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", ["industry"]),
    ("qbitai", "量子位", "https://www.qbitai.com/feed", ["china"]),
    ("technode", "TechNode", "https://technode.com/feed/", ["china"]),
    ("bens_bites", "Ben's Bites", "https://www.bensbites.com/feed", ["industry"]),
    ("the_neuron", "The Neuron", "https://www.theneuron.ai/feed", ["industry"]),
    ("whytryai", "WhyTryAI", "https://www.whytryai.com/feed", ["industry"]),
    ("one_useful_thing", "One Useful Thing", "https://www.oneusefulthing.org/feed", ["workflow"]),
    ("chinatalk", "ChinaTalk", "https://www.chinatalk.media/feed", ["geopolitics"]),
    ("techmeme", "Techmeme", "https://www.techmeme.com/feed.xml", ["industry"]),
    ("ars_ai", "Ars Technica AI", "https://arstechnica.com/ai/feed/", ["industry"]),
    ("mit_ai", "MIT Technology Review AI", "https://www.technologyreview.com/topic/artificial-intelligence/feed", ["research", "industry"]),
    ("ieee_ai", "IEEE Spectrum AI", "https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss", ["research"]),
    ("google_ai", "Google AI", "https://blog.google/technology/ai/rss/", ["official"]),
    ("anthropic", "Anthropic", "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml", ["official"]),
    ("register_ai", "The Register AI", "https://www.theregister.com/software/ai_ml/headlines.atom", ["industry"]),
    # 36kr is dropped rather than repointed: every feed path it publishes
    # (/feed, /feed-newsflash, /feed-ai) serves obfuscated anti-bot JavaScript
    # instead of XML, so the parse fails identically on all of them.
    ("pandaily", "Pandaily", "https://pandaily.com/feed", ["china"]),
    ("techcrunch_ai", "TechCrunch AI", "https://techcrunch.com/category/artificial-intelligence/feed/", ["industry"]),
    ("tech_eu", "Tech.eu", "https://tech.eu/feed/", ["industry", "europe"]),
    ("nates_newsletter", "Nate's Newsletter", "https://natesnewsletter.substack.com/feed", ["industry", "workflow"]),
    ("techcrunch_fundraising", "TechCrunch Fundraising", "https://techcrunch.com/category/fundraising/feed/", ["investment"]),
    ("techcrunch_ma", "TechCrunch M&A", "https://techcrunch.com/tag/mergers-and-acquisitions/feed/", ["investment"]),
    ("globenewswire_ma", "GlobeNewswire M&A", "https://www.globenewswire.com/RssFeed/subjectcode/15-Mergers%20and%20Acquisitions/feedTitle/GlobeNewswire%20-%20Mergers%20and%20Acquisitions", ["investment"]),
]

SITEMAP_SOURCES = [
    ("prime_intellect", "Prime Intellect", "https://primeintellect.ai/sitemap.xml", "/blog/", ["official", "research"]),
]

FAST_RSS_SOURCES = [
    ("reddit_chatgpt", "Reddit r/ChatGPT", "https://www.reddit.com/r/ChatGPT/top/.rss?t=day", ["community", "workflow"]),
    ("reddit_chatgptpro", "Reddit r/ChatGPTPro", "https://www.reddit.com/r/ChatGPTPro/top/.rss?t=day", ["community", "workflow"]),
    ("reddit_claudeai", "Reddit r/ClaudeAI", "https://www.reddit.com/r/ClaudeAI/top/.rss?t=day", ["community", "workflow"]),
    ("reddit_promptengineering", "Reddit r/PromptEngineering", "https://www.reddit.com/r/PromptEngineering/top/.rss?t=day", ["community", "workflow"]),
]

YOUTUBE_CHANNELS = [
    ("youtube_ai_explained", "AI Explained", "aiexplained-official"),
    ("youtube_matt_wolfe", "Matt Wolfe", "mreflow"),
    ("youtube_ai_daily_brief", "The AI Daily Brief", "AIDailyBrief"),
    ("youtube_fireship", "Fireship", "Fireship"),
    ("youtube_two_minute_papers", "Two Minute Papers", "TwoMinutePapers"),
    ("youtube_bycloud", "bycloud", "bycloudAI"),
    ("youtube_cole_medin", "Cole Medin", "ColeMedin"),
    ("youtube_indydevdan", "IndyDevDan", "indydevdan"),
    ("youtube_wes_roth", "Wes Roth", "WesRoth"),
    ("youtube_matthew_berman", "Matthew Berman", "matthew_berman"),
    ("youtube_sam_witteveen", "Sam Witteveen", "samwitteveenai"),
    ("youtube_futurepedia", "Futurepedia", "futurepedia_io"),
    ("youtube_mlst", "Machine Learning Street Talk", "MachineLearningStreetTalk"),
    ("youtube_3blue1brown", "3Blue1Brown", "3blue1brown"),
    ("youtube_andrej_karpathy", "Andrej Karpathy", "AndrejKarpathy"),
]

REDDIT_SPACING_SECONDS = 75
REDDIT_RETRY_DELAY_SECONDS = 120
RSS_WORKERS = 6


def _collect_rss_entry(entry: tuple) -> tuple[str, list]:
    source, name, url, tags = entry
    found = collect_rss(url, source, name, tags)
    if source == "qbitai":
        for item in found:
            item.lang = "zh"
    return source, found


def known_source_keys() -> set[str]:
    """Every source key any group can report health for.

    meta.json merges each group's health into one map, because a group only knows
    its own sources. Nothing pruned it, so a source removed from the registry kept
    its last failure in meta.json forever -- 36kr went on being reported as a
    failing source after it was dropped. Callers use this to drop keys no source
    produces any more.
    """
    keys = {"hacker_news", "github_trending", "arxiv", "youtube"}
    keys.update(entry[0] for entry in RSS_SOURCES)
    keys.update(entry[0] for entry in FAST_RSS_SOURCES)
    keys.update(entry[0] for entry in SITEMAP_SOURCES)
    return keys


def collect_group(group: str) -> tuple[list, dict[str, dict]]:
    items, health = [], {}
    sources = [("hacker_news", "Hacker News", "", ["community"])] if group == "fast" else []
    if group == "medium":
        with ThreadPoolExecutor(max_workers=RSS_WORKERS) as executor:
            futures = {executor.submit(_collect_rss_entry, entry): entry for entry in RSS_SOURCES}
            for future in as_completed(futures):
                entry = futures[future]
                source = entry[0]
                try:
                    _, found = future.result()
                    items.extend(found)
                    health[source] = {"ok": True, "items": len(found)}
                except Exception as error:
                    health[source] = {"ok": False, "error": str(error)[:180]}
        for source, name, url, path_prefix, tags in SITEMAP_SOURCES:
            try:
                found = collect_sitemap(url, source, name, path_prefix, tags)
                items.extend(found)
                health[source] = {"ok": True, "items": len(found)}
            except Exception as error:
                health[source] = {"ok": False, "error": str(error)[:180]}
        sources = []
    for entry in sources:
        source, name = entry[0], entry[1]
        try:
            if source == "hacker_news":
                found = collect_hn()
            else:
                source_entry = next(row for row in RSS_SOURCES if row[0] == source)
                _, found = _collect_rss_entry(source_entry)
            items.extend(found); health[source] = {"ok": True, "items": len(found)}
        except Exception as error:
            health[source] = {"ok": False, "error": str(error)[:180]}
    if group == "fast":
        failed_reddit = []
        for index, entry in enumerate(FAST_RSS_SOURCES):
            if index:
                time.sleep(REDDIT_SPACING_SECONDS)
            source, name, url, tags = entry
            try:
                found = collect_rss(url, source, name, tags, limit=15)
                items.extend(found)
                health[source] = {"ok": True, "items": len(found)}
            except Exception as error:
                failed_reddit.append(entry)
                health[source] = {"ok": False, "error": str(error)[:180]}
        if failed_reddit:
            time.sleep(REDDIT_RETRY_DELAY_SECONDS)
            for index, entry in enumerate(failed_reddit):
                if index:
                    time.sleep(REDDIT_SPACING_SECONDS)
                source, name, url, tags = entry
                try:
                    found = collect_rss(url, source, name, tags, limit=15)
                    items.extend(found)
                    health[source] = {"ok": True, "items": len(found), "retried": True}
                except Exception as error:
                    health[source] = {"ok": False, "error": str(error)[:180], "retried": True}
        try:
            found = collect_github(); items.extend(found); health["github_trending"] = {"ok": True, "items": len(found)}
        except Exception as error:
            health["github_trending"] = {"ok": False, "error": str(error)[:180]}
    if group == "slow":
        try:
            found = collect_arxiv(); items.extend(found); health["arxiv"] = {"ok": True, "items": len(found)}
        except Exception as error:
            health["arxiv"] = {"ok": False, "error": str(error)[:180]}
    # Videos collect on the medium cadence, not the slow one. collect-slow runs at
    # 01:30 UTC, when "today" is 90 minutes old and has essentially no videos yet, so
    # the freshest thing a scheduled run could ever find was the previous day's --
    # a same-day video was arithmetically impossible regardless of any filter.
    # Medium runs every 6 hours, so a morning upload is collected the same morning.
    # Quota is not the constraint: ~232 units per run (15 channels.list + 15
    # playlistItems.list + 2 search.list at 100 + videos.list) against a 10,000/day
    # allowance, so 4 runs spend about 9%.
    if group == "medium":
        try:
            found = collect_youtube(YOUTUBE_CHANNELS)
            items.extend(found)
            health["youtube"] = {"ok": True, "items": len(found)}
            if not os.environ.get("FRONTIER_YOUTUBE_API_KEY"):
                health["youtube"]["skipped"] = "FRONTIER_YOUTUBE_API_KEY not set"
        except Exception as error:
            health["youtube"] = {"ok": False, "error": str(error)[:180]}
    return items, health
