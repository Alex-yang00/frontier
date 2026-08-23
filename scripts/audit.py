"""Measure the qualities the homepage depends on, and fail when one regresses.

Quality had no measurement: the only check was opening the page and reading it,
which catches a bad day only after it ships and cannot say whether the day got
better or worse than the last one. Every check here is a property the homepage
actually renders off, so a pass means the page can be good and a fail names the
reason it is not.

Run after the collect workflows commit and publish, never before: a failure here
must not discard the LLM work the run just paid for.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# Mirrors SLUG_TITLE_RE in scripts/enrich.py and web/components/editorial-home.tsx.
# A title that is only "owner/project" or a filename is not a headline.
SLUG_TITLE_RE = re.compile(r"^[\w.-]+/[\w.-]+$|^[\w.-]+\.[a-z]{2,4}$")

# Kept equal to SUMMARY_MAX in scripts/enrich.py and STORY_DECK_LIMIT in
# web/components/editorial-home.tsx: past this the page cuts the deck itself.
SUMMARY_MAX = 320

SECTIONS = ("tech", "investment", "tips", "policy")
LANGUAGES = ("en", "zh")

# Kept equal to VIDEO_WINDOW_DAYS in web/components/editorial-home.tsx. A newest
# video older than this cannot appear on the newest day's rail at all.
VIDEO_WINDOW_DAYS = 2

# The fast group runs every 30 minutes, so three consecutive misses means the
# pipeline stopped rather than ran late.
STALE_AFTER_MINUTES = 95

# A day is judged on enrichment only once it has had time to be enriched. Before
# that, a low rate means "still filling", which is not a defect.
GRACE_HOURS = 6

# Rates the complete days in the live file already hold, rounded down to leave
# headroom: enrichment ran 92-100% per day and Chinese summaries 98-100%. A day
# below these has lost work rather than merely finished late.
MIN_ENRICHED_RATE = 0.90
MIN_TRANSLATED_RATE = 0.95

# The newest day is judged on the share of its rows that render, not on how many
# it holds: a short day is the honest state of a stream still filling, while a day
# whose rows are mostly unenriched is a broken page at any length. Measured
# 2026-08-23 at 06:00 UTC, the newest day held 7 tech articles with 1 presentable
# -- 14%, which is the defect. Complete days run 92-100%.
MIN_PRESENTABLE_RATE_NEWEST_DAY = 0.6

# Below this the rate is too small a sample to mean anything, and a day that has
# only just begun should not read as a regression.
NEWEST_DAY_RATE_MIN_SAMPLE = 4


class Report:
    """Collected findings. `failures` decide the exit code; warnings only inform."""

    def __init__(self) -> None:
        self.failures: list[str] = []
        self.warnings: list[str] = []
        self.facts: list[str] = []

    def failure(self, message: str) -> None:
        self.failures.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def fact(self, message: str) -> None:
        self.facts.append(message)


def _day(item: dict) -> str:
    return str(item.get("published") or "")[:10]


def _text(item: dict, language: str, field: str) -> str:
    return str(item.get(f"{field}_{language}") or item.get(field) or "").strip()


def _is_slug(title: str) -> bool:
    title = " ".join(title.split())
    if not title:
        return False
    if SLUG_TITLE_RE.match(title):
        return True
    # A word-count test means nothing in a script without spaces, and calling a
    # Chinese headline a slug would be wrong in the one language it reads best.
    if any("一" <= char <= "鿿" for char in title):
        return False
    return " " not in title


def _presentable(item: dict, language: str) -> bool:
    """The same test the homepage applies before it will render a row as finished."""
    title = _text(item, language, "title")
    if not title or _is_slug(title):
        return False
    return bool(_text(item, language, "summary"))


def _age_hours(timestamp: str) -> float | None:
    try:
        parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError:
        return None
    return (datetime.now(timezone.utc) - parsed).total_seconds() / 3600


def check_freshness(data: dict, report: Report) -> None:
    """The file must be about today, and must have been written recently."""
    today = datetime.now(timezone.utc).date().isoformat()
    date = str(data.get("date") or "")
    if date != today:
        report.failure(f"daily.json date is {date or 'missing'}, expected {today}")
    else:
        report.fact(f"date {date} is today")

    age = _age_hours(str(data.get("updated_at") or ""))
    if age is None:
        report.failure("daily.json has no readable updated_at")
    elif age * 60 > STALE_AFTER_MINUTES:
        report.failure(f"last write was {age * 60:.0f} min ago, over the {STALE_AFTER_MINUTES} min bound")
    else:
        report.fact(f"written {age * 60:.0f} min ago")


def check_newest_day(items: list[dict], report: Report) -> None:
    """Whatever the newest day is, it has to carry a page worth reading.

    The homepage opens on the newest day the section holds, so this is the page a
    visitor actually lands on. Only `tech` is required to fill it: the narrower
    sections legitimately run a day behind on a slow news day.
    """
    articles = [item for item in items if not item.get("is_video") and (item.get("section") or "tech") == "tech"]
    days = sorted({_day(item) for item in articles if _day(item)}, reverse=True)
    if not days:
        report.failure("no tech articles carry a usable published date")
        return
    newest = days[0]
    ready = sum(1 for item in articles if _day(item) == newest and _presentable(item, "en"))
    total = sum(1 for item in articles if _day(item) == newest)
    if total < NEWEST_DAY_RATE_MIN_SAMPLE:
        report.fact(f"newest tech day {newest}: {ready}/{total} presentable, too few to rate")
        return
    rate = ready / total
    if rate < MIN_PRESENTABLE_RATE_NEWEST_DAY:
        report.failure(
            f"newest tech day {newest}: {ready} of {total} articles render as finished rows "
            f"({rate:.0%}), under {MIN_PRESENTABLE_RATE_NEWEST_DAY:.0%} — the front page opens on broken rows"
        )
    else:
        report.fact(f"newest tech day {newest}: {ready}/{total} presentable ({rate:.0%})")

    # Chinese is half the product, and nothing rated it: the gate above reads `en`
    # only, so a newest day whose Chinese rows all failed to render passed. Counts a
    # row that renders via English fallback as rendering, the way the page does. A
    # warning rather than a failure because translate runs after enrich inside the
    # same job and carries its own --limit, so zh legitimately trails en for one
    # run. A hole that outlives the grace window fails in check_completed_days.
    ready_zh = sum(1 for item in articles if _day(item) == newest and _presentable(item, "zh"))
    if ready_zh < ready:
        report.warn(
            f"newest tech day {newest}: {ready_zh}/{total} presentable in Chinese "
            f"against {ready}/{total} in English — zh is behind"
        )
    else:
        report.fact(f"newest tech day {newest}: {ready_zh}/{total} presentable in Chinese")


def check_completed_days(items: list[dict], report: Report) -> None:
    """Days past the grace window must be fully enriched and fully translated.

    A day still inside the window is allowed to be incomplete: the pipeline fills a
    day over its whole span, so a low rate there means "in progress", not "broken".
    Past it, a shortfall is work that was dropped and will not come back on its own.
    """
    by_day: dict[str, list[dict]] = {}
    for item in items:
        day = _day(item)
        if day:
            by_day.setdefault(day, []).append(item)

    for day in sorted(by_day, reverse=True):
        group = by_day[day]
        newest_fetch = max((str(item.get("fetched_at") or "") for item in group), default="")
        age = _age_hours(newest_fetch)
        if age is None or age < GRACE_HOURS:
            report.fact(f"{day}: {len(group)} items, inside the {GRACE_HOURS}h grace window")
            continue

        enriched = sum(1 for item in group if item.get("editorial_version"))
        translated = sum(1 for item in group if str(item.get("summary_zh") or "").strip())
        enriched_rate = enriched / len(group)
        translated_rate = translated / len(group)
        if enriched_rate < MIN_ENRICHED_RATE:
            report.failure(
                f"{day}: {enriched}/{len(group)} enriched ({enriched_rate:.0%}), "
                f"under {MIN_ENRICHED_RATE:.0%}"
            )
        if translated_rate < MIN_TRANSLATED_RATE:
            report.failure(
                f"{day}: {translated}/{len(group)} have Chinese summaries "
                f"({translated_rate:.0%}), under {MIN_TRANSLATED_RATE:.0%}"
            )
        # Summaries were rated but titles were not, so a row could pass on a Chinese
        # deck while its headline resolved to a slug. This asks the narrower question
        # the page asks: does the row render for a Chinese reader at all. English
        # text reached by fallback counts, exactly as it does on the page --
        # translated-but-identical text is a separate defect, warned in
        # check_rendered_text. Rated on the same bound as summaries.
        titled_zh = sum(1 for item in group if _presentable(item, "zh"))
        titled_rate = titled_zh / len(group)
        if titled_rate < MIN_TRANSLATED_RATE:
            report.failure(
                f"{day}: {titled_zh}/{len(group)} render as finished Chinese rows "
                f"({titled_rate:.0%}), under {MIN_TRANSLATED_RATE:.0%}"
            )
        if (
            enriched_rate >= MIN_ENRICHED_RATE
            and translated_rate >= MIN_TRANSLATED_RATE
            and titled_rate >= MIN_TRANSLATED_RATE
        ):
            report.fact(f"{day}: {enriched}/{len(group)} enriched, {translated}/{len(group)} translated")


def check_rendered_text(items: list[dict], report: Report) -> None:
    """Catch the specific text defects that make a finished row read as broken."""
    over_length = [item for item in items if len(_text(item, "en", "summary")) > SUMMARY_MAX]
    if over_length:
        report.warn(
            f"{len(over_length)} summaries exceed {SUMMARY_MAX} chars, so the page cuts them: "
            + ", ".join(str(item.get("id")) for item in over_length[:3])
        )

    # A slug on an item that was never enriched is just a raw title waiting its
    # turn, so it stays a warning. A slug on an *enriched* item is a defect: the
    # rewrite was paid for and did not reach the field the page reads. That is
    # exactly the bug where `_editorial_fields` set `title` but not `title_en`, and
    # 23 GitHub rows rendered "microsoft/onnxruntime" while the headline sat unused
    # in the same record. It shipped as a warning nobody had to act on, so it gates
    # now -- and the resume filter retires those items, so it cannot self-heal.
    slugs = [item for item in items if _is_slug(_text(item, "en", "title"))]
    enriched_slugs = [item for item in slugs if item.get("editorial_version")]
    raw_slugs = [item for item in slugs if not item.get("editorial_version")]
    if enriched_slugs:
        report.failure(
            f"{len(enriched_slugs)} enriched items still show a slug where the page reads the "
            "headline, so the rewrite never reached title_en: "
            + ", ".join(_text(item, "en", "title") for item in enriched_slugs[:3])
        )
    if raw_slugs:
        report.warn(
            f"{len(raw_slugs)} unenriched titles are still repository slugs rather than headlines: "
            + ", ".join(_text(item, "en", "title") for item in raw_slugs[:3])
        )

    # A summary repeated across both languages means one language never got its own
    # text, which reads as untranslated rather than as a translation.
    untranslated = [
        item
        for item in items
        if _text(item, "zh", "summary") and _text(item, "zh", "summary") == _text(item, "en", "summary")
    ]
    if untranslated:
        report.warn(f"{len(untranslated)} items carry identical English and Chinese summaries")


def check_video_freshness(items: list[dict], report: Report) -> None:
    """The newest video must be recent enough to reach the newest day's rail."""
    videos = [item for item in items if item.get("is_video") and _day(item)]
    if not videos:
        report.failure("the file holds no videos at all")
        return
    newest_video = max(_day(item) for item in videos)
    newest_day = max((_day(item) for item in items if _day(item)), default="")
    lag = (
        datetime.fromisoformat(newest_day).date() - datetime.fromisoformat(newest_video).date()
    ).days
    if lag > VIDEO_WINDOW_DAYS:
        report.failure(
            f"newest video is {newest_video}, {lag} days behind {newest_day} — "
            f"outside the {VIDEO_WINDOW_DAYS}-day window, so no video can render on the newest day"
        )
    else:
        report.fact(f"newest video {newest_video}, {lag} day(s) behind the newest day")


def check_briefings(data: dict, items: list[dict], report: Report) -> None:
    """Each section with content on the current day should have a briefing in both languages."""
    date = str(data.get("date") or "")
    briefings = (data.get("daily_throughlines") or {}).get(date) or {}
    present = {(item.get("section") or "tech") for item in items if _day(item) == date}
    for section in SECTIONS:
        if section not in present:
            continue
        entry = briefings.get(section) or {}
        missing = [language for language in LANGUAGES if not str(entry.get(language) or "").strip()]
        if missing:
            report.warn(f"{date} {section}: briefing missing for {', '.join(missing)}")


def check_archive_coverage(data_dir: Path, report: Report) -> None:
    """Every date the rail offers must have an archive file behind it.

    The rail is built from archive filenames on the data branch, but the site reads
    R2, and only collect-slow publishes the whole rail. So a date could reach the
    rail while its file existed only on the branch, and clicking it opened a failed
    fetch -- which is what happened to the restored 2026-08-18. collect-slow now
    publishes every date the rail names; this is the check that says it worked.

    A file is judged by whether it parses and holds items, not by its presence: an
    empty or truncated upload fetches with a 200 and renders as a blank day.
    """
    rail_path = data_dir / "weeks.json"
    if not rail_path.exists():
        report.warn("weeks.json is absent, so the date rail cannot be checked")
        return
    try:
        weeks = (json.loads(rail_path.read_text(encoding="utf-8")) or {}).get("weeks") or []
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        report.failure(f"weeks.json does not parse: {error}")
        return

    dates = [str(week.get("id") or "") for week in weeks]
    broken = []
    for date in [date for date in dates if date]:
        path = data_dir / "archive" / f"{date}.json"
        if not path.exists():
            broken.append(f"{date} (no file)")
            continue
        try:
            archived = json.loads(path.read_text(encoding="utf-8")) or {}
        except (json.JSONDecodeError, UnicodeDecodeError):
            broken.append(f"{date} (does not parse)")
            continue
        if not (archived.get("items") or []):
            broken.append(f"{date} (holds no items)")
    if broken:
        report.failure(
            f"{len(broken)} of {len(dates)} dates on the rail open to nothing: " + ", ".join(broken[:4])
        )
    else:
        report.fact(f"all {len(dates)} dates on the rail have a readable archive")


def check_sources(meta: dict, report: Report) -> None:
    """Report failing sources. A handful is normal; losing many at once is not."""
    health = meta.get("source_health") or {}
    if not health:
        report.warn("meta.json carries no source_health")
        return
    failing = {name: str(entry.get("error") or "")[:60] for name, entry in health.items() if not entry.get("ok")}
    ok_count = len(health) - len(failing)
    report.fact(f"sources healthy: {ok_count}/{len(health)}")
    for name, error in sorted(failing.items()):
        report.warn(f"source {name} failing: {error}")
    # Losing a quarter of the feeds changes what the page can cover, so it is a
    # failure rather than a note even though each individual feed is only a warning.
    if len(health) and len(failing) / len(health) > 0.25:
        report.failure(f"{len(failing)} of {len(health)} sources are failing")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("data_dir", type=Path, nargs="?", default=Path("web/public/data"))
    parser.add_argument(
        "--warn-only",
        action="store_true",
        help="Report findings but always exit 0, for inspecting a run without gating it",
    )
    args = parser.parse_args()

    daily_path = args.data_dir / "daily.json"
    if not daily_path.exists():
        print(f"audit: {daily_path} does not exist", file=sys.stderr)
        return 1
    data = json.loads(daily_path.read_text(encoding="utf-8"))
    items = data.get("items") or []
    if not items:
        print("audit: daily.json holds no items", file=sys.stderr)
        return 1

    meta_path = args.data_dir / "meta.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}

    report = Report()
    check_freshness(data, report)
    check_newest_day(items, report)
    check_completed_days(items, report)
    check_rendered_text(items, report)
    check_video_freshness(items, report)
    check_briefings(data, items, report)
    check_archive_coverage(args.data_dir, report)
    check_sources(meta, report)

    for fact in report.facts:
        print(f"  ok      {fact}")
    for warning in report.warnings:
        print(f"  warn    {warning}")
    for failure in report.failures:
        print(f"  FAIL    {failure}")
    print(
        f"\naudit: {len(report.failures)} failures, {len(report.warnings)} warnings, "
        f"{len(items)} items in {daily_path}"
    )
    if report.failures and not args.warn_only:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
