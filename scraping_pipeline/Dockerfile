# syntax=docker/dockerfile:1.6

FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

RUN groupadd -r scraper && useradd -r -g scraper -u 1001 scraper \
    && mkdir -p /app /ms-playwright \
    && chown -R scraper:scraper /app /ms-playwright

COPY scraping_pipeline/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY scraping_pipeline/ ./

USER scraper

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

CMD ["python", "worker.py"]
