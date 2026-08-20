from collectors import github


PAGE = """
<article class="Box-row unstarred">
  <h2 class="h3"><a href="/acme/first-repo">acme /
      first-repo</a></h2>
  <p class="col-9 color-fg-muted my-1 pr-4">Runs &amp; evaluates agents locally.</p>
</article>
<article class="Box-row unstarred">
  <h2 class="h3"><a href="/acme/no-blurb">acme /
      no-blurb</a></h2>
</article>
<article class="Box-row unstarred">
  <h2 class="h3"><a href="/beta/third-repo">beta /
      third-repo</a></h2>
  <p class="col-9 color-fg-muted my-1 pr-4">A Rust inference server.</p>
</article>
"""


def _collect(monkeypatch, page=PAGE, **kwargs):
    monkeypatch.setattr(github, "fetch_text", lambda url: page)
    return github.collect(**kwargs)


def test_collect_attaches_the_repo_description_as_summary(monkeypatch):
    items = _collect(monkeypatch)

    assert [item.title for item in items] == ["acme/first-repo", "acme/no-blurb", "beta/third-repo"]
    # Entities are decoded so the summary is plain text, as every other collector emits.
    assert items[0].summary == "Runs & evaluates agents locally."


def test_a_row_without_a_description_does_not_borrow_the_next_ones(monkeypatch):
    """The blurb is optional on GitHub Trending (2 of 13 rows lacked one when
    measured). Scanning page-wide instead of per-row would shift every later
    pairing by one, so guard the alignment rather than just the happy path."""
    items = _collect(monkeypatch)

    assert items[1].summary == ""
    assert items[2].summary == "A Rust inference server."


def test_limit_caps_the_result_count(monkeypatch):
    assert len(_collect(monkeypatch, limit=2)) == 2
