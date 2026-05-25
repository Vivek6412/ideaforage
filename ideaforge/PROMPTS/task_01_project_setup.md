# task_01_project_setup.md
# INJECT WITH: MASTER.md + STACK.md + FOLDER_STRUCTURE.md + ENV.md + DEPENDENCIES.md

Create exact folder structure from FOLDER_STRUCTURE.md.

Files to generate:
  backend/app/main.py
    - FastAPI app init
    - CORS middleware (allow FRONTEND_URL from config)
    - Include all routers from routers/
    - WebSocket endpoint: /ws/projects/{id}/execution
    - Health check: GET /health → { status: "ok" }

  backend/app/config.py
    - pydantic-settings BaseSettings
    - All env vars from ENV.md with correct types
    - Settings singleton: settings = Settings()

  backend/app/database.py
    - Async SQLAlchemy engine (asyncpg)
    - AsyncSessionLocal factory
    - Base = declarative_base()
    - get_db() async dependency (yields session, closes after)

  backend/requirements.txt
    - Exact versions from DEPENDENCIES.md

  backend/.env.example
    - All keys from ENV.md, empty values

  frontend/package.json
    - Exact versions from DEPENDENCIES.md

  frontend/tsconfig.json
    - strict: true, paths: @/* → ./*, jsx: preserve

  frontend/tailwind.config.ts
    - content: app/**/*.tsx + components/**/*.tsx

  frontend/next.config.ts
    - Basic config, no src directory

Done when:
  - uvicorn app.main:app starts without errors
  - GET /health returns 200
  - npm install completes without errors
  - npm run dev starts without errors
