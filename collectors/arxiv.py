from __future__ import annotations

from collectors.rss import collect as collect_rss


def collect(limit: int = 30) -> list:
    return collect_rss("https://export.arxiv.org/rss/cs.AI", "arxiv", "arXiv", ["research", "paper"], limit)
