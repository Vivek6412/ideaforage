# DEPENDENCIES.md — IdeaForge AI
# INSTALL EXACTLY THESE VERSIONS. NO OTHERS.

## Backend — requirements.txt
```
fastapi==0.111.1
uvicorn[standard]==0.29.0
pydantic==2.7.1
pydantic-settings==2.2.1
sqlalchemy==2.0.30
alembic==1.13.1
asyncpg==0.29.0
httpx==0.27.0
python-multipart==0.0.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
cryptography==42.0.7
PyGitHub==2.3.0
PyMuPDF==1.24.3
python-docx==1.1.2
anthropic==0.28.0
openai==1.30.1
websockets==12.0
supabase==2.4.6
boto3==1.34.0
Pillow==10.3.0
```

## Backend Install Command
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Frontend — package.json dependencies
```json
{
  "dependencies": {
    "next": "14.2.3",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "@supabase/supabase-js": "2.43.4",
    "@supabase/ssr": "0.3.0",
    "mermaid": "10.9.1",
    "react-syntax-highlighter": "15.5.0",
    "@types/react-syntax-highlighter": "15.5.13",
    "lucide-react": "0.383.0",
    "clsx": "2.1.1",
    "tailwind-merge": "2.3.0"
  },
  "devDependencies": {
    "typescript": "5.4.5",
    "@types/node": "20.13.0",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "tailwindcss": "3.4.3",
    "autoprefixer": "10.4.19",
    "postcss": "8.4.38"
  }
}
```

## Frontend Install Command
```bash
cd frontend
npm install
```

## External Tools Required
```
Claude Code CLI:  npm install -g @anthropic-ai/claude-code
Python:           3.11 (use pyenv or official installer)
Node.js:          18.x LTS minimum
PostgreSQL:       15 (or use Supabase hosted)
```

## Supabase CLI (for migrations)
```bash
npm install -g supabase
supabase login
supabase init
supabase db push
```
