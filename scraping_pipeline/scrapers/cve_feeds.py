# scraping_pipeline/scrapers/cve_feeds.py
"""
Module 3 — Scraping Pipeline
Source type : CVE / security advisory
Bright Data product : SERP API

Why Bright Data is required here:
  BrightData's SERP index surfaces CVE disclosures faster than direct NVD
  queries — crucial for ShiftScope's pre-CVE monitoring window (7–14 days
  before official CVE assignment when all standard scanners report zero vulns).

Output schema (list[dict]):
  query           str         — SERP query that produced this result
  title           str         — advisory or blog post title
  url             str         — result URL
  snippet         str         — SERP snippet (often contains CVSS / affected range)
  date            str | None  — disclosure date if available
  cve_ids         list[str]   — CVE IDs parsed from title + snippet (e.g. ['CVE-2024-1234'])
  credibility     float       — heuristic 0.0–1.0 (known advisory domain = 1.0)
"""

import logging
import os
import re
from typing import Optional

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

logger = logging.getLogger("shiftscope.scrapers.cve_feeds")

BD_SERP_URL = os.environ["BD_SERP_URL"]
BD_SERP_KEY = os.environ["BD_SERP_API_KEY"]

# High-credibility advisory domains — score 1.0
_HIGH_CREDIBILITY_DOMAINS = frozenset(
    [
        "nvd.nist.gov",
        "cve.mitre.org",
        "github.com/advisories",
        "osv.dev",
        "security.snyk.io",
        "huntr.com",
        "cisa.gov",
        "cert.org",
    ]
)

# Known security blog domains — score 0.8
_MEDIUM_CREDIBILITY_DOMAINS = frozenset(
    [
        "snyk.io",
        "sonatype.com",
        "checkmarx.com",
        "jfrog.com",
        "socket.dev",
    ]
)

CVE_PATTERN = re.compile(r"CVE-\d{4}-\d{4,7}", re.IGNORECASE)

# SERP query templates for security / CVE signals
_CVE_QUERIES = [
    "{name} {new_version} CVE vulnerability",
    "{name} {new_version} security advisory",
    "site:nvd.nist.gov {name}",
    "site:github.com/advisories {name} {new_version}",
]


def _credibility_score(url: str) -> float:
    """Heuristic credibility score based on domain."""
    for domain in _HIGH_CREDIBILITY_DOMAINS:
        if domain in url:
            return 1.0
    for domain in _MEDIUM_CREDIBILITY_DOMAINS:
        if domain in url:
            return 0.8
    return 0.4  # unknown / SEO-blog default


def _extract_cve_ids(text: str) -> list[str]:
    return list({m.upper() for m in CVE_PATTERN.findall(text)})


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=2, max=20),
    retry=retry_if_exception_type(Exception),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def fetch_cve_signals(
    name: str,
    new_version: str,
    *,
    country: str = "US",
    min_credibility: float = 0.0,
) -> list[dict]:
    """
    Query BrightData SERP API for CVE / security advisory signals.

    Runs the four canonical CVE query templates and enriches each result
    with extracted CVE IDs and a heuristic credibility score.

    Args:
        name:            Package name        (e.g. 'requests')
        new_version:     New version string  (e.g. '2.32.0')
        country:         ISO-3166 geo-target for SERP.
        min_credibility: Filter out results below this score (0.0 = keep all).

    Returns:
        Enriched list of CVE signal dicts matching the output schema above.
    """
    results: list[dict] = []
    seen_urls: set[str] = set()

    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0)) as client:
        for template in _CVE_QUERIES:
            query = template.format(name=name, new_version=new_version)
            logger.debug("CVE SERP query: %s", query)

            resp = await client.post(
                BD_SERP_URL,
                headers={
                    "Authorization": f"Bearer {BD_SERP_KEY}",
                    "Content-Type": "application/json",
                },
                json={"query": query, "num_results": 5, "country": country},
            )
            resp.raise_for_status()

            for item in resp.json().get("organic", []):
                url: str = item.get("link", "")
                if not url or url in seen_urls:
                    continue

                title = item.get("title", "")
                snippet = item.get("snippet", "")
                score = _credibility_score(url)

                if score < min_credibility:
                    continue

                seen_urls.add(url)
                results.append(
                    {
                        "query": query,
                        "title": title,
                        "url": url,
                        "snippet": snippet,
                        "date": item.get("date"),
                        "cve_ids": _extract_cve_ids(f"{title} {snippet}"),
                        "credibility": score,
                    }
                )

    logger.info(
        "CVE signals for %s@%s — %d results (min_credibility=%.1f)",
        name, new_version, len(results), min_credibility,
    )
    return results
