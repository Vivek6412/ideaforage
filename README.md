# IdeaForge AI

> Convert vague ideas into fully built, GitHub-pushed products using a 6-stage AI-powered workflow.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-blue)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is IdeaForge?

IdeaForge is a full-stack AI SaaS platform that takes a raw idea (text, voice, file, or image) and guides it through 6 structured stages:

1. **Idea Capture** — AI extracts and clarifies your concept
2. **Blueprint** — Architecture, tech stack, and folder structure are generated
3. **Prompts** — 12 context files are generated for Claude Code
4. **Execution** — Claude Code builds the entire project autonomously
5. **Review** — You inspect the generated codebase
6. **Deploy** — One-click GitHub push and deployment

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11, SQLAlchemy 2.0 (async) |
| Database | PostgreSQL via Supabase |
| AI | Anthropic Claude, OpenAI, Google Gemini (fallback chain) |
| Execution | Claude Code CLI |
| Auth | JWT + BYOK (Bring Your Own Key) |
| Storage | Supabase Storage |

---

## Project Structure

```
ideaforge/
├── backend/              # FastAPI backend service
│   ├── app/
│   │   ├── core/         # AI client, encryption, state machine
│   │   ├── middleware/   # Auth middleware
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── routers/      # API route handlers
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   └── services/     # Business logic layer
│   ├── migrations/       # Alembic database migrations
│   ├── scripts/          # Utility and maintenance scripts
│   └── tests/            # pytest test suite
└── frontend/             # Next.js frontend service
    ├── app/              # App Router pages and layouts
    ├── components/       # Shared UI components
    ├── hooks/            # Custom React hooks
    ├── lib/              # API client and utilities
    ├── types/            # TypeScript type definitions
    └── tests/            # Playwright E2E tests
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (via Supabase or local)
- A Supabase project

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cp .env.example .env         # Fill in your secrets
alembic upgrade head         # Run migrations
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local  # Fill in your secrets
npm run dev
```

### Running Tests

```bash
# Backend unit tests
cd backend && pytest

# Frontend E2E tests (requires both servers running)
cd frontend && npx playwright test
```

---

## Environment Variables

See `backend/.env.example` for required backend variables and `frontend/.env.local` for frontend variables.

Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing key
- `FERNET_KEY` — Encryption key for stored API keys
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` — Supabase credentials

---

## License

MIT
