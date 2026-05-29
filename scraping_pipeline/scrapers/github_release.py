# scraping_pipeline/scrapers/github_release.py
"""
Module 3 — Scraping Pipeline
Source type : GitHub release page
Bright Data product : Scraping Browser (Playwright-compatible CDP endpoint)

Why Bright Data is required here:
  GitHub's release pages are JavaScript-rendered and CAPTCHA-gated at scale.
  The Scraping Browser is a managed remote Chromium that handles JS rendering,
  CAPTCHA solving, TLS fingerprinting, and IP rotation transparently.

Output schema (dict):
  url             str   — canonical release URL
  raw_html        str   — full rendered page HTML
  changelog_text  str   — extracted .markdown-body text
  linked_issues   list  — hrefs to /issues/ and /pull/ referenced in the release
  tag             str   — the git tag scraped
"""

import asyncio
import logging
import os
from typing import Optional

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from bs4 import BeautifulSoup
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

logger = logging.getLogger("shiftscope.scrapers.github_release")

# Bright Data Scraping Browser WebSocket endpoint — read lazily so tests can import
# without the env var being set.
def _get_bd_ws() -> str:
    val = os.environ.get("BD_SCRAPING_BROWSER_WS")
    if not val:
        raise RuntimeError(
            "BD_SCRAPING_BROWSER_WS is not set — Bright Data Scraping Browser "
            "cannot connect. Set it in .env or export it before running."
        )
    return val

# Error code SS-001: Scraping Browser connection timeout
#   Recovery: retry with exponential backoff × 3, then skip source


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=4, max=30),
    retry=retry_if_exception_type(Exception),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def scrape_github_release(
    owner: str,
    repo: str,
    tag: str,
    *,
    extra_wait_ms: int = 0,
) -> dict:
    """
    Scrape a GitHub release page via BrightData Scraping Browser.

    Args:
        owner:         GitHub organisation/user (e.g. 'axios')
        repo:          Repository name            (e.g. 'axios')
        tag:           Release tag                (e.g. 'v3.0.0')
        extra_wait_ms: Optional additional wait after domcontentloaded
                       (useful for large changelogs with deferred rendering).

    Returns:
        dict matching the output schema above.

    Raises:
        PlaywrightTimeout: if the release body never renders (will be retried).
        Exception:          on any unrecoverable scraping failure.
    """
    url = f"https://github.com/{owner}/{repo}/releases/tag/{tag}"
    logger.info("Scraping GitHub release: %s", url)

    async with async_playwright() as p:
        # Connect to BrightData's Scraping Browser over CDP.
        # This replaces a local browser launch and routes all traffic through
        # BrightData's residential proxy pool with automatic CAPTCHA solving.
        browser = await p.chromium.connect_over_cdp(_get_bd_ws())
        context = await browser.new_context(
            # Mimic a real browser fingerprint expected by GitHub
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="en-US",
        )
        page = await context.new_page()

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)

            # Wait for the Markdown-rendered release body — this is the JS-gated
            # element that requires Scraping Browser instead of plain httpx.
            await page.wait_for_selector(".markdown-body", timeout=15_000)

            if extra_wait_ms > 0:
                await page.wait_for_timeout(extra_wait_ms)

            html = await page.content()

        except PlaywrightTimeout as exc:
            # SS-001: log clearly so the worker can surface this error code
            logger.error("SS-001 | Scraping Browser timeout for %s: %s", url, exc)
            raise  # tenacity will retry
        finally:
            await browser.close()

    # -----------------------------------------------------------------------
    # Parse with BeautifulSoup
    # -----------------------------------------------------------------------
    soup = BeautifulSoup(html, "lxml")

    release_body = soup.select_one(".markdown-body")
    changelog_text: str = ""
    linked_issues: list[str] = []

    if release_body:
        changelog_text = release_body.get_text(separator="\n").strip()
        for anchor in release_body.find_all("a", href=True):
            href: str = anchor["href"]
            # Capture both issue and pull-request links mentioned in the release
            if "/issues/" in href or "/pull/" in href:
                # Normalise relative hrefs to absolute
                if href.startswith("/"):
                    href = f"https://github.com{href}"
                linked_issues.append(href)

    logger.info(
        "Scraped release %s/%s@%s — changelog_len=%d linked_issues=%d",
        owner, repo, tag,
        len(changelog_text),
        len(linked_issues),
    )

    return {
        "url": url,
        "raw_html": html,
        "changelog_text": changelog_text,
        "linked_issues": linked_issues,
        "tag": tag,
    }
