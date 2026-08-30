from collectors import sitemap


def test_sitemap_collector_reads_recent_blog_metadata(monkeypatch):
    index = """<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://example.com/blog/older</loc><lastmod>2026-08-20T00:00:00Z</lastmod></url>
      <url><loc>https://example.com/about</loc><lastmod>2026-08-24T00:00:00Z</lastmod></url>
      <url><loc>https://example.com/blog/new</loc><lastmod>2026-08-24T00:00:00Z</lastmod></url>
    </urlset>"""
    pages = {
        "https://example.com/sitemap.xml": index,
        "https://example.com/blog/new": '<meta property="og:title" content="Measured agent research"><meta name="description" content="18 models completed 153 runs.">',
        "https://example.com/blog/older": '<meta property="og:title" content="Older research"><meta property="og:description" content="An older result.">',
    }
    monkeypatch.setattr(sitemap, "fetch_text", pages.__getitem__)

    items = sitemap.collect("https://example.com/sitemap.xml", "lab", "Lab", "/blog/", ["research"])

    assert [item.title for item in items] == ["Measured agent research", "Older research"]
    assert items[0].summary == "18 models completed 153 runs."
    assert items[0].published == "2026-08-24T00:00:00Z"
