# Information Asset Inventory — Eco-Agent MVP (Demonstrator)

> **Scope**: Security audit asset inventory for the Eco-Agent proof-of-concept
> **Classification**: Internal — Security Review
> **Date**: 2026-02-09
> **Status**: MVP / Demonstrator (not production-grade)
> **Deployment**: Render.com (Free Tier)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Environment & Deployment](#2-environment--deployment)
3. [Secrets & Credentials](#3-secrets--credentials)
4. [External Service Integrations](#4-external-service-integrations)
5. [Application Routes & Endpoints](#5-application-routes--endpoints)
6. [Data Stores & Schemas](#6-data-stores--schemas)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Third-Party Dependencies](#9-third-party-dependencies)
10. [File Processing & Generation](#10-file-processing--generation)
11. [Configuration Files](#11-configuration-files)
12. [Hardcoded Values & Constants](#12-hardcoded-values--constants)
13. [Security Headers & Middleware](#13-security-headers--middleware)
14. [Identified Risk Areas](#14-identified-risk-areas)

---

## 1. System Overview

| Attribute          | Detail                                                        |
|--------------------|---------------------------------------------------------------|
| **Application**    | Eco-Agent PoC — AI chat assistant for City of Olympia public documents |
| **Framework**      | Next.js 15.4.5 (App Router), React 19.1.0                    |
| **Runtime**        | Node.js 20 (Docker: `node:20-slim`)                          |
| **Language**       | TypeScript 5.x (strict mode)                                 |
| **AI Provider**    | OpenAI (primary, only provider used in MVP)                   |
| **AI Models**      | `gpt-5.1` (chat), `text-embedding-3-small` (embeddings), `gpt-4o-mini` (RAG compression) |
| **Database**       | Supabase (PostgreSQL + Auth) — production; SQLite — local dev |
| **Vector Store**   | AWS S3 Vectors (pre-indexed City of Olympia public documents) |
| **Hosting**        | Render.com (Free Tier, Oregon region)                         |
| **Purpose**        | Demonstrator only — all indexed documents are public City of Olympia records |

---

## 2. Environment & Deployment

### 2.1 Deployment Target — Render.com

| Attribute           | Value                                           |
|---------------------|------------------------------------------------|
| **Config file**     | `render.yaml`                                  |
| **Plan**            | Free                                           |
| **Region**          | Oregon (us-west)                               |
| **Build command**   | `npm install --legacy-peer-deps && npm run build` |
| **Start command**   | `npm start`                                    |
| **Health check**    | `GET /`                                        |
| **Dockerfile**      | `Dockerfile` (node:20-slim + Chromium for PDF) |

### 2.2 Environment Variable Inventory

| Variable | Scope | Classification | Purpose |
|----------|-------|----------------|---------|
| `OPENAI_API_KEY` | Server-only | **SECRET** | OpenAI API access |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | **SECRET** | Supabase admin access (bypasses RLS) |
| `AWS_ACCESS_KEY_ID` | Server-only | **SECRET** | AWS S3 Vectors access |
| `AWS_SECRET_ACCESS_KEY` | Server-only | **SECRET** | AWS S3 Vectors secret |
| `VALYU_API_KEY` | Server-only | **SECRET** | Valyu biomedical API (present but secondary) |
| `DAYTONA_API_KEY` | Server-only | **SECRET** | Daytona code sandbox |
| `POLAR_ACCESS_TOKEN` | Server-only | **SECRET** | Polar billing service — **NOT USED in MVP** |
| `POLAR_WEBHOOK_SECRET` | Server-only | **SECRET** | Polar webhook HMAC — **NOT USED in MVP** |
| `RESEND_API_KEY` | Server-only | **SECRET** | Resend email service |
| `NEXT_PUBLIC_SUPABASE_URL` | Client-exposed | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-exposed | Public | Supabase anon JWT (RLS-restricted) |
| `NEXT_PUBLIC_POSTHOG_KEY` | Client-exposed | Public | PostHog analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | Client-exposed | Public | PostHog EU endpoint |
| `NEXT_PUBLIC_APP_MODE` | Client-exposed | Config | `development` / `production` |
| `NEXT_PUBLIC_APP_URL` | Client-exposed | Config | Application base URL |
| `NEXT_PUBLIC_ENTERPRISE` | Client-exposed | Config | Enterprise feature flag |
| `POLAR_UNLIMITED_PRODUCT_ID` | Server-only | Config | Polar product ID — **NOT USED** |
| `POLAR_PAY_PER_USE_PRODUCT_ID` | Server-only | Config | Polar product ID — **NOT USED** |
| `POLAR_SKIP_WEBHOOK_VERIFICATION` | Server-only | Config | Dev-only webhook bypass — **NOT USED** |
| `AWS_REGION` | Server-only | Config | `us-west-2` |
| `DAYTONA_API_URL` | Server-only | Config | Daytona endpoint |
| `DAYTONA_TARGET` | Server-only | Config | Daytona region |
| `OLLAMA_BASE_URL` | Server-only | Config | Local dev only |
| `LMSTUDIO_BASE_URL` | Server-only | Config | Local dev only |
| `NODE_ENV` | Server-only | Config | Runtime environment |

---

## 3. Secrets & Credentials

### 3.1 Secret Storage

| Secret | Storage Location | Rotation Policy | Notes |
|--------|-----------------|-----------------|-------|
| OpenAI API Key | Render env vars / `.env.local` | None defined | `sk-proj-*` format |
| Supabase Service Role Key | Render env vars / `.env.local` | None defined | JWT, bypasses all RLS |
| Supabase Anon Key | Client bundle (public) | N/A | RLS-restricted, expected public |
| AWS Access Key | Render env vars / `.env.local` | None defined | IAM key `AKIA*` |
| AWS Secret Key | Render env vars / `.env.local` | None defined | Paired with access key |
| Polar Access Token | Render env vars / `.env.local` | None defined | **NOT USED** — dead code, billing not active |
| Polar Webhook Secret | Render env vars / `.env.local` | None defined | **NOT USED** — dead code, billing not active |
| Valyu API Key | Render env vars / `.env.local` | None defined | Secondary service |
| Daytona API Key | Render env vars / `.env.local` | None defined | `dtn_*` format |
| Resend API Key | Render env vars / `.env.local` | None defined | Email service |

### 3.2 Secret Exposure Risks

- `.env.local` contains **all production secrets** in plaintext — confirm this file is in `.gitignore` and has NOT been committed to version control
- No secret rotation policy exists
- No vault or secret manager in use (secrets are set directly in Render dashboard)

---

## 4. External Service Integrations

### 4.1 OpenAI (Primary AI — Active in MVP)

| Attribute | Detail |
|-----------|--------|
| **SDK** | `@ai-sdk/openai@^2.0.16`, `openai@^6.9.1` |
| **Models used** | `gpt-5.1` (chat + reasoning), `text-embedding-3-small` (embeddings, 1024 dims), `gpt-4o-mini` (RAG compression) |
| **Endpoints called** | Chat completions (streaming), Embeddings, Image generation (DALL-E) |
| **Auth** | Bearer token via `OPENAI_API_KEY` |
| **Data sent** | User chat messages, system prompts, document chunks for embedding |
| **Data received** | Streamed chat responses, embedding vectors, generated images |
| **Key files** | `src/lib/tools.ts`, `src/app/api/chat/route.ts`, `src/app/api/eco-rag/route.ts` |

### 4.2 Supabase (Database + Auth)

| Attribute | Detail |
|-----------|--------|
| **SDK** | `@supabase/supabase-js@^2.55.0`, `@supabase/ssr@^0.6.1` |
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` (public) |
| **Auth method** | OAuth (JWT-based, HTTP-only cookies via SSR) |
| **RLS** | Enabled on all tables |
| **Service role** | `SUPABASE_SERVICE_ROLE_KEY` — bypasses all RLS (server-side only) |
| **Tables** | `users`, `user_rate_limits`, `chat_sessions`, `chat_messages`, `charts`, `csvs`, `images`, `rag_contexts` |
| **Key files** | `src/utils/supabase/server.ts`, `src/lib/db.ts`, `middleware.ts` |

### 4.3 AWS S3 Vectors (RAG Vector Store)

| Attribute | Detail |
|-----------|--------|
| **SDK** | `@aws-sdk/client-s3vectors@^3.936.0` |
| **Region** | `us-west-2` |
| **Bucket** | `olympia-rag-vectors` |
| **Index** | `olympia-pages-idx` |
| **Embedding dims** | 1024 |
| **Auth** | IAM Access Key + Secret Key |
| **Data indexed** | Public City of Olympia documents (public records) |
| **Key files** | `src/app/api/eco-rag/route.ts` |

### 4.4 Polar (Billing & Subscriptions) — NOT USED IN MVP

> **Status**: Code exists in codebase but **no payments are active**. Polar is not used in this demonstrator. Routes and SDK remain as dead code.

| Attribute | Detail |
|-----------|--------|
| **SDK** | `@polar-sh/sdk@^0.34.12`, `@polar-sh/nextjs@^0.4.4`, `@polar-sh/ingestion@^0.3.1` |
| **Auth** | `POLAR_ACCESS_TOKEN` |
| **Webhook** | `POLAR_WEBHOOK_SECRET` (Standard Webhooks HMAC) |
| **Products** | Unlimited tier, Pay-per-use tier |
| **Customer mapping** | Supabase user ID → Polar external customer ID |
| **Key files** | `src/app/api/checkout/route.ts`, `src/app/api/webhooks/polar/route.ts`, `src/lib/polar-access-validation.ts` |
| **Recommendation** | Consider removing dead Polar code and dependencies to reduce attack surface |

### 4.5 Valyu (Biomedical Data — Present in Codebase)

| Attribute | Detail |
|-----------|--------|
| **SDK** | `valyu-js@^2.0.2` |
| **Auth** | `VALYU_API_KEY` |
| **Base URL** | `https://api.valyu.network/v1` |
| **Purpose** | PubMed, clinical trials, FDA drug labels (biomedical search) |
| **Key files** | `src/lib/tools.ts` |

### 4.6 Daytona (Code Execution Sandbox)

| Attribute | Detail |
|-----------|--------|
| **SDK** | `@daytonaio/sdk@^0.25.5` |
| **Auth** | `DAYTONA_API_KEY` |
| **API URL** | `https://app.daytona.io/api` |
| **Purpose** | Isolated Python code execution for data analysis |
| **Key files** | `src/lib/tools.ts` |

### 4.7 Resend (Email)

| Attribute | Detail |
|-----------|--------|
| **SDK** | `resend@^6.0.1` |
| **Auth** | `RESEND_API_KEY` |
| **Purpose** | Enterprise inquiry form emails |
| **Recipients** | Hardcoded list of `@valyu.ai` addresses |
| **Key files** | `src/app/api/enterprise/inquiry/route.ts` |

### 4.8 PostHog (Analytics)

| Attribute | Detail |
|-----------|--------|
| **SDK** | `posthog-js@^1.290.0` |
| **Host** | `https://eu.i.posthog.com` (EU region) |
| **Key** | `NEXT_PUBLIC_POSTHOG_KEY` (client-side, public) |
| **Events tracked** | Chart creation, enterprise inquiries, usage patterns |

### 4.9 Vercel Analytics

| Attribute | Detail |
|-----------|--------|
| **SDK** | `@vercel/analytics@^1.5.0` |
| **Integration** | Embedded in `layout.tsx` |
| **Note** | App is deployed on Render, not Vercel — may not be functional |

---

## 5. Application Routes & Endpoints

### 5.1 API Routes (Server-Side)

| Route | Method | Auth Required | Purpose | Key Risks |
|-------|--------|---------------|---------|-----------|
| `/api/chat` | POST | Rate-limited | Main AI chat (streaming) | Token usage, prompt injection |
| `/api/chat/generate-title` | POST | Session | Generate session title via LLM | Minor token cost |
| `/api/chat/sessions` | GET, POST | Session | List/create chat sessions | Data access |
| `/api/chat/sessions/[sessionId]` | GET, PUT, DELETE | Session | CRUD individual session | Authz check needed |
| `/api/eco-rag` | POST | None apparent | RAG search against Olympia docs | AWS cost, rate abuse |
| `/api/reports/generate-pdf` | POST | Session | PDF generation via Puppeteer | SSRF, resource exhaustion (300s timeout) |
| `/api/checkout` | POST | Session | Create Polar checkout — **NOT USED** | Dead code — billing not active |
| `/api/customer-portal` | POST | Session | Polar customer portal — **NOT USED** | Dead code — billing not active |
| `/api/webhooks/polar` | POST | Webhook sig | Polar billing webhooks — **NOT USED** | Dead code — billing not active |
| `/api/rate-limit` | GET, POST | Cookie/Session | Check/increment rate limits | Bypass via cookie manipulation |
| `/api/images/[imageId]` | GET | None | Serve generated images | IDOR (image enumeration) |
| `/api/csvs/[csvId]` | GET | None | Serve CSV data | IDOR (CSV enumeration) |
| `/api/charts/[chartId]` | GET | None | Serve chart data | IDOR (chart enumeration) |
| `/api/charts/[chartId]/render` | GET, POST | None | Render chart image | Resource usage |
| `/api/enterprise/inquiry` | POST | None | Enterprise contact form | Spam, email injection |
| `/api/env-status` | GET | None | Env variable status | Information disclosure |
| `/api/ollama-status` | GET | None | Ollama availability | Information disclosure |
| `/api/lmstudio-status` | GET | None | LM Studio availability | Information disclosure |
| `/api/usage/dark-mode` | POST | None | Store dark mode pref | Low risk |

### 5.2 Auth Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/auth/callback` | GET | OAuth callback → user creation → anonymous usage transfer |

### 5.3 Page Routes

| Route | Purpose |
|-------|---------|
| `/` | Main chat interface |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/eco-rag-test` | RAG testing page (should not be public in prod) |

---

## 6. Data Stores & Schemas

### 6.1 Supabase Tables (Production)

#### `users`
| Column | Type | Constraints | Sensitivity |
|--------|------|-------------|-------------|
| id | TEXT | PK | Low (UUID) |
| email | TEXT | UNIQUE, NOT NULL | **PII** |
| subscription_tier | TEXT | `unlimited` / `free` / `pay_per_use` | Low |
| subscription_status | TEXT | `active` / `inactive` | Low |
| polar_customer_id | TEXT | nullable | Low |
| subscription_id | TEXT | nullable | Low |
| created_at | TIMESTAMP | default now() | Low |

#### `user_rate_limits`
| Column | Type | Constraints | Sensitivity |
|--------|------|-------------|-------------|
| user_id | TEXT | PK, FK → users | Low |
| usage_count | INTEGER | | Low |
| reset_date | TEXT | ISO date | Low |
| last_request_at | TIMESTAMP | | Low |
| tier | TEXT | | Low |

#### `chat_sessions`
| Column | Type | Constraints | Sensitivity |
|--------|------|-------------|-------------|
| id | TEXT | PK | Low |
| user_id | TEXT | FK → users | Low |
| title | TEXT | | Low |
| created_at | TIMESTAMP | | Low |
| updated_at | TIMESTAMP | | Low |
| last_message_at | TIMESTAMP | | Low |

#### `chat_messages`
| Column | Type | Constraints | Sensitivity |
|--------|------|-------------|-------------|
| id | TEXT | PK | Low |
| session_id | TEXT | FK → chat_sessions | Low |
| role | TEXT | `user` / `assistant` | Low |
| content | TEXT (JSON) | Message parts array | **Medium** — user queries may contain sensitive info |
| created_at | TIMESTAMP | | Low |
| processing_time_ms | INTEGER | | Low |

#### `charts`, `csvs`, `images`
| Column | Sensitivity | Notes |
|--------|-------------|-------|
| id | Low | UUID primary key |
| user_id | Low | FK to users |
| anonymous_id | Low | For unauthenticated users |
| session_id | Low | FK to session |
| *_data / image_data | **Medium** | Generated content; images stored as base64 |

#### `rag_contexts`
| Column | Sensitivity | Notes |
|--------|-------------|-------|
| id | Low | UUID |
| session_id | Low | FK to session |
| query | Medium | User's search query |
| full_context | Low | Public document excerpts |
| compressed_summary | Low | LLM-compressed summary |
| sources | Low | Source document references |
| token_count | Low | Token usage tracking |

### 6.2 Local Dev Database

- **Engine**: SQLite via `better-sqlite3` + `drizzle-orm`
- **Schema**: Mirrors Supabase tables (defined in `src/lib/local-db/schema.ts`)
- **Dev user**: `DEV_USER_ID = 'dev-user-123'`, `DEV_USER_EMAIL = 'dev@example.com'`

### 6.3 AWS S3 Vectors (Read-Only in App)

| Attribute | Value |
|-----------|-------|
| Bucket | `olympia-rag-vectors` |
| Index | `olympia-pages-idx` |
| Content | Pre-indexed public City of Olympia documents |
| Access pattern | Read-only vector similarity search |
| Embedding dimensions | 1024 |

---

## 7. Authentication & Authorization

### 7.1 Authentication Flow

```
User → Supabase OAuth → /auth/callback → JWT session cookie → App
```

- **Provider**: Supabase Auth (OAuth)
- **Session storage**: HTTP-only cookies via `@supabase/ssr`
- **Middleware**: `middleware.ts` refreshes Supabase session on every request

### 7.2 Authorization Model

| Tier | Query Limit | Mechanism |
|------|-------------|-----------|
| Anonymous | 1/day | Cookie-based counter (obfuscated name: `$dekcuf_teg`) |
| Free (authenticated) | 5/day | Database counter in `user_rate_limits` |
| Unlimited | 999,999/day | Database counter (effectively unlimited) |
| ~~Pay-per-use~~ | ~~Token-based~~ | ~~Polar ingestion tracking~~ — **NOT USED in MVP** |

### 7.3 Access Control Matrix

| Resource | Anonymous | Free User | Unlimited User | Service Role |
|----------|-----------|-----------|----------------|-------------|
| Chat (rate-limited) | 1/day | 5/day | Unlimited | N/A |
| Own sessions | No | Yes (RLS) | Yes (RLS) | Full access |
| Other users' sessions | No | No (RLS) | No (RLS) | Full access |
| Images/Charts/CSVs | By ID only | By ID only | By ID only | Full access |
| RAG search | Via chat | Via chat | Via chat | Direct |
| PDF generation | No | Yes | Yes | N/A |
| Admin operations | No | No | No | Yes |

> **Note**: No paid tiers are active in the MVP. Polar billing code exists but is not used. All users are effectively Anonymous or Free tier.

### 7.4 Development Mode Bypass

When `NEXT_PUBLIC_APP_MODE=development`:
- Authentication checks may be bypassed
- Rate limiting returns unlimited
- Headers include `X-Development-Mode: true`
- Polar webhook verification can be skipped via `POLAR_SKIP_WEBHOOK_VERIFICATION` (Polar not used in MVP)

---

## 8. Data Flow Diagrams

### 8.1 Chat Query Flow

```
User Browser
  │
  ├─► POST /api/chat (message + sessionId)
  │     │
  │     ├─► middleware.ts (refresh Supabase session)
  │     ├─► Rate limit check (cookie or DB)
  │     ├─► Access validation (tier check — Polar NOT active in MVP)
  │     ├─► Token trimming (cap at 50,000 tokens)
  │     ├─► streamText() → OpenAI gpt-5.1
  │     │     │
  │     │     ├─► [Tool: olympiaRAGSearch]
  │     │     │     ├─► POST /api/eco-rag
  │     │     │     │     ├─► OpenAI embeddings API
  │     │     │     │     ├─► AWS S3 Vectors query
  │     │     │     │     ├─► GPT-4o-mini compression
  │     │     │     │     └─► Store in rag_contexts table
  │     │     │     └─► Return compressed context
  │     │     │
  │     │     ├─► [Tool: createChart] → Store in charts table
  │     │     ├─► [Tool: createCSV] → Store in csvs table
  │     │     ├─► [Tool: generateImage] → OpenAI DALL-E → Store base64 in images table
  │     │     ├─► [Tool: codeExecution] → Daytona sandbox → Return output
  │     │     └─► [Tool: biomedicalSearch] → Valyu API → Return results
  │     │
  │     ├─► onFinish: Save messages to chat_messages table
  │     └─► Stream response back to browser
  │
  └─► Render streamed response in chat UI
```

### 8.2 Billing Flow — NOT ACTIVE IN MVP

> Polar billing code exists in the codebase but is **not used**. No payments are processed. The below flow is dead code.

```
User → /api/checkout → Polar checkout page → Payment
                                                │
Polar webhook → POST /api/webhooks/polar ──────┘
  │
  ├─► Verify HMAC signature (POLAR_WEBHOOK_SECRET)
  ├─► Update users.subscription_tier in Supabase
  └─► Next /api/chat request sees updated tier
```

### 8.3 PDF Generation Flow

```
User → POST /api/reports/generate-pdf (sessionId)
  │
  ├─► Fetch chat_session + chat_messages from Supabase
  ├─► Build HTML template (inline styles, embedded charts)
  ├─► Launch Puppeteer (Chromium)
  ├─► Render HTML → PDF
  └─► Return PDF file (application/pdf)
```

---

## 9. Third-Party Dependencies

### 9.1 High-Risk Dependencies (Direct External Communication)

| Package | Version | Risk | Purpose |
|---------|---------|------|---------|
| `openai` | ^6.9.1 | **High** — API key, data egress | AI completions & embeddings |
| `@ai-sdk/openai` | ^2.0.16 | **High** — wraps OpenAI | Vercel AI SDK OpenAI provider |
| `@supabase/supabase-js` | ^2.55.0 | **High** — DB access, auth | Database & authentication |
| `@aws-sdk/client-s3vectors` | ^3.936.0 | **High** — AWS credentials | Vector similarity search |
| `@polar-sh/sdk` | ^0.34.12 | **Low** — dead code, not used | Payment processing — **NOT ACTIVE** |
| `valyu-js` | ^2.0.2 | **Medium** — API key | Biomedical data retrieval |
| `@daytonaio/sdk` | ^0.25.5 | **Medium** — remote code exec | Python sandbox |
| `resend` | ^6.0.1 | **Medium** — email sending | Enterprise inquiry emails |
| `posthog-js` | ^1.290.0 | **Low** — analytics only | User analytics |
| `puppeteer` | ^24.29.1 | **Medium** — browser automation | PDF generation (SSRF risk) |

### 9.2 UI & Utility Dependencies (No Direct External Communication)

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.4.5 | Application framework |
| `react` / `react-dom` | 19.1.0 | UI library |
| `zod` | ^4.0.17 | Input validation |
| `zustand` | ^5.0.8 | Client state management |
| `@tanstack/react-query` | ^5.85.5 | Data fetching |
| `jspdf` | ^3.0.3 | Client-side PDF (secondary) |
| `html-to-image` / `html2canvas` | various | Image generation from DOM |
| `react-markdown` | ^10.1.0 | Markdown rendering |
| `rehype-raw` | ^7.0.1 | Raw HTML in markdown |
| `@radix-ui/*` | various | Accessible UI primitives |
| `recharts` | ^2.15.4 | Chart rendering |
| `framer-motion` | ^12.23.12 | Animations |
| `drizzle-orm` / `drizzle-kit` | various | Local SQLite ORM (dev only) |
| `better-sqlite3` | ^12.4.1 | Local SQLite driver (dev only) |
| `@sparticuz/chromium` | ^141.0.0 | Serverless Chromium binary |
| `katex` | ^0.16.22 | Math rendering |
| `lucide-react` | ^0.539.0 | Icons |
| `tailwindcss` | ^4 | CSS framework |

---

## 10. File Processing & Generation

### 10.1 PDF Generation

| Attribute | Detail |
|-----------|--------|
| **Route** | `POST /api/reports/generate-pdf` |
| **Max duration** | 300 seconds |
| **Engine** | Puppeteer + Chromium (`@sparticuz/chromium` in prod, system Chromium in Docker) |
| **Input** | Session ID → fetches messages from DB |
| **Output** | PDF file (streamed response) |
| **Risk** | SSRF if HTML template includes external resources; resource exhaustion on free tier |
| **Key files** | `src/app/api/reports/generate-pdf/route.ts`, `src/lib/pdf-utils.ts`, `src/lib/pdf-generator.ts` |

### 10.2 Image Generation

| Attribute | Detail |
|-----------|--------|
| **Provider** | OpenAI DALL-E API |
| **Storage** | Base64-encoded PNG in `images` table |
| **Retrieval** | `GET /api/images/[imageId]` → raw PNG |
| **Cache** | `Cache-Control: public, max-age=31536000, immutable` (1 year) |
| **Risk** | Large base64 blobs in DB; no auth on image retrieval (IDOR) |

### 10.3 CSV Generation

| Attribute | Detail |
|-----------|--------|
| **Storage** | Headers + rows as JSON in `csvs` table |
| **Retrieval** | `GET /api/csvs/[csvId]` |
| **Risk** | No auth on retrieval (IDOR) |

### 10.4 Chart Generation

| Attribute | Detail |
|-----------|--------|
| **Library** | Recharts (client-side rendering) |
| **Storage** | Chart config JSON in `charts` table |
| **Retrieval** | `GET /api/charts/[chartId]` |
| **Risk** | No auth on retrieval (IDOR) |

---

## 11. Configuration Files

| File | Purpose | Security Relevance |
|------|---------|-------------------|
| `next.config.ts` | Next.js config | Remote image patterns allow **any** HTTPS/HTTP domain |
| `tsconfig.json` | TypeScript config | Strict mode enabled (good) |
| `tailwind.config.ts` | Tailwind CSS | Dark mode class-based |
| `postcss.config.mjs` | PostCSS | Minimal |
| `eslint.config.mjs` | ESLint | React hooks + Next.js rules |
| `middleware.ts` | Request middleware | Supabase session refresh on all routes |
| `render.yaml` | Render deployment | Free tier, env var references |
| `Dockerfile` | Container build | Chromium installed, runs as Node 20 |
| `.env.local` | Local secrets | **Contains all production secrets in plaintext** |
| `.env.example` | Env template | Documents required variables |
| `drizzle.config.ts` | Drizzle ORM | Local SQLite config |

---

## 12. Hardcoded Values & Constants

| Value | Location | Risk |
|-------|----------|------|
| `olympia-rag-vectors` (S3 bucket) | `src/app/api/eco-rag/route.ts` | Low — bucket name |
| `olympia-pages-idx` (index name) | `src/app/api/eco-rag/route.ts` | Low — index name |
| `us-west-2` (AWS region) | `src/app/api/eco-rag/route.ts` | Low |
| `text-embedding-3-small` (model) | `src/app/api/eco-rag/route.ts` | Low |
| `1024` (embedding dimensions) | `src/app/api/eco-rag/route.ts` | Low |
| `4` (max RAG calls/conversation) | `src/app/api/eco-rag/route.ts` | Low |
| `50000` (max context tokens) | `src/app/api/chat/route.ts` | Low |
| `$dekcuf_teg` (rate limit cookie) | `src/lib/rate-limit.ts` | Low — obfuscated cookie name |
| `dev-user-123` (dev user ID) | `src/lib/local-db/client.ts` | Low — dev only |
| Enterprise email recipients | `src/app/api/enterprise/inquiry/route.ts` | Medium — hardcoded `@valyu.ai` emails |
| `999999` (unlimited tier cap) | `src/lib/rate-limit.ts` | Low |

---

## 13. Security Headers & Middleware

### 13.1 Middleware (`middleware.ts`)

- Refreshes Supabase auth session on every request
- Applies to all routes except static assets
- Pattern: `/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`

### 13.2 Response Headers

| Header | Value | Route |
|--------|-------|-------|
| `X-Accel-Buffering` | `no` | `/api/chat` (disables nginx buffering for SSE) |
| `Cache-Control` | `no-cache, no-transform` | `/api/chat` |
| `Connection` | `keep-alive` | `/api/chat` |
| `X-Development-Mode` | `true` | `/api/chat` (dev only) |
| `X-RateLimit-Limit` | varies | `/api/chat` |
| `X-RateLimit-Remaining` | varies | `/api/chat` |
| `X-RateLimit-Reset` | ISO date | `/api/chat` |
| `Cache-Control` | `public, max-age=31536000, immutable` | `/api/images/*` |

### 13.3 Missing Security Headers

- No `Content-Security-Policy` (CSP)
- No `X-Content-Type-Options`
- No `X-Frame-Options` / `X-XSS-Protection`
- No `Strict-Transport-Security` (HSTS)
- No explicit CORS configuration

---

## 14. Identified Risk Areas

### CRITICAL

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| C1 | **Secrets in `.env.local`** — Verify this file is gitignored and has never been committed. If committed, **rotate all keys immediately**. | `.env.local` | Full compromise of all services |
| C2 | **Supabase service role key bypasses all RLS** — If leaked, attacker has full DB access | Server-side env | Full database access |
| C3 | **Development mode disables auth & rate limiting** — Ensure `NEXT_PUBLIC_APP_MODE` is never `development` in production | `src/app/api/chat/route.ts` | Auth bypass |

### HIGH

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| H1 | **No auth on asset endpoints** — `/api/images/[id]`, `/api/csvs/[id]`, `/api/charts/[id]` have no authentication; IDs may be enumerable | Asset route handlers | Data leakage (IDOR) |
| H2 | **Dead Polar billing code with webhook bypass flag** — `POLAR_SKIP_WEBHOOK_VERIFICATION` exists; Polar is not used but routes are still reachable. Consider removing dead code. | `/api/webhooks/polar/route.ts` | Low (dead code) but unnecessary attack surface |
| H3 | **Cookie-based anonymous rate limiting** — Stored client-side, trivially bypassable by clearing cookies | `src/lib/rate-limit.ts` | Cost abuse (OpenAI spend) |
| H4 | **No secret rotation policy** — All API keys are static with no rotation schedule | All env vars | Prolonged exposure window |
| H5 | **`/api/env-status` exposes environment info** — Returns which env vars are set/missing | `src/app/api/env-status/route.ts` | Information disclosure |

### MEDIUM

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| M1 | **No CSP or security headers** — Missing Content-Security-Policy, HSTS, X-Frame-Options | Global | XSS, clickjacking |
| M2 | **Remote image patterns allow any domain** — `next.config.ts` image optimization has no domain restrictions | `next.config.ts` | SSRF via image optimization |
| M3 | **Puppeteer SSRF risk** — PDF generation renders HTML that could reference external resources | `/api/reports/generate-pdf` | SSRF |
| M4 | **`rehype-raw` enabled** — Allows raw HTML in markdown rendering; potential XSS vector if user content rendered | Markdown components | XSS |
| M5 | **No input sanitization on enterprise inquiry** — Only email format validation | `/api/enterprise/inquiry/route.ts` | Email header injection |
| M6 | **`/eco-rag-test` page exposed** — Test/debug page should not be accessible in production | Page route | Information disclosure |
| M7 | **Base64 images stored in database** — Large blob storage in PostgreSQL; no size limits | `images` table | Storage cost, DoS |
| M8 | **Dead Polar billing code increases attack surface** — 3 unused API routes (`/checkout`, `/customer-portal`, `/webhooks/polar`), 3 npm packages (`@polar-sh/sdk`, `@polar-sh/nextjs`, `@polar-sh/ingestion`), and associated env vars remain in codebase despite billing not being used | Multiple files | Unnecessary attack surface, dependency risk |

### LOW

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| L1 | **Vercel Analytics on non-Vercel host** — May not function or may leak data unnecessarily | `layout.tsx` | Minor data leakage |
| L2 | **Ollama/LMStudio status endpoints exposed** — Leak info about dev infrastructure | Status routes | Minor info disclosure |
| L3 | **No rate limit on non-chat endpoints** — PDF gen, RAG search, enterprise inquiry have no rate limits | Various routes | Resource exhaustion |
| L4 | **Hardcoded email recipients** — Changes require code deployment | Enterprise inquiry | Operational friction |

---

## Appendix A: File Index (Security-Relevant)

```
├── .env.local                          # ALL SECRETS (must be gitignored)
├── .env.example                        # Env variable template
├── Dockerfile                          # Container config (Chromium)
├── middleware.ts                        # Auth session refresh
├── next.config.ts                       # Image domains, dev settings
├── render.yaml                          # Render.com deployment
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts            # Main AI chat endpoint
│   │   │   ├── chat/generate-title/     # Session title generation
│   │   │   ├── chat/sessions/           # Session CRUD
│   │   │   ├── checkout/route.ts        # Polar checkout (NOT USED)
│   │   │   ├── customer-portal/route.ts # Polar portal (NOT USED)
│   │   │   ├── eco-rag/route.ts         # RAG search (AWS + OpenAI)
│   │   │   ├── enterprise/inquiry/      # Contact form + email
│   │   │   ├── env-status/route.ts      # Env info disclosure
│   │   │   ├── images/[imageId]/        # Image serving (no auth)
│   │   │   ├── csvs/[csvId]/            # CSV serving (no auth)
│   │   │   ├── charts/[chartId]/        # Chart serving (no auth)
│   │   │   ├── rate-limit/route.ts      # Rate limit check/increment
│   │   │   ├── reports/generate-pdf/    # Puppeteer PDF generation
│   │   │   ├── webhooks/polar/route.ts  # Billing webhooks (NOT USED)
│   │   │   └── usage/dark-mode/         # Preference storage
│   │   └── auth/callback/route.ts       # OAuth callback
│   ├── lib/
│   │   ├── db.ts                        # Database abstraction
│   │   ├── tools.ts                     # AI tool definitions
│   │   ├── rate-limit.ts               # Rate limiting logic
│   │   ├── polar-access-validation.ts  # Billing access checks (NOT USED)
│   │   ├── pdf-utils.ts               # PDF template utilities
│   │   ├── pdf-generator.ts           # PDF generation logic
│   │   ├── types.ts                   # Type definitions
│   │   └── local-db/
│   │       ├── schema.ts              # SQLite schema (mirrors Supabase)
│   │       └── client.ts             # Dev DB client
│   └── utils/supabase/
│       └── server.ts                  # Supabase server client factory
```

---

## Appendix B: Subprocessor Registry

| Subprocessor | Data Shared | Purpose | Data Location | DPA Required |
|-------------|-------------|---------|---------------|-------------|
| **OpenAI** (Microsoft) | User queries, document chunks, system prompts | AI chat, embeddings, image generation | US | Yes |
| **Supabase** (AWS us-east-1) | User profiles (email), chat history, generated assets | Database, authentication | US | Yes |
| **AWS** (Amazon) | Embedding vectors, document metadata | Vector similarity search | us-west-2 | Yes |
| **Polar** | ~~User IDs, subscription data~~ | ~~Billing & payments~~ — **NOT USED in MVP** | EU/US | No (not active) |
| **Render.com** | Application code, env secrets, request logs | Hosting & deployment | Oregon, US | Yes |
| **PostHog** | Anonymous usage events, session data | Product analytics | EU | Yes |
| **Valyu** | Search queries (biomedical) | Data retrieval API | Unknown | Review |
| **Daytona** | User-generated Python code | Code execution sandbox | US | Review |
| **Resend** | Enterprise inquiry emails, recipient addresses | Transactional email | US | Review |
| **Vercel** | Page view analytics (if functional) | Web analytics | US | Review |

---

*This document should be updated as the application evolves. All findings should be tracked to resolution.*
