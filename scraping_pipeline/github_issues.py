# scraping_pipeline/scrapers/github_issues.py
"""
Module 3 — Scraping Pipeline
Source type : GitHub issue tracker
Bright Data product : Web Unlocker (proxy mode via httpx)

Why Bright Data is required here:
  The GitHub REST API is rate-limited to 60 unauthenticated requests / hour.
  Routing through BrightData's Web Unlocker proxy bypasses this limit by
  rotating residential IPs so each request appears from a different source.

Output schema (list[dict]):
  Each dict is a GitHub issue object as returned by the GitHub REST API v3:
    id           int
    number       int
    title        str
    html_url     str
    state        str  — 'open' | 'closed'
    labels       list[dict]
    body         str | None
    created_at   str  — ISO-8601
    updated_at   str  — ISO-8601
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

logger = logging.getLogger("shiftscope.scrapers.github_issues")

# -----------------------------------------------------------------------
# BrightData Web Unlocker proxy configuration
# Credentials are read from the environment (see scraping_pipeline/.env).
# -----------------------------------------------------------------------
_BD_USER = os.environ["BRIGHT_DATA_USERNAME"]
_BD_PASS = os.environ["BRIGHT_DATA_PASSWORD"]
_BD_HOST = os.environ["BD_UNLOCKER_HOST"]      # brd.superproxy.io
_BD_PORT = os.environ["BD_UNLOCKER_PORT"]      # 22225

UNLOCKER_PROXY = {
    "http://": (
        f"http://brd-customer-{_BD_USER}-zone-unblocker:{_BD_PASS}"
        f"@{_BD_HOST}:{_BD_PORT}"
    ),
    "https://": (
        f"http://brd-customer-{_BD_USER}-zone-unblocker:{_BD_PASS}"
        f"@{_BD_HOST}:{_BD_PORT}"
    ),
}

# Default labels that indicate a breaking change or regression
DEFAULT_BREAKING_LABELS = ["breaking-change", "regression", "bug"]

# GitHub API base
GITHUB_API = "https://api.github.com"

# Error code SS-002: GitHub rate limit even via Web Unlocker
#   Recovery: queue for 60-second delay, then retry


@retry(
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=2, min=4, max=60),
    retry=retry_if_exception_type(Exception),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def fetch_breaking_issues(
    owner: str,
    repo: str,
    since_date: str,
    labels: Optional[list[str]] = None,
    per_page: int = 30,
) -> list[dict]:
    """
    Fetch GitHub issues tagged with breaking / regression labels via BrightData
    Web Unlocker so the 60 req/hr rate limit is bypassed.

    Args:
        owner:      GitHub organisation/user  (e.g. 'axios')
        repo:       Repository name           (e.g. 'axios')
        since_date: ISO-8601 datetime string — only issues updated after this
                    date are returned (e.g. '2024-01-01T00:00:00Z')
        labels:     List of label names to filter by.
                    Defaults to DEFAULT_BREAKING_LABELS.
        per_page:   Number of results per page (max 100).

    Returns:
        List of GitHub issue dicts, or an empty list on failure.

    Raises:
        httpx.HTTPStatusError: on non-200 responses (will be retried).
    """
    labels = labels or DEFAULT_BREAKING_LABELS
    label_str = ",".join(labels)
    url = f"{GITHUB_API}/repos/{owner}/{repo}/issues"

    params = {
        "state": "open",
        "labels": label_str,
        "since": since_date,
        "per_page": per_page,
        "sort": "updated",
    }

    logger.info(
        "Fetching GitHub issues: %s/%s labels=[%s] since=%s",
        owner, repo, label_str, since_date,
    )

    async with httpx.AsyncClient(
        proxies=UNLOCKER_PROXY,
        # BrightData intercepts TLS for proxy inspection — disable peer verify
        verify=False,
        timeout=httpx.Timeout(20.0, connect=10.0),
        headers={
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            # Standard browser UA to avoid GitHub bot heuristics
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        },
    ) as client:
        resp = await client.get(url, params=params)

        if resp.status_code == 403 or resp.status_code == 429:
            # SS-002: rate limit hit — tenacity will wait and retry
            logger.warning(
                "SS-002 | GitHub rate limit (%d) for %s/%s — will retry",
                resp.status_code, owner, repo,
            )
            resp.raise_for_status()

        if resp.status_code != 200:
            logger.error(
                "Unexpected status %d fetching issues for %s/%s",
                resp.status_code, owner, repo,
            )
            return []

        issues: list[dict] = resp.json()

    logger.info(
        "Fetched %d issues for %s/%s",
        len(issues), owner, repo,
    )
    return issues
