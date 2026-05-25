# API_SPEC.md — IdeaForge AI
# IMPLEMENT ALL ENDPOINTS. EXACT ROUTES. EXACT METHODS.

Base URL: /api/v1
Auth: JWT via httpOnly cookie (except /auth/* routes)

---

## AUTH
POST   /api/v1/auth/register
  body: { email, password, full_name }
  returns: { user, message }

POST   /api/v1/auth/login
  body: { email, password }
  returns: { user } + sets httpOnly JWT cookie

POST   /api/v1/auth/logout
  returns: { message } + clears cookie

GET    /api/v1/auth/me
  returns: { user }

---

## API KEYS (BYOK)
GET    /api/v1/keys
  returns: [{ provider, has_key, created_at }]
  note: never return the actual key value

POST   /api/v1/keys
  body: { provider, api_key }
  returns: { message }
  action: encrypt + upsert to user_api_keys

DELETE /api/v1/keys/{provider}
  returns: { message }

POST   /api/v1/keys/verify
  body: { provider }
  action: make minimal test call with stored key
  returns: { valid: bool, error?: string }

---

## INTEGRATIONS (GitHub/Vercel/Railway)
GET    /api/v1/integrations
  returns: [{ provider, connected, username }]

GET    /api/v1/integrations/github/oauth-url
  returns: { url }

POST   /api/v1/integrations/github/callback
  body: { code }
  action: exchange code for token, encrypt + store
  returns: { username, message }

DELETE /api/v1/integrations/{provider}
  returns: { message }

---

## PROJECTS
GET    /api/v1/projects
  returns: [{ id, name, current_state, created_at, updated_at }]

POST   /api/v1/projects
  body: { name }
  returns: { project }

GET    /api/v1/projects/{id}
  returns: { project, stage_outputs, execution_tasks }

DELETE /api/v1/projects/{id}
  returns: { message }

---

## STAGE 1 — IDEA CAPTURE
POST   /api/v1/projects/{id}/idea/process
  body: multipart/form-data {
    text?: string,
    voice?: File (audio),
    file?: File (md/txt/pdf/docx),
    image?: File (png/jpg)
  }
  action: preprocess all inputs → merge → Claude API call
  returns: { structured_idea, clarifying_questions, warnings }

POST   /api/v1/projects/{id}/idea/refine
  body: { answers: {}, corrections: {}, round: int }
  returns: { structured_idea, clarifying_questions, ready_to_confirm }

POST   /api/v1/projects/{id}/idea/confirm
  returns: { message, next_stage: 'BLUEPRINT_DRAFT' }
  action: saves to stage_outputs, advances state

---

## STAGE 2 — BLUEPRINT
POST   /api/v1/projects/{id}/blueprint/generate
  action: fetch versions from PyPI/npm → Claude API call
  returns: { blueprint, mermaid_source, warnings }

PATCH  /api/v1/projects/{id}/blueprint/edit
  body: { section: string, changes: {} }
  action: regenerate only specified section
  returns: { updated_blueprint }

POST   /api/v1/projects/{id}/blueprint/confirm
  action: generate 12 context files → upload to Supabase Storage
  returns: { message, files: [{ name, url }] }

GET    /api/v1/projects/{id}/blueprint/files
  returns: [{ filename, download_url }]

---

## STAGE 3 — PROMPTS
POST   /api/v1/projects/{id}/prompts/generate
  action: single Claude call → full prompt set
  returns: { prompts: [{ id, name, type, content, depends_on }] }

PATCH  /api/v1/projects/{id}/prompts/{prompt_id}/regenerate
  body: { feedback?: string }
  returns: { prompt }

POST   /api/v1/projects/{id}/prompts/confirm
  returns: { message, execution_queue: [tasks in order] }

---

## STAGE 4 — EXECUTION
POST   /api/v1/projects/{id}/execution/start
  action: launch Claude Code subprocess, begin task queue
  returns: { message, websocket_url }

GET    /api/v1/projects/{id}/execution/status
  returns: { tasks: [{ id, name, status, retry_count }] }

GET    /api/v1/projects/{id}/execution/tasks/{task_id}
  returns: { task, generated_files, validation_result, error_log }

POST   /api/v1/projects/{id}/execution/tasks/{task_id}/approve
  action: write files to disk, advance queue
  returns: { message, next_task?: string }

POST   /api/v1/projects/{id}/execution/tasks/{task_id}/fix
  body: { feedback: string }
  action: inject feedback + previous output → retry
  returns: { message }

POST   /api/v1/projects/{id}/execution/pause
  returns: { message }

POST   /api/v1/projects/{id}/execution/resume
  returns: { message }

---

## STAGE 5 — GITHUB
GET    /api/v1/projects/{id}/github/preview
  returns: { files: [path], auto_generated: [README, .gitignore] }

POST   /api/v1/projects/{id}/github/push
  body: { repo_name, is_private, branch }
  returns: { repo_url, commit_sha }

---

## STAGE 6 — DEPLOY
POST   /api/v1/projects/{id}/deploy/frontend
  body: { platform: 'vercel', env_vars: {} }
  action: Vercel API → create project → inject vars → trigger deploy
  returns: { deploy_id, status }

POST   /api/v1/projects/{id}/deploy/backend
  body: { platform: 'railway', env_vars: {} }
  action: Railway API → create project → inject vars → trigger deploy
  returns: { deploy_id, status }

GET    /api/v1/projects/{id}/deploy/status
  returns: { frontend: { url, status }, backend: { url, status } }

GET    /api/v1/projects/{id}/deploy/health
  action: ping frontend + backend + DB
  returns: { frontend: bool, backend: bool, db: bool, auth: bool }

---

## WEBSOCKET
WS     /ws/projects/{id}/execution
  events server→client:
    { event: 'task_started', task_id, task_name }
    { event: 'task_generating', task_id }
    { event: 'task_pending_review', task_id, files: [] }
    { event: 'task_retrying', task_id, attempt: int, reason }
    { event: 'fix_injected', task_id, fix_type }
    { event: 'task_approved', task_id }
    { event: 'task_failed', task_id, error }
    { event: 'task_paused', task_id, reason }
    { event: 'execution_complete' }
    { event: 'build_log', platform, message }
