# ARCHITECTURE.md — IdeaForge AI

## Architecture Type
Monolithic (V1) — single backend service, single frontend.
Correct for: solo dev, 1 month, MVP validation.

## System Flow
```
User (Browser)
    ↕ HTTPS + WebSocket
Next.js Frontend (Vercel)
    ↕ REST API + WebSocket
FastAPI Backend (Railway)
    ├── Supabase (PostgreSQL) — primary data store
    ├── Supabase Storage — project files (CONTEXT.md etc.)
    ├── Anthropic API (BYOK) — primary AI
    ├── OpenAI API (BYOK) — fallback AI + Whisper
    ├── Gemini API (BYOK) — fallback AI
    ├── Claude Code CLI (subprocess) — code execution
    ├── PyGitHub → GitHub API — repo push
    ├── Vercel API — frontend deploy
    └── Railway API — backend deploy
```

## Component Responsibilities

### Frontend (Next.js)
- Idea input wizard (multi-modal)
- Stage-by-stage review UI
- Real-time execution progress (WebSocket)
- Code viewer + approve/reject per task
- Project dashboard
- API key management UI
- GitHub OAuth flow
- Deploy configuration UI

### Backend (FastAPI)
- State machine orchestrator (controls all 6 stages)
- Prompt engine (builds + injects prompts)
- Version verification layer (PyPI + npm registry)
- Deprecation checker
- Multi-modal input processor
- File generator (12 context files)
- Execution engine (Claude Code subprocess manager)
- Error classifier + surgical prompt generator
- GitHub integration (push, commit)
- Deploy integration (Vercel + Railway)
- API key encryption/decryption
- WebSocket event broadcaster

### State Machine
```
IDEA_CAPTURE → IDEA_CONFIRMED → BLUEPRINT_DRAFT → 
BLUEPRINT_CONFIRMED → PROMPTS_GENERATED → PROMPTS_CONFIRMED → 
EXECUTION_RUNNING → EXECUTION_COMPLETE → GITHUB_PUSHED → 
DEPLOYED → PAUSED (any failure state)
```

### Execution Engine Detail
```
Agent (FastAPI)
    ├── launches Claude Code CLI as subprocess
    ├── injects MASTER.md + relevant context files
    ├── injects task prompts sequentially
    ├── monitors stdout/stderr continuously
    ├── classifies errors (ERROR_PATTERNS dict)
    ├── generates surgical fix prompts
    ├── verifies no architecture drift after each fix
    ├── writes approved files to /tmp/projects/{id}/
    └── broadcasts progress via WebSocket

Claude Code CLI
    ├── receives prompts from agent via stdin
    ├── writes/edits files
    ├── runs terminal commands
    ├── installs dependencies
    ├── runs migrations
    ├── starts dev servers
    ├── runs tests
    └── reports results via stdout
```

## Data Flow Per Stage

### Stage 1 (Idea Capture)
```
Multi-modal input → preprocessors → merged text → 
Claude API (idea extraction) → structured idea JSON → 
clarifying questions → user answers → refined JSON → 
user approves → saved to stage_outputs
```

### Stage 2 (Blueprint)
```
Structured idea JSON → 
parallel: PyPI checks + npm checks (version verification) →
Claude API (blueprint generation with verified versions) →
blueprint JSON → Mermaid diagram source generated →
user reviews/edits → approved → 
CONTEXT files generated (12 files) → 
saved to stage_outputs + Supabase Storage
```

### Stage 3 (Prompts)
```
Blueprint JSON + context files →
Claude API (single call, full prompt set) →
prompt set JSON → stored per task →
user reviews → approved → saved to stage_outputs
```

### Stage 4 (Execution)
```
Approved prompts + context files →
Claude Code subprocess launched →
task queue executed sequentially (dependency order) →
per task: inject → execute → validate → user approves →
error: classify → surgical prompt → execute → verify →
all approved → files on disk → execution_complete
```

### Stages 5-6 (GitHub + Deploy)
```
Files on disk → README/gitignore auto-generated →
GitHub OAuth token → create repo → single commit push →
Vercel API: create project + inject env vars + trigger deploy →
Railway API: create project + inject env vars + trigger deploy →
monitor build logs → health check → deliver URLs
```

## Security Architecture
- API keys: AES-128 (Fernet) encrypted at rest
- JWT: httpOnly cookies only (never localStorage)
- GitHub tokens: encrypted, scoped to repo only
- Env vars: injected via platform APIs (never shown in UI)
- Webhook verification: all platforms (Stripe pattern applied)
- CORS: restricted to known frontend origin only
