from unittest.mock import patch

from collectors.rss import collect


RSS = """<rss><channel><item><title>New model release</title><link>https://example.com/model</link><description>Useful release.</description><pubDate>Wed, 13 Aug 2026 08:00:00 GMT</pubDate></item></channel></rss>"""


def test_rss_collects_item():
    with patch("collectors.rss.fetch_text", return_value=RSS):
        items = collect("https://example.com/feed", "example", "Example", ["model"])
    assert items[0].title == "New model release"
    assert items[0].tags == ["model"]
