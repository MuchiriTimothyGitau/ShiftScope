# scraping_pipeline/scrapers/community_signals.py
"""
Module 3 — Scraping Pipeline
Source type : Community signals (Hacker News, Reddit, dev.to, security blogs)
Bright Data product : SERP API

Why Bright Data is required here:
  HN / Reddit / dev.to content is indexed and searchable via BrightData's
  SERP API, which provides structured organic results without requiring
  direct scraping of those platforms. This also surfaces pre-CVE security
  disclosures faster than direct NVD queries.

Output schema (list[dict]):
  query    str  — the search query that produced this result
  title    str  — page title
  url      str  — result URL
  snippet  str  — search engine snippet
  date     str | None — publication date if available
"""

import logging
import os
from typing import Optional

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

logger = logging.getLogger("shiftscope.scrapers.community_signals")

BD_SERP_URL = os.environ["BD_SERP_URL"]       # https://api.brightdata.com/datasets/v3/query
BD_SERP_KEY = os.environ["BD_SERP_API_KEY"]

# The four query templates defined in the ShiftScope spec.
# Each covers a distinct intelligence signal:
#   1. Generic breaking-change mentions across all indexed sources
#   2. Hacker News discussion threads
#   3. Reddit/r/programming threads
#   4. Security vulnerability disclosures (pre-CVE window)
SIGNAL_QUERIES = [
    "{name} {new_version} breaking change",
    "site:news.ycombinator.com {name} {new_version}",
    "site:reddit.com/r/programming {name} {new_version}",
    "{name} {new_version} security vulnerability disclosure",
]

NUM_RESULTS_PER_QUERY = 5


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=2, max=20),
    retry=retry_if_exception_type(Exception),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def fetch_community_signals(
    name: str,
    new_version: str,
    *,
    country: str = "US",
    extra_queries: Optional[list[str]] = None,
) -> list[dict]:
    """
    Query BrightData's SERP API for community signals about a dependency update.

    Each of the four canonical query templates is fired in sequence.
    Results are deduplicated by URL before being returned.

    Args:
        name:          Package name        (e.g. 'axios')
        new_version:   New version string  (e.g. '3.0.0')
        country:       ISO-3166 country code for SERP geo-targeting.
        extra_queries: Additional query templates, formatted the same way.

    Returns:
        Deduplicated list of signal dicts matching the output schema.

    Raises:
        httpx.HTTPStatusError: on non-2xx SERP API responses (will be retried).
    """
    all_queries = list(SIGNAL_QUERIES) + (extra_queries or [])
    results: list[dict] = []
    seen_urls: set[str] = set()

    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0)) as client:
        for template in all_queries:
            query = template.format(name=name, new_version=new_version)
            logger.debug("SERP query: %s", query)

            resp = await client.post(
                BD_SERP_URL,
                headers={
                    "Authorization": f"Bearer {BD_SERP_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "query": query,
                    "num_results": NUM_RESULTS_PER_QUERY,
                    "country": country,
                },
            )
            resp.raise_for_status()

            organic = resp.json().get("organic", [])
            for item in organic:
                item_url: str = item.get("link", "")
                # Deduplicate by URL across all queries
                if item_url and item_url not in seen_urls:
                    seen_urls.add(item_url)
                    results.append(
                        {
                            "query": query,
                            "title": item.get("title"),
                            "url": item_url,
                            "snippet": item.get("snippet"),
                            "date": item.get("date"),
                        }
                    )

    logger.info(
        "Community signals for %s@%s — %d unique results across %d queries",
        name, new_version, len(results), len(all_queries),
    )
    return results
