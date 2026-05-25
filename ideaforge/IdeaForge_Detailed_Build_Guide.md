# IdeaForge AI — Detailed Build Guide (Free Tools)

# Follow this exactly. Step by step. No skipping.

---

# BEFORE YOU START — ONE-TIME SETUP

## Step 1: Install Everything (Day 0)

### VS Code

```
1. Go to code.visualstudio.com
2. Download + install
3. Install extensions:
   - Python (Microsoft)
   - Pylance
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense
   - GitLens
```

### Node.js

```
1. Go to nodejs.org
2. Download LTS version (18.x or higher)
3. Install
4. Verify: open terminal → node --version → should show v18.x
```

### Python 3.11

```
1. Go to python.org/downloads
2. Download Python 3.11.x
3. Install (check "Add to PATH" on Windows)
4. Verify: python --version → Python 3.11.x
```

### Gemini CLI

```
Open terminal and run:
npm install -g @google/gemini-cli

Then authenticate:
gemini auth
(Opens browser → sign in with Google account → done)

Verify:
gemini --version
```

### Git

```
1. Go to git-scm.com
2. Download + install
3. Verify: git --version
4. Setup:
   git config --global user.name "Your Name"
   git config --global user.email "your@email.com"
```

---

## Step 2: Create All Accounts (Day 0)

### Supabase (Database + Auth + Storage)

```
1. Go to supabase.com
2. Sign up with GitHub
3. Create new project:
   Name: ideaforge
   Password: (save this, it's your DB password)
   Region: closest to you
4. Wait for project to provision (~2 min)
5. Go to Settings → API
6. Copy and save:
   - Project URL (SUPABASE_URL)
   - anon/public key (SUPABASE_ANON_KEY)
   - service_role key (SUPABASE_SERVICE_KEY)
```

### GitHub

```
1. Go to github.com → sign up
2. Create new repository:
   Name: ideaforge
   Visibility: Private
   Add README: No
3. Copy repo URL
```

### Vercel (Frontend Hosting)

```
1. Go to vercel.com
2. Sign up with GitHub
3. Skip project import for now (will do later)
```

### Railway (Backend Hosting)

```
1. Go to railway.app
2. Sign up with GitHub
3. Skip project for now
```

### Anthropic (Testing Credits)

```
1. Go to console.anthropic.com
2. Create new account (use different email if you have one already)
3. You get $5 free credits
4. Go to API Keys → Create API Key
5. Copy and save this key (ANTHROPIC_TEST_KEY)
   USE THIS ONLY FOR TESTING — not production
```

---

## Step 3: Create Project Folder

```
Open terminal:

mkdir ideaforge
cd ideaforge
git init
git remote add origin https://github.com/YOUR_USERNAME/ideaforge.git

Create folder structure:
mkdir -p frontend backend
```

## Step 4: Put Context Files In Project

```
Download the ideaforge_context_files.zip
Extract it into your ideaforge/ folder

You should now have:
ideaforge/
├── MASTER.md
├── PRODUCT.md
├── STACK.md
├── ARCHITECTURE.md
├── FOLDER_STRUCTURE.md
├── SCHEMA.md
├── API_SPEC.md
├── BUSINESS_LOGIC.md
├── ENV.md
├── CONVENTIONS.md
├── ANTI_PATTERNS.md
├── DEPENDENCIES.md
├── FILE_INJECTION_GUIDE.md
└── PROMPTS/
    ├── 00_MASTER_PROMPT.md
    ├── task_01_project_setup.md
    ├── task_02_database.md
    ├── task_03_auth_byok.md
    ├── task_04_state_machine.md
    ├── task_05_idea_capture_engine.md
    ├── task_06_to_09.md
    ├── task_10_to_13.md
    ├── task_14_to_18_frontend.md
    └── debug_prompts.md
```

---

# HOW TO USE CLAUDE.AI FREE — MASTER TEMPLATE

## The Exact Message Format (Use Every Time)

```
ALWAYS structure your Claude.ai message like this:

---CONTEXT START---
[paste file contents here]
---CONTEXT END---

[paste task prompt here]

Additional instructions:
- Return each file with its exact path as a heading above the code block
- Use exact file paths from FOLDER_STRUCTURE.md
- No explanations between files, just path + code
- All files complete, no truncation
---
```

## Example: What A Real Claude.ai Message Looks Like

```
---CONTEXT START---
[full content of MASTER.md pasted here]

[full content of STACK.md pasted here]

[full content of FOLDER_STRUCTURE.md pasted here]

[full content of ENV.md pasted here]

[full content of DEPENDENCIES.md pasted here]
---CONTEXT END---

[full content of task_01_project_setup.md pasted here]

Additional instructions:
- Return each file with its exact path as a heading above the code block
- Use exact file paths from FOLDER_STRUCTURE.md
- No explanations between files, just path + code
- All files complete, no truncation
```

## After Claude Responds

```
1. For each file Claude generates:
   - Read the path heading (e.g., backend/app/main.py)
   - Create that file in VS Code at that exact path
   - Paste the code
   - Save

2. If Claude says "continued in next message":
   - Reply: "Continue from where you stopped.
             Return remaining files only. Same format."

3. If Claude truncates a file midway:
   - Reply: "File [filename] was cut off at [last line you saw].
             Return the complete file from the beginning."
```

---

# PHASE 0 — FOUNDATION

# Days 1-3 | Goal: Both servers running, DB migrated, auth working

---

## DAY 1 — Project Setup + Database

### Morning: Project Structure + Config Files

**Open Claude.ai (use Sonnet 4.6)**

**Message 1 — Project Setup:**

```
Paste these files:
- MASTER.md (full content)
- STACK.md (full content)
- FOLDER_STRUCTURE.md (full content)
- ENV.md (full content)
- DEPENDENCIES.md (full content)
- PROMPTS/task_01_project_setup.md (full content)

Then add:
"Additional instructions:
- Return each file with its exact path as a heading
- Complete files only, no truncation
- Include all imports"
```

**What Claude will return:**

- backend/app/main.py
- backend/app/config.py
- backend/app/database.py
- backend/requirements.txt
- backend/.env.example
- frontend/package.json
- frontend/tsconfig.json
- frontend/tailwind.config.ts
- frontend/next.config.ts

**After Claude responds:**

```
Create each file exactly at the path Claude specifies.
For each file:
  1. In VS Code: right-click folder → New File
  2. Type exact path
  3. Paste code
  4. Save (Ctrl+S)
```

---

### Run With Gemini CLI

**Open terminal in your ideaforge/ folder:**

**Gemini Command 1 — Backend Setup:**

```
gemini "I have a FastAPI project in the backend/ folder.
Read backend/requirements.txt and backend/app/main.py.
Do the following steps in order:
1. Create Python virtual environment: python -m venv venv
2. Activate it
3. Install all packages from requirements.txt
4. Create backend/.env by copying backend/.env.example
5. Try running: uvicorn app.main:app --reload (from backend/ folder)
6. Tell me what happened - did it start or did it error?"
```

**If Gemini says it started successfully:**

```
gemini "Good. Now do the frontend:
1. Go to frontend/ folder
2. Run npm install
3. Try running npm run dev
4. Tell me if it started or errored"
```

**If Gemini says there's an error (most likely scenario):**

```
Copy the exact error text.
Go to Claude.ai.

Paste this message:
"---CONTEXT START---
[paste MASTER.md]
[paste ANTI_PATTERNS.md]
[paste STACK.md]
---CONTEXT END---

I got this error when running the project:
[paste exact error]

The file that has the issue is [filename from error].
Current content of that file:
[paste the file content]

Fix the error. Return the corrected file only with its path as heading."
```

Apply the fix Claude gives → go back to Gemini → retry.

---

### Afternoon: Database Setup

**Go to Supabase Dashboard:**

```
1. Open supabase.com → your project
2. Click "SQL Editor" in left sidebar
3. Click "New Query"
4. Open your SCHEMA.md file
5. Copy ALL the SQL from SCHEMA.md
6. Paste into Supabase SQL editor
7. Click "Run"
8. Should see "Success. No rows returned"
9. Go to Table Editor → verify all 9 tables exist:
   users, user_api_keys, user_integrations, projects,
   stage_outputs, execution_tasks, execution_logs,
   github_pushes, deployments
```

**If any SQL error in Supabase:**

```
Go to Claude.ai.

Message:
"---CONTEXT START---
[paste SCHEMA.md]
---CONTEXT END---

I got this SQL error in Supabase:
[paste exact error]

Fix the SQL. Return only the corrected CREATE TABLE statement
for the table that has the error."
```

---

### Evening: Create .env Files

**Create backend/.env:**

```
Open backend/.env.example
Copy it → create backend/.env
Fill in real values:

DATABASE_URL: Go to Supabase → Settings → Database
  → copy "URI" → change postgres:// to postgresql+asyncpg://
  Add ?ssl=require at the end

SUPABASE_URL: from Supabase Settings → API → Project URL
SUPABASE_SERVICE_KEY: from Supabase Settings → API → service_role key
JWT_SECRET: generate random 64 chars (go to random.org or use:
  python -c "import secrets; print(secrets.token_hex(32))")
FERNET_KEY: run in terminal:
  cd backend
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENVIRONMENT: development
FRONTEND_URL: http://localhost:3000
ALLOWED_ORIGINS: http://localhost:3000
CLAUDE_CODE_PATH: claude (we'll set this later)
```

**Create frontend/.env.local:**

```
NEXT_PUBLIC_SUPABASE_URL: same as SUPABASE_URL above
NEXT_PUBLIC_SUPABASE_ANON_KEY: from Supabase → anon/public key
NEXT_PUBLIC_API_URL: http://localhost:8000
NEXT_PUBLIC_WS_URL: ws://localhost:8000
NEXT_PUBLIC_GITHUB_CLIENT_ID: (leave blank for now)
```

---

## DAY 2 — Database Models + Alembic

### Morning: Generate Database Models

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste SCHEMA.md]
[paste CONVENTIONS.md]
---CONTEXT END---

[paste PROMPTS/task_02_database.md]

Additional instructions:
- Return each file with its exact path as heading
- All models complete with all constraints from SCHEMA.md
- Include __init__.py for models folder
- Include migrations/env.py setup
- No truncation
```

**What Claude returns:**

- backend/app/models/user.py
- backend/app/models/project.py
- backend/app/models/stage_output.py
- backend/app/models/execution_task.py
- backend/app/models/execution_log.py
- backend/app/models/github_push.py
- backend/app/models/deployment.py
- backend/app/models/user_integration.py
- backend/app/models/**init**.py
- backend/migrations/env.py

Create all files in VS Code exactly as Claude specifies.

---

### Run Alembic With Gemini

```
gemini "I have a FastAPI project with SQLAlchemy models.
Read all files in backend/app/models/ and backend/migrations/env.py
and backend/app/database.py and backend/app/config.py.

Do the following from the backend/ folder with venv activated:
1. Run: alembic init migrations (skip if migrations/ already exists)
2. Run: alembic revision --autogenerate -m 'initial'
3. Run: alembic upgrade head
4. Tell me the result of each step"
```

**If alembic error:**

```
Claude.ai message:
"---CONTEXT START---
[paste SCHEMA.md]
[paste STACK.md]
[paste ANTI_PATTERNS.md]
---CONTEXT END---

Alembic migration failed with this error:
[paste error]

Current backend/migrations/env.py:
[paste file content]

Current backend/app/database.py:
[paste file content]

Fix both files so alembic upgrade head works.
Return corrected files with paths as headings."
```

---

## DAY 3 — Auth + BYOK

### Morning: Generate Auth System

**Claude.ai Message 1 (Auth core — use Sonnet, complex logic):**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste SCHEMA.md — only users, user_api_keys, user_integrations tables]
[paste ANTI_PATTERNS.md]
[paste CONVENTIONS.md]
---CONTEXT END---

[paste PROMPTS/task_03_auth_byok.md]

Additional instructions:
- Return each file with exact path as heading
- Pydantic v2 syntax only (@field_validator, model_dump)
- SQLAlchemy 2.0 async only (select(), await session.execute())
- JWT in httpOnly cookie exactly as specified
- No truncation"
```

**What Claude returns:**

- backend/app/core/encryption.py
- backend/app/middleware/auth.py
- backend/app/schemas/auth.py
- backend/app/services/auth_service.py
- backend/app/routers/auth.py

Create all files.

---

### Afternoon: Generate State Machine

**Claude.ai Message 2 (State machine — can use Haiku for this):**

```
Switch to Haiku 4.5 for this (saves Sonnet quota)

---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste SCHEMA.md — only projects, stage_outputs tables]
[paste BUSINESS_LOGIC.md — only "State Transitions" section]
[paste CONVENTIONS.md]
---CONTEXT END---

[paste PROMPTS/task_04_state_machine.md]

Additional instructions:
- Return each file with exact path as heading
- All state transitions validated before executing
- Ownership check on every project request
- No truncation
```

**What Claude returns:**

- backend/app/core/state_machine.py
- backend/app/schemas/project.py
- backend/app/services/project_service.py
- backend/app/routers/projects.py

---

### Evening: Test Auth With Gemini

```
gemini "I have a FastAPI app in backend/.
Read backend/app/main.py, backend/app/routers/auth.py,
backend/app/services/auth_service.py, backend/app/core/encryption.py.

From backend/ with venv activated:
1. Start the server: uvicorn app.main:app --reload (run in background)
2. Test register: curl -X POST http://localhost:8000/api/v1/auth/register
   -H 'Content-Type: application/json'
   -d '{\"email\":\"test@test.com\",\"password\":\"testpass123\",\"full_name\":\"Test User\"}'
3. Test login: curl -X POST http://localhost:8000/api/v1/auth/login
   -H 'Content-Type: application/json'
   -d '{\"email\":\"test@test.com\",\"password\":\"testpass123\"}'
4. Test me: curl http://localhost:8000/api/v1/auth/me (should return 401)
5. Tell me the result of each test"
```

**If any test fails:**

```
Claude.ai message:
"---CONTEXT START---
[paste MASTER.md]
[paste API_SPEC.md — AUTH section only]
[paste ANTI_PATTERNS.md]
---CONTEXT END---

Auth endpoint failing:
Endpoint tested: [which endpoint]
Expected: [what should happen]
Got: [paste exact error/response]

Relevant files:
backend/app/routers/auth.py:
[paste content]

backend/app/services/auth_service.py:
[paste content]

backend/app/middleware/auth.py:
[paste content]

Find and fix the issue. Return only corrected files with paths."
```

---

# PHASE 1 — IDEA CAPTURE ENGINE

# Days 4-8 | Goal: Multi-modal input + Claude-powered clarification working

---

## DAY 4 — AI Client + Version Service

### Morning: AI Client (Core — Use Sonnet)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste BUSINESS_LOGIC.md — "Stage 4 — Execution Rules" section only,
  specifically the Fallback Chain and retry strategy]
[paste ANTI_PATTERNS.md]
[paste CONVENTIONS.md]
---CONTEXT END---

Build the AI client abstraction layer.

Files to create:

backend/app/core/ai_client.py
- AIClient class
- async call(api_key, provider, system, user, max_tokens=2000) → str
- Supports providers: 'anthropic', 'openai', 'gemini'
- Fallback chain: try anthropic → try openai → try gemini
- Exponential backoff on rate limit: wait 2s, 4s, 8s then raise
- Returns text content only (not full API response object)
- Uses anthropic SDK, openai SDK
- Never logs api_key values

Additional instructions:
- Pydantic v2, async, exact versions from STACK.md
- Return file with path as heading
- Complete, no truncation
```

---

### Afternoon: Version Verification Service (Haiku is fine)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste CONVENTIONS.md]
---CONTEXT END---

Build the version verification service.

backend/app/services/version_service.py:
- fetch_pypi_version(package: str) → str
  GET https://pypi.org/pypi/{package}/json → info.version
- fetch_npm_version(package: str) → str
  GET https://registry.npmjs.org/{package}/latest → version
- get_verified_versions(stack: dict) → dict
  Fetches versions for these packages:
  PyPI: fastapi, pydantic, sqlalchemy, alembic, uvicorn, httpx,
        PyGitHub, PyMuPDF, python-docx, cryptography, anthropic, openai
  npm: next, react, typescript, tailwindcss, @supabase/supabase-js
- DEPRECATION_FLAGS dict:
  next@14: ['getServerSideProps deprecated → use Server Components',
            'pages/ directory legacy → use app/']
  sqlalchemy@2: ['Query() API removed → use select()',
                 'sync session in async context forbidden']
  pydantic@2: ['@validator deprecated → @field_validator',
               '.dict() removed → .model_dump()',
               '.json() removed → .model_dump_json()']
- get_deprecation_flags(stack, versions) → list[dict]

Return file with path as heading. Complete, no truncation.
```

---

## DAY 5 — Idea Input Processors

### Morning: File + Voice + Image Processors (Haiku fine)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste CONVENTIONS.md]
[paste ANTI_PATTERNS.md]
---CONTEXT END---

Build the multi-modal input preprocessors.

backend/app/services/idea_service.py (Part 1 — preprocessors only):

Functions to implement:
1. preprocess_text(text: str) → str
   Strip, clean whitespace, return

2. async preprocess_voice(audio: bytes, openai_key: str) → str
   Send to OpenAI Whisper API using openai SDK
   Model: whisper-1
   Return transcript text

3. async preprocess_file(file: UploadFile) → str
   .md/.txt: decode as UTF-8 string
   .pdf: use PyMuPDF (fitz) - open stream, extract text page by page
   .docx: use python-docx - extract all paragraph text
   Unsupported: raise HTTPException(400, 'Unsupported file type')

4. async preprocess_image(image_bytes: bytes,
                          media_type: str,
                          anthropic_key: str) → str
   Send to Claude claude-haiku-4-5-20251001 (cheaper) via anthropic SDK
   System: 'Extract product idea from image. Return structured text only. Max 200 words.'
   Return extracted text

5. merge_inputs(text, voice_transcript, file_content, image_desc) → str
   Merge all non-None inputs with separators:
   '---USER TYPED---\n{text}\n---USER SAID (voice)---\n{voice}\n...'
   Return merged string

Return file with path as heading. Complete.
```

---

### Afternoon: Idea Extraction Logic (Use Sonnet — critical)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste SCHEMA.md — projects and stage_outputs tables only]
[paste API_SPEC.md — STAGE 1 section only]
[paste BUSINESS_LOGIC.md — "Stage 1 — Idea Capture Rules" section only]
[paste CONVENTIONS.md]
---CONTEXT END---

Continue building backend/app/services/idea_service.py.
Add these functions after the preprocessors:

IDEA_EXTRACTION_SCHEMA = { ... }  ← define the full JSON schema as a string constant

IDEA_EXTRACTION_PROMPT = """
Role: product analyst
Task: extract structured idea from user input
Rules:
- ask max {max_questions} questions this round
- never re-ask already answered fields
- idk response → generate exactly 5 context-specific suggestions as options array
- warn if: features>8 (too_broad), ML/blockchain/hardware in features (infeasible),
  exact clone of major platform (crowded_market)
- warnings advisory only
- return ONLY valid JSON matching schema exactly
Schema: {schema}
"""

async def process_idea(db, project_id, merged_input, user_keys, round_num=1) → dict:
  - max_questions = 3 if round==1, 2 if round==2, 1 if round==3
  - if round >= 4: return force_confirm_response()
  - Call ai_client.call() with IDEA_EXTRACTION_PROMPT
  - Parse JSON response
  - Save to stage_outputs with status=pending_review, round_number=round_num
  - Return parsed dict

async def refine_idea(db, project_id, answers, corrections, round_num, user_keys) → dict:
  - Get current stage_output for this project
  - Build prompt with current understood + user answers + corrections
  - Instruct: update only fields where corrections given, keep rest
  - Call ai_client.call()
  - Save updated output to stage_outputs (new row, incremented round)
  - Return parsed dict

async def confirm_idea(db, project_id) → None:
  - Get latest stage_output for idea_capture stage
  - Update status to 'approved'
  - Call state_machine.advance_state(project, 'IDEA_CONFIRMED')

Return ONLY additions to idea_service.py (not the preprocessors again).
Path: backend/app/services/idea_service.py (additions)
Complete, no truncation.
```

---

### Evening: Idea Router (Haiku fine)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste API_SPEC.md — STAGE 1 section only]
[paste CONVENTIONS.md]
---CONTEXT END---

Build the idea capture router.

backend/app/routers/idea.py:
- POST /api/v1/projects/{project_id}/idea/process
  Accept multipart/form-data with optional fields:
  text: str, voice: UploadFile, file: UploadFile, image: UploadFile
  Call preprocessors for each provided input
  Merge all inputs
  Call idea_service.process_idea()
  Return result

- POST /api/v1/projects/{project_id}/idea/refine
  Accept JSON: {answers: dict, corrections: dict, round: int}
  Call idea_service.refine_idea()
  Return result

- POST /api/v1/projects/{project_id}/idea/confirm
  Call idea_service.confirm_idea()
  Return {message, next_stage}

All routes: Depends(get_current_user), verify project ownership
Return file with path as heading. Complete.
```

---

## DAY 6 — Test Idea Capture

### Test With Gemini

```
gemini "Read backend/app/routers/idea.py and backend/app/services/idea_service.py
and backend/app/core/ai_client.py

From backend/ with venv activated, server running:

Test the idea capture endpoint:
curl -X POST http://localhost:8000/api/v1/projects/TEST_PROJECT_ID/idea/process \
  -H 'Content-Type: multipart/form-data' \
  -F 'text=I want to build an app where students find tutors near them and book them'

What was the response? Did it work or error?"
```

NOTE: Replace TEST_PROJECT_ID with an actual UUID from your projects table.
To get one: Go to Supabase → Table Editor → projects → copy any id.

**If error from Gemini:**

```
Claude.ai message:
"---CONTEXT START---
[paste MASTER.md]
[paste ANTI_PATTERNS.md]
[paste API_SPEC.md — STAGE 1 only]
---CONTEXT END---

Error from idea capture endpoint:
[paste exact error + stack trace]

Files involved:
backend/app/services/idea_service.py:
[paste content]

backend/app/core/ai_client.py:
[paste content]

backend/app/routers/idea.py:
[paste content]

Identify root cause. Fix. Return only corrected files."
```

---

## DAYS 7-8 — Blueprint Engine

### DAY 7 Morning: Blueprint Generation (Use Sonnet — complex)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste SCHEMA.md — projects and stage_outputs tables only]
[paste API_SPEC.md — STAGE 2 section only]
[paste BUSINESS_LOGIC.md — "Stage 2 — Blueprint Rules" section only]
[paste CONVENTIONS.md]
[paste ANTI_PATTERNS.md]
---CONTEXT END---

[paste PROMPTS/task_06_to_09.md — ONLY the task_06_blueprint_engine.md section]

Additional instructions:
- Return each file with exact path as heading
- BLUEPRINT_PROMPT must be defined as a string constant in blueprint_service.py
- Version service calls are async (await all)
- Complete, no truncation
```

**What Claude returns:**

- backend/app/services/blueprint_service.py
- backend/app/routers/blueprint.py

---

### DAY 7 Afternoon: File Generator (Haiku fine)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste CONVENTIONS.md]
---CONTEXT END---

[paste PROMPTS/task_10_to_13.md — ONLY the task_11_file_generator.md section]

Additional instructions:
- All generators are pure Python string generation (no Claude API calls)
- Each gen_* function takes blueprint dict + returns string
- generate_all_files() calls all generators, returns {filename: content}
- Return file with path as heading. Complete.
```

---

### DAY 8: Prompt Engine + Test

### Morning: Prompt Engine (Sonnet)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste SCHEMA.md — stage_outputs table only]
[paste API_SPEC.md — STAGE 3 section only]
[paste BUSINESS_LOGIC.md — "Stage 3 — Prompt Rules" section only]
[paste CONVENTIONS.md]
---CONTEXT END---

[paste PROMPTS/task_06_to_09.md — ONLY the task_08_prompt_engine.md section]

Additional instructions:
- topological sort implementation required (no external library, write it)
- PROMPT_GEN_PROMPT defined as string constant
- Return each file with exact path. Complete.
```

---

# PHASE 2 — EXECUTION ENGINE

# Days 9-18 | Goal: Claude Code integration + task execution working

---

## DAY 9 — Execution Engine Core (Use Sonnet — most complex part)

**SPLIT INTO 2 MESSAGES — too long for one:**

**Claude.ai Message 1 (WebSocket + Error Classifier):**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste BUSINESS_LOGIC.md — "Stage 4 — Execution Rules" and
  "Error Classification" sections only]
[paste CONVENTIONS.md]
[paste ANTI_PATTERNS.md]
---CONTEXT END---

Build Part 1 of the execution system.

Files to create:

backend/app/core/websocket_manager.py:
- ConnectionManager class
- connect(websocket: WebSocket, project_id: str)
- disconnect(websocket: WebSocket, project_id: str)
- broadcast(project_id: str, event: dict) → sends JSON to all connected clients
- Store connections in dict: {project_id: [websocket1, websocket2]}

backend/app/services/error_classifier.py:
- ERROR_PATTERNS dict (all patterns from BUSINESS_LOGIC.md)
- classify_error(error_text: str) → str (returns error type key)
- generate_surgical_prompt(error, file_content, error_type,
                           folder_structure, anti_patterns) → str
  Builds targeted fix prompt. Max 200 tokens output.
  References specific rule from anti_patterns.
- verify_no_drift(fixed_files: list, approved_stack: dict,
                  folder_structure: str) → list[str]
  Check: no imports outside approved stack
  Check: file paths match folder structure
  Returns list of violations (empty = clean)

Return each file with exact path. Complete.
```

**Claude.ai Message 2 (Execution Service):**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste SCHEMA.md — execution_tasks and execution_logs tables only]
[paste API_SPEC.md — STAGE 4 and WEBSOCKET sections only]
[paste BUSINESS_LOGIC.md — Stage 4 Rules only]
[paste CONVENTIONS.md]
[paste ANTI_PATTERNS.md]
---CONTEXT END---

[paste PROMPTS/task_06_to_09.md — ONLY task_09_execution_engine.md section]

Additional instructions:
- Use asyncio for non-blocking execution
- WebSocket broadcast after every state change
- All DB operations async
- Return each file with exact path. Complete, no truncation.
```

---

## DAY 10 — Claude Code Subprocess Service (Sonnet)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste BUSINESS_LOGIC.md — Stage 4 Rules only]
[paste CONVENTIONS.md]
---CONTEXT END---

[paste PROMPTS/task_10_to_13.md — ONLY task_10_claude_code_service.md section]

Additional instructions:
- Use asyncio.create_subprocess_exec (not subprocess.Popen) for async
- Context files written to project temp dir before launching Claude Code
- JSON detection: watch stdout for complete JSON object containing 'files' key
- Buffer stdout line by line
- Timeout: 300 seconds using asyncio.wait_for
- Return file with exact path. Complete.
```

---

## DAYS 11-12 — Test Execution Engine

### Test With Gemini

```
gemini "Read backend/app/services/execution_service.py
and backend/app/core/ai_client.py
and backend/app/services/error_classifier.py

From backend/ with venv activated, server running:

Test execution start:
curl -X POST http://localhost:8000/api/v1/projects/YOUR_PROJECT_ID/execution/start \
  -H 'Cookie: access_token=YOUR_JWT_TOKEN'

What happened? Show me the response."
```

**To get JWT token for testing:**

```
gemini "Run this curl to get a JWT:
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{\"email\":\"test@test.com\",\"password\":\"testpass123\"}' \
  -c cookies.txt -v

The -v flag shows headers. Copy the Set-Cookie header value (the JWT).
Show me the full response headers."
```

**If execution engine errors:**

```
Claude.ai message:
"---CONTEXT START---
[paste MASTER.md]
[paste ANTI_PATTERNS.md]
[paste BUSINESS_LOGIC.md — Stage 4 Rules only]
---CONTEXT END---

Execution engine error:
[paste full error + stack trace]

Files:
backend/app/services/execution_service.py:
[paste content]

backend/app/core/websocket_manager.py:
[paste content]

Root cause + fix. Return only corrected files."
```

---

## DAYS 13-15 — GitHub + Deploy Integration

### Day 13: GitHub Service (Haiku fine)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste SCHEMA.md — github_pushes and user_integrations tables only]
[paste API_SPEC.md — STAGE 5 and INTEGRATIONS sections only]
[paste BUSINESS_LOGIC.md — Stage 5 Rules only]
[paste CONVENTIONS.md]
---CONTEXT END---

[paste PROMPTS/task_10_to_13.md — ONLY task_12_github_integration.md section]

Additional instructions:
- PyGitHub 2.3.0 syntax (check DEPENDENCIES.md)
- All files filtered through exclusion list from BUSINESS_LOGIC.md
- Single commit only
- Return each file with exact path. Complete.
```

### Day 14: Deploy Service (Haiku fine)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste SCHEMA.md — deployments and user_integrations tables only]
[paste API_SPEC.md — STAGE 6 section only]
[paste BUSINESS_LOGIC.md — Stage 6 Rules only]
[paste CONVENTIONS.md]
---CONTEXT END---

[paste PROMPTS/task_10_to_13.md — ONLY task_13_deploy_integration.md section]

Additional instructions:
- Vercel REST API + Railway GraphQL API both implemented
- Health check pings 4 services
- Return each file with exact path. Complete.
```

### Day 15: Set Up GitHub OAuth App

```
1. Go to github.com → Settings → Developer Settings
2. OAuth Apps → New OAuth App
3. Fill in:
   Application name: IdeaForge AI
   Homepage URL: http://localhost:3000
   Callback URL: http://localhost:3000/settings?tab=integrations
4. Register
5. Copy Client ID → add to backend/.env as GITHUB_CLIENT_ID
6. Generate Client Secret → add to backend/.env as GITHUB_CLIENT_SECRET
7. Copy Client ID → add to frontend/.env.local as NEXT_PUBLIC_GITHUB_CLIENT_ID
```

---

# PHASE 3 — FRONTEND

# Days 16-24 | Goal: Complete UI working end-to-end

---

## DAY 16 — Frontend Foundation (Haiku fine for layout)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste FOLDER_STRUCTURE.md]
[paste CONVENTIONS.md]
---CONTEXT END---

[paste PROMPTS/task_14_to_18_frontend.md — ONLY task_14_frontend_layout.md section]

Additional instructions:
- Next.js 14 App Router only (app/ directory)
- TypeScript strict mode
- All types in frontend/types/index.ts matching API responses
- Return each file with exact path. Complete.
```

**Gemini after Claude:**

```
gemini "Read frontend/app/layout.tsx and frontend/middleware.ts
and frontend/lib/supabase.ts

From frontend/ folder:
1. Run npm run dev
2. Open http://localhost:3000 in description
3. Does it compile without TypeScript errors?
4. Show me any errors"
```

---

## DAY 17 — Idea Wizard UI (Sonnet for complex multi-modal UI)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste FOLDER_STRUCTURE.md]
[paste API_SPEC.md — STAGE 1 section only]
[paste CONVENTIONS.md]
---CONTEXT END---

[paste PROMPTS/task_14_to_18_frontend.md — ONLY task_15_frontend_idea_wizard.md]

Additional instructions:
- MediaRecorder API for voice (browser built-in, no library)
- Drag and drop using HTML5 drag events (no library)
- Show loading spinner while processing
- Error messages inline (not alerts)
- Return each file with exact path. Complete.
```

---

## DAY 18 — Blueprint View UI (Haiku fine)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste FOLDER_STRUCTURE.md]
[paste API_SPEC.md — STAGE 2 section only]
[paste CONVENTIONS.md]
---CONTEXT END---

[paste PROMPTS/task_14_to_18_frontend.md — ONLY task_16_frontend_blueprint_view.md]

Additional instructions:
- Mermaid.js: import dynamically (dynamic import, not static)
- Toggle between plain/technical/both views with state
- Return each file with exact path. Complete.
```

---

## DAY 19 — Execution View UI (Sonnet — complex WebSocket UI)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste FOLDER_STRUCTURE.md]
[paste API_SPEC.md — STAGE 4 and WEBSOCKET sections only]
[paste CONVENTIONS.md]
---CONTEXT END---

[paste PROMPTS/task_14_to_18_frontend.md — ONLY task_17_frontend_execution_view.md]

Additional instructions:
- WebSocket reconnect on disconnect (retry 3x with 2s delay)
- react-syntax-highlighter: dynamic import to avoid SSR issues
- Task approval triggers immediate UI update before server confirms
- Return each file with exact path. Complete.
```

---

## DAY 20 — Dashboard + Settings UI (Haiku fine)

**Claude.ai Message:**

```
---CONTEXT START---
[paste MASTER.md]
[paste STACK.md]
[paste FOLDER_STRUCTURE.md]
[paste API_SPEC.md — PROJECTS and AUTH/API KEYS sections only]
[paste CONVENTIONS.md]
---CONTEXT END---

[paste PROMPTS/task_14_to_18_frontend.md — ONLY task_18_frontend_dashboard.md]

Additional instructions:
- API key input: password type (masked)
- GitHub OAuth: redirect to oauth-url, handle callback in same page
- Return each file with exact path. Complete.
```

---

# PHASE 4 — INTEGRATION + TESTING

# Days 21-27 | Goal: Full flow working end-to-end

---

## DAY 21 — Connect Backend to Frontend

**Gemini Command:**

```
gemini "I have a Next.js frontend in frontend/ and FastAPI backend in backend/.

Read frontend/lib/api.ts and frontend/.env.local.

From frontend/ folder:
1. Start frontend: npm run dev
From backend/ folder (separate terminal):
2. Start backend: uvicorn app.main:app --reload

Test if frontend can reach backend:
Open http://localhost:3000/login
Open browser DevTools → Network tab
Try to load the page and check if any API calls to localhost:8000 fail.
Tell me what you see in the network requests."
```

**If CORS error:**

```
Claude.ai message:
"---CONTEXT START---
[paste MASTER.md]
[paste ANTI_PATTERNS.md]
---CONTEXT END---

CORS error in browser console:
[paste exact CORS error]

Current backend/app/main.py:
[paste content]

Current backend/app/config.py:
[paste content]

Fix CORS configuration. FRONTEND_URL is http://localhost:3000.
Return corrected main.py only."
```

---

## DAYS 22-23 — End-to-End Flow Test

**Manual Test — Do This Yourself:**

```
1. Open http://localhost:3000
2. Register a new account
3. Go to Settings → API Keys
4. Add your Anthropic test key ($5 credits)
5. Create a new project
6. Submit idea: "I want to build a todo app with teams"
7. Answer clarifying questions
8. Confirm idea
9. View generated blueprint
10. Approve blueprint
11. View generated prompts
12. Start execution (small test — just project setup task)
13. Approve first task output
14. Check if file appears in /tmp/projects/{id}/
```

**For every error you hit:**

```
Claude.ai message:
"---CONTEXT START---
[paste MASTER.md]
[paste ANTI_PATTERNS.md]
[paste relevant spec file for the broken feature]
---CONTEXT END---

Error at step: [which step above]
Error message: [exact error]
Browser console: [paste any JS errors]
Backend terminal: [paste any Python errors]

Relevant files:
[paste the 1-2 files most likely causing the issue]

Fix. Return corrected files only."
```

---

## DAYS 24-25 — GitHub Push Test

```
1. Complete at least 3 execution tasks manually
2. Go to Settings → Integrations → Connect GitHub
3. Complete OAuth flow
4. Go to project → GitHub push
5. Confirm push with test repo name
6. Check if repo appears on github.com

If push fails:
Gemini: "Read backend/app/services/github_service.py
         Test the GitHub push endpoint with this curl:
         [build curl from API_SPEC.md github push endpoint]
         Show me the error"

Claude fix message:
"---CONTEXT START---
[paste MASTER.md]
[paste API_SPEC.md — STAGE 5 only]
[paste BUSINESS_LOGIC.md — Stage 5 Rules only]
[paste ANTI_PATTERNS.md]
---CONTEXT END---

GitHub push error:
[paste error]

backend/app/services/github_service.py:
[paste content]

Fix. Return corrected file."
```

---

## DAYS 26-27 — Deploy Test

```
1. After GitHub push succeeds
2. Go to project → Deploy
3. Connect Vercel (add Vercel token in Settings)
4. Connect Railway (add Railway token in Settings)
5. Enter production env var values
6. Trigger deploy
7. Monitor build logs
8. Run health check

If deploy fails:
Gemini: "Read backend/app/services/deploy_service.py
         The Vercel/Railway deploy is failing.
         Try calling the deploy status endpoint and show me the build logs"

Claude fix message:
"---CONTEXT START---
[paste MASTER.md]
[paste API_SPEC.md — STAGE 6 only]
[paste BUSINESS_LOGIC.md — Stage 6 Rules only]
[paste ANTI_PATTERNS.md — GitHub Deploy section only]
---CONTEXT END---

Deploy error from build logs:
[paste build logs]

backend/app/services/deploy_service.py:
[paste content]

Fix. Return corrected file."
```

---

# PHASE 5 — POLISH + LAUNCH

# Days 28-30 | Goal: Ship V1

---

## DAY 28 — Error Handling Cleanup

**Claude.ai Message (Sonnet):**

```
---CONTEXT START---
[paste MASTER.md]
[paste ANTI_PATTERNS.md]
[paste CONVENTIONS.md]
---CONTEXT END---

Review these files for missing error handling:
[paste backend/app/routers/idea.py]
[paste backend/app/routers/blueprint.py]
[paste backend/app/routers/execution.py]

For each endpoint:
1. Missing try/except → add with HTTPException
2. Missing input validation → add Pydantic validators
3. Raw exceptions exposed to user → wrap in generic message
4. Missing auth check → add Depends(get_current_user)

Return corrected files only. Add error handling only, change nothing else."
```

---

## DAY 29 — Deploy To Production

```
BACKEND TO RAILWAY:
1. Push code to GitHub: git add . && git commit -m "feat: v1" && git push
2. Go to railway.app → New Project → Deploy from GitHub
3. Select your ideaforge repo
4. Set root directory: backend
5. Add all env vars from backend/.env (use production values)
   DATABASE_URL: your Supabase URI
   All other keys: your real values
6. Railway auto-detects FastAPI
7. Add start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
8. Deploy
9. Copy Railway URL (e.g. https://ideaforge-api.railway.app)

FRONTEND TO VERCEL:
1. Go to vercel.com → New Project → Import from GitHub
2. Select ideaforge repo
3. Set root directory: frontend
4. Add env vars:
   NEXT_PUBLIC_API_URL: your Railway URL
   NEXT_PUBLIC_WS_URL: wss://your-railway-url.railway.app
   NEXT_PUBLIC_SUPABASE_URL: your Supabase URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY: your Supabase anon key
5. Deploy
6. Copy Vercel URL

UPDATE BACKEND ENV:
Back in Railway → add:
FRONTEND_URL: your Vercel URL
ALLOWED_ORIGINS: your Vercel URL
```

---

## DAY 30 — Final Verification

**Gemini Command:**

```
gemini "My app is deployed:
Frontend: [your Vercel URL]
Backend: [your Railway URL]

Test the following:
1. curl [Railway URL]/health → should return {status: ok}
2. curl [Railway URL]/api/v1/auth/me → should return 401
3. curl [Vercel URL] → should return 200

Show me the results of each test."
```

**If any production issue:**

```
Claude.ai message:
"---CONTEXT START---
[paste MASTER.md]
[paste ANTI_PATTERNS.md — GitHub Deploy section]
---CONTEXT END---

Production error:
Platform: [Vercel/Railway]
Error from logs: [paste build or runtime logs]
Environment: production

The issue is in: [which service]

Fix. Specify exactly what to change and where."
```

---

# QUICK REFERENCE — ERROR DECISION TREE

```
Got an error?
    │
    ├── Is it a SYNTAX ERROR (Python/TypeScript)?
    │   → Claude.ai: paste MASTER.md + ANTI_PATTERNS.md + error + file
    │
    ├── Is it a DATABASE error?
    │   → Claude.ai: paste MASTER.md + SCHEMA.md + ANTI_PATTERNS.md + error + file
    │
    ├── Is it an AUTH / 401 error?
    │   → Claude.ai: paste MASTER.md + API_SPEC.md(AUTH) + ANTI_PATTERNS.md + error + files
    │
    ├── Is it a CORS error?
    │   → Claude.ai: paste MASTER.md + ANTI_PATTERNS.md + error + main.py
    │
    ├── Is it a PYDANTIC validation error?
    │   → Claude.ai: paste MASTER.md + ANTI_PATTERNS.md + error + schema file
    │
    ├── Is it a DEPENDENCY / import error?
    │   → Gemini: "Install [package] version [x] from DEPENDENCIES.md"
    │   → If still fails: Claude.ai: paste MASTER.md + DEPENDENCIES.md + error
    │
    ├── Is it an AI API error (Claude/OpenAI)?
    │   → Claude.ai: paste MASTER.md + ANTI_PATTERNS.md + error + ai_client.py
    │
    ├── Is it a WEBSOCKET error?
    │   → Claude.ai: paste MASTER.md + API_SPEC.md(WEBSOCKET) + error + websocket files
    │
    └── Is it a DEPLOY error (Vercel/Railway)?
        → Claude.ai: paste MASTER.md + ANTI_PATTERNS.md(GitHub Deploy) + build logs
```

---

# CLAUDE.AI MESSAGE LIMITS — SURVIVAL GUIDE

```
Limit hit? Switch in this order:

1. Claude.ai Haiku 4.5 (separate model, separate quota)
   Use for: simple files, routers, schemas, basic components

2. gemini.google.com (web interface, free)
   Use for: any generation when Claude quota exhausted
   Paste same context files + same task prompt
   Quality slightly lower but acceptable

3. Wait for reset (daily reset, usually midnight)
   Use waiting time: test what you built, fix manually, read code

4. Split large requests into smaller ones
   Instead of asking for 5 files → ask for 2 files, then 3 files
   Smaller messages = less quota used
```

---

# DAILY CHECKLIST

```
Start of day:
  □ Git pull (if collaborating)
  □ Start backend: cd backend && uvicorn app.main:app --reload
  □ Start frontend: cd frontend && npm run dev
  □ Check yesterday's work still works

End of day:
  □ git add .
  □ git commit -m "feat/fix: [what you did today]"
  □ git push
  □ Note what's done + what's broken in a notes file
  □ Plan tomorrow's Claude.ai sessions (which tasks, which files to paste)
```
