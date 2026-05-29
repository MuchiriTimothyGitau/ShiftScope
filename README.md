# ShiftScope — Autonomous Dependency Intelligence Agent

Monitors open-source dependency ecosystems (npm, PyPI), detects breaking changes, pre-CVE signals, supply chain risks, and delivers actionable alerts. Combines an **Express API server** (BullMQ + Gemini + Cognee Knowledge Graph + TriggerWare automation) with dedicated background workers.

## Team

| Role | Member | Responsibilities |
|---|---|---|
| **Backend & AI** | Tim | Express server, AI analysis chain, security/resilience layer, Gemini + Cognee + TriggerWare integration |
| **Infra & Docker** | Promise / Yira | Docker Compose, CI/CD pipelines, Upstash Redis |
| **Frontend** | Joyce | React SPA dashboard (Vite + Tailwind), Supabase client |
| **Scrapers & Demo** | Ishrak | Bright Data web scraping, CVE feeds, demo video + presentation |
| **Backend Support** | Hammad | Lockfile parsers, API diff, Zod schemas, cache layer |
| **Testing / QA** | Hussnain | Unit tests, integration tests, regression testing |

## Project Structure

```
shiftscope/
├── server.ts                 # Express API server (BullMQ + Gemini + Cognee + TriggerWare)
├── middleware/                # Security & resilience (env validation, rate limiter, graceful shutdown)
├── src/                      # React SPA dashboard (Vite + Tailwind)
├── scheduler/                # Module 1 — Scan orchestrator + lockfile parsers + security/resilience layer
├── analysis_chain/           # Module 2 — AI analysis (7-step Gemini chain)
├── delivery/                 # Module 3 — Alert delivery engine (Slack, email, webhook)
├── scraping_pipeline/        # Python Bright Data + Playwright scrapers
├── supabase/                 # Shared SQL schema & seed data
├── types/                    # Shared TypeScript interfaces
├── docker-compose.yml        # All services (Express server + Redis + workers)
├── Dockerfile                # Express server container
├── package.json              # Root: Express server + frontend deps
├── vite.config.ts            # Vite dev server config
├── tsconfig.json             # TypeScript config
└── .env.example
```

## Quick Start

### Prerequisites

- Node.js 18+
- Redis (local or Upstash)
- Gemini API key
- Supabase project (optional — for persistence)

### Setup

```bash
cp .env.example .env
npm install
npm install --prefix scheduler
npm install --prefix analysis_chain
npm install --prefix delivery
```

### Run Migration

Open Supabase Studio SQL editor at `https://supabase.com/dashboard/project/<project-id>/sql/new`
and paste `supabase/migrations/001_initial_schema.sql` then `supabase/seed.sql`.

### Start Dev Server + Workers

```bash
# Terminal 1 — Express API server (includes Vite dev middleware for frontend)
npm run dev

# Terminal 2 — Scheduler
npm run dev --prefix scheduler

# Terminal 3 — Analysis Chain
npm run dev --prefix analysis_chain

# Terminal 4 — Delivery
npm run dev --prefix delivery
```

Open `http://localhost:3000` for the dashboard.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/analyze` | POST | Sync dependency analysis (Gemini or local fallback) |
| `/api/analyze-queue` | POST | Async analysis via BullMQ queue (or in-memory fallback) |
| `/api/status/:jobId` | GET | Poll async job progress and result |
| `/api/autonomous-agent` | POST | Full agent pipeline (Bright Data + Cognee + TriggerWare) |
| `/api/redis-stats` | GET | Queue telemetry (waiting, active, completed, failed) |
| `/api/redis-purge` | POST | Drain all queue jobs |
| `/api/download-zip` | GET | Download project source archive |

## Architecture

```
User (Dashboard) ──> Express Server ──> BullMQ Queue ──> Worker Pool
                        │                                      │
                        ├── Gemini AI (analysis fallback)       ├── Scheduler (lockfile parsing)
                        ├── Cognee Knowledge Graph              ├── Analysis Chain (7-step Gemini)
                        ├── TriggerWare Automation              └── Delivery (Slack/email/webhook)
                        └── Bright Data Scraper
```

The **Express server** is the primary API gateway — it serves the React frontend, accepts analysis requests, and orchestrates the agent pipeline. Background **workers** consume BullMQ jobs for scheduling, deep analysis, and alert delivery.

## Security & Resilience

| Feature | Location | Purpose |
|---|---|---|
| Env validation | `middleware/env-validator.ts` | Warn on startup if keys are missing |
| Graceful shutdown | `middleware/shutdown.ts` | SIGTERM drains workers, closes Redis, exits. 30s timeout |
| Rate limiter | `middleware/rate-limiter.ts` | Redis sliding-window per IP (30/min analyze, 20/min agent) |
| Circuit breaker | `scheduler/src/resilience/circuit-breaker.ts` | 5 failures -> open 60s |
| Dead letter queue | `scheduler/src/resilience/dead-letter.ts` | Failed jobs persisted for replay |
| Dedup | `scheduler/src/resilience/dedup.ts` | Content-hash dedup + 30-min cooldown |
| API key auth | `scheduler/src/security/auth.ts` | Bearer token + HMAC webhook verification |
| XSS sanitizer | `scheduler/src/security/sanitizer.ts` | Strip script tags, event handlers |
| Typosquat detector | `scheduler/src/security/typosquat-detector.ts` | Levenshtein vs 150+ packages + homoglyph detection |
| Risk scanner | `scheduler/src/security/risk-scanner.ts` | Heuristic scoring (typosquat, deprecation, low adoption) |

## Deployment

| Component | Platform | Notes |
|---|---|---|
| Express server | Railway / Fly.io | Long-running process with BullMQ |
| Dashboard | Vite SPA (served by Express) | Built-in, no separate deployment needed |
| Workers | Railway / Fly.io | Separate services per worker |
| Database | Supabase Cloud (free tier) | Already provisioned |
| Redis | Upstash (free 10MB) | BullMQ queue backend |
| AI | Gemini API (free tier) | 60 req/min |
