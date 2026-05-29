# syntax=docker/dockerfile:1.6

FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

# Non-root user (image already runs as root by default)
RUN groupadd -r scraper && useradd -r -g scraper -u 1001 scraper \
    && mkdir -p /app /ms-playwright \
    && chown -R scraper:scraper /app /ms-playwright

# Install Python deps (layer cached as long as requirements.txt unchanged)
COPY --chown=scraper:scraper requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=scraper:scraper . .

USER scraper

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Worker is a long-running BullMQ consumer; no health endpoint exposed by default.
# If/when worker.py adds a /health server, add HEALTHCHECK + EXPOSE here.

CMD ["python", "worker.py"]