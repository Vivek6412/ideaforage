## Stage 6 — Deploy Rules

- Frontend → Vercel (root directory: frontend/)
- Backend → Railway (root directory: backend/)
- Database → Supabase (already configured, no action)
- Env vars: injected via platform APIs (never shown in plain text in UI)
- Post-deploy health check: ping all 4 services
- Build failure: auto-fix and retrigger (common errors only)
- Max deploy retrigger attempts: 2
