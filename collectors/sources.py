from __future__ import annotations

from collectors.arxiv import collect as collect_arxiv
from collectors.github import collect as collect_github
from collectors.hn import collect as collect_hn
from collectors.rss import collect as collect_rss


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
    ("36kr", "36氪", "https://36kr.com/feed", ["china"]),
    ("pandaily", "Pandaily", "https://pandaily.com/feed", ["china"]),
    ("techcrunch_fundraising", "TechCrunch Fundraising", "https://techcrunch.com/category/fundraising/feed/", ["investment"]),
    ("techcrunch_ma", "TechCrunch M&A", "https://techcrunch.com/tag/mergers-and-acquisitions/feed/", ["investment"]),
    ("globenewswire_ma", "GlobeNewswire M&A", "https://www.globenewswire.com/RssFeed/subjectcode/15-Mergers%20and%20Acquisitions/feedTitle/GlobeNewswire%20-%20Mergers%20and%20Acquisitions", ["investment"]),
]

FAST_RSS_SOURCES = [
    ("reddit_chatgpt", "Reddit r/ChatGPT", "https://www.reddit.com/r/ChatGPT/.rss?t=day", ["community", "workflow"]),
    ("reddit_chatgptpro", "Reddit r/ChatGPTPro", "https://www.reddit.com/r/ChatGPTPro/.rss?t=day", ["community", "workflow"]),
    ("reddit_claudeai", "Reddit r/ClaudeAI", "https://www.reddit.com/r/ClaudeAI/.rss?t=day", ["community", "workflow"]),
    ("reddit_promptengineering", "Reddit r/PromptEngineering", "https://www.reddit.com/r/PromptEngineering/.rss?t=day", ["community", "workflow"]),
]


def collect_group(group: str) -> tuple[list, dict[str, dict]]:
    items, health = [], {}
    sources = [("hacker_news", "Hacker News", "", ["community"])] if group == "fast" else []
    if group == "fast":
        sources.extend(FAST_RSS_SOURCES)
    if group == "medium":
        sources = RSS_SOURCES
    for entry in sources:
        source, name = entry[0], entry[1]
        try:
            if source == "hacker_news":
                found = collect_hn()
            elif source.startswith("reddit_"):
                found = collect_rss(entry[2], source, name, entry[3], limit=15)
            else:
                source_entry = next(row for row in RSS_SOURCES if row[0] == source)
                found = collect_rss(source_entry[2], source, name, source_entry[3])
                if source == "qbitai":
                    for item in found:
                        item.lang = "zh"
            items.extend(found); health[source] = {"ok": True, "items": len(found)}
        except Exception as error:
            health[source] = {"ok": False, "error": str(error)[:180]}
    if group == "fast":
        try:
            found = collect_github(); items.extend(found); health["github_trending"] = {"ok": True, "items": len(found)}
        except Exception as error:
            health["github_trending"] = {"ok": False, "error": str(error)[:180]}
    if group == "slow":
        try:
            found = collect_arxiv(); items.extend(found); health["arxiv"] = {"ok": True, "items": len(found)}
        except Exception as error:
            health["arxiv"] = {"ok": False, "error": str(error)[:180]}
    return items, health
