# ShiftScope — Autonomous Dependency Intelligence Agent

Monitors open-source dependency ecosystems (npm, PyPI, crates.io, Go, RubyGems, Maven), detects breaking changes, pre-CVE signals, supply chain risks, and delivers actionable alerts.

## Team

| Role | Member | Responsibilities |
|---|---|---|
| **Backend & AI** | Tim | Scheduler, analysis chain, delivery engine, AI prompt engineering, security/resilience layer |
| **Infra & Docker** | Promise / Yira | Redis Cloud (Upstash), Docker Compose, CI/CD pipelines |
| **Frontend** | Joyce | Next.js dashboard, Supabase client, deployment to Vercel |
| **Scrapers & Demo** | Ishrak | CVE feed crawler, GitHub issues/blog scraper, demo video + presentation |
| **Backend Support** | Hammad | Version comparator, API diff, Zod schemas, cache layer (integrated) |
| **Testing / QA** | Hussnain | Unit tests, integration tests, regression testing |

## Project Structure

```
shiftscope/
├── scheduler/                 # Module 1 — Scan orchestrator + security + resilience
│   └── src/
│       ├── security/          # Env validation, rate limiter, XSS sanitizer, auth, typosquat detector, risk scanner
│       ├── resilience/        # Circuit breaker, graceful shutdown, dead letter queue, dedup
│       ├── monitor.ts         # WorkerMonitor (Redis-backed job tracking)
│       ├── health-server.ts   # HTTP /health + /metrics on :9090
│       ├── registry.ts        # Registry checkers (6 ecosystems) with circuit breaker
│       ├── lockfile_parser/   # Parsers for npm, pip, Cargo, go.sum, yarn, pnpm, gem, maven
│       └── index.ts           # Scan cycle orchestrator
├── analysis_chain/            # Module 2 — AI analysis (7-step Gemini chain)
│   └── src/
│       ├── security/          # LLM-based malware scanner
│       ├── trends/            # LLM-based trend/sentiment analyzer
│       ├── chain.ts           # Step 1-7: summarise -> breaking changes -> cross-ref -> fix -> severity -> security scan -> trends
│       ├── worker.ts          # BullMQ worker with heuristic risk pre-check
│       └── prompts/           # Step-specific prompt templates
├── delivery/                  # Module 3 — Alert delivery engine
│   └── src/
│       ├── slack.ts           # Slack blocks builder
│       ├── email.ts           # Email via Resend
│       ├── webhook.ts         # HMAC-signed webhook dispatch
│       └── worker.ts          # Multi-channel delivery worker
├── dashboard/                 # Module 4 — Next.js frontend (Joyce)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # DDL: 6 tables, RLS, trigram indexes, claim_analysis_jobs()
├── .env.example
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- Redis (local or Upstash)
- Supabase project (cloud or local)
- Gemini API key

### Setup

```bash
cp .env.example .env
# Fill in real values (see Environment Variables below)
npm install --prefix scheduler
npm install --prefix analysis_chain
npm install --prefix delivery
```

### Run Migration

Open Supabase Studio SQL editor at `https://supabase.com/dashboard/project/<project-id>/sql/new`
and paste the contents of `supabase/migrations/001_initial_schema.sql`, then `supabase/seed.sql`.

### Start Workers (local)

```bash
# Terminal 1 — Scheduler
npm run dev --prefix scheduler

# Terminal 2 — Analysis Chain
npm run dev --prefix analysis_chain

# Terminal 3 — Delivery
npm run dev --prefix delivery
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key (keep secret) |
| `REDIS_URL` | No | Defaults to `redis://localhost:6379` |
| `GEMINI_API_KEY` | Yes | For AI analysis chain |
| `SLACK_BOT_TOKEN` | No | Slack alert delivery |
| `RESEND_API_KEY` | No | Email alert delivery |
| `WEBHOOK_SECRET` | No | HMAC secret for webhooks |
| `SCAN_INTERVAL_MINUTES` | No | Default 15 |
| `LOG_LEVEL` | No | Default `info` |

## Architecture

**Scheduler** -> enqueues -> Scrape Queue -> consumes -> **Analysis Chain** -> enqueues -> Delivery Queue -> consumes -> **Delivery Engine**

The scheduler parses lockfiles and checks registry versions, enqueuing scrape jobs when updates are detected. The analysis chain runs a 7-step Gemini process (5 prompt steps plus parallel security scan and trend analysis). The delivery engine sends per-channel alerts via Slack, email, or webhook.

## Security & Resilience

| Feature | Module | Purpose |
|---|---|---|
| Env validation | `scheduler/src/security/env-validator.ts` | Fail-fast on missing secrets |
| Rate limiter | `scheduler/src/security/rate-limiter.ts` | Redis sliding-window (30/min webhook, 60/min registry, 100/min API) |
| API key auth | `scheduler/src/security/auth.ts` | Bearer token + timingSafeEqual + HMAC webhook verification |
| XSS sanitizer | `scheduler/src/security/sanitizer.ts` | Strip script tags, event handlers, javascript: URLs |
| Typosquat detector | `scheduler/src/security/typosquat-detector.ts` | Levenshtein distance vs 150+ popular packages + homoglyph detection |
| Risk scanner | `scheduler/src/security/risk-scanner.ts` | Heuristic scoring: typosquat, deprecation, low adoption, unmaintained, install scripts |
| Circuit breaker | `scheduler/src/resilience/circuit-breaker.ts` | 5 failures -> open 60s -> half-open 2 probes -> closed on recovery |
| Graceful shutdown | `scheduler/src/resilience/shutdown.ts` | SIGTERM drains workers, closes Redis, exits. 30s timeout |
| Dead letter queue | `scheduler/src/resilience/dead-letter.ts` | Failed jobs persisted for replay |
| Dedup | `scheduler/src/resilience/dedup.ts` | Content-hash dedup + 30-min cooldown |
| WorkerMonitor | `scheduler/src/monitor.ts` | Redis-backed active jobs, counters, durations, error tracking |
| Health server | `scheduler/src/health-server.ts` | HTTP /health (JSON) + /metrics (Prometheus) on :9090 |
| Malware scanner | `analysis_chain/src/security/scanner.ts` | Gemini-based 7-indicator supply chain attack detection |
| Trend analyzer | `analysis_chain/src/trends/analyzer.ts` | Gemini-based community sentiment + upgrade recommendation |

## Implementation Status

### Complete
- **Scheduler**: Lockfile parsers (10 formats), registry checkers (6 ecosystems) with circuit breaker + rate limiting, scan cycle orchestrator, BullMQ queue setup
- **Security layer**: Env validation, XSS sanitizer, rate limiter, API key + HMAC auth, typosquat detector, heuristic risk scanner, Gemini malware scanner, Gemini trend analyzer
- **Resilience layer**: Circuit breaker, graceful shutdown, dead letter queue, dedup, WorkerMonitor, health server
- **Analysis Chain**: 7-step Gemini chain (summarise -> breaking changes -> cross-reference -> fix generation -> severity scoring + parallel security scan + trend analysis), heuristic risk pre-check, BullMQ worker with exponential backoff
- **Delivery**: Slack blocks builder, email HTML renderer (Resend), HMAC-signed webhook dispatch, multi-channel per-row alert_deliveries inserts, BullMQ worker with backoff
- **Database**: Full DDL (6 tables, CHECK constraints, RLS cascading, claim_analysis_jobs() SKIP LOCKED function, pg_trgm indexes), seed data with full pipeline demo

### In Progress
- **Dashboard** (Joyce) — Next.js scaffold ready
- **Scraping pipeline** (Ishrak) — CVE feeds, GitHub issues/blog crawler
- **Docker Compose** (Promise/Yira) — Local dev with Redis
- **Tests** (Hussnain) — Lockfile parser tests passing (6/6), chain test needs mock fix

### Not Started
- CI/CD (GitHub Actions)
- Demo video + presentation

## Deployment

| Component | Platform | Notes |
|---|---|---|
| Dashboard | Vercel (free) | Serverless Next.js — connect GitHub repo, root dashboard/ |
| Workers | Fly.io / Railway (free tier) | Long-running BullMQ processes — scheduler, analysis, delivery |
| Database | Supabase Cloud (free tier) | Already provisioned |
| Redis | Upstash (free 10MB) | BullMQ queue backend |
| AI | Gemini API (free tier) | 60 req/min |

Total estimated cost: $0/month for all services on free tiers.
