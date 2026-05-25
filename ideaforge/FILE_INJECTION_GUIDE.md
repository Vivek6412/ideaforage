# FILE_INJECTION_GUIDE.md — IdeaForge AI
# WHICH FILES TO INJECT WITH EACH PROMPT.
# Inject MASTER.md always first. Then listed files only.

---

## ALWAYS INJECT (every prompt)
- MASTER.md
- ANTI_PATTERNS.md

---

## TASK PROMPTS — FILE INJECTION MAP

### task_01_project_setup
Inject: STACK.md, FOLDER_STRUCTURE.md, ENV.md, DEPENDENCIES.md

### task_02_database
Inject: STACK.md, SCHEMA.md, CONVENTIONS.md

### task_03_auth_byok
Inject: STACK.md, SCHEMA.md (users + user_api_keys + user_integrations),
        API_SPEC.md (AUTH + API KEYS sections), CONVENTIONS.md

### task_04_state_machine
Inject: STACK.md, SCHEMA.md (projects + stage_outputs),
        BUSINESS_LOGIC.md (State Transitions section), CONVENTIONS.md

### task_05_idea_capture_engine
Inject: STACK.md, SCHEMA.md (projects + stage_outputs),
        API_SPEC.md (STAGE 1 section),
        BUSINESS_LOGIC.md (Stage 1 Rules section), CONVENTIONS.md

### task_06_blueprint_engine
Inject: STACK.md, SCHEMA.md (projects + stage_outputs),
        API_SPEC.md (STAGE 2 section),
        BUSINESS_LOGIC.md (Stage 2 Rules section), CONVENTIONS.md

### task_07_version_verification
Inject: STACK.md, CONVENTIONS.md

### task_08_prompt_engine
Inject: STACK.md, SCHEMA.md (stage_outputs),
        API_SPEC.md (STAGE 3 section),
        BUSINESS_LOGIC.md (Stage 3 Rules section), CONVENTIONS.md

### task_09_execution_engine
Inject: STACK.md, SCHEMA.md (execution_tasks + execution_logs),
        API_SPEC.md (STAGE 4 + WEBSOCKET sections),
        BUSINESS_LOGIC.md (Stage 4 Rules + Error Classification),
        CONVENTIONS.md

### task_10_claude_code_service
Inject: STACK.md, BUSINESS_LOGIC.md (Stage 4 Rules), CONVENTIONS.md

### task_11_file_generator
Inject: STACK.md, SCHEMA.md (stage_outputs), CONVENTIONS.md

### task_12_github_integration
Inject: STACK.md, SCHEMA.md (github_pushes + user_integrations),
        API_SPEC.md (STAGE 5 + INTEGRATIONS sections),
        BUSINESS_LOGIC.md (Stage 5 Rules), CONVENTIONS.md

### task_13_deploy_integration
Inject: STACK.md, SCHEMA.md (deployments + user_integrations),
        API_SPEC.md (STAGE 6 section),
        BUSINESS_LOGIC.md (Stage 6 Rules), CONVENTIONS.md

### task_14_frontend_layout
Inject: STACK.md, FOLDER_STRUCTURE.md, CONVENTIONS.md

### task_15_frontend_idea_wizard
Inject: STACK.md, FOLDER_STRUCTURE.md,
        API_SPEC.md (STAGE 1 section), CONVENTIONS.md

### task_16_frontend_blueprint_view
Inject: STACK.md, FOLDER_STRUCTURE.md,
        API_SPEC.md (STAGE 2 section), CONVENTIONS.md

### task_17_frontend_execution_view
Inject: STACK.md, FOLDER_STRUCTURE.md,
        API_SPEC.md (STAGE 4 + WEBSOCKET sections), CONVENTIONS.md

### task_18_frontend_dashboard
Inject: STACK.md, FOLDER_STRUCTURE.md,
        API_SPEC.md (PROJECTS section), CONVENTIONS.md

---

## DEBUG PROMPTS — FILE INJECTION MAP

### debug_01_database
Inject: STACK.md, SCHEMA.md, ANTI_PATTERNS.md

### debug_02_auth
Inject: STACK.md, API_SPEC.md (AUTH section), ANTI_PATTERNS.md

### debug_03_claude_api
Inject: STACK.md, BUSINESS_LOGIC.md (Stage 4 Rules), ANTI_PATTERNS.md

### debug_04_subprocess
Inject: STACK.md, BUSINESS_LOGIC.md (Stage 4 Rules), ANTI_PATTERNS.md

### debug_05_github_deploy
Inject: STACK.md, API_SPEC.md (STAGE 5 + STAGE 6), ANTI_PATTERNS.md

---

## EXECUTION ORDER (dependency-resolved)
```
01_project_setup
02_database
03_auth_byok          (depends: 02)
04_state_machine       (depends: 02, 03)
05_idea_capture_engine (depends: 04)
06_blueprint_engine    (depends: 04)
07_version_verification(depends: 06)
08_prompt_engine       (depends: 06)
09_execution_engine    (depends: 04, 08)
10_claude_code_service (depends: 09)
11_file_generator      (depends: 06)
12_github_integration  (depends: 03)
13_deploy_integration  (depends: 12)
14_frontend_layout     (depends: 03)
15_frontend_idea_wizard(depends: 14, 05)
16_frontend_blueprint  (depends: 14, 06)
17_frontend_execution  (depends: 14, 09)
18_frontend_dashboard  (depends: 14, 04)
```
