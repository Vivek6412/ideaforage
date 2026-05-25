# task_06_blueprint_engine.md
# INJECT WITH: MASTER.md + STACK.md + SCHEMA.md (stage_outputs) + API_SPEC.md (STAGE 2) + BUSINESS_LOGIC.md (Stage 2 Rules) + CONVENTIONS.md

Implement blueprint generation with version verification + context file generation.

Files to create:
  backend/app/services/version_service.py
    - fetch_pypi_version(package: str) → str  (GET pypi.org/pypi/{pkg}/json)
    - fetch_npm_version(package: str) → str   (GET registry.npmjs.org/{pkg}/latest)
    - get_verified_versions(stack: dict) → dict
        Fetches all packages relevant to chosen stack
        Returns {package: latest_stable_version}
    - check_compatibility(stack, versions) → list[str]
        Known pairs: pydantic@2 requires fastapi>=0.100,
        next@14 requires react@18+, etc.
    - get_deprecation_flags(stack, versions) → list[dict]
        Returns framework-version-specific deprecation rules

  backend/app/services/blueprint_service.py
    - generate_blueprint(db, project_id, user_keys) → dict
        1. Get structured idea from stage_outputs
        2. Call version_service.get_verified_versions()
        3. Call version_service.get_deprecation_flags()
        4. Single Claude call with BLUEPRINT_PROMPT
        5. Generate Mermaid diagram source from blueprint JSON
        6. Return { blueprint, mermaid_source, warnings }
    - edit_blueprint_section(db, project_id, section, changes, user_keys) → dict
        Regenerate only specified section with single Claude call
        Merge back into full blueprint
    - confirm_blueprint(db, project_id) → list[dict]
        1. Save to stage_outputs
        2. Call file_generator.generate_all_files()
        3. Upload to Supabase Storage
        4. Advance state to BLUEPRINT_CONFIRMED
        5. Return list of generated file URLs

  backend/app/routers/blueprint.py
    - All routes from API_SPEC.md STAGE 2 section

  BLUEPRINT_PROMPT (in blueprint_service.py):
    """
    Role: software architect
    Input: structured_idea={idea_json}, verified_versions={versions},
           deprecations={dep_flags}
    Task: generate complete technical blueprint
    Rules:
    - monolithic default for MVPs
    - use ONLY versions from verified_versions (never assume)
    - inject deprecation flags into anti_patterns field
    - real DB schema (not placeholder) with exact types + constraints
    - real API endpoints (versioned /api/v1/)
    - reasoning per tech choice: max 10 words
    - complexity: Low|Medium|High (honest assessment)
    - return ONLY valid JSON:
    {
      "architecture": {"type":"","reasoning":"","diagram_description":""},
      "tech_stack": {"frontend":{"tech":"","reasoning":""},...},
      "modules": [{"name":"","description":"","sub_components":[],"depends_on":[]}],
      "database_schema": {"tables":[{"name":"","fields":[],"relationships":[]}]},
      "api_endpoints": [{"method":"","route":"","description":""}],
      "folder_structure": "",
      "third_party_integrations": [],
      "anti_patterns": [],
      "complexity_estimate": "",
      "estimated_modules_count": 0
    }
    """

Done when:
  - POST /generate returns full blueprint with verified versions
  - Mermaid source generated from blueprint
  - PATCH /edit regenerates only specified section
  - POST /confirm generates all 12 context files + uploads to Supabase Storage
  - State advances to BLUEPRINT_CONFIRMED


---

# task_07_version_verification.md
# INJECT WITH: MASTER.md + STACK.md + CONVENTIONS.md
# NOTE: This is implemented inside version_service.py (task_06). 
# Separate task only if version_service needs expansion.
# Skip if task_06 completed version_service.py fully.

Verify version_service.py from task_06 handles all stack packages:
  Backend: fastapi, pydantic, sqlalchemy, alembic, uvicorn, httpx,
           PyGitHub, PyMuPDF, python-docx, cryptography, anthropic, openai
  Frontend: next, react, typescript, tailwindcss, @supabase/supabase-js

Add: DEPRECATION_FLAGS dict covering:
  next@14: getServerSideProps, pages/ directory
  sqlalchemy@2: Query() API, sync sessions
  pydantic@2: @validator, .dict(), .json()
  fastapi: sync def for DB operations

Done when: version_service tests pass with live registry calls


---

# task_08_prompt_engine.md
# INJECT WITH: MASTER.md + STACK.md + SCHEMA.md (stage_outputs) + API_SPEC.md (STAGE 3) + BUSINESS_LOGIC.md (Stage 3 Rules) + CONVENTIONS.md

Implement prompt generation from approved blueprint.

Files to create:
  backend/app/services/prompt_service.py
    - generate_prompt_set(db, project_id, user_keys) → dict
        1. Get blueprint from stage_outputs
        2. Get context files list from Supabase Storage
        3. Single Claude call with PROMPT_GEN_PROMPT
        4. Returns { master_prompt, task_prompts[], integration_prompts[], debug_prompts[] }
    - regenerate_prompt(db, project_id, prompt_id, feedback, user_keys) → dict
        Regenerate single prompt with optional feedback
    - confirm_prompts(db, project_id) → dict
        Save to stage_outputs
        Build execution queue from depends_on chain
        Save execution_tasks in order
        Advance state to PROMPTS_CONFIRMED
        Return { execution_queue: [tasks in dependency order] }
    - resolve_execution_order(prompts: list) → list
        Topological sort on depends_on fields

  backend/app/routers/prompts.py
    - All routes from API_SPEC.md STAGE 3 section

  PROMPT_GEN_PROMPT:
    """
    Role: prompt engineer
    Input: blueprint={blueprint_json}, modules={module_list}
    Task: generate complete prompt set for building this product
    Rules:
    - master prompt: max 1000 tokens, full project context
    - task prompts: max 300 tokens each, one per module
    - each task: exact files list + done condition (testable)
    - integration prompts: one per third-party service
    - debug prompts: max 150 tokens, cover top 5 error types
    - no filler, imperative mood only
    - depends_on: module names this task requires first
    - return ONLY valid JSON:
    {
      "master_prompt": "",
      "task_prompts": [{"id":"","name":"","content":"","depends_on":[]}],
      "integration_prompts": [{"id":"","name":"","content":"","depends_on":[]}],
      "debug_prompts": [{"id":"","name":"","content":""}]
    }
    """

Done when:
  - POST /generate returns full prompt set (master + tasks + integrations + debug)
  - Execution order correctly resolved via topological sort
  - POST /confirm saves tasks to execution_tasks table in dependency order
  - State advances to PROMPTS_CONFIRMED


---

# task_09_execution_engine.md
# INJECT WITH: MASTER.md + STACK.md + SCHEMA.md (execution_tasks+execution_logs) + API_SPEC.md (STAGE 4 + WEBSOCKET) + BUSINESS_LOGIC.md (Stage 4 Rules + Error Classification) + CONVENTIONS.md

Implement core execution orchestration engine.

Files to create:
  backend/app/core/websocket_manager.py
    - ConnectionManager class
    - connect(websocket, project_id)
    - disconnect(websocket, project_id)
    - broadcast(project_id, event_dict) → sends JSON to all connected clients

  backend/app/services/error_classifier.py
    - ERROR_PATTERNS dict (from BUSINESS_LOGIC.md Error Classification)
    - classify_error(error_text: str) → str (error type key)
    - generate_surgical_prompt(error, file_content, error_type, context) → str
        Builds targeted fix prompt, references ANTI_PATTERNS rules
        Max 200 tokens output
    - verify_no_drift(fixed_files, approved_stack, folder_structure) → list[str]
        Returns list of drift violations (unapproved imports, wrong paths)

  backend/app/services/execution_service.py
    - start_execution(db, project_id, user_keys) → None (async, runs in background)
        Launches claude_code_service or direct API execution
        Broadcasts WebSocket events throughout
    - execute_task_via_api(task, user_keys, context_files) → dict
        Direct Claude API call for tasks (non-subprocess mode)
        Returns { files: [{path, content}] }
    - validate_task_output(files, task) → ValidationResult
        All expected files present?
        Correct paths (matches folder structure)?
        No TODO/placeholder content?
        Syntax valid? (Python: ast.parse, TS: basic check)
    - handle_error(db, task, error, user_keys) → None
        Attempt 1: Claude self-fix (1 try only)
        Attempt 2-3: agent classify → surgical prompt → execute
        Attempt 4: set task status=failed, project=PAUSED
    - approve_task(db, task_id, project_id) → None
        Write files to /tmp/projects/{project_id}/
        Set task status=approved
        Check + start next eligible task
    - fix_task(db, task_id, feedback, user_keys) → None
        Inject feedback + previous output → retry (no retry limit)
    - log_event(db, project_id, task_id, event, detail) → None

  backend/app/routers/execution.py
    - All routes from API_SPEC.md STAGE 4 section
    - WebSocket handler using websocket_manager

Done when:
  - POST /start launches execution, returns websocket URL
  - WebSocket broadcasts task_started, task_pending_review events
  - POST /tasks/{id}/approve writes files to disk, starts next task
  - POST /tasks/{id}/fix retries with user feedback
  - Error handler: 1 Claude self-fix, then 2 agent surgical prompts, then PAUSED
  - All events logged to execution_logs
