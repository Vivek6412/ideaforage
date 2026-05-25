# STACK.md — IdeaForge AI
# EXACT VERSIONS. NO ALTERNATIVES. NO DEVIATIONS.

## Frontend
Tech:       Next.js 14 (App Router) + TypeScript + Tailwind CSS 3
Reasoning:  SSR for performance, App Router for layouts, 
            Tailwind for rapid UI, TypeScript for safety

## Backend
Tech:       Python 3.11 + FastAPI 0.111 + Pydantic v2
Reasoning:  AI SDK ecosystem native to Python, async support,
            Pydantic v2 for strict validation

## ORM
Tech:       SQLAlchemy 2.0 (async) + Alembic (migrations)
Reasoning:  Async-first, production-proven, type-safe

## Database
Tech:       PostgreSQL 15 via Supabase
Reasoning:  Relational (complex relationships), 
            Supabase = DB + Auth + Storage bundled, free tier

## Authentication
Tech:       Supabase Auth (JWT, httpOnly cookies)
Reasoning:  Built-in, no extra service, handles OAuth

## AI — Primary
Tech:       Anthropic API (claude-sonnet-4-5) — BYOK
Reasoning:  Best instruction-following, JSON output reliability

## AI — Fallback
Tech:       OpenAI API (gpt-4o) — BYOK
Reasoning:  Reliable fallback, same JSON capability

## AI — Fallback 2
Tech:       Google Gemini API (gemini-1.5-pro) — BYOK
Reasoning:  Third fallback, large context window

## Voice Transcription
Tech:       OpenAI Whisper API — BYOK
Reasoning:  Best accuracy, simple API

## File Processing
Tech:       PyMuPDF (PDF) + python-docx (DOCX)
Reasoning:  Zero Claude tokens for parsing, fast, free

## GitHub Integration
Tech:       PyGitHub 2.x
Reasoning:  Simple, well-documented, handles all repo operations

## Deploy Integration
Tech:       Vercel API (REST) + Railway GraphQL API
Reasoning:  Both have clean APIs, free tiers, fast deploys

## Subprocess Execution
Tech:       Python subprocess (Claude Code CLI)
Reasoning:  Direct terminal control, captures stdout/stderr

## Encryption
Tech:       Python cryptography (Fernet / AES-128)
Reasoning:  Industry standard for symmetric encryption of API keys

## Real-time (Frontend ↔ Backend)
Tech:       WebSockets via FastAPI WebSocket
Reasoning:  Live execution progress updates to frontend

## HTTP Client (Backend)
Tech:       httpx (async)
Reasoning:  Async-native, used for registry checks + deploy APIs

## Hosting — Frontend
Tech:       Vercel
Reasoning:  Native Next.js, free tier, instant deploys

## Hosting — Backend
Tech:       Railway
Reasoning:  Simple Python deploy, free tier, env var management

## Package Registry Checks
Tech:       PyPI JSON API + npm registry API (no auth needed)
Reasoning:  Free, real-time version data, no SDK needed

## EXACT VERSIONS (use these exactly)
python:             3.11
fastapi:            0.111.1
pydantic:           2.7.1
sqlalchemy:         2.0.30
alembic:            1.13.1
uvicorn:            0.29.0
httpx:              0.27.0
PyGitHub:           2.3.0
PyMuPDF:            1.24.3
python-docx:        1.1.2
cryptography:       42.0.7
python-multipart:   0.0.9
anthropic:          0.28.0
openai:             1.30.1
websockets:         12.0

next:               14.2.3
typescript:         5.4.5
tailwindcss:        3.4.3
@supabase/supabase-js: 2.43.4
@anthropic-ai/sdk:  0.20.7
