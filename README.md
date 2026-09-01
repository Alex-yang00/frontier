<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./web/public/logo/frontier-lockup-dark.svg">
    <img src="./web/public/logo/frontier-lockup-light.svg" width="280" alt="Frontier">
  </picture>
</p>

# Frontier

Frontier is an open AI intelligence stream. It continuously collects public
sources, deduplicates related events, ranks their relevance, and publishes a
quality-gated feed in English and Simplified Chinese.

**[Read the latest AI news at frontiermemo.com](https://frontiermemo.com)**

> Frontier uses AI-assisted classification, translation, curation, and
> synthesis. Important claims should always be verified with the linked
> original publisher.

## Use Frontier With An Agent

Frontier is available as a standalone Agent Skill. Give an agent this prompt:

```text
Read https://raw.githubusercontent.com/Alex-yang00/frontier/main/skills/frontier/SKILL.md,
then use Frontier to get the latest important news in the AI industry.
```

## How Stories Are Scored

Every candidate receives a score from 0 to 100:

```text
score = clamp(0, 100,
  source_quality
  + popularity
  + freshness
  + high_signal_terms
  + AI_relevance
)
```

| Component | Range | Calculation |
| --- | ---: | --- |
| Source quality | 13-30 | Established first-party and specialist sources receive higher prior weights; unknown sources default to 15. |
| Popularity | 0-25 | Text: `min(25, points // 20 + comments // 15)`. Video: `min(25, floor(8 x log10(views / 1,000)))` for at least 1,000 views. |
| Freshness | 0-25 | `max(0, 25 - floor(age_hours / 4))`. The score falls by one point every four hours. |
| High-signal terms | 0-20 | Weighted terms such as release, launch, funding, acquisition, security, benchmark, and open source. |
| AI relevance | 0-15 | `round(model_relevance x 15)`, where model relevance is constrained to 0-1. |

Source quality is a prior, not an editorial verdict. Popularity is capped so a
single network cannot dominate, freshness decays automatically, and the final
published shortlist must also pass bilingual editorial review, source-diversity
checks, deduplication, and section-level quality gates.

Frontier's code is MIT licensed. Frontier-authored editorial fields are
available under CC BY 4.0; third-party material remains subject to publisher
rights. See [DATA_LICENSE.md](DATA_LICENSE.md) for details.
