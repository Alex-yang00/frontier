import json
from pathlib import Path

import pytest

from scripts import enrich


@pytest.fixture(autouse=True)
def _clear_result_cache():
    """The cache is process-scoped, so it would leak between tests."""
    enrich._RESULT_CACHE.clear()
    yield
    enrich._RESULT_CACHE.clear()


def test_add_curation_attaches_fused_event_to_selected_representative(monkeypatch):
    items = [
        {
            "id": "official", "title": "Model released", "summary": "The model shipped.",
            "url": "https://example.com/official", "source_name": "Official", "section": "tech",
            "published": "2026-08-19T08:00:00Z",
        },
        {
            "id": "report", "title": "Company ships model", "summary": "It adds tool use.",
            "url": "https://example.com/report", "source_name": "Reporter", "section": "tech",
            "published": "2026-08-19T09:00:00Z",
        },
    ]

    def fake_complete(prompt, system, timeout=90, **kwargs):
        if "Independently audit" in prompt:
            return """{
              "same_event": true,
              "canonical_id": "official",
              "member_ids": ["official", "report"],
              "event_anchor": "The model release",
              "reason": "Same model release",
              "summary_en": "The model shipped with tool use.",
              "summary_zh": "该模型已发布，并支持工具调用。"
            }"""
        if "'tech' section" in prompt:
            return """{
              "ids": ["report"],
              "event_groups": [{
                "canonical_id": "official",
                "member_ids": ["official", "report"],
                "reason": "Same model release"
              }]
            }"""
        return '{"ids": [], "event_groups": []}'

    monkeypatch.setattr(enrich, "complete", fake_complete)
    data = {"items": items}

    assert enrich.add_curation(data) == 1
    assert data["curated_ids"]["tech"] == ["official"]
    assert data["event_clusters"][0]["member_ids"] == ["official", "report"]
    assert items[0]["event_summary_en"] == "The model shipped with tool use."
    assert [source["source_name"] for source in items[0]["event_sources"]] == ["Official", "Reporter"]
    assert "event_sources" not in items[1]


def _pending(articles: int, videos: int) -> list[dict]:
    """Videos at the tail, which is where score-descending order put them."""
    return (
        [{"id": f"a{n}"} for n in range(articles)]
        + [{"id": f"v{n}", "is_video": True} for n in range(videos)]
    )


def test_a_bounded_run_reaches_videos_at_the_tail_of_the_queue():
    selected = enrich._select_pending(_pending(280, 20), limit=40)

    assert len(selected) == 40
    assert sum(1 for item in selected if item.get("is_video")) == 8


def test_unused_video_budget_goes_back_to_articles():
    selected = enrich._select_pending(_pending(280, 2), limit=40)

    assert len(selected) == 40
    assert sum(1 for item in selected if item.get("is_video")) == 2


def test_a_run_that_fits_takes_everything():
    pending = _pending(5, 2)

    assert enrich._select_pending(pending, limit=40) == pending
    assert enrich._select_pending(pending, limit=None) == pending


def test_selection_keeps_score_order_within_the_run():
    pending = _pending(10, 10)
    selected = enrich._select_pending(pending, limit=10)

    assert [item["id"] for item in selected] == [item["id"] for item in pending if item in selected]


def _fields(result: dict, item: dict | None = None) -> dict:
    return enrich._editorial_fields(result, item or {"summary": "raw feed prose"})


def test_a_usable_rewrite_replaces_the_feed_prose_in_both_places():
    summary = "OpenAI shipped a smaller model. " * 3

    out = _fields({"summary": summary})

    assert out["summary"] == out["summary_en"] == summary.strip()
    # Cleared so translate.py re-queues the item for Chinese.
    assert out["summary_zh"] == ""


def test_an_unchanged_rewrite_keeps_the_existing_translation():
    summary = "OpenAI shipped a smaller model. " * 3
    item = {"summary": summary, "summary_zh": "OpenAI 发布了一个更小的模型。"}

    assert "summary_zh" not in _fields({"summary": summary}, item)


def test_a_summary_that_would_be_clamped_again_is_refused():
    assert "summary" not in _fields({"summary": "x " * 200})
    assert "summary" not in _fields({"summary": "Too short."})


def test_generic_feed_labels_are_dropped_from_the_tags():
    out = _fields({"tags": ["OpenAI", "industry", "Inference", "official", "OPENAI"]})

    assert out["tags"] == ["OpenAI", "Inference"]


def test_a_thin_tag_list_leaves_the_source_tags_alone():
    assert "tags" not in _fields({"tags": ["industry", "community"]})


def test_the_budget_stops_the_run_and_keeps_what_it_finished(tmp_path, monkeypatch):
    path = tmp_path / "daily.json"
    path.write_text(json.dumps({"items": [
        {"id": f"i{n}", "title": f"Item {n}", "summary": "Feed prose.", "published": "2026-08-20T00:00:00Z"}
        for n in range(6)
    ]}))
    calls = []

    def fake_classify(batch):
        calls.append(len(batch))
        return [
            {
                "id": item["id"], "relevance": 0.9, "section": "tech",
                # A usable summary is what stamps editorial_version, so a fake
                # without one would leave every item pending.
                "summary": "A compact model shipped today and cuts inference cost by half.",
                "tags": ["OpenAI", "Inference"],
            }
            for item in batch
        ]

    monkeypatch.setattr(enrich, "classify_batch", fake_classify)
    monkeypatch.setattr(enrich, "ENRICH_BUDGET_SECONDS", 30)
    # The budget runs from process start, so a second file in the same run
    # inherits what is left of it rather than getting a fresh allowance.
    monkeypatch.setattr(enrich, "_STARTED_AT", 0.0)
    ticks = iter([0.0])
    monkeypatch.setattr(enrich.time, "monotonic", lambda: next(ticks, 999.0))

    changed = enrich.enrich_file(path, limit=None, batch_size=2)

    assert calls == [2]
    assert changed == 2
    # The finished batch is on disk, so the next run does not pay for it again.
    saved = json.loads(path.read_text())["items"]
    assert sum(1 for item in saved if enrich._is_enriched(item)) == 2


def test_chinese_tags_ride_along_when_the_count_matches():
    out = _fields({"tags": ["OpenAI", "Inference"], "tags_zh": ["OpenAI", "推理"]})

    assert out["tags"] == ["OpenAI", "Inference"]
    assert out["tags_zh"] == ["OpenAI", "推理"]


def test_a_mismatched_chinese_list_is_dropped_rather_than_paired_wrongly():
    out = _fields({"tags": ["OpenAI", "Inference", "Agents"], "tags_zh": ["OpenAI", "推理"]})

    assert out["tags"] == ["OpenAI", "Inference", "Agents"]
    assert "tags_zh" not in out


def test_the_chinese_category_needs_an_english_one():
    assert _fields({"category_zh": "人工智能基础设施"}) == {}
    out = _fields({"category": "AI Infrastructure", "category_zh": "人工智能基础设施"})
    assert out["category_zh"] == "人工智能基础设施"


def test_arxiv_boilerplate_does_not_eat_the_prompt_budget():
    body = "arXiv:2608.14580v1 Announce Type: new Abstract: OGX is an application server."

    assert enrich._clip_body(body, 500) == "OGX is an application server."
    # Ordinary prose is untouched.
    assert enrich._clip_body("A model shipped today.", 500) == "A model shipped today."


def test_the_classify_loop_stops_while_budget_remains_for_curation(monkeypatch):
    """The loop gets a share; the stages after it must still have time."""
    monkeypatch.setattr(enrich, "ENRICH_BUDGET_SECONDS", 100)
    monkeypatch.setattr(enrich, "_STARTED_AT", 0.0)
    # 70s spent: past the classify share (60), inside the whole budget (100).
    monkeypatch.setattr(enrich.time, "monotonic", lambda: 70.0)

    assert enrich._budget_exhausted(enrich.CLASSIFY_BUDGET_SHARE) is True
    assert enrich._budget_exhausted() is False


def test_no_budget_configured_never_stops_anything(monkeypatch):
    monkeypatch.setattr(enrich, "ENRICH_BUDGET_SECONDS", 0)

    assert enrich._budget_exhausted(enrich.CLASSIFY_BUDGET_SHARE) is False
    assert enrich._budget_exhausted() is False


def test_a_reply_without_editorial_fields_stays_pending(tmp_path, monkeypatch):
    """Classification still applies, but the item is not retired.

    Stamping editorial_version on a reply that ignored the editorial instruction
    would retire the item with its raw feed prose permanently -- provenance alone
    marks it done, so only a version bump would ever revisit it.
    """
    path = tmp_path / "daily.json"
    path.write_text(json.dumps({"items": [
        {"id": "a", "title": "T", "summary": "Publisher prose, long enough to matter.",
         "published": "2026-08-20T00:00:00Z"},
    ]}))
    monkeypatch.setattr(
        enrich, "classify_batch",
        lambda batch: [{"id": "a", "relevance": 0.8, "section": "tech", "impact": "high"}],
    )

    enrich.enrich_file(path, limit=None, batch_size=8)

    item = json.loads(path.read_text())["items"][0]
    assert item["relevance"] == 0.8
    assert item["summary"] == "Publisher prose, long enough to matter."
    assert "editorial_version" not in item
    assert enrich._is_enriched(item) is False


def test_an_item_in_two_files_is_paid_for_once(tmp_path, monkeypatch):
    """enrich is invoked with a group file and daily.json, which overlap heavily.

    Each file holds its own dict for a shared item, so without the result cache
    the same item is sent to the model once per file in a single run.
    """
    item = {"id": "shared", "title": "Model shipped", "summary": "Publisher prose here.",
            "published": "2026-08-20T00:00:00Z"}
    group = tmp_path / "medium.json"
    daily = tmp_path / "daily.json"
    for path in (group, daily):
        path.write_text(json.dumps({"items": [dict(item)]}))
    calls = []

    def fake_classify(batch):
        calls.append([i["id"] for i in batch])
        return [{"id": i["id"], "relevance": 0.9, "section": "tech",
                 "summary": "A compact model shipped today and it cuts inference cost by about half.",
                 "tags": ["OpenAI", "Inference"]} for i in batch]

    monkeypatch.setattr(enrich, "classify_batch", fake_classify)

    assert enrich.enrich_file(group, limit=None, batch_size=8) == 1
    assert enrich.enrich_file(daily, limit=None, batch_size=8) == 1

    # One request total, not one per file.
    assert calls == [["shared"]]
    # Both files still carry the result.
    for path in (group, daily):
        saved = json.loads(path.read_text())["items"][0]
        assert saved["summary"] == "A compact model shipped today and it cuts inference cost by about half."
        assert saved["editorial_version"] == 1


def test_a_mangled_id_is_recovered_by_position():
    """Measured: the model sometimes copies an id with a character inserted."""
    batch = [{"id": "a"}, {"id": "b"}]
    results = [{"id": "a"}, {"id": "b9"}]

    paired = enrich._pair_results(batch, results)

    assert [(item["id"], result["id"]) for item, result in paired] == [("a", "a"), ("b", "b9")]


def test_a_short_reply_is_not_realigned_by_position():
    """A dropped row shifts every later position, so guessing would mispair."""
    batch = [{"id": "a"}, {"id": "b"}, {"id": "c"}]

    paired = enrich._pair_results(batch, [{"id": "a"}, {"id": "zzz"}])

    assert [item["id"] for item, _ in paired] == ["a"]


def test_a_duplicate_id_is_not_written_twice():
    batch = [{"id": "a"}, {"id": "b"}]

    paired = enrich._pair_results(batch, [{"id": "a"}, {"id": "a"}])

    assert [item["id"] for item, _ in paired] == ["a"]


def test_an_item_retired_with_raw_prose_is_reopened():
    """bdf1679 stamped the version unconditionally, so a rejected summary retired
    the item holding the very text the rewrite exists to replace."""
    item = {"classification_source": "llm", "editorial_version": 1, "summary": "x " * 400}

    assert enrich._is_enriched(item) is False


def test_a_correct_rewrite_stays_retired():
    item = {"classification_source": "llm", "editorial_version": 1,
            "summary": "OpenAI reaffirmed zero data retention for eligible API customers today."}

    assert enrich._is_enriched(item) is True


def test_an_item_without_a_summary_does_not_loop_forever():
    """Some feeds carry no body. That is not evidence of the stamping defect, so
    re-opening it every run would pay for a result that can never satisfy the gate."""
    assert enrich._is_enriched({"classification_source": "llm", "editorial_version": 1}) is True


def _dated(day: str, n: int) -> dict:
    return {"id": f"{day}-{n}", "published": f"{day}T08:00:00Z"}


def test_todays_items_are_enriched_before_a_higher_scoring_backlog():
    """Freshness is only 25 of the score, so yesterday's well-signalled items
    outrank everything published today -- and the homepage opens on today."""
    data = {"date": "2026-08-20"}
    # File order is score-descending: the backlog leads.
    pending = [_dated("2026-08-19", n) for n in range(3)] + [_dated("2026-08-20", n) for n in range(2)]

    ordered = enrich._current_day_first(Path("daily.json"), data, pending)

    assert [item["id"] for item in ordered[:2]] == ["2026-08-20-0", "2026-08-20-1"]
    # The backlog keeps its score order behind today.
    assert [item["id"] for item in ordered[2:]] == ["2026-08-19-0", "2026-08-19-1", "2026-08-19-2"]


def test_a_file_with_no_items_from_its_own_day_is_left_alone():
    pending = [_dated("2026-08-19", n) for n in range(2)]

    assert enrich._current_day_first(Path("daily.json"), {"date": "2026-08-20"}, pending) == pending


def test_a_file_without_a_date_is_left_alone():
    pending = [_dated("2026-08-19", 0)]

    assert enrich._current_day_first(Path("medium.json"), {}, pending) == pending


def test_a_repo_slug_title_is_replaced_with_a_real_headline():
    """Measured: 14 GitHub Trending items rendered as "jundot/omlx" on the page."""
    item = {"title": "jundot/omlx", "title_zh": "jundot/omlx", "summary": "raw"}

    out = enrich._editorial_fields({"headline": "omlx serves LLM inference on Apple Silicon"}, item)

    assert out["title"] == "omlx serves LLM inference on Apple Silicon"
    # Both fields: the page resolves title_en first, so setting only `title` left
    # the rewritten headline unread and the slug on the page.
    assert out["title_en"] == "omlx serves LLM inference on Apple Silicon"
    # The stored zh title is a copy of the slug, so it is re-queued.
    assert out["title_zh"] == ""


def test_a_declined_headline_leaves_title_en_alone():
    """The replacement is all-or-nothing: a rejected headline must not half-apply."""
    item = {"title": "jundot/omlx", "title_en": "jundot/omlx", "summary": "raw"}

    out = enrich._editorial_fields({"headline": "short"}, item)

    assert "title" not in out
    assert "title_en" not in out


def test_a_slug_left_in_title_en_is_repaired_without_a_model_call():
    """Items enriched before title_en was written kept the slug in the field the
    page reads first, and the resume filter would not revisit them: it sees a good
    `title` and treats the item as done."""
    items = [
        {"title": "ONNX Runtime accelerates ML inference", "title_en": "microsoft/onnxruntime"},
        {"title": "n8n combines visual workflow automation", "title_en": "n8n-io/n8n"},
    ]

    assert enrich._repair_slug_title_en(items) == 2
    assert items[0]["title_en"] == "ONNX Runtime accelerates ML inference"
    assert items[1]["title_en"] == "n8n combines visual workflow automation"


def test_the_repair_leaves_a_real_title_en_untouched():
    """It must never overwrite a publisher headline or an unenriched pair."""
    items = [
        {"title": "OpenAI reaffirms zero data retention", "title_en": "OpenAI keeps zero retention"},
        {"title": "jundot/omlx", "title_en": "jundot/omlx"},
        {"title": "", "title_en": "microsoft/onnxruntime"},
    ]

    assert enrich._repair_slug_title_en(items) == 0
    assert items[0]["title_en"] == "OpenAI keeps zero retention"
    assert items[1]["title_en"] == "jundot/omlx"
    assert items[2]["title_en"] == "microsoft/onnxruntime"


def test_a_publisher_headline_is_never_rewritten():
    """The model is asked to decline, but the decision is enforced here."""
    item = {"title": "OpenAI reaffirms zero data retention for API customers", "summary": "raw"}

    out = enrich._editorial_fields({"headline": "OpenAI talks about privacy again"}, item)

    assert "title" not in out


def test_a_slug_shaped_replacement_is_refused():
    item = {"title": "jundot/omlx", "summary": "raw"}

    assert "title" not in enrich._editorial_fields({"headline": "jundot/omlx-server"}, item)


def test_slug_shapes_that_need_a_headline():
    assert enrich._is_slug_title("jundot/omlx") is True
    assert enrich._is_slug_title("MoneyPrinterTurbo") is True
    assert enrich._is_slug_title("readme.md") is True
    assert enrich._is_slug_title("OpenAI ships a smaller model") is False
    assert enrich._is_slug_title("") is False


def _reject(text: str, code: str = "zh", corpus: str = "") -> str | None:
    return enrich._throughline_rejection(text, code, corpus)


def test_the_run_on_summary_the_page_actually_showed_is_refused():
    """Measured live: 170 chars in one sentence chaining commas, and the template
    clause that the old prompt asked for by name."""
    measured = (
        "本期内容集中在<em>智能体基础设施的工程化转向</em>，从 OpenAI 的工具调用接口，"
        "到 Anthropic 的上下文管理，再到开源社区的推理优化，都在把去年的演示变成可部署的组件，"
        "对AI读者而言，这意味着评估标准正在从模型能力转向系统可靠性。"
    )

    assert _reject(measured) is not None


def test_a_short_two_sentence_briefing_passes():
    text = "<em>推理成本</em>成为本期主线。DeepSeek 与 Qwen 均把单位价格压到上一代的一半。"

    assert _reject(text) is None


def test_the_significance_template_is_refused_in_both_languages():
    assert _reject("<em>推理成本</em>下降。这意味着部署门槛降低。") is not None
    assert _reject("Costs fell across <em>open models</em>. For AI readers this means cheaper deploys, "
                   "and the trend holds across every vendor named here today.", "en") is not None


def test_a_sentence_chaining_too_many_clauses_is_refused():
    assert _reject("<em>推理成本</em>全面下降，主流价格减半，部署门槛降低，迁移更快。") is not None
    # The same comma count split across sentences reads fine.
    assert _reject("<em>推理成本</em>全面下降，主流价格减半。部署门槛降低，迁移更快。") is None


def test_a_briefing_over_the_length_cap_is_refused():
    assert _reject("<em>推理</em>" + "成本持续下降。" * 20) is not None


def test_a_stub_too_short_to_be_a_briefing_is_refused():
    assert _reject("<em>成本下降</em>。") is not None


def test_the_markup_rules_still_hold():
    assert _reject("no em pair here at all, which the accent underline needs", "en") is not None
    assert _reject("<em>推理成本</em>下降。<script>x</script>也在。") is not None


def test_a_chinese_headline_is_not_mistaken_for_a_slug():
    """Chinese carries no spaces, so the word-count test alone called 19 of 23
    measured 量子位 headlines slugs -- and a "replacement" would have put
    model-written English on the Chinese page."""
    assert enrich._is_slug_title("MiniMax核心工程负责人阿岛离职") is False
    assert enrich._is_slug_title("全球首个人形机器人自主乒乓球完整对局亮相2026世界机器人大会") is False
    # A genuine slug is still a slug whatever else is on the page.
    assert enrich._is_slug_title("jundot/omlx") is True


def test_a_chinese_headline_is_never_replaced():
    item = {"title": "MiniMax核心工程负责人阿岛离职", "summary": "raw"}

    assert "title" not in enrich._editorial_fields({"headline": "MiniMax engineering lead departs"}, item)


def test_a_briefing_that_names_its_own_input_is_refused():
    """Measured: one reply opened "The most items share a direction of ...", which
    is the prompt instruction read back. The reader sees a page, not a list."""
    assert _reject("The most items share a direction of <em>embodied AI</em> reaching products. "
                   "Unitree launched a seven-axis arm priced at RMB9,900.", "en") is not None
    assert _reject("本期内容集中在<em>推理成本</em>下降。主流价格已经减半。") is not None


def test_a_forum_post_is_kept_out_of_the_briefing_sample(monkeypatch):
    """A briefing states what happened, so its supporting fact needs a party who
    reported it. Measured: a Reddit joke was the top tips candidate and three
    prompt wordings each reached for its number, twice crediting it to Anthropic."""
    seen = []

    def fake_complete(prompt, system, timeout=90, **kwargs):
        seen.append(prompt)
        return '{"throughline": "Vendors are shipping <em>cheaper inference</em>. DeepSeek halved its price."}'

    monkeypatch.setattr(enrich, "complete", fake_complete)
    items = [
        {"id": "r", "source": "reddit_claudeai", "title": "Claude says I used 54.9 BILLION tokens"},
        {"id": "h", "source": "hacker_news", "title": "Ask HN: what do you use"},
        {"id": "d", "source": "the_decoder", "title": "DeepSeek halves inference price"},
    ]

    enrich.throughline_for_section("tips", items)

    assert "54.9" not in seen[0]
    assert "Ask HN" not in seen[0]
    assert "DeepSeek" in seen[0]


def test_an_all_community_section_still_gets_a_briefing(monkeypatch):
    """Filtering to nothing would drop the briefing rather than improve it."""
    seen = []

    def fake_complete(prompt, system, timeout=90, **kwargs):
        seen.append(prompt)
        return '{"throughline": "Users report <em>heavy agent usage</em>. One reported 54.9 billion tokens."}'

    monkeypatch.setattr(enrich, "complete", fake_complete)
    items = [{"id": "r", "source": "reddit_claudeai", "title": "Claude says I used 54.9 BILLION tokens"}]

    out = enrich.throughline_for_section("tips", items)

    assert "54.9" in seen[0]
    assert out["zh"]


def test_an_item_retired_still_showing_a_slug_is_reopened_once():
    """4 of 9 GitHub Trending rows were stamped by a run predating the headline
    field, so they were retired rendering "jundot/omlx"."""
    retired = {"classification_source": "llm", "editorial_version": 1,
               "title": "jundot/omlx", "summary": "A compact summary."}

    assert enrich._is_enriched(retired) is False
    # Once asked, the answer stands -- including a refusal to retitle.
    assert enrich._is_enriched({**retired, "headline_checked": True}) is True


def test_asking_is_recorded_even_when_no_headline_comes_back():
    """Otherwise a title the model declines to rewrite is re-sent every run."""
    item = {"id": "a", "title": "jundot/omlx", "summary": "Publisher prose, long enough."}

    enrich._apply_result(item, {"id": "a", "relevance": 0.9, "section": "tech", "headline": ""})

    assert item["headline_checked"] is True


def test_a_real_headline_is_not_marked_for_a_headline_check():
    item = {"id": "a", "title": "OpenAI ships a smaller model", "summary": "Publisher prose."}

    enrich._apply_result(item, {"id": "a", "relevance": 0.9, "section": "tech"})

    assert "headline_checked" not in item


def test_an_agency_the_source_never_named_is_refused():
    """Measured 2026-08-21 over two runs: the source item says only that the model
    "完成生成式人工智能服务备案", and both runs named the agency that handles such
    filings. The agency is the plausible one, which is exactly why nothing but a
    corpus check catches it."""
    source = "优必选的行者具身智能大模型已完成生成式人工智能服务备案，成为国内首批完成备案的模型之一。"
    invented = "<em>优必选行者大模型完成备案</em>。该模型已通过国家网信办备案程序。"

    rejection = _reject(invented, "zh", source)

    assert rejection is not None
    assert "国家网信办" in rejection


def test_an_agency_the_source_did_name_is_kept():
    source = "国家网信办公布首批生成式人工智能服务备案名单。The Cyberspace Administration published the list."
    text = "<em>优必选行者大模型完成备案</em>。国家网信办公布了首批名单。"

    assert _reject(text, "zh", source) is None


def test_an_agency_named_only_in_the_items_chinese_text_is_kept():
    """The prompt carries English fields only, so a zh briefing naming the agency in
    Chinese is translating what the item says, not inventing it."""
    corpus = (
        "China's Cyberspace Administration published the first filing list. "
        "国家网信办公布首批生成式人工智能服务备案名单。"
    )
    text = "<em>行者具身智能大模型完成服务备案</em>。国家网信办公布了首批通过的名单。"

    assert _reject(text, "zh", corpus) is None


def test_ordinary_company_names_are_not_treated_as_agencies():
    """The check keys on government-body suffixes. A briefing naming companies has
    no such suffix and must pass on an empty corpus like every existing case."""
    assert _reject("<em>推理成本</em>下降。DeepSeek 与阿里巴巴把价格压到一半。") is None


_CAPEX_ZH = (
    "阿里巴巴6月份季度收入同比增长9%，达到人民币2689.5亿元。"
    "资本支出跃升75%，达到人民币676.8亿元，主要用于AI基础设施。"
)


def test_a_figure_off_by_a_factor_of_ten_is_refused():
    """Measured 2026-08-21: the source says RMB67.68 billion, which is 676.8亿. The
    prompt carries only the English fields, and the briefing came back with 67.6亿元
    -- a tenth of the real number, with every digit present in the source."""
    text = "<em>科技巨头加码AI</em>。阿里巴巴季度资本支出激增75%至67.6亿元。"

    rejection = _reject(text, "zh", _CAPEX_ZH)

    assert rejection is not None
    assert "67.6亿" in rejection


def test_a_rounded_figure_is_kept():
    """676亿 for 676.8亿 is ordinary rounding, not a magnitude error."""
    text = "<em>科技巨头加码AI</em>。阿里巴巴季度资本支出激增75%至676亿元。"

    assert _reject(text, "zh", _CAPEX_ZH) is None


def test_the_exact_figure_is_kept():
    text = "<em>科技巨头加码AI</em>。阿里巴巴季度资本支出激增75%至676.8亿元。"

    assert _reject(text, "zh", _CAPEX_ZH) is None


def test_a_briefing_with_no_yi_figure_is_unaffected():
    """The check must stay silent when neither side quotes a 亿 figure, or it would
    reject every briefing that happens to carry no money at all."""
    assert _reject("<em>推理成本</em>下降。DeepSeek 与阿里巴巴把价格压到一半。", "zh", _CAPEX_ZH) is None
    assert _reject("<em>推理成本</em>下降。DeepSeek 与阿里巴巴把价格压到一半。", "zh", "") is None


def test_a_figure_is_kept_when_the_source_quotes_no_yi_figure_at_all():
    """With nothing to compare against the check cannot judge, and refusing would
    mean a section whose items are all in dollars could never quote a number."""
    text = "<em>科技巨头加码AI</em>。阿里巴巴季度资本支出激增75%至676亿元。"

    assert _reject(text, "zh", "Alibaba capex rose 75% to RMB67.68 billion.") is None
