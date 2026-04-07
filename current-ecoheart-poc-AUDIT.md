# EcoHeart — Platform Audit & Architecture Overview

> **Audit Date:** March 22, 2026
> **Application:** EcoHeart (eco-agent-poc)
> **Current Deployment:** https://eco-agent-poc.onrender.com
> **Target City (POC):** City of Olympia, WA

---

## What EcoHeart Does

EcoHeart is an AI-powered municipal research assistant that lets city staff and residents query indexed city documents through a streaming chat interface. Users ask natural-language questions about climate plans, budgets, transportation, infrastructure, public safety, and more — and get cited, data-backed answers drawn from official city records.

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Document Q&A** | RAG-powered search across 26 indexed municipal PDFs with source citations and page numbers |
| **Chart Generation** | Creates interactive line, bar, area, scatter, and quadrant charts from analysis results |
| **CSV Export** | Generates downloadable data tables from AI analysis |
| **PDF Reports** | Exports full conversation threads as formatted PDF documents |
| **AI Image Generation** | Creates infographics, diagrams, and visualizations on demand |
| **Systems Modeler** | Builds causal loop diagrams for policy analysis (Gene Bellinger methodology) |
| **Code Execution** | Runs Python code in a sandboxed environment for data analysis |
| **Subscription Billing** | Tiered access (free / pay-per-use / unlimited) via Polar |

### Indexed Document Categories (26 total)

- **Climate & Environment (8):** Climate risk assessment, sea level rise plan, greenhouse gas inventory, water quality/system plans, stormwater management, urban forestry manual, green belt stewardship
- **Planning & Development (4):** Neighborhood centers strategy, comprehensive plan EIS, housing action plan, public participation plan
- **Budget & Finance (4):** 2025 operating budget, long-range financial projections, capital facilities plans (2025-2030, 2026-2031)
- **Transportation & Infrastructure (3):** Transportation master plan, street safety plan, stormwater site plans
- **Public Safety (3):** Natural hazard mitigation, emergency management, police strategic plan
- **Other Municipal Plans (4):** Parks/arts/recreation, waste resources, annual work plan, tree density guide

---

## Core Dependencies

### 1. OpenAI API — `OPENAI_API_KEY`

**Role:** Primary AI engine. Powers all intelligence in the platform.

| Use Case | Model | Purpose |
|----------|-------|---------|
| Chat | `gpt-4o` | Streaming responses with tool calling |
| RAG context compression | `gpt-4o` | Summarizes retrieved document chunks (8500 max tokens, temp=0.1) |
| Embeddings | `text-embedding-3-small` | Converts queries and documents to 1024-dim vectors for semantic search |
| Image generation | `gpt-image-1` | Creates infographics, diagrams, visualizations |
| Title generation | `gpt-5-nano` | Auto-generates chat session titles |
| Systems Modeler | `gpt-4o` | Generates causal loop diagram models (JSON mode) |

**Cost exposure:** Every chat message, RAG query, image generation, and systems model call hits the OpenAI API. No per-query cost tracking is implemented.

**Fallbacks:** Ollama and LM Studio supported in development mode only (not production).

---

### 2. Supabase — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Role:** Authentication, database, and user management.

| Function | Details |
|----------|---------|
| **Authentication** | Google OAuth (primary), email/password (secondary) |
| **User profiles** | Subscription tier, Polar customer ID, creation date |
| **Chat storage** | Sessions and messages with JSON content |
| **Rate limiting** | Per-user usage counts with daily reset |
| **Data storage** | Charts (JSON), CSVs (JSON arrays), images (base64), RAG contexts |
| **Row Level Security** | RLS policies on all tables (users only see their own data) |

**Database tables:** `users`, `user_rate_limits`, `chat_sessions`, `chat_messages`, `charts`, `csvs`, `images`, `rag_contexts`

**Dev fallback:** SQLite via Drizzle ORM when `NEXT_PUBLIC_APP_MODE=development`.

---

### 3. AWS S3 & S3 Vectors — `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

**Role:** Document storage and vector search for RAG.

| Resource | Purpose |
|----------|---------|
| S3 bucket `olympia-plans-raw` | Stores the 26 raw city PDF documents |
| S3 Vectors bucket `olympia-rag-vectors` | Stores vector embeddings |
| S3 Vectors index `olympia-pages-idx` | Indexes 1024-dim embeddings for semantic search |
| Region | `us-west-2` (Oregon) |

**RAG pipeline:** PDFs → PyMuPDF4LLM text extraction → token-based chunking (max 5000) → OpenAI embeddings → S3 Vectors. Ingestion is a one-time offline Python process (`RAG/full_ingestion.py`).

**Runtime flow:** User query → embed with OpenAI → query S3 Vectors (top-K=8) → compress context with GPT-4o → return cited answer.

---

### 4. Polar — `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_UNLIMITED_PRODUCT_ID`, `POLAR_PAY_PER_USE_PRODUCT_ID`

**Role:** Subscription billing and usage metering.

| Function | Details |
|----------|---------|
| Checkout | Creates payment sessions for plan upgrades |
| Webhooks | Handles `customer.state_changed`, `subscription.created/updated/canceled` |
| Customer portal | Self-service billing management |
| Usage metering | Tracks API call costs per user via `@polar-sh/ingestion` |

**Tiers:** Free (5 queries/day), Pay-per-use, Unlimited. Currently all authenticated users get unlimited (POC bypass).

---

### 5. Daytona — `DAYTONA_API_KEY`, `DAYTONA_API_URL`, `DAYTONA_TARGET`

**Role:** Sandboxed Python code execution.

Users can ask EcoHeart to run Python code for data analysis. Code runs in Daytona's isolated sandbox environment, not on the application server. Execution time is tracked for billing purposes.

**Default endpoint:** `https://api.daytona.io`, region `us`.

---

### 6. Valyu API — `VALYU_API_KEY`

**Role:** Web and biomedical search tool.

Provides web search capabilities as a fallback/supplement to RAG-based document search. Originally from the biomedical fork this project was based on. Usage is tracked via Polar event metering.

---

### 7. PostHog — `NEXT_PUBLIC_POSTHOG_KEY` (optional)

**Role:** Product analytics.

Tracks page views and user behavior for identified (authenticated) users only. Session recording enabled with input masking on `.sensitive` class elements. Autocapture disabled.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15.4.5 (App Router, TypeScript) |
| **React** | React 19.1.0 |
| **Styling** | Tailwind CSS v4, Radix UI, shadcn/ui |
| **State management** | Zustand (auth, systems modeler), TanStack Query (data fetching) |
| **AI SDK** | Vercel AI SDK (`@ai-sdk/openai`) for streaming + tool calling |
| **Charts** | Recharts |
| **Diagrams** | D3.js (force simulation for causal loop diagrams) |
| **PDF generation** | Puppeteer + Chromium (`@sparticuz/chromium` in prod) |
| **ORM** | Drizzle ORM (SQLite dev, Supabase prod) |
| **Animation** | Framer Motion |
| **Math rendering** | KaTeX |
| **Markdown** | remark-gfm, rehype-raw |

---

## Hosting Architecture

| Component | Service | Tier |
|-----------|---------|------|
| **Application** | Render | Free (spins down after 15min idle) |
| **Database** | Supabase | Managed PostgreSQL |
| **Vector DB** | AWS S3 Vectors | Pay-per-use |
| **Document storage** | AWS S3 | Standard |
| **DNS/SSL** | Render | Auto-provisioned |
| **Container** | Docker (Node 20-slim + Chromium) | — |

**Deployment:** Push to GitHub → Render auto-builds from `render.yaml` blueprint → `npm install --legacy-peer-deps && npm run build` → `npm start` on port 3000.

---

## Production Readiness Gaps (for City of Denver)

### Tier 1 — Blockers

| Issue | Current State | Required State |
|-------|--------------|----------------|
| **Rate limiting disabled** | All auth users get unlimited queries | Enforce per-user caps, server-side |
| **No security headers** | Zero CSP, HSTS, X-Frame-Options | Full OWASP security header set |
| **Public API routes** | `/api/eco-rag`, `/api/env-status` unauthenticated | All routes require auth by default |
| **Free hosting tier** | Render free (cold starts, no SLA) | Paid tier with always-on, auto-scaling, SLA |
| **No backups** | No backup strategy documented | Automated Supabase backups, S3 versioning, documented RTO/RPO |
| **Cookie rate limiting bypassable** | Base64 cookie (delete to bypass) | Server-side IP or session-based limiting |

### Tier 2 — Serious

| Issue | Current State | Required State |
|-------|--------------|----------------|
| **No input validation** | User messages passed raw to LLM | Content filtering, length limits, prompt injection detection |
| **XSS risk** | `rehype-raw` renders raw HTML in AI responses | Replace with `rehype-sanitize` or strict CSP |
| **No logging infrastructure** | `console.log` only | Structured logging, centralized aggregation, alerting |
| **No test suite** | Zero tests | Unit, integration, and e2e test coverage |
| **Hardcoded Olympia branding** | Index names, buckets, prompts all Olympia-specific | Configurable per-city tenant layer |
| **No RBAC** | Only anonymous vs authenticated | Admin, city-staff, department, public roles |
| **Unmaintainable file sizes** | chat-interface.tsx (4,422 lines), route.ts (1,242 lines) | Decompose into focused modules |

### Tier 3 — Government Readiness

| Issue | Current State | Required State |
|-------|--------------|----------------|
| **No compliance framework** | None | SOC 2, FedRAMP, ADA Section 508 as applicable |
| **Accessibility violations** | Zoom disabled, no skip nav, no ARIA live regions | Full WCAG 2.1 AA compliance |
| **No multi-tenancy** | Single city per deployment | Tenant isolation at DB and RAG layer |
| **No API versioning** | Unversioned routes | `/api/v1/*` versioning |
| **No CI/CD** | Manual deploys | Automated lint, type-check, test, staged deploy pipeline |
| **No secrets management** | Plain env vars in Render | Secrets manager with rotation |
| **No admin dashboard** | No management UI | User management, usage monitoring, system config |
| **No cost tracking** | No per-query cost attribution | Track and report OpenAI/AWS costs per user |

### Overall Production Readiness: ~2/10

The AI/RAG functionality is solid. The gaps are in security, infrastructure, compliance, testing, and observability — everything required to wrap a working POC into a production government service.

---

## File Map (Key Files)

```
eco-agent-poc/
├── render.yaml                          # Render deployment config
├── Dockerfile                           # Container image (Node 20 + Chromium)
├── middleware.ts                         # Supabase auth session refresh
├── src/
│   ├── app/
│   │   ├── page.tsx                     # Homepage + chat entry point
│   │   ├── layout.tsx                   # Root layout, viewport, metadata
│   │   ├── globals.css                  # Tailwind v4 theme, animations
│   │   ├── auth/callback/route.ts       # Google OAuth callback
│   │   ├── systems-modeler/             # Causal loop diagram tool
│   │   └── api/
│   │       ├── chat/route.ts            # Main chat streaming (1,242 lines)
│   │       ├── chat/sessions/           # Session CRUD
│   │       ├── eco-rag/route.ts         # RAG query pipeline
│   │       ├── charts/[chartId]/        # Chart storage + rendering
│   │       ├── csvs/[csvId]/            # CSV storage
│   │       ├── images/[imageId]/        # Image storage
│   │       ├── reports/generate-pdf/    # PDF export
│   │       ├── checkout/                # Polar billing
│   │       ├── webhooks/polar/          # Billing webhooks
│   │       └── env-status/              # Config health check
│   ├── components/
│   │   ├── chat-interface.tsx           # Main chat UI (4,422 lines)
│   │   ├── sidebar.tsx                  # Session history nav
│   │   ├── financial-chart.tsx          # Recharts visualization
│   │   ├── systems-modeler/             # D3 causal loop diagrams
│   │   ├── auth/                        # Auth modal + initializer
│   │   ├── user/                        # Settings + subscription modals
│   │   └── ui/                          # shadcn/ui base components
│   ├── lib/
│   │   ├── db.ts                        # DB abstraction (Supabase/SQLite)
│   │   ├── tools.ts                     # AI tool definitions (1,169 lines)
│   │   ├── rate-limit.ts                # Rate limiting logic
│   │   ├── env-validation.ts            # Env var validation
│   │   ├── local-db/schema.ts           # Drizzle ORM schema
│   │   ├── supabase/                    # Supabase client init
│   │   └── stores/use-auth-store.ts     # Zustand auth state
│   └── data/inventory.json              # Indexed document metadata
├── RAG/
│   ├── full_ingestion.py                # Complete RAG ingestion pipeline
│   ├── inventory.json                   # Document catalog (26 docs)
│   └── *.py                             # Supporting ingestion scripts
└── supabase_*.sql                       # Database migration files
```
