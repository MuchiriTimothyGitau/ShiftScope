# scraping_pipeline/scrapers/registry_dataset.py
"""
Module 3 — Scraping Pipeline
Source type : Package registry page (npm / PyPI)
Bright Data product : Dataset API (pre-scraped, structured datasets)

Why Bright Data is required here:
  BrightData maintains continuously refreshed structured datasets for npm and
  PyPI packages. Using the Dataset API avoids the need to scrape registry pages
  directly and delivers clean, structured data including version metadata and
  deprecation flags — see TABLE 10 in the ShiftScope spec.

Output schema (dict):
  name            str         — normalised package name
  ecosystem       str         — 'npm' | 'pypi'
  latest_version  str         — latest published version
  versions        list[str]   — all published versions (newest first)
  deprecated      bool        — true if the package is officially deprecated
  description     str | None
  homepage        str | None
  repository      str | None
  weekly_downloads int | None  — npm only
  raw             dict        — full raw Dataset API response
"""

import logging
import os
from typing import Literal

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

logger = logging.getLogger("shiftscope.scrapers.registry_dataset")

BD_DATASET_API_KEY = os.environ["BD_DATASET_API_KEY"]

# BrightData Dataset IDs — pre-scraped npm and PyPI package datasets
BD_DATASET_NPM_ID = os.environ.get("BD_DATASET_NPM_ID", "gd_npm_packages_v3")
BD_DATASET_PYPI_ID = os.environ.get("BD_DATASET_PYPI_ID", "gd_pypi_packages_v2")

# BrightData Dataset API endpoint
_DATASET_URL = "https://api.brightdata.com/datasets/v3/snapshot"

Ecosystem = Literal["npm", "pypi"]


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=4, max=30),
    retry=retry_if_exception_type(Exception),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def fetch_registry_metadata(
    name: str,
    ecosystem: Ecosystem,
) -> dict:
    """
    Retrieve structured registry metadata for a package from BrightData's
    pre-scraped Dataset API.

    Args:
        name:       Package name  (e.g. 'axios' or 'requests')
        ecosystem:  'npm' or 'pypi'

    Returns:
        Normalised metadata dict matching the output schema above.

    Raises:
        ValueError: if ecosystem is not supported.
        httpx.HTTPStatusError: on API errors (will be retried).
    """
    if ecosystem == "npm":
        dataset_id = BD_DATASET_NPM_ID
    elif ecosystem == "pypi":
        dataset_id = BD_DATASET_PYPI_ID
    else:
        raise ValueError(f"Unsupported ecosystem: {ecosystem!r}")

    logger.info("Fetching registry metadata: %s (%s)", name, ecosystem)

    async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0)) as client:
        resp = await client.get(
            _DATASET_URL,
            headers={
                "Authorization": f"Bearer {BD_DATASET_API_KEY}",
                "Content-Type": "application/json",
            },
            params={
                "dataset_id": dataset_id,
                "filter": f"name={name}",
                "format": "json",
                "limit": 1,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    if not data:
        logger.warning("No registry data found for %s (%s)", name, ecosystem)
        return _empty_result(name, ecosystem)

    raw = data[0] if isinstance(data, list) else data

    # Normalise across npm and PyPI response shapes
    result = _normalise(raw, ecosystem, name)
    logger.info(
        "Registry metadata for %s@%s (deprecated=%s)",
        name, result["latest_version"], result["deprecated"],
    )
    return result


def _normalise(raw: dict, ecosystem: Ecosystem, name: str) -> dict:
    """Map BrightData Dataset API response to the ShiftScope output schema."""
    if ecosystem == "npm":
        dist_tags = raw.get("dist-tags", {})
        latest = dist_tags.get("latest", "")
        versions = sorted(
            raw.get("versions", {}).keys(),
            reverse=True,
        )
        deprecated = bool(raw.get("deprecated", False))
        description = raw.get("description")
        homepage = raw.get("homepage")
        repository = (raw.get("repository") or {}).get("url")
        weekly_downloads = raw.get("weeklyDownloads")

    else:  # pypi
        info = raw.get("info", {})
        latest = info.get("version", "")
        versions = [
            release
            for release, files in raw.get("releases", {}).items()
            if files  # skip yanked/empty releases
        ]
        versions.sort(reverse=True)
        deprecated = bool(info.get("yanked", False))
        description = info.get("summary")
        homepage = info.get("home_page") or (info.get("project_urls") or {}).get(
            "Homepage"
        )
        repository = (info.get("project_urls") or {}).get("Source")
        weekly_downloads = None

    return {
        "name": name,
        "ecosystem": ecosystem,
        "latest_version": latest,
        "versions": versions,
        "deprecated": deprecated,
        "description": description,
        "homepage": homepage,
        "repository": repository,
        "weekly_downloads": weekly_downloads,
        "raw": raw,
    }


def _empty_result(name: str, ecosystem: Ecosystem) -> dict:
    return {
        "name": name,
        "ecosystem": ecosystem,
        "latest_version": "",
        "versions": [],
        "deprecated": False,
        "description": None,
        "homepage": None,
        "repository": None,
        "weekly_downloads": None,
        "raw": {},
    }
