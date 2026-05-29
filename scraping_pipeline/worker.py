# scraping_pipeline/worker.py
"""
Module 3 — Scraping Pipeline: Worker
=====================================
BullMQ job consumer that orchestrates all six source-type scrapers for each
ScrapeJob enqueued by Module 1 (Scheduler).

Job flow per dependency change event
--------------------------------------
1. Receive ScrapeJob from the 'scrape' BullMQ queue
2. Run all 6 scrapers in parallel (source types per §3.3 TABLE 10):
     • registry_dataset   — BrightData Dataset API
     • github_release     — BrightData Scraping Browser
     • github_issues      — BrightData Web Unlocker
     • community_signals  — BrightData SERP API
     • cve_feeds          — BrightData SERP API
     • maintainer_blog    — BrightData Scraping Browser (if blog URL known)
3. Persist every raw_scrape row to Supabase
4. Large HTML (>512 KB) is offloaded to Supabase Storage per §3.4
5. Enqueue AnalysisJob(scrape_id) for Module 5 (AI Analysis Chain)

Error codes handled
-------------------
  SS-001  Scraping Browser connection timeout  → retry ×3, skip source
  SS-002  GitHub rate limit via Web Unlocker   → 60 s delay, retry
  SS-006  Supabase connection timeout          → retry ×3, alert + halt

Environment variables required (scraping_pipeline/.env)
---------------------------------------------------------
See TABLE 11 in the ShiftScope Technical Reference Documentation.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field
from supabase import AsyncClient, acreate_client
from tenacity import (
    AsyncRetrying,
    before_sleep_log,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from scrapers.github_release import scrape_github_release
from scrapers.github_issues import fetch_breaking_issues
from scrapers.community_signals import fetch_community_signals
from scrapers.cve_feeds import fetch_cve_signals
from scrapers.registry_dataset import fetch_registry_metadata
from scrapers.maintainer_blog import scrape_maintainer_blog

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("shiftscope.scraping_pipeline.worker")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY: str = os.environ["SUPABASE_SERVICE_KEY"]

# HTML payloads exceeding this threshold are offloaded to Supabase Storage
# and the raw_html column stores the Storage URL instead (§3.4).
RAW_HTML_MAX_INLINE_BYTES: int = 512 * 1024  # 512 KB

# Supabase Storage bucket for large HTML files
RAW_SCRAPES_BUCKET = "raw-scrapes"

# ---------------------------------------------------------------------------
# Job payload schema (matches BullMQ job data from Scheduler)
# ---------------------------------------------------------------------------


class ScrapeJobPayload(BaseModel):
    dep_id: str              # UUID from dependency_manifest table
    dep_name: str            # e.g. 'axios'
    ecosystem: str           # 'npm' | 'pypi' | 'crates' | 'go' | 'gem' | 'maven'
    old_version: str         # e.g. '1.7.2'
    new_version: str         # e.g. '3.0.0'
    repo_owner: Optional[str] = None   # GitHub owner if known
    repo_name: Optional[str] = None    # GitHub repo name if known
    blog_url: Optional[str] = None     # Maintainer blog URL if known
    since_date: str = Field(
        default_factory=lambda: "2020-01-01T00:00:00Z"
    )


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------


async def _get_db() -> AsyncClient:
    """Create and return a Supabase async client."""
    return await acreate_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


async def _store_raw_scrape(
    db: AsyncClient,
    dep_id: str,
    source_type: str,
    source_url: Optional[str],
    raw_html: Optional[str],
    structured: dict,
) -> str:
    """
    Persist one raw_scrape row to Supabase.

    If raw_html exceeds RAW_HTML_MAX_INLINE_BYTES the HTML is offloaded to
    Supabase Storage and the Storage URL is stored in raw_html instead.
    Returns the new scrape row UUID.
    """
    scrape_id = str(uuid.uuid4())
    stored_html: Optional[str] = raw_html

    if raw_html and len(raw_html.encode("utf-8")) > RAW_HTML_MAX_INLINE_BYTES:
        storage_path = f"{dep_id}/{scrape_id}.html"
        try:
            db.storage.from_(RAW_SCRAPES_BUCKET).upload(
                path=storage_path,
                file=raw_html.encode("utf-8"),
                file_options={"content-type": "text/html"},
            )
            stored_html = (
                f"{SUPABASE_URL}/storage/v1/object/public/"
                f"{RAW_SCRAPES_BUCKET}/{storage_path}"
            )
            logger.debug(
                "Offloaded large HTML (%d bytes) to Storage: %s",
                len(raw_html), stored_html,
            )
        except Exception as exc:
            logger.warning("Failed to offload HTML to Storage: %s", exc)
            stored_html = raw_html[:524288]

    row = {
        "id": scrape_id,
        "dep_id": dep_id,
        "source_type": source_type,
        "source_url": source_url,
        "raw_html": stored_html,
        "structured": structured,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }

    async for attempt in AsyncRetrying(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=10),
        retry=retry_if_exception_type(Exception),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    ):
        with attempt:
            await db.table("raw_scrapes").insert(row).execute()

    logger.debug("Stored raw_scrape id=%s source_type=%s", scrape_id, source_type)
    return scrape_id


async def _enqueue_analysis_job(scrape_id: str) -> None:
    """
    Enqueue an AnalysisJob for Module 5.
    Inserts a trigger row into the analysis_jobs table that the
    analysis_chain worker polls — avoids adding a Redis client dependency
    to the Python service.
    """
    db = await _get_db()
    await (
        db.table("analysis_jobs")
        .insert(
            {
                "scrape_id": scrape_id,
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .execute()
    )
    logger.info("Enqueued AnalysisJob for scrape_id=%s", scrape_id)


# ---------------------------------------------------------------------------
# Per-source scraper runners (each isolated so one failure doesn't block others)
# ---------------------------------------------------------------------------


async def _run_github_release(payload: ScrapeJobPayload) -> Optional[dict]:
    if not payload.repo_owner or not payload.repo_name:
        return None
    try:
        tag = f"v{payload.new_version}"
        return await scrape_github_release(
            payload.repo_owner, payload.repo_name, tag
        )
    except Exception as exc:
        logger.error("SS-001 | github_release scraper failed: %s", exc)
        return None


async def _run_github_issues(payload: ScrapeJobPayload) -> Optional[list]:
    if not payload.repo_owner or not payload.repo_name:
        return None
    try:
        return await fetch_breaking_issues(
            payload.repo_owner,
            payload.repo_name,
            since_date=payload.since_date,
        )
    except Exception as exc:
        logger.error("SS-002 | github_issues scraper failed: %s", exc)
        return None


async def _run_community_signals(payload: ScrapeJobPayload) -> Optional[list]:
    try:
        return await fetch_community_signals(payload.dep_name, payload.new_version)
    except Exception as exc:
        logger.error("community_signals scraper failed: %s", exc)
        return None


async def _run_cve_signals(payload: ScrapeJobPayload) -> Optional[list]:
    try:
        return await fetch_cve_signals(payload.dep_name, payload.new_version)
    except Exception as exc:
        logger.error("cve_feeds scraper failed: %s", exc)
        return None


async def _run_registry_dataset(payload: ScrapeJobPayload) -> Optional[dict]:
    if payload.ecosystem not in ("npm", "pypi"):
        return None
    try:
        return await fetch_registry_metadata(payload.dep_name, payload.ecosystem)  # type: ignore[arg-type]
    except Exception as exc:
        logger.error("registry_dataset scraper failed: %s", exc)
        return None


async def _run_maintainer_blog(payload: ScrapeJobPayload) -> Optional[dict]:
    if not payload.blog_url:
        return None
    try:
        return await scrape_maintainer_blog(payload.blog_url)
    except Exception as exc:
        logger.error("maintainer_blog scraper failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Main job processor
# ---------------------------------------------------------------------------


async def process_scrape_job(job_data: dict) -> str:
    """
    Entry point called by the BullMQ Python worker for each ScrapeJob.

    Runs all six scrapers in parallel, persists results to Supabase, and
    enqueues an AnalysisJob.

    Returns the scrape_id of the primary raw_scrape row.
    """
    payload = ScrapeJobPayload(**job_data)

    logger.info(
        "Processing ScrapeJob dep=%s %s->%s (ecosystem=%s)",
        payload.dep_name, payload.old_version, payload.new_version, payload.ecosystem,
    )

    # Run all 6 scrapers in parallel — failures are isolated per source
    (
        release_result,
        issues_result,
        community_result,
        cve_result,
        registry_result,
        blog_result,
    ) = await asyncio.gather(
        _run_github_release(payload),
        _run_github_issues(payload),
        _run_community_signals(payload),
        _run_cve_signals(payload),
        _run_registry_dataset(payload),
        _run_maintainer_blog(payload),
    )

    # Persist each non-null result as a raw_scrape row
    db = await _get_db()
    primary_scrape_id: Optional[str] = None

    if release_result:
        sid = await _store_raw_scrape(
            db,
            dep_id=payload.dep_id,
            source_type="github_release",
            source_url=release_result.get("url"),
            raw_html=release_result.get("raw_html"),
            structured={
                "changelog_text": release_result.get("changelog_text", ""),
                "linked_issues": release_result.get("linked_issues", []),
                "tag": release_result.get("tag"),
            },
        )
        primary_scrape_id = primary_scrape_id or sid

    if issues_result:
        await _store_raw_scrape(
            db,
            dep_id=payload.dep_id,
            source_type="github_issues",
            source_url=(
                f"https://github.com/{payload.repo_owner}/{payload.repo_name}/issues"
                if payload.repo_owner else None
            ),
            raw_html=None,
            structured={"issues": issues_result},
        )

    if community_result:
        await _store_raw_scrape(
            db,
            dep_id=payload.dep_id,
            source_type="community",
            source_url=None,
            raw_html=None,
            structured={"signals": community_result},
        )

    if cve_result:
        sid = await _store_raw_scrape(
            db,
            dep_id=payload.dep_id,
            source_type="cve",
            source_url=None,
            raw_html=None,
            structured={"signals": cve_result},
        )
        primary_scrape_id = primary_scrape_id or sid

    if registry_result:
        await _store_raw_scrape(
            db,
            dep_id=payload.dep_id,
            source_type="registry",
            source_url=registry_result.get("homepage"),
            raw_html=None,
            structured={k: v for k, v in registry_result.items() if k != "raw"},
        )

    if blog_result:
        await _store_raw_scrape(
            db,
            dep_id=payload.dep_id,
            source_type="maintainer",
            source_url=blog_result.get("url"),
            raw_html=blog_result.get("raw_html"),
            structured={
                "text": blog_result.get("text", ""),
                "title": blog_result.get("title"),
                "published_at": blog_result.get("published_at"),
            },
        )

    if not primary_scrape_id:
        logger.warning(
            "All scrapers returned no data for dep=%s %s->%s",
            payload.dep_name, payload.old_version, payload.new_version,
        )
        return ""

    await _enqueue_analysis_job(primary_scrape_id)

    logger.info(
        "ScrapeJob complete dep=%s primary_scrape_id=%s",
        payload.dep_name, primary_scrape_id,
    )
    return primary_scrape_id


# ---------------------------------------------------------------------------
# Standalone entry-point for local testing
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    test_job = {
        "dep_id": "00000000-0000-0000-0000-000000000001",
        "dep_name": "axios",
        "ecosystem": "npm",
        "old_version": "1.7.2",
        "new_version": "3.0.0",
        "repo_owner": "axios",
        "repo_name": "axios",
        "blog_url": None,
        "since_date": "2024-01-01T00:00:00Z",
    }
    result = asyncio.run(process_scrape_job(test_job))
    print(f"primary_scrape_id: {result}")
