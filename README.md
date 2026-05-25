# ShiftScope - Autonomous Dependency Intelligence Agent

## Team Roles Assignment
- **Tim (You)** - Backend & AI Development
  - Modules: Scheduler, Lockfile Parser, AI Analysis Chain, Delivery Engine
  - Focus: Core logic, data flow, AI prompt engineering, integration
- **Joyce** - Frontend & DevOps
  - Modules: Dashboard, Deployment, CI/CD
  - Focus: User interface, Docker orchestration, monitoring
- **Ishrak** - Data & Security
  - Modules: Storage Layer, Scraping Pipeline, Security Implementation
  - Focus: Database design, data pipelines, credential management, compliance

## Project Structure
```
shiftscope/
├── scheduler/                # Module 1 — Node.js + TypeScript (Tim)
├── scraping_pipeline/        # Module 3 — Python + Playwright (Ishrak)
├── analysis_chain/           # Module 5 — Node.js + TypeScript (Tim)
├── delivery/                 # Module 6 — Node.js + TypeScript (Tim)
├── dashboard/                # Next.js 14 frontend (Joyce)
├── supabase/                 # Database migrations & seeds (Ishrak)
├── docker-compose.yml
├── .env.example
└── README.md
```

## Development Guidelines
1. **Neurotypical Thinking**: Approach problems with clear, structured logic
2. **Standard Practices**: Follow conventional project setup and coding standards
3. **Module Independence**: Each team member owns their modules with minimal coupling
4. **Communication**: Regular syncs on interface contracts and data flow
5. **Quality Focus**: Prioritize clean, maintainable code over speed

## Immediate Next Steps
1. Each member sets up their development environment
2. Implement basic module scaffolding
3. Define and agree on interface contracts (Supabase tables, BullMQ queues)
4. Begin implementation according to the 48-hour build plan in documentation

## Environment Setup
Copy `.env.example` to `.env` and fill in actual values for local development.

## Key References
- Technical Documentation: `ShiftScope_Technical_Documentation.docx`
- User Manual: `ShiftScope_User_Manual.docx`

This foundation will serve as the reference for our branch creation and development workflow.

## Implementation Status

### ✅ Backend & AI (Tim)
- **scheduler/** — lockfile parsers (npm, requirements.txt, Cargo.lock, go.sum, yarn, pnpm, pipfile, poetry, gem, maven), registry version checker (npm, PyPI, crates.io, Go proxy, RubyGems, Maven), BullMQ queue setup, scan cycle orchestrator
- **analysis_chain/** — 5-step Gemini prompt chain (summarise, breaking changes, cross-reference, fix generation, severity scoring), BullMQ worker
- **delivery/** — Slack alert blocks builder, email HTML renderer (Resend), webhook with HMAC-SHA256 signing, multi-channel delivery worker
- **supabase/migrations/** — Full DDL with RLS policies

### 🟡 Frontend & DevOps (Joyce)
- **dashboard/** — Scaffold ready for Next.js 14 implementation

### 🟡 Data & Scraping (Ishrak)
- **scraping_pipeline/** — Requirements.txt ready, Dockerfile with Playwright, awaiting scraper implementations
- **supabase/** — Migration DDL ready, seed data pending