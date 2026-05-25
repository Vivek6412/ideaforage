# debug_01_database.md
# INJECT WITH: MASTER.md + STACK.md + SCHEMA.md + ANTI_PATTERNS.md
# USE WHEN: Database connection or migration errors

Provide: exact error message + contents of database.py + .env (redact values)

Check in order:
1. DATABASE_URL format: must be postgresql+asyncpg:// (not postgresql://)
2. Supabase port: use 6543 (pooled) not 5432 for Supabase hosted
3. SSL: add ?ssl=require for Supabase
4. asyncpg installed: pip show asyncpg
5. async session: never call session.execute() without await
6. Migration: alembic upgrade head run after models created?
7. Model imports: all models imported in migrations/env.py?

Fix and verify: uvicorn app.main:app → no DB errors in startup log


---

# debug_02_auth.md
# INJECT WITH: MASTER.md + STACK.md + API_SPEC.md (AUTH section) + ANTI_PATTERNS.md
# USE WHEN: 401 errors, cookie not set, JWT validation fails

Provide: exact error + auth.py router + middleware/auth.py + request headers

Check in order:
1. Cookie set? Check response headers for Set-Cookie
2. Cookie name: must be 'access_token' exactly
3. httpOnly: True, SameSite: Lax, Secure: False (dev) / True (prod)
4. JWT decode: using JWT_SECRET from settings (not hardcoded)
5. Token in cookie: middleware reads request.cookies.get('access_token')
6. Pydantic v2: @field_validator not @validator in schemas
7. Frontend: fetch with credentials: 'include' (not 'same-origin')

Fix and verify: POST /login → cookie in response → GET /me → 200


---

# debug_03_claude_api.md
# INJECT WITH: MASTER.md + STACK.md + BUSINESS_LOGIC.md (Stage 4 Rules) + ANTI_PATTERNS.md
# USE WHEN: Claude API returning errors or malformed JSON output

Provide: exact error + ai_client.py + prompt used + raw API response

Check in order:
1. API key valid? POST /api/v1/keys/verify → valid: true?
2. Rate limit (429): exponential backoff implemented? 2s/4s/8s waits?
3. JSON parse fail: response contains non-JSON text?
   Fix: add json.loads fallback with regex extraction
4. Max tokens: output truncated mid-JSON?
   Fix: increase max_tokens or split task into smaller chunks
5. Pydantic model mismatch: response schema different from expected?
   Fix: log raw response, adjust prompt schema instruction
6. Fallback chain: anthropic fail → openai → gemini all tried?

Fix and verify: test Claude call returns valid parseable JSON


---

# debug_04_subprocess.md
# INJECT WITH: MASTER.md + STACK.md + BUSINESS_LOGIC.md (Stage 4 Rules) + ANTI_PATTERNS.md
# USE WHEN: Claude Code subprocess not starting or not responding

Provide: exact error + claude_code_service.py + CLAUDE_CODE_PATH value

Check in order:
1. Claude Code installed? Run in terminal: claude --version
2. CLAUDE_CODE_PATH correct? which claude in terminal
3. Subprocess permissions: can Python execute the binary?
4. Working directory: set to /tmp/projects/{id}/ before starting
5. Stdin encoding: text=True in subprocess.Popen
6. Output buffering: stdout=subprocess.PIPE, bufsize=1 (line buffered)
7. Timeout: 300s per task — not too short for complex tasks?
8. JSON detection: watching for complete JSON object in stdout?

Fix and verify: ClaudeCodeSession.start() → inject test prompt → read output


---

# debug_05_github_deploy.md
# INJECT WITH: MASTER.md + STACK.md + API_SPEC.md (STAGE 5 + STAGE 6) + ANTI_PATTERNS.md
# USE WHEN: GitHub push fails or Vercel/Railway deploy fails

GITHUB PUSH ERRORS:
Provide: exact error + github_service.py + GitHub OAuth token scope

Check in order:
1. Token scope: must include 'repo' scope
2. Repo name: no spaces, lowercase, valid chars only
3. PyGitHub version: 2.3.0 (see DEPENDENCIES.md)
4. File encoding: content must be str not bytes for PyGitHub
5. .env excluded? Check BUSINESS_LOGIC.md Stage 5 excluded files list

VERCEL DEPLOY ERRORS:
Provide: Vercel build logs + deploy_service.py

Check in order:
1. Root directory set to 'frontend' in Vercel project config
2. Framework: 'nextjs' (not 'next')
3. All NEXT_PUBLIC_* env vars injected before deploy triggered?
4. Build command: next build (Vercel auto-detects for Next.js)
5. Node version: 18.x (set in Vercel project settings)

RAILWAY DEPLOY ERRORS:
Provide: Railway build logs + deploy_service.py

Check in order:
1. Root directory: 'backend/' set in service config
2. Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
3. Python version: 3.11 (set nixpacks.toml or railway.json)
4. All backend env vars injected?
5. DATABASE_URL uses external Supabase URL (not localhost)

Fix and verify: push succeeds → repo visible on GitHub
               deploy succeeds → health check returns all true
