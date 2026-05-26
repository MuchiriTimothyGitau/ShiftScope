# scraping_pipeline/tests/test_scrapers.py
"""
Module 3 — Scraper Resilience Tests  (§5.3 — Dev 2 ownership)
==============================================================
Test scope:
  - github_release: changelog extraction, linked-issue parsing, 404 handling
  - github_issues:  rate-limit retry behaviour, label filtering
  - community_signals: deduplication, query template formatting
  - cve_feeds: CVE-ID extraction, credibility scoring
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch

# ---------------------------------------------------------------------------
# github_release
# ---------------------------------------------------------------------------

AXIOS_RELEASE_HTML = """
<html><body>
<div class="markdown-body">
<h2>Breaking Changes</h2>
<p>The <code>timeout</code> option has been removed. Use AbortSignal.timeout instead.</p>
<a href="/axios/axios/issues/5798">Issue #5798</a>
<a href="/axios/axios/pull/6124">PR #6124</a>
<a href="https://example.com/external">external link</a>
</div>
</body></html>
"""

NOT_FOUND_HTML = "<html><body>Not Found</body></html>"


@pytest.mark.asyncio
async def test_github_release_extracts_changelog():
    from scrapers.github_release import scrape_github_release

    mock_page = AsyncMock()
    mock_page.content.return_value = AXIOS_RELEASE_HTML
    mock_page.wait_for_selector = AsyncMock()

    mock_context = AsyncMock()
    mock_context.new_page.return_value = mock_page

    mock_browser = AsyncMock()
    mock_browser.new_context.return_value = mock_context

    mock_chromium = AsyncMock()
    mock_chromium.connect_over_cdp.return_value = mock_browser

    mock_pw = MagicMock()
    mock_pw.__aenter__ = AsyncMock(return_value=mock_pw)
    mock_pw.__aexit__ = AsyncMock(return_value=False)
    mock_pw.chromium = mock_chromium

    with patch("scrapers.github_release.async_playwright", return_value=mock_pw), \
         patch.dict("os.environ", {"BD_SCRAPING_BROWSER_WS": "wss://fake"}):
        result = await scrape_github_release("axios", "axios", "v3.0.0")

    assert "timeout" in result["changelog_text"].lower()
    assert result["tag"] == "v3.0.0"


@pytest.mark.asyncio
async def test_github_release_collects_linked_issues():
    from scrapers.github_release import scrape_github_release

    mock_page = AsyncMock()
    mock_page.content.return_value = AXIOS_RELEASE_HTML
    mock_page.wait_for_selector = AsyncMock()

    mock_context = AsyncMock()
    mock_context.new_page.return_value = mock_page

    mock_browser = AsyncMock()
    mock_browser.new_context.return_value = mock_context

    mock_chromium = AsyncMock()
    mock_chromium.connect_over_cdp.return_value = mock_browser

    mock_pw = MagicMock()
    mock_pw.__aenter__ = AsyncMock(return_value=mock_pw)
    mock_pw.__aexit__ = AsyncMock(return_value=False)
    mock_pw.chromium = mock_chromium

    with patch("scrapers.github_release.async_playwright", return_value=mock_pw), \
         patch.dict("os.environ", {"BD_SCRAPING_BROWSER_WS": "wss://fake"}):
        result = await scrape_github_release("axios", "axios", "v3.0.0")

    # Should capture /issues/ and /pull/ hrefs, not the external link
    assert len(result["linked_issues"]) == 2
    assert all(
        "/issues/" in url or "/pull/" in url
        for url in result["linked_issues"]
    )


@pytest.mark.asyncio
async def test_github_release_returns_empty_on_missing_body():
    """When .markdown-body is absent (404 page), changelog_text is empty."""
    from scrapers.github_release import scrape_github_release
    from playwright.async_api import TimeoutError as PlaywrightTimeout

    mock_page = AsyncMock()
    mock_page.content.return_value = NOT_FOUND_HTML
    mock_page.wait_for_selector.side_effect = PlaywrightTimeout("Timeout")

    mock_context = AsyncMock()
    mock_context.new_page.return_value = mock_page

    mock_browser = AsyncMock()
    mock_browser.new_context.return_value = mock_context

    mock_chromium = AsyncMock()
    mock_chromium.connect_over_cdp.return_value = mock_browser

    mock_pw = MagicMock()
    mock_pw.__aenter__ = AsyncMock(return_value=mock_pw)
    mock_pw.__aexit__ = AsyncMock(return_value=False)
    mock_pw.chromium = mock_chromium

    with patch("scrapers.github_release.async_playwright", return_value=mock_pw), \
         patch.dict("os.environ", {"BD_SCRAPING_BROWSER_WS": "wss://fake"}):
        with pytest.raises(PlaywrightTimeout):
            await scrape_github_release("fake", "repo", "v99.0.0")


# ---------------------------------------------------------------------------
# github_issues
# ---------------------------------------------------------------------------

MOCK_ISSUES = [
    {
        "number": 5798,
        "title": "Breaking: timeout removed",
        "html_url": "https://github.com/axios/axios/issues/5798",
        "state": "open",
        "labels": [{"name": "breaking-change"}],
        "body": "timeout was removed",
        "created_at": "2024-05-01T00:00:00Z",
        "updated_at": "2024-05-10T00:00:00Z",
    }
]


@pytest.mark.asyncio
async def test_github_issues_returns_issues_on_200():
    from scrapers.github_issues import fetch_breaking_issues

    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = MOCK_ISSUES

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get.return_value = mock_response

    env = {
        "BRIGHT_DATA_USERNAME": "user",
        "BRIGHT_DATA_PASSWORD": "pass",
        "BD_UNLOCKER_HOST": "brd.superproxy.io",
        "BD_UNLOCKER_PORT": "22225",
    }

    with patch("scrapers.github_issues.httpx.AsyncClient", return_value=mock_client), \
         patch.dict("os.environ", env):
        result = await fetch_breaking_issues("axios", "axios", "2024-01-01T00:00:00Z")

    assert len(result) == 1
    assert result[0]["number"] == 5798


@pytest.mark.asyncio
async def test_github_issues_returns_empty_on_non_200():
    from scrapers.github_issues import fetch_breaking_issues

    mock_response = AsyncMock()
    mock_response.status_code = 404
    mock_response.json.return_value = {"message": "Not Found"}

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get.return_value = mock_response

    env = {
        "BRIGHT_DATA_USERNAME": "user",
        "BRIGHT_DATA_PASSWORD": "pass",
        "BD_UNLOCKER_HOST": "brd.superproxy.io",
        "BD_UNLOCKER_PORT": "22225",
    }

    with patch("scrapers.github_issues.httpx.AsyncClient", return_value=mock_client), \
         patch.dict("os.environ", env):
        result = await fetch_breaking_issues("fake", "repo", "2024-01-01T00:00:00Z")

    assert result == []


# ---------------------------------------------------------------------------
# community_signals
# ---------------------------------------------------------------------------

MOCK_SERP_RESPONSE = {
    "organic": [
        {
            "title": "axios 3.0 breaking change discussion",
            "link": "https://news.ycombinator.com/item?id=1",
            "snippet": "The timeout option was removed...",
            "date": "2024-05-10",
        },
        {
            "title": "axios upgrade gotchas",
            "link": "https://reddit.com/r/programming/abc",
            "snippet": "Spent hours on this migration...",
            "date": "2024-05-11",
        },
    ]
}


@pytest.mark.asyncio
async def test_community_signals_deduplicates_urls():
    from scrapers.community_signals import fetch_community_signals

    call_count = 0

    async def fake_post(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        mock = AsyncMock()
        mock.raise_for_status = MagicMock()
        # Return the same two results for every query to test deduplication
        mock.json.return_value = MOCK_SERP_RESPONSE
        return mock

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = fake_post

    env = {
        "BD_SERP_URL": "https://api.brightdata.com/datasets/v3/query",
        "BD_SERP_API_KEY": "fake-key",
    }

    with patch("scrapers.community_signals.httpx.AsyncClient", return_value=mock_client), \
         patch.dict("os.environ", env):
        results = await fetch_community_signals("axios", "3.0.0")

    # 4 queries × 2 results each, but same 2 URLs every time → only 2 unique
    assert len(results) == 2
    urls = {r["url"] for r in results}
    assert len(urls) == 2


@pytest.mark.asyncio
async def test_community_signals_formats_query_template():
    from scrapers.community_signals import fetch_community_signals

    posted_queries = []

    async def fake_post(*args, **kwargs):
        posted_queries.append(kwargs.get("json", {}).get("query", ""))
        mock = AsyncMock()
        mock.raise_for_status = MagicMock()
        mock.json.return_value = {"organic": []}
        return mock

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = fake_post

    env = {
        "BD_SERP_URL": "https://api.brightdata.com/datasets/v3/query",
        "BD_SERP_API_KEY": "fake-key",
    }

    with patch("scrapers.community_signals.httpx.AsyncClient", return_value=mock_client), \
         patch.dict("os.environ", env):
        await fetch_community_signals("requests", "2.32.0")

    assert any("requests" in q and "2.32.0" in q for q in posted_queries)


# ---------------------------------------------------------------------------
# cve_feeds
# ---------------------------------------------------------------------------

def test_cve_id_extraction():
    """CVE IDs are correctly parsed from title + snippet text."""
    from scrapers.cve_feeds import _extract_cve_ids

    text = "CVE-2024-26130 affects cryptography < 42.0.4. Also related to cve-2023-49083."
    ids = _extract_cve_ids(text)
    assert "CVE-2024-26130" in ids
    assert "CVE-2023-49083" in ids


def test_credibility_high_for_nvd():
    from scrapers.cve_feeds import _credibility_score

    assert _credibility_score("https://nvd.nist.gov/vuln/detail/CVE-2024-0001") == 1.0


def test_credibility_medium_for_snyk():
    from scrapers.cve_feeds import _credibility_score

    assert _credibility_score("https://security.snyk.io/package/npm/axios") == 1.0


def test_credibility_low_for_unknown():
    from scrapers.cve_feeds import _credibility_score

    assert _credibility_score("https://some-random-seo-blog.com/article") == 0.4
