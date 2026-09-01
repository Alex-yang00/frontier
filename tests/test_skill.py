import json
from pathlib import Path

import yaml


SKILL = Path("skills/frontier/SKILL.md")


def test_frontier_skill_has_valid_metadata_and_canonical_endpoints():
    text = SKILL.read_text(encoding="utf-8")
    _empty, frontmatter, body = text.split("---", 2)
    metadata = yaml.safe_load(frontmatter)

    assert metadata["name"] == "frontier"
    assert "today's AI news" in metadata["description"]
    for endpoint in ("daily.json", "weeks.json", "archive/YYYY-MM-DD.json", "meta.json"):
        assert endpoint in body
    assert "Do not request `hot.json`" in body
    assert "original `url`" in body


def test_frontier_skill_eval_set_covers_brief_search_archive_and_status():
    values = json.loads(Path("tests/skill_evals.json").read_text(encoding="utf-8"))

    assert values["skill_name"] == "frontier"
    assert [row["id"] for row in values["evals"]] == [1, 2, 3, 4]
    assert all(row["expected_output"] for row in values["evals"])
