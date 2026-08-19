from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@dataclass
class Item:
    id: str
    title: str
    url: str
    source: str
    source_name: str
    tags: list[str] = field(default_factory=list)
    published: str = ""
    fetched_at: str = field(default_factory=utc_now)
    summary: str = ""
    lang: str = "en"
    score: int = 0
    impact: str = "medium"
    relevance: float | None = None
    section: str = "tech"
    points: int | None = None
    comments: int | None = None
    title_en: str = ""
    title_zh: str = ""
    summary_en: str = ""
    summary_zh: str = ""
    event_summary_en: str = ""
    event_summary_zh: str = ""
    event_sources: list[dict[str, Any]] = field(default_factory=list)
    is_video: bool = False
    video_id: str = ""
    video_duration: str = ""
    video_view_count: str = ""
    video_thumbnail_url: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "Item":
        fields = cls.__dataclass_fields__
        return cls(**{key: value[key] for key in fields if key in value})
