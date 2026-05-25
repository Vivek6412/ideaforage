# ENV.md — IdeaForge AI
# ALL ENVIRONMENT VARIABLES. IMPLEMENT ALL.

## Backend (.env)
```
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/ideaforge
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=

# Auth
JWT_SECRET=                    # 64-char random string
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=7

# Encryption
FERNET_KEY=                    # generated via Fernet.generate_key()

# Storage
SUPABASE_STORAGE_BUCKET=project-files

# GitHub OAuth App
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:3000/settings?tab=integrations

# App
ENVIRONMENT=development        # development | production
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000

# Claude Code CLI path (where it's installed)
CLAUDE_CODE_PATH=/usr/local/bin/claude
```

## Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_GITHUB_CLIENT_ID=
```
