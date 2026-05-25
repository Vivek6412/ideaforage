# IdeaForge AI — Complete Product Specification
**Version 1.0 | Solo Developer | 30-Day Build | Multi-User SaaS**

---

# TABLE OF CONTENTS
1. Product Overview
2. Target Users
3. Core Features
4. System Architecture
5. Tech Stack
6. Database Schema
7. API Specification
8. Stage-by-Stage Breakdown
   - Stage 1: Idea Capture
   - Stage 2: Blueprint Generation
   - Stage 3: Prompt Generation
   - Stage 4: Execution Engine
   - Stage 5: GitHub Push
   - Stage 6: Deploy
9. Business Logic & Rules
10. Error Handling Strategy
11. Security Architecture
12. Monetization Model
13. V1 vs V2 Scope
14. Development Roadmap
15. Risk Register

---

# 1. PRODUCT OVERVIEW

## Definition
IdeaForge AI is a multi-user SaaS platform that converts vague, unstructured ideas into fully built, GitHub-pushed, deployed products — via AI-guided clarification, technical blueprint generation, optimized prompt engineering, and semi-automatic Claude Code execution.

## One-Line Pitch
*"Describe your idea in any way. Get a working product."*

## Core Problem
Non-technical founders, developers, and students cannot convert vague ideas into structured, buildable products without knowing prompting, system design, or architecture. They waste time on trial-and-error with AI tools, produce incorrect outputs, and face constant re-explanation of their idea.

## Solution
A structured AI agent that:
- Extracts clarity from messy input
- Generates industry-standard blueprints with verified tech
- Produces optimized, token-efficient prompts
- Executes development via Claude Code with agent-controlled error correction
- Delivers a complete GitHub repo + deployed product

---

# 2. TARGET USERS

| User Type | Primary Need | Pain Point Solved |
|---|---|---|
| Non-technical founders | Idea → product, no coding | Eliminate dependency on developers for MVP |
| Developers | Fast scaffolding + architecture | Skip repetitive setup, get production-ready base |
| Students / Beginners | Guided learning + working output | Learn by seeing professional output generated |

---

# 3. CORE FEATURES

## Multi-Modal Idea Input
- Text: free-form natural language
- Voice: browser MediaRecorder → OpenAI Whisper transcription
- File: .md, .txt, .pdf (PyMuPDF), .docx (python-docx)
- Image: screenshots, wireframes, sketches → Claude Vision extraction
- Mixed: all four combined, agent merges into unified input

## AI-Guided Idea Clarification
- Max 3 clarification rounds (hard cap, anti-loop)
- Decreasing questions per round: 3 → 2 → 1
- Round 4: force confirmation, unknowns marked TBD
- IDK handling: 5 context-specific suggestions generated
- Partial correction: only wrong fields re-refined
- Warnings: too broad, technically infeasible, crowded market
- All warnings advisory only — never block

## Blueprint Generation
- Industry-standard architecture (monolithic default for MVPs)
- Live version verification: PyPI + npm registries (never Claude's memory)
- Compatibility checking between stack components
- Deprecation flag injection per framework version
- Full DB schema with types, constraints, relationships
- Complete REST API spec (versioned /api/v1/)
- Mermaid diagram auto-rendered from blueprint JSON (zero extra tokens)
- View toggle: Plain English / Technical / Both
- Granular editing: change one section without regenerating all
- Auto-generated CONTEXT.md + 11 additional project files

## Prompt Generation
- All prompts derived from blueprint JSON (not generic templates)
- Master prompt: full project context, max 1000 tokens
- Task prompts: one per module, max 300 tokens, exact file list + done condition
- Integration prompts: one per third-party service
- Debug prompts: top 5 error types, max 150 tokens each
- Execution order auto-resolved via topological sort on depends_on
- ~47% token reduction vs user-written prompts

## Semi-Automatic Execution
- User approves every stage output before advancing
- Claude Code CLI launched as subprocess by agent
- Agent = brain (orchestrator), Claude Code = hands (executor)
- Sequential task execution respecting dependency order
- Output validation before user sees: syntax, paths, completeness
- User fix requests: unlimited, surgical (previous output always included)
- Real-time progress via WebSocket

## Agent-Controlled Error Correction
- Claude Code: 1 self-fix attempt only
- Agent takeover: classifies error, generates surgical prompt, re-executes
- Max 3 agent fix attempts per task (different root cause per attempt)
- Drift verification after every fix
- Fallback chain: Anthropic → OpenAI → Gemini
- Exponential backoff: 2s, 4s, 8s
- PAUSED state with full user notification after all attempts exhausted

## GitHub Push
- GitHub OAuth (one-time setup)
- Auto-generated: README.md, .gitignore, .env.example, LICENSE
- Single clean commit
- Excluded automatically: .env, __pycache__, node_modules, .next, venv
- User configures: repo name, visibility, branch

## Auto-Deploy
- Frontend → Vercel API
- Backend → Railway GraphQL API
- Env vars injected via platform APIs (never shown in plain text)
- Build log monitoring + common error auto-fix
- Post-deploy health check: frontend, backend, DB, auth
- Live URLs delivered to user

## 12 Auto-Generated Context Files
MASTER.md, PRODUCT.md, STACK.md, ARCHITECTURE.md, FOLDER_STRUCTURE.md,
SCHEMA.md, API_SPEC.md, BUSINESS_LOGIC.md, ENV.md, CONVENTIONS.md,
ANTI_PATTERNS.md, DEPENDENCIES.md + FILE_INJECTION_GUIDE.md

Purpose: AI tools reading these files need zero follow-up questions.

## BYOK (Bring Your Own Key)
- Users provide their own Anthropic/OpenAI/Gemini API keys
- Platform uses user's keys for all AI calls
- Zero API cost to platform operator
- Platform revenue = subscription only

---

# 4. SYSTEM ARCHITECTURE

## Type
Monolithic (V1). Single FastAPI backend, single Next.js frontend.
Correct for: solo dev, 1 month, MVP validation.

## Component Map
```
User (Browser)
    ↕ HTTPS + WebSocket
Next.js Frontend (Vercel)
    ↕ REST API + WebSocket
FastAPI Backend (Railway)
    ├── Supabase PostgreSQL      — primary data store
    ├── Supabase Storage         — generated context files
    ├── Anthropic API (BYOK)     — primary AI
    ├── OpenAI API (BYOK)        — fallback AI + Whisper
    ├── Gemini API (BYOK)        — fallback AI
    ├── Claude Code CLI          — subprocess execution
    ├── PyGitHub → GitHub API    — repo push
    ├── Vercel REST API          — frontend deploy
    └── Railway GraphQL API      — backend deploy
```

## State Machine
```
IDEA_CAPTURE → IDEA_CONFIRMED → BLUEPRINT_DRAFT → BLUEPRINT_CONFIRMED
→ PROMPTS_GENERATED → PROMPTS_CONFIRMED → EXECUTION_RUNNING
→ EXECUTION_COMPLETE → GITHUB_PUSHED → DEPLOYED
                    ↕ (any state ↔ PAUSED on failure)
```

## Agent vs Claude Code Roles

| Agent (FastAPI — you write) | Claude Code (subprocess — executes) |
|---|---|
| Controls state machine | Writes files |
| Crafts all prompts | Edits files |
| Injects context files | Runs terminal commands |
| Monitors subprocess output | Installs dependencies |
| Classifies errors | Runs migrations + tests |
| Generates surgical fix prompts | Reports results |
| Verifies no architecture drift | Executes exactly what agent instructs |
| Manages DB + WebSocket | — |

---

# 5. TECH STACK

## Exact Stack (no alternatives)

| Layer | Technology | Version | Reasoning |
|---|---|---|---|
| Frontend | Next.js + TypeScript + Tailwind | 14.2.3 / 5.4.5 / 3.4.3 | SSR, App Router, type safety |
| Backend | Python + FastAPI + Pydantic v2 | 3.11 / 0.111.1 / 2.7.1 | AI SDK ecosystem, async, validation |
| ORM | SQLAlchemy async + Alembic | 2.0.30 / 1.13.1 | Async-first, migrations |
| Database | PostgreSQL 15 via Supabase | — | Relational, Supabase bundles auth+storage |
| Auth | Supabase Auth (JWT, httpOnly) | — | Built-in, no extra service |
| AI Primary | Anthropic API (BYOK) | anthropic 0.28.0 | Best instruction-following |
| AI Fallback 1 | OpenAI API (BYOK) | openai 1.30.1 | Reliable fallback |
| AI Fallback 2 | Gemini API (BYOK) | — | Large context fallback |
| Voice | OpenAI Whisper (BYOK) | — | Best transcription accuracy |
| PDF | PyMuPDF | 1.24.3 | Zero Claude tokens for parsing |
| DOCX | python-docx | 1.1.2 | Zero Claude tokens for parsing |
| GitHub | PyGitHub | 2.3.0 | Simple repo management |
| Encryption | Cryptography (Fernet) | 42.0.7 | AES-128 for API key storage |
| Real-time | FastAPI WebSocket | — | Native, no extra service |
| HTTP Client | httpx async | 0.27.0 | Async-native |
| Subprocess | Python asyncio.subprocess | — | Claude Code CLI control |
| Diagrams | Mermaid.js (frontend) | 10.9.1 | Zero extra Claude tokens |
| Frontend Host | Vercel | — | Native Next.js |
| Backend Host | Railway | — | Simple Python deploy |

---

# 6. DATABASE SCHEMA

## users
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
email         VARCHAR(255) UNIQUE NOT NULL
password_hash TEXT NOT NULL
full_name     VARCHAR(255)
tier          VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free','pro','team'))
is_verified   BOOLEAN DEFAULT FALSE
created_at    TIMESTAMPTZ DEFAULT NOW()
updated_at    TIMESTAMPTZ DEFAULT NOW()
```

## user_api_keys
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id       UUID REFERENCES users(id) ON DELETE CASCADE
provider      VARCHAR(30) CHECK (provider IN ('anthropic','openai','gemini'))
encrypted_key TEXT NOT NULL
created_at    TIMESTAMPTZ DEFAULT NOW()
UNIQUE (user_id, provider)
```

## user_integrations
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id       UUID REFERENCES users(id) ON DELETE CASCADE
provider      VARCHAR(30) CHECK (provider IN ('github','vercel','railway'))
access_token  TEXT NOT NULL
username      VARCHAR(255)
created_at    TIMESTAMPTZ DEFAULT NOW()
UNIQUE (user_id, provider)
```

## projects
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id       UUID REFERENCES users(id) ON DELETE CASCADE
name          VARCHAR(255) NOT NULL
raw_idea      TEXT
current_state VARCHAR(50) DEFAULT 'IDEA_CAPTURE'
              CHECK (current_state IN (
                'IDEA_CAPTURE','IDEA_CONFIRMED','BLUEPRINT_DRAFT',
                'BLUEPRINT_CONFIRMED','PROMPTS_GENERATED','PROMPTS_CONFIRMED',
                'EXECUTION_RUNNING','EXECUTION_COMPLETE',
                'GITHUB_PUSHED','DEPLOYED','PAUSED'))
paused_reason TEXT
created_at    TIMESTAMPTZ DEFAULT NOW()
updated_at    TIMESTAMPTZ DEFAULT NOW()
```

## stage_outputs
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id    UUID REFERENCES projects(id) ON DELETE CASCADE
stage         VARCHAR(50) CHECK (stage IN (
              'idea_capture','blueprint','prompts','execution','github','deploy'))
output_json   JSONB NOT NULL
status        VARCHAR(30) DEFAULT 'pending_review'
              CHECK (status IN ('pending_review','approved','revision_requested'))
user_feedback TEXT
round_number  INT DEFAULT 1
created_at    TIMESTAMPTZ DEFAULT NOW()
updated_at    TIMESTAMPTZ DEFAULT NOW()
UNIQUE (project_id, stage, round_number)
```

## execution_tasks
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id      UUID REFERENCES projects(id) ON DELETE CASCADE
task_name       VARCHAR(100) NOT NULL
task_order      INT NOT NULL
depends_on      UUID[]
prompt_used     TEXT
generated_files JSONB
status          VARCHAR(30) DEFAULT 'pending'
                CHECK (status IN (
                'pending','running','pending_review','approved','failed','skipped'))
retry_count     INT DEFAULT 0
error_log       TEXT
tool_used       VARCHAR(30) CHECK (tool_used IN ('anthropic','openai','gemini','claude_code'))
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

## execution_logs
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id  UUID REFERENCES projects(id) ON DELETE CASCADE
task_id     UUID REFERENCES execution_tasks(id)
event       VARCHAR(50) NOT NULL
detail      JSONB
created_at  TIMESTAMPTZ DEFAULT NOW()
```

## github_pushes
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id  UUID REFERENCES projects(id) ON DELETE CASCADE
repo_url    TEXT
repo_name   VARCHAR(255)
branch      VARCHAR(100) DEFAULT 'main'
is_private  BOOLEAN DEFAULT TRUE
commit_sha  TEXT
status      VARCHAR(20) DEFAULT 'pending'
            CHECK (status IN ('pending','success','failed'))
error_log   TEXT
pushed_at   TIMESTAMPTZ DEFAULT NOW()
```

## deployments
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id          UUID REFERENCES projects(id) ON DELETE CASCADE
platform            VARCHAR(20) CHECK (platform IN ('vercel','railway'))
service_type        VARCHAR(20) CHECK (service_type IN ('frontend','backend'))
deploy_url          TEXT
platform_project_id TEXT
build_status        VARCHAR(20) DEFAULT 'pending'
                    CHECK (build_status IN ('pending','building','success','failed'))
error_log           TEXT
deployed_at         TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

---

# 7. API SPECIFICATION

## Base URL: /api/v1
## Auth: JWT via httpOnly cookie (all routes except /auth/*)

### Auth & BYOK
```
POST   /auth/register          body: {email, password, full_name}
POST   /auth/login             body: {email, password} → sets cookie
POST   /auth/logout            clears cookie
GET    /auth/me                returns current user

GET    /keys                   returns [{provider, has_key}] — no raw keys
POST   /keys                   body: {provider, api_key} → encrypt + store
DELETE /keys/{provider}
POST   /keys/verify            body: {provider} → test call → {valid: bool}

GET    /integrations           [{provider, connected, username}]
GET    /integrations/github/oauth-url
POST   /integrations/github/callback  body: {code}
DELETE /integrations/{provider}
```

### Projects
```
GET    /projects               list user's projects
POST   /projects               body: {name}
GET    /projects/{id}          detail with stage_outputs + tasks
DELETE /projects/{id}
```

### Stage 1 — Idea
```
POST   /projects/{id}/idea/process    multipart: text?, voice?, file?, image?
POST   /projects/{id}/idea/refine     body: {answers, corrections, round}
POST   /projects/{id}/idea/confirm
```

### Stage 2 — Blueprint
```
POST   /projects/{id}/blueprint/generate
PATCH  /projects/{id}/blueprint/edit   body: {section, changes}
POST   /projects/{id}/blueprint/confirm
GET    /projects/{id}/blueprint/files  download URLs for 12 context files
```

### Stage 3 — Prompts
```
POST   /projects/{id}/prompts/generate
PATCH  /projects/{id}/prompts/{prompt_id}/regenerate
POST   /projects/{id}/prompts/confirm
```

### Stage 4 — Execution
```
POST   /projects/{id}/execution/start
GET    /projects/{id}/execution/status
GET    /projects/{id}/execution/tasks/{task_id}
POST   /projects/{id}/execution/tasks/{task_id}/approve
POST   /projects/{id}/execution/tasks/{task_id}/fix    body: {feedback}
POST   /projects/{id}/execution/pause
POST   /projects/{id}/execution/resume
WS     /ws/projects/{id}/execution
```

### Stage 5 — GitHub
```
GET    /projects/{id}/github/preview
POST   /projects/{id}/github/push    body: {repo_name, is_private, branch}
```

### Stage 6 — Deploy
```
POST   /projects/{id}/deploy/frontend   body: {platform, env_vars}
POST   /projects/{id}/deploy/backend    body: {platform, env_vars}
GET    /projects/{id}/deploy/status
GET    /projects/{id}/deploy/health
```

### WebSocket Events (server → client)
```
task_started, task_generating, task_pending_review,
task_retrying, fix_injected, task_approved,
task_failed, task_paused, execution_complete, build_log
```

---

# 8. STAGE-BY-STAGE BREAKDOWN

## Stage 1 — Idea Capture

**Input:** Raw idea via text, voice, file, image, or combination
**Output:** Structured idea JSON, locked and confirmed by user

**Flow:**
1. User submits multi-modal input
2. Agent preprocesses: Whisper (voice), PyMuPDF (PDF), python-docx (DOCX), Claude Vision (image)
3. All inputs merged into unified text
4. Single Claude API call with IDEA_EXTRACTION_PROMPT
5. Returns: structured idea + clarifying questions + warnings
6. User answers questions / corrects fields (partial correction only)
7. Agent refines with answers (max 3 rounds hard cap)
8. User confirms → saved to stage_outputs → state: IDEA_CONFIRMED

**Clarification Rules:**
- Round 1: max 3 questions
- Round 2: max 2 questions (unanswered only)
- Round 3: max 1 question
- Round 4: force confirm, mark unknowns as TBD
- IDK: generate exactly 5 context-specific suggestions
- Warnings: too_broad (>8 features), infeasible (ML/blockchain/hardware), crowded_market
- All warnings advisory — never block

**Token Budget:** ~400 tokens input, ~800 tokens output per round. Max ~3600 tokens total Stage 1.

---

## Stage 2 — Blueprint Generation

**Input:** Confirmed structured idea JSON
**Output:** Complete technical blueprint + 12 context files

**Flow:**
1. Auto-triggered after IDEA_CONFIRMED
2. Agent fetches live versions: PyPI + npm registries (not Claude's memory)
3. Compatibility check: known incompatible version pairs flagged
4. Deprecation flags built per framework + version
5. Single Claude API call with blueprint prompt + verified versions
6. Mermaid diagram source auto-generated from blueprint JSON (zero extra tokens)
7. User reviews: Plain English / Technical / Both views
8. User edits specific sections → partial regeneration (1 Claude call per section)
9. User confirms → 12 context files generated → uploaded to Supabase Storage
10. State: BLUEPRINT_CONFIRMED

**Blueprint Contents:** Architecture type + reasoning, exact tech stack with verified versions + reasoning, modules with dependencies, full DB schema with types + constraints, complete API endpoints, folder structure, third-party integrations, anti-patterns (from deprecation flags), complexity estimate.

**12 Generated Files:** MASTER.md, PRODUCT.md, STACK.md, ARCHITECTURE.md, FOLDER_STRUCTURE.md, SCHEMA.md, API_SPEC.md, BUSINESS_LOGIC.md, ENV.md, CONVENTIONS.md, ANTI_PATTERNS.md, DEPENDENCIES.md

**Token Budget:** ~800 tokens input, ~1400 tokens output. ~2200 tokens total.

---

## Stage 3 — Prompt Generation

**Input:** Confirmed blueprint JSON + context files
**Output:** Complete prompt set (master + tasks + integrations + debug)

**Flow:**
1. Auto-triggered after BLUEPRINT_CONFIRMED
2. Single Claude API call with prompt generation instructions
3. Returns full prompt set JSON
4. Execution order resolved via topological sort on depends_on fields
5. Execution tasks saved to DB in dependency order
6. User reviews each prompt: approve / regenerate with feedback
7. User confirms → state: PROMPTS_CONFIRMED

**Prompt Set:**
- 1 Master Prompt (max 1000 tokens) — full context for any tool session
- N Task Prompts (max 300 tokens each) — one per module, exact files + done condition
- M Integration Prompts (max 300 tokens) — one per third-party service
- 5 Debug Prompts (max 150 tokens each) — top error types

**Token Optimization:** Prompts reference context files, never repeat them. ~47% reduction vs user-written prompts.

**Token Budget:** ~800 tokens input, ~4300 tokens output. ~5100 tokens total.

---

## Stage 4 — Execution Engine

**Input:** Confirmed prompt set + context files
**Output:** Complete codebase on disk, task by task, user-approved

**Flow:**
1. Agent launches Claude Code CLI as async subprocess
2. Context files written to /tmp/projects/{id}/
3. MASTER_PROMPT injected first
4. Task queue executed in dependency order (one at a time)
5. Per task: agent builds selective context injection + injects task prompt
6. Claude Code executes → returns JSON with files array
7. Agent validates output (syntax, paths, completeness, no placeholders)
8. Frontend shows code to user (syntax highlighted, file-by-file)
9. User: Approve → files written to disk → next task starts
        Request Fix → feedback injected → retry (unlimited user fixes)
10. All tasks approved → state: EXECUTION_COMPLETE

**Error Handling:**
- Attempt 1: Claude Code self-fix (1 try only)
- Attempt 2: Agent classifies error → surgical prompt → Claude Code executes
- Attempt 3: Agent tries different root cause hypothesis → new surgical prompt
- Attempt 4: PAUSED state → full user notification with diagnosis

**Selective Injection (token saving):**
Each task receives only relevant files (per FILE_INJECTION_GUIDE.md).
Result: ~400-600 tokens per task vs ~1500 for full context. ~60% saving.

**Drift Prevention:** After every fix, agent verifies: no unapproved imports, files in correct paths, module scope boundaries respected. Drift detected → revert + new targeted prompt.

**Token Budget:** ~700 tokens input per task, ~3000 tokens output per task.
18 tasks × ~3700 tokens = ~66,000 tokens total execution stage.

---

## Stage 5 — GitHub Push

**Input:** All approved files on disk
**Output:** GitHub repository URL

**Flow:**
1. GitHub OAuth token retrieved from encrypted storage
2. Agent generates: README.md (from PRODUCT.md + STACK.md), .gitignore, .env.example
3. User confirms: repo name, visibility (default: private), branch (default: main)
4. PyGitHub creates repo + single commit
5. Excluded: .env, __pycache__, node_modules, .next, venv, *.pyc
6. Result stored in github_pushes table
7. State: GITHUB_PUSHED

---

## Stage 6 — Deploy (Optional)

**Input:** GitHub repo + platform tokens
**Output:** Live URLs for frontend + backend

**Flow:**
1. User selects: Vercel (frontend) + Railway (backend)
2. User enters production env var values (sensitive inputs, never stored by agent)
3. Agent calls Vercel API: create project → link repo → inject env vars → trigger deploy
4. Agent calls Railway API: create project → link repo → inject env vars → trigger deploy
5. Agent monitors build logs via polling
6. Build failure: auto-fix common errors (wrong start command, missing env var) + retrigger
7. Post-deploy health check: ping all services
8. Live URLs delivered. State: DEPLOYED

---

# 9. BUSINESS LOGIC & RULES

## Token Optimization Principles
1. No greeting/role storytelling in system prompts
2. Fragment instructions (never full sentences)
3. Schema referenced not repeated
4. Output constraint always last line
5. Conditionals compressed: "payments→Stripe | location→Maps"
6. No examples in system prompts (Claude infers from schema)
7. Context injected from DB (not re-described)
8. Max output constraints enforced ("reasoning: max 10 words")

## Version Verification
- All versions fetched from live registries at blueprint generation time
- PyPI: GET pypi.org/pypi/{pkg}/json → info.version
- npm: GET registry.npmjs.org/{pkg}/latest → version
- Claude never used as version source
- Compatibility matrix checked after fetching
- Deprecation flags built per detected framework versions

## BYOK Rules
- Keys encrypted with Fernet before any DB write
- Decrypted only at point of API call
- Never logged, never returned in API responses
- Verified with minimal test call on save
- Key invalid/expired → PAUSED state + user notification

## Free Tier Limits
- 2 projects per month
- Claude API only (no fallbacks)
- No auto-deploy
- Pro tier: unlimited, all tools, deploy

---

# 10. ERROR HANDLING STRATEGY

## Error Classification Engine
```
Pattern matched → Error Type → Surgical Fix Prompt Generated

ImportError / ModuleNotFoundError → missing_dependency
pydantic @validator → pydantic_v1_syntax
greenlet_spawn / sync in async → sync_in_async_context
CORS / Access-Control → cors_misconfiguration
401 / Unauthorized / JWT → auth_error
stripe signature → stripe_webhook_error
alembic / migration → migration_error
getServerSideProps / pages/ → nextjs_legacy_pattern
.dict() / .json() pydantic → pydantic_v2_api
SyntaxError / IndentationError → syntax_error
```

## Retry Strategy
```
API errors:        3x with exponential backoff (2s, 4s, 8s)
Parse errors:      2x auto-retry with parse-fix prompt
Validation errors: 2x auto-retry with issues injected
User fix:          Unlimited (no cap on user-requested fixes)
Max agent fixes:   3 per task (different root cause per attempt)
All exhausted:     PAUSED → user notification with full diagnosis
```

## Fallback Chain
```
Anthropic API fails → OpenAI API → Gemini API → PAUSED
```

---

# 11. SECURITY ARCHITECTURE

| Concern | Implementation |
|---|---|
| API key storage | AES-128 (Fernet) encrypted at rest |
| JWT tokens | httpOnly cookies, SameSite=Lax, Secure in prod |
| Passwords | bcrypt via passlib |
| GitHub tokens | Encrypted, repo scope only |
| Env vars | Injected via platform APIs, never shown in UI |
| CORS | Restricted to FRONTEND_URL only |
| Input validation | Pydantic v2 on all request bodies |
| User isolation | project_id + user_id ownership verified on every request |
| API key return | Never returned in any GET response |
| Subprocess | Claude Code runs in isolated /tmp/projects/{id}/ directory |

---

# 12. MONETIZATION MODEL

## Pricing Structure
| Tier | Price | Projects | AI Tools | Deploy |
|---|---|---|---|---|
| Free | $0 | 2/month | Claude only | No |
| Pro | $X/month | Unlimited | All (Claude + OpenAI + Gemini) | Yes |
| Team | $XX/month | Unlimited + shared workspace | All | Yes |

## Revenue Model
- BYOK: users pay AI providers directly (zero API cost to platform)
- Platform charges subscription for orchestration, file generation, UX
- At scale: platform API cost = $0 (all on user keys)

## Cost Structure (Platform)
- Vercel hosting: free tier (frontend)
- Railway hosting: free tier (backend)
- Supabase: free tier (DB + storage + auth)
- GitHub OAuth app: free
- Platform owner API cost: $0 in production

---

# 13. V1 vs V2 SCOPE

## V1 — Month 1 (Build This)
✅ Multi-user SaaS with auth
✅ BYOK (Anthropic + OpenAI + Gemini)
✅ Multi-modal idea input (text, voice, file, image)
✅ Idea clarification (3-round max)
✅ Blueprint generation (industry standard, version-verified)
✅ 12 context file generation
✅ Prompt generation (optimized)
✅ Execution via direct Claude API (primary)
✅ Execution via Claude Code subprocess (primary)
✅ Agent-controlled error correction (3 attempts, surgical prompts)
✅ GitHub push (PyGitHub)
✅ Vercel + Railway auto-deploy
✅ WebSocket real-time progress
✅ Semi-automatic (user approves every stage)

## V2 — Month 2+
🔲 Gemini CLI subprocess support
🔲 Ollama local model support
🔲 Team workspaces (shared projects)
🔲 Usage analytics dashboard
🔲 Prompt library (save + reuse across projects)
🔲 Deprecation registry auto-update (weekly changelog scraping)
🔲 Mobile app (React Native)
🔲 Export to Bolt/Lovable-compatible format
🔲 Custom domain for deployed projects

---

# 14. DEVELOPMENT ROADMAP

## Phase 0 — Foundation (Days 1–5)
- Init Next.js + FastAPI projects
- Supabase setup (DB + auth + storage)
- All DB migrations (9 tables)
- Supabase Auth integration
- BYOK: key input UI + Fernet encryption + storage
- Claude API test call using user's stored key
- Deploy: Railway (backend) + Vercel (frontend)

**Deliverable:** Login → enter API key → verify key → raw Claude call works

## Phase 1 — Idea Clarifier (Days 6–12)
- Multi-modal input UI (all 4 modes)
- Whisper voice transcription
- PDF/DOCX file extraction
- Claude Vision image processing
- Idea extraction Claude prompt
- Clarification flow (3-round state machine)
- IDK suggestion generation
- Warning system
- Stage 1 confirmation + state advance

**Deliverable:** Any input type → structured idea → confirmed

## Phase 2 — Blueprint + Files (Days 13–18)
- Version verification service (PyPI + npm)
- Compatibility + deprecation checks
- Blueprint generation Claude prompt
- Blueprint review UI (plain English + technical + both)
- Mermaid diagram rendering
- Partial section editing
- 12 context file generation
- Supabase Storage upload
- FILE_INJECTION_GUIDE.md auto-generation

**Deliverable:** Idea → blueprint → 12 downloadable context files

## Phase 3 — Prompt Engine (Days 19–21)
- Prompt generation Claude prompt (single call, full set)
- Topological sort for execution order
- Execution task queue saved to DB
- Prompt review UI (approve/regenerate per prompt)
- File injection mapping

**Deliverable:** Blueprint → complete optimized prompt set → execution queue

## Phase 4 — Execution Engine (Days 22–27)
- Claude Code subprocess service
- Direct Claude API execution (fallback mode)
- Selective context injection per task
- Output validation (syntax + paths + completeness)
- Error classifier + surgical prompt generator
- Drift verification
- WebSocket progress broadcasting
- Approve/fix UI per task
- File write to disk on approval
- Retry logic (all 3 layers)
- Fallback chain (Anthropic → OpenAI → Gemini)

**Deliverable:** Prompts → full codebase generated task by task, user-approved

## Phase 5 — GitHub + Deploy (Days 28–30)
- GitHub OAuth + PyGitHub push
- Auto-generated README + .gitignore + .env.example
- Vercel API deploy integration
- Railway API deploy integration
- Env var injection via platform APIs
- Build log monitoring
- Post-deploy health check
- Final delivery screen

**Deliverable:** Complete V1. Idea → code → GitHub → live URL.

---

# 15. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Claude API returns malformed JSON | High | High | 2x auto-retry + JSON extraction regex fallback |
| Generated code doesn't run | Medium | High | Agent-controlled testing via Claude Code |
| Claude Code subprocess hangs | Medium | Medium | 300s timeout per task + kill + retry |
| Architecture drift during fixes | Medium | High | Drift verification after every fix + auto-revert |
| Version mismatch causes errors | Low | High | Live registry checks at blueprint gen time |
| GitHub push fails | Low | Medium | Error detection + manual download fallback |
| Vercel/Railway build fails | Medium | Low | Auto-fix common errors + retrigger (2x) |
| User API key runs out | Medium | High | 429 detection → pause + notify user |
| Scope creep past 30 days | High | High | Strict V1 boundary, V2 features explicitly listed |
| Solo dev bottleneck | High | High | Phase-gated delivery, each phase ships working value |

---

## Definition of V1 Done

- [ ] User can register, login, add API keys (all 3 providers)
- [ ] Idea clarifier works with all 4 input modes
- [ ] Blueprint generated with live-verified versions
- [ ] 12 context files generated and downloadable
- [ ] Prompt set generated and downloadable
- [ ] Execution runs via Claude Code subprocess
- [ ] Agent corrects errors (3 attempts, surgical prompts)
- [ ] User approves every task output
- [ ] Code pushed to GitHub repo
- [ ] Vercel + Railway auto-deploy works
- [ ] Post-deploy health check passes
- [ ] All errors handled gracefully (no raw crashes to UI)
- [ ] WebSocket real-time progress working
- [ ] Works for all 3 user types (founder, dev, student)
- [ ] Free tier limits enforced
