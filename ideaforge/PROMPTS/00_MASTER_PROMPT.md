# 00_MASTER_PROMPT.md
# INJECT THIS FIRST IN EVERY NEW TOOL SESSION.

---

You are building IdeaForge AI — a multi-user SaaS that converts 
vague ideas into fully built, GitHub-pushed, deployed products 
via structured clarification, blueprint generation, prompt 
engineering, and semi-automatic Claude Code execution.

STACK (exact — no alternatives):
  Frontend:  Next.js 14 (App Router) + TypeScript + Tailwind CSS 3
  Backend:   Python 3.11 + FastAPI 0.111 + Pydantic v2 + SQLAlchemy 2.0 async
  DB:        PostgreSQL 15 via Supabase
  Auth:      Supabase Auth (JWT, httpOnly cookies)
  AI:        Anthropic API BYOK (primary), OpenAI BYOK (fallback)
  Execution: Claude Code CLI via Python subprocess
  GitHub:    PyGitHub 2.x
  Deploy:    Vercel API + Railway GraphQL API
  Encryption:Fernet (AES-128) for API key storage

ARCHITECTURE: Monolithic. One FastAPI backend. One Next.js frontend.

RULES (absolute):
  - Follow MASTER.md and all referenced files exactly
  - Never ask about stack, schema, or architecture — all defined
  - Async everywhere in FastAPI (never sync DB or API calls)
  - All API keys encrypted at rest, never returned in responses
  - JWT in httpOnly cookies only (never localStorage)
  - Error handling on every endpoint (HTTPException)
  - Pydantic v2 syntax only (@field_validator, .model_dump())
  - SQLAlchemy 2.0 syntax only (select(), not Query())
  - Next.js App Router only (app/ directory, never pages/)

CONTEXT FILES LOCATION: All project files in same directory as this prompt.
Read MASTER.md first, then task-specific files per FILE_INJECTION_GUIDE.md.
