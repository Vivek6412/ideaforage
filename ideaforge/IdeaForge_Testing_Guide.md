# IdeaForge AI — Complete Testing Guide
# Test every feature after building it. In this exact order.
# Use Gemini CLI for all curl tests. Use browser for WebSocket tests.

---

# HOW TO USE THIS GUIDE

## Rule 1: Test after every task, not at the end
```
Build task → test immediately → fix if broken → move to next task
Never stack 5 tasks then test all at once
You won't know which one broke it
```

## Rule 2: What each test result means
```
✅ Got expected response → task is done, move on
⚠️ Got wrong response → check the specific field, minor fix
❌ Got error/crash → take error to Claude or ChatGPT, fix before moving on
```

## Rule 3: How to run tests
```
All curl tests → run in Gemini CLI or your terminal
Save your JWT token after first login test → you'll need it for everything else
Replace {TOKEN} in commands with your actual JWT value
Replace {PROJECT_ID} with actual UUID from your database
```

---

# PHASE 0 TESTS — Foundation
# Run these after Day 1-3

---

## TEST 0.1 — Both Servers Start
```bash
# Terminal 1 — Backend
cd backend
venv\Scripts\activate  # Windows
uvicorn app.main:app --reload

# Expected output:
# INFO: Started server process
# INFO: Application startup complete.
# INFO: Uvicorn running on http://127.0.0.1:8000

# Terminal 2 — Frontend
cd frontend
npm run dev

# Expected output:
# ▲ Next.js 14.x.x
# - Local: http://localhost:3000
# ✓ Ready in Xs
```

**If backend fails:** Take full error to Claude.
Paste: MASTER.md + ANTI_PATTERNS.md + STACK.md + error + backend/app/main.py

**If frontend fails:** Take error to ChatGPT.
Paste: MASTER.md + ANTI_PATTERNS.md + error + frontend/next.config.ts

---

## TEST 0.2 — Health Check
```bash
curl http://localhost:8000/health
```
**Expected:**
```json
{"status": "ok"}
```

---

## TEST 0.3 — Database Connected
```bash
curl http://localhost:8000/api/v1/auth/me
```
**Expected:**
```json
{"detail": "missing token"}
```
or
```json
{"detail": "Not authenticated"}
```
This means server reached auth check = DB is connected.
❌ If you get a 500 error = DB connection broken. Fix .env DATABASE_URL.

---

## TEST 0.4 — Alembic Migration
```bash
cd backend
alembic upgrade head
```
**Expected:**
```
INFO [alembic.runtime.migration] Running upgrade -> 001_initial, initial
```
Then go to Supabase → Table Editor → verify all 9 tables exist.

---

# PHASE 1 TESTS — Auth + BYOK
# Run these after Day 3

---

## TEST 1.1 — Register New User
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@ideaforge.com\", \"password\": \"Test1234!\", \"full_name\": \"Test User\"}"
```
**Expected:**
```json
{"user": {"id": "uuid...", "email": "test@ideaforge.com", "full_name": "Test User", "tier": "free"}, "message": "Registration successful"}
```
❌ 422 error = Pydantic validation failing. Check schemas/auth.py
❌ 500 error = DB insert failing. Check services/auth_service.py + models/user.py

---

## TEST 1.2 — Login + Get Cookie
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@ideaforge.com\", \"password\": \"Test1234!\"}" \
  -c cookies.txt \
  -v 2>&1 | grep -E "Set-Cookie|{|}"
```
**Expected in response headers:**
```
Set-Cookie: access_token=eyJ...; HttpOnly; SameSite=lax; Path=/
```
**Expected body:**
```json
{"user": {"id": "uuid...", "email": "test@ideaforge.com"}}
```
❌ No Set-Cookie header = JWT not being set. Check routers/auth.py login endpoint.
❌ 401 = Password wrong or bcrypt mismatch. Check auth_service.py login function.

---

## TEST 1.3 — Get Current User (Protected Route)
```bash
# Using the cookie file saved from login
curl http://localhost:8000/api/v1/auth/me \
  -b cookies.txt
```
**Expected:**
```json
{"id": "uuid...", "email": "test@ideaforge.com", "full_name": "Test User", "tier": "free"}
```
❌ 401 = Cookie not being read. Check middleware/auth.py
❌ 422 = Response model mismatch. Check schemas/auth.py UserResponse

---

## TEST 1.4 — Save API Key (BYOK)
```bash
curl -X POST http://localhost:8000/api/v1/keys \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"provider\": \"anthropic\", \"api_key\": \"sk-ant-your-test-key\"}"
```
**Expected:**
```json
{"message": "API key saved successfully"}
```
❌ 500 = Encryption failing. Check core/encryption.py + FERNET_KEY in .env

---

## TEST 1.5 — Verify API Key Never Returned
```bash
curl http://localhost:8000/api/v1/keys \
  -b cookies.txt
```
**Expected:**
```json
[{"provider": "anthropic", "has_key": true, "created_at": "..."}]
```
❌ CRITICAL: If actual key value appears in response = security bug.
   Fix immediately. Key must NEVER appear in any GET response.

---

## TEST 1.6 — Verify API Key Works
```bash
curl -X POST http://localhost:8000/api/v1/keys/verify \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"provider\": \"anthropic\"}"
```
**Expected:**
```json
{"valid": true}
```
❌ {"valid": false} = Key is wrong or expired. Check your test key.
❌ 500 = ai_client.py call failing. Check core/ai_client.py

---

## TEST 1.7 — Logout
```bash
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```
**Expected:**
```json
{"message": "Logged out successfully"}
```
Then test /me again — should return 401:
```bash
curl http://localhost:8000/api/v1/auth/me -b cookies.txt
```
**Expected:** 401

---

## TEST 1.8 — Wrong Password Rejected
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@ideaforge.com\", \"password\": \"wrongpassword\"}"
```
**Expected:** 401
❌ If 200 returned = serious security bug in auth_service.py

---

## TEST 1.9 — Duplicate Email Rejected
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@ideaforge.com\", \"password\": \"Test1234!\", \"full_name\": \"Another\"}"
```
**Expected:** 400 or 409 with error message
❌ If 200 = duplicate users allowed = DB constraint not enforced

---

# PHASE 2 TESTS — Projects + State Machine
# Run these after Day 3 (state machine task)

---

## TEST 2.1 — Create Project
```bash
# Login first to get fresh cookie
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@ideaforge.com\", \"password\": \"Test1234!\"}" \
  -c cookies.txt

# Create project
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"name\": \"Test Project\"}"
```
**Expected:**
```json
{"id": "some-uuid", "name": "Test Project", "current_state": "IDEA_CAPTURE", "created_at": "..."}
```
**Save the id value — you need it for all remaining tests.**
Call it PROJECT_ID.

---

## TEST 2.2 — List Projects
```bash
curl http://localhost:8000/api/v1/projects \
  -b cookies.txt
```
**Expected:**
```json
[{"id": "PROJECT_ID", "name": "Test Project", "current_state": "IDEA_CAPTURE"}]
```

---

## TEST 2.3 — Get Project Detail
```bash
curl http://localhost:8000/api/v1/projects/PROJECT_ID \
  -b cookies.txt
```
**Expected:**
```json
{"id": "PROJECT_ID", "name": "Test Project", "current_state": "IDEA_CAPTURE", "stage_outputs": [], "execution_tasks": []}
```

---

## TEST 2.4 — State Machine Rejects Invalid Transition
```bash
# Try to jump from IDEA_CAPTURE directly to DEPLOYED (invalid)
# This tests your state machine validation
# You'll need to call this via your internal state machine
# Run in Python shell from backend/:

cd backend
python -c "
from app.core.state_machine import advance_state
# This should raise an error
try:
    advance_state(None, 'DEPLOYED')
    print('FAIL - should have raised error')
except Exception as e:
    print('PASS - correctly rejected:', e)
"
```

---

## TEST 2.5 — User Isolation (Security Test)
```bash
# Register second user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"hacker@test.com\", \"password\": \"Test1234!\", \"full_name\": \"Hacker\"}" \
  -c cookies2.txt

curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"hacker@test.com\", \"password\": \"Test1234!\"}" \
  -c cookies2.txt

# Try to access first user's project with second user's cookie
curl http://localhost:8000/api/v1/projects/PROJECT_ID \
  -b cookies2.txt
```
**Expected:** 404 or 403
❌ CRITICAL: If project data returned = user isolation broken = security bug.
   Fix project_service.py to verify user_id ownership on every request.

---

# PHASE 3 TESTS — Idea Capture
# Run after Day 5

---

## TEST 3.1 — Process Text Idea
```bash
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/idea/process" \
  -b cookies.txt \
  -F "text=I want to build an app where students can find tutors near them and book sessions online"
```
**Expected:**
```json
{
  "understood": {
    "problem": "Students struggle to find and book local tutors",
    "target_users": ["Students", "Tutors"],
    "core_features": ["..."],
    "platform": "...",
    "scope": "..."
  },
  "clarifying_questions": ["Question 1?", "Question 2?", "Question 3?"],
  "warnings": [],
  "ready_to_confirm": false
}
```
❌ 500 = Claude API call failing. Check core/ai_client.py + your API key.
❌ JSON parse error = Claude returned non-JSON. Check idea_service.py parse logic.

---

## TEST 3.2 — Too Broad Warning Triggered
```bash
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/idea/process" \
  -b cookies.txt \
  -F "text=I want to build an app with user auth, payments, chat, video calls, AI recommendations, social feed, marketplace, delivery tracking, AR features, and blockchain rewards"
```
**Expected:** Response includes warning with type "too_broad"
```json
{"warnings": [{"type": "too_broad", "message": "...", "suggestion": "..."}]}
```

---

## TEST 3.3 — Clarification Round Limit
```bash
# Process idea (round 1)
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/idea/refine" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"answers\": {\"Q1\": \"web app\"}, \"corrections\": {}, \"round\": 2}"

# Round 2
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/idea/refine" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"answers\": {}, \"corrections\": {}, \"round\": 3}"

# Round 4 — should force confirm
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/idea/refine" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"answers\": {}, \"corrections\": {}, \"round\": 4}"
```
**Expected on round 4:** ready_to_confirm: true (force confirmed)

---

## TEST 3.4 — Confirm Idea + State Advance
```bash
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/idea/confirm" \
  -b cookies.txt
```
**Expected:**
```json
{"message": "Idea confirmed", "next_stage": "BLUEPRINT_DRAFT"}
```
Then check project state changed:
```bash
curl http://localhost:8000/api/v1/projects/PROJECT_ID -b cookies.txt
```
**Expected:** current_state = "IDEA_CONFIRMED"

---

## TEST 3.5 — File Upload (PDF)
```bash
# Create a test text file first
echo "I want to build a task management app for remote teams" > test_idea.txt

curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/idea/process" \
  -b cookies.txt \
  -F "file=@test_idea.txt"
```
**Expected:** Same structured response as TEST 3.1

---

# PHASE 4 TESTS — Blueprint
# Run after Day 7-8

---

## TEST 4.1 — Generate Blueprint
```bash
# Make sure project is in IDEA_CONFIRMED state first (run TEST 3.4)
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/blueprint/generate" \
  -b cookies.txt
```
**Expected:**
```json
{
  "blueprint": {
    "architecture": {"type": "Monolithic", ...},
    "tech_stack": {"frontend": {...}, "backend": {...}, ...},
    "modules": [...],
    "database_schema": {"tables": [...]},
    "api_endpoints": [...],
    "complexity_estimate": "Medium"
  },
  "mermaid_source": "graph TD\n  ...",
  "warnings": []
}
```
❌ Versions in blueprint are old/wrong = version_service.py not fetching from PyPI/npm
❌ No mermaid_source = blueprint_service.py missing mermaid generation

---

## TEST 4.2 — Versions Are Live (Not Hardcoded)
```bash
# Check that versions in blueprint match current PyPI versions
# Open a Python shell:
python -c "
import httpx, asyncio
async def check():
    async with httpx.AsyncClient() as c:
        r = await c.get('https://pypi.org/pypi/fastapi/json')
        print('Latest FastAPI:', r.json()['info']['version'])
asyncio.run(check())
"
```
Compare this version with what appears in the generated blueprint.
They should match (or be very close).
❌ If blueprint has old version = version_service not being called correctly.

---

## TEST 4.3 — Edit Blueprint Section
```bash
curl -X PATCH "http://localhost:8000/api/v1/projects/PROJECT_ID/blueprint/edit" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"section\": \"tech_stack\", \"changes\": {\"database\": \"MySQL\"}}"
```
**Expected:** Updated blueprint with MySQL in database field, everything else unchanged.
❌ Full blueprint regenerated = partial edit not working. Check blueprint_service.py edit function.

---

## TEST 4.4 — Confirm Blueprint + Files Generated
```bash
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/blueprint/confirm" \
  -b cookies.txt
```
**Expected:**
```json
{"message": "Blueprint confirmed", "files": [{"name": "MASTER.md", "url": "..."}, ...]}
```
Should return 12 files. Check Supabase Storage → project-files bucket → your project_id folder.
❌ Files not in Supabase = file_generator.py or upload_to_storage not working.

---

# PHASE 5 TESTS — Prompts
# Run after Day 8

---

## TEST 5.1 — Generate Prompts
```bash
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/prompts/generate" \
  -b cookies.txt
```
**Expected:**
```json
{
  "prompts": [
    {"id": "...", "name": "master_prompt", "type": "master", "content": "...", "depends_on": []},
    {"id": "...", "name": "project_setup", "type": "task", "content": "...", "depends_on": []},
    ...
  ]
}
```
Check: master prompt content is under 1000 tokens (count words, approx 750 words = 1000 tokens)
Check: task prompts are under 300 tokens each

---

## TEST 5.2 — Execution Order Correct
```bash
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/prompts/confirm" \
  -b cookies.txt
```
**Expected:**
```json
{"message": "Prompts confirmed", "execution_queue": [{"task_name": "project_setup", "task_order": 1}, ...]}
```
Check: project_setup comes before auth (dependency order)
Check: auth comes before state_machine
❌ Wrong order = topological sort broken in prompt_service.py

---

# PHASE 6 TESTS — Execution Engine
# Run after Days 9-10

---

## TEST 6.1 — WebSocket Connection
```
Open browser → go to: http://localhost:3000
Open DevTools → Console tab
Paste this JavaScript:

const ws = new WebSocket('ws://localhost:8000/ws/projects/PROJECT_ID/execution');
ws.onopen = () => console.log('✅ WebSocket connected');
ws.onmessage = (e) => console.log('Message:', JSON.parse(e.data));
ws.onerror = (e) => console.log('❌ Error:', e);
ws.onclose = () => console.log('Connection closed');
```
**Expected:** "✅ WebSocket connected" in console
❌ Error = websocket_manager.py or main.py WebSocket route broken

---

## TEST 6.2 — Start Execution
```bash
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/execution/start" \
  -b cookies.txt
```
**Expected:**
```json
{"message": "Execution started", "websocket_url": "ws://localhost:8000/ws/projects/PROJECT_ID/execution"}
```
Watch the WebSocket in browser console — should see:
```json
{"event": "task_started", "task_id": "...", "task_name": "project_setup"}
{"event": "task_generating", "task_id": "..."}
```

---

## TEST 6.3 — Check Execution Status
```bash
curl "http://localhost:8000/api/v1/projects/PROJECT_ID/execution/status" \
  -b cookies.txt
```
**Expected:**
```json
{"tasks": [{"id": "...", "name": "project_setup", "status": "pending_review", "retry_count": 0}]}
```

---

## TEST 6.4 — Approve Task
```bash
# Get task_id from TEST 6.3 response
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/execution/tasks/TASK_ID/approve" \
  -b cookies.txt
```
**Expected:**
```json
{"message": "Task approved", "next_task": "database"}
```
Check: file was written to /tmp/projects/PROJECT_ID/ on disk

---

## TEST 6.5 — Error Handler (Trigger Deliberately)
```bash
# Request a fix with bad feedback to test the fix loop
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/execution/tasks/TASK_ID/fix" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"feedback\": \"The imports are wrong, use absolute imports not relative\"}"
```
**Expected:**
```json
{"message": "Fix requested, retrying task"}
```
Watch WebSocket — should see:
```json
{"event": "fix_injected", "task_id": "...", "fix_type": "user_requested"}
{"event": "task_pending_review", "task_id": "...", "files": [...]}
```

---

## TEST 6.6 — Error Classification
```bash
# Test the error classifier directly
cd backend
python -c "
from app.services.error_classifier import classify_error, generate_surgical_prompt
error = 'pydantic.errors.PydanticUserError: @validator is deprecated, use @field_validator'
error_type = classify_error(error)
print('Classified as:', error_type)
print('Expected: pydantic_v1_syntax')
print('Pass:', error_type == 'pydantic_v1_syntax')
"
```

---

# PHASE 7 TESTS — GitHub Push
# Run after Day 13

---

## TEST 7.1 — GitHub OAuth URL Generated
```bash
curl "http://localhost:8000/api/v1/integrations/github/oauth-url" \
  -b cookies.txt
```
**Expected:**
```json
{"url": "https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID&scope=repo"}
```
❌ Wrong URL format = github_service.py get_oauth_url() broken

---

## TEST 7.2 — Preview Files Before Push
```bash
curl "http://localhost:8000/api/v1/projects/PROJECT_ID/github/preview" \
  -b cookies.txt
```
**Expected:**
```json
{
  "files": ["backend/app/main.py", "backend/app/config.py", ...],
  "auto_generated": ["README.md", ".gitignore", ".env.example", "LICENSE"]
}
```
Check: .env is NOT in the files list (must be excluded)
❌ CRITICAL: If .env appears = security bug. Fix exclusion list in github_service.py

---

## TEST 7.3 — Push To GitHub (After OAuth Connected)
```bash
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/github/push" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"repo_name\": \"ideaforge-test-project\", \"is_private\": true, \"branch\": \"main\"}"
```
**Expected:**
```json
{"repo_url": "https://github.com/YOUR_USERNAME/ideaforge-test-project", "commit_sha": "abc123"}
```
Then open GitHub — verify:
- Repo exists and is private
- .env file is NOT in repo
- README.md is there
- Single commit: "Initial commit — generated by IdeaForge AI"

---

# PHASE 8 TESTS — Deploy
# Run after Day 14

---

## TEST 8.1 — Frontend Deploy to Vercel
```bash
curl -X POST "http://localhost:8000/api/v1/projects/PROJECT_ID/deploy/frontend" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"platform\": \"vercel\", \"env_vars\": {\"NEXT_PUBLIC_API_URL\": \"https://your-railway-url.railway.app\"}}"
```
**Expected:**
```json
{"deploy_id": "...", "status": "building"}
```

---

## TEST 8.2 — Check Deploy Status
```bash
curl "http://localhost:8000/api/v1/projects/PROJECT_ID/deploy/status" \
  -b cookies.txt
```
**Expected (after deploy completes):**
```json
{
  "frontend": {"url": "https://your-app.vercel.app", "status": "success"},
  "backend": {"url": "https://your-app.railway.app", "status": "success"}
}
```

---

## TEST 8.3 — Health Check All Services
```bash
curl "http://localhost:8000/api/v1/projects/PROJECT_ID/deploy/health" \
  -b cookies.txt
```
**Expected:**
```json
{"frontend": true, "backend": true, "db": true, "auth": true}
```
❌ Any false = that service is down or misconfigured

---

# SECURITY TESTS — Run Before Going Live
# These test for critical security issues

---

## SECURITY TEST 1 — API Key Never Exposed
```bash
# Add a key
curl -X POST http://localhost:8000/api/v1/keys \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"provider\": \"anthropic\", \"api_key\": \"sk-ant-test-key-12345\"}"

# Try to get it back
curl http://localhost:8000/api/v1/keys -b cookies.txt
```
**Check:** "sk-ant-test-key-12345" must NOT appear anywhere in response.
❌ If it does = critical security bug

---

## SECURITY TEST 2 — JWT Only In Cookie
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@ideaforge.com\", \"password\": \"Test1234!\"}" \
  -v 2>&1
```
**Check response body:** Must NOT contain any JWT token string.
**Check Set-Cookie header:** Must have HttpOnly flag.
❌ Token in body = security bug. Fix routers/auth.py

---

## SECURITY TEST 3 — Auth Required On All Protected Routes
```bash
# Test without any cookie
curl http://localhost:8000/api/v1/projects
curl http://localhost:8000/api/v1/keys
curl "http://localhost:8000/api/v1/projects/fake-id/idea/process" -X POST
```
**Expected:** All return 401
❌ If any return 200 = missing auth middleware on that route

---

## SECURITY TEST 4 — SQL Injection Attempt
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test'; DROP TABLE users; --\", \"password\": \"Test1234!\", \"full_name\": \"Test\"}"
```
**Expected:** 422 validation error (email format invalid)
❌ If 200 = SQL injection possible (SQLAlchemy ORM should prevent this, but verify)

---

# FULL END-TO-END TEST — THE REAL TEST
# Run this when everything is built

---

## Complete Flow Test (Takes ~15 minutes)
```
Step 1:  Register new user
Step 2:  Login
Step 3:  Add Anthropic API key
Step 4:  Verify API key
Step 5:  Create project "Tutor Booking App"
Step 6:  Submit idea: "Students find and book local tutors online"
Step 7:  Answer clarifying questions
Step 8:  Confirm idea → verify state = IDEA_CONFIRMED
Step 9:  Generate blueprint → verify versions are current
Step 10: Approve blueprint → verify 12 files in Supabase Storage
Step 11: Generate prompts → verify master prompt + task prompts
Step 12: Confirm prompts → verify execution queue in dependency order
Step 13: Start execution → watch WebSocket events in browser
Step 14: Approve first task → verify file written to /tmp/projects/
Step 15: Request fix on second task → verify fix loop works
Step 16: Approve all tasks
Step 17: Preview GitHub push → verify .env excluded
Step 18: Push to GitHub → verify repo created
Step 19: Deploy → verify URLs returned
Step 20: Health check → verify all 4 services return true
```

**Every step should work without errors.**
**If any step fails → fix before moving to next step.**

---

# WHEN A TEST FAILS — EXACT STEPS

## Step 1: Identify which layer is broken
```
Frontend error (React, TypeScript) → ChatGPT
Backend error (FastAPI, Python) → Claude Sonnet
Database error (SQL, Alembic) → Claude Haiku + paste SCHEMA.md
API key / external service → Claude Sonnet + paste ANTI_PATTERNS.md
```

## Step 2: Gather evidence before going to AI
```
Always collect:
1. Exact error message (full stack trace)
2. Which endpoint / file
3. Current content of the broken file
4. What you expected vs what you got
```

## Step 3: Claude/ChatGPT fix message template
```
---CONTEXT START---
[paste MASTER.md]
[paste ANTI_PATTERNS.md]
[paste most relevant spec file for this error]
---CONTEXT END---

Test that failed: [which test above]
Expected: [paste expected response]
Got: [paste actual response/error]

File with issue:
Path: [exact path]
Content:
[paste full file content]

Fix. Return corrected file with path as heading.
```

## Step 4: Apply fix → rerun exact same test
```
Never assume fix worked without rerunning the test.
Rerun until test passes before moving on.
```
