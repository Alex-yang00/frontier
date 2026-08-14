from __future__ import annotations

from collectors.arxiv import collect as collect_arxiv
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
]


def collect_group(group: str) -> tuple[list, dict[str, dict]]:
    items, health = [], {}
    sources = [("hacker_news", "Hacker News") ] if group == "fast" else []
    if group == "medium":
        sources = RSS_SOURCES
    for entry in sources:
        source, name = entry[0], entry[1]
        try:
            if source == "hacker_news":
                found = collect_hn()
            else:
                source_entry = next(row for row in RSS_SOURCES if row[0] == source)
                found = collect_rss(source_entry[2], source, name, source_entry[3])
                if source == "qbitai":
                    for item in found:
                        item.lang = "zh"
            items.extend(found); health[source] = {"ok": True, "items": len(found)}
        except Exception as error:
            health[source] = {"ok": False, "error": str(error)[:180]}
    if group == "slow":
        try:
            found = collect_arxiv(); items.extend(found); health["arxiv"] = {"ok": True, "items": len(found)}
        except Exception as error:
            health["arxiv"] = {"ok": False, "error": str(error)[:180]}
    return items, health
