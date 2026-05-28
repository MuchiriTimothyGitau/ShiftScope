# scraping_pipeline/scrapers/maintainer_blog.py
"""
Module 3 — Scraping Pipeline
Source type : Maintainer blog / social post
Bright Data product : Scraping Browser (Playwright CDP)

Why Bright Data is required here:
  Maintainer blogs and social posts are often JavaScript-rendered, paywalled
  behind soft gates, or geo-varied (different content per region). BrightData's
  Scraping Browser solves all three transparently.

Output schema (dict):
  url          str         — canonical URL scraped
  raw_html     str         — full rendered page HTML
  text         str         — extracted body text (plain)
  title        str | None  — <title> tag content
  published_at str | None  — best-effort publication date
"""

import logging
import os

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from bs4 import BeautifulSoup
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

logger = logging.getLogger("shiftscope.scrapers.maintainer_blog")

BD_WS = os.environ["BD_SCRAPING_BROWSER_WS"]

# CSS selectors tried in order to find the article body.
# Most maintainer blogs/social platforms use one of these.
_CONTENT_SELECTORS = [
    "article",
    "main",
    '[role="main"]',
    ".post-content",
    ".entry-content",
    ".prose",
    "#content",
    "body",  # final fallback — always present
]

# Meta tags tried in order for publication date
_DATE_METAS = [
    'meta[property="article:published_time"]',
    'meta[name="date"]',
    'meta[name="pubdate"]',
    'time[datetime]',
]


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=4, max=30),
    retry=retry_if_exception_type(Exception),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def scrape_maintainer_blog(url: str) -> dict:
    """
    Scrape a maintainer blog post or social thread via BrightData Scraping Browser.

    The Scraping Browser is used here because:
    - Many maintainer blogs (Substack, Ghost, custom) are JS-rendered.
    - Some add soft paywalls (login prompts) that BrightData bypasses via its
      CAPTCHA solver and fingerprint rotation.
    - Dev.to / Hashnode / Medium have geo-varied content.

    Args:
        url: The full URL of the blog post or social thread to scrape.

    Returns:
        Dict matching the output schema above.

    Raises:
        PlaywrightTimeout: if the page never loads (will be retried).
    """
    logger.info("Scraping maintainer blog: %s", url)

    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(BD_WS)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
            locale="en-US",
        )
        page = await context.new_page()

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            # Wait for any lazy-rendered content to settle
            await page.wait_for_load_state("networkidle", timeout=10_000)
            html = await page.content()

        except PlaywrightTimeout as exc:
            logger.error("SS-001 | Scraping Browser timeout for %s: %s", url, exc)
            raise
        finally:
            await browser.close()

    soup = BeautifulSoup(html, "lxml")

    # Extract title
    title_tag = soup.find("title")
    title = title_tag.get_text().strip() if title_tag else None

    # Extract publication date — try meta tags then <time>
    published_at: str | None = None
    for selector in _DATE_METAS:
        el = soup.select_one(selector)
        if el:
            published_at = el.get("content") or el.get("datetime") or el.get_text(strip=True)
            if published_at:
                break

    # Extract article body using selector cascade
    content_el = None
    for selector in _CONTENT_SELECTORS:
        content_el = soup.select_one(selector)
        if content_el:
            break

    text = content_el.get_text(separator="\n").strip() if content_el else ""

    logger.info(
        "Scraped blog %s — title=%r text_len=%d",
        url, title, len(text),
    )

    return {
        "url": url,
        "raw_html": html,
        "text": text,
        "title": title,
        "published_at": published_at,
    }
