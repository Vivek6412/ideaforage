# task_04_state_machine.md
# INJECT WITH: MASTER.md + STACK.md + SCHEMA.md (projects+stage_outputs) + BUSINESS_LOGIC.md (State Transitions) + CONVENTIONS.md

Implement project CRUD + state machine.

Files to create:
  backend/app/core/state_machine.py
    - VALID_STATES: list of all states from BUSINESS_LOGIC.md
    - VALID_TRANSITIONS: dict of state → allowed next states
    - advance_state(project, new_state) → Project (validates transition first)
    - raises HTTPException(400) on invalid transition

  backend/app/schemas/project.py
    - ProjectCreate: name
    - ProjectResponse: id, name, current_state, paused_reason, created_at, updated_at
    - ProjectDetail: ProjectResponse + stage_outputs list + execution_tasks summary

  backend/app/services/project_service.py
    - create_project(db, user_id, name) → Project
    - get_projects(db, user_id) → list[Project]
    - get_project(db, project_id, user_id) → Project (verify ownership)
    - delete_project(db, project_id, user_id) → None
    - advance_project_state(db, project_id, new_state) → Project
    - pause_project(db, project_id, reason) → Project
    - resume_project(db, project_id) → Project

  backend/app/routers/projects.py
    - All routes from API_SPEC.md PROJECTS section
    - All routes require Depends(get_current_user)
    - Verify project ownership on every request

Done when:
  - GET /api/v1/projects returns empty list for new user
  - POST /api/v1/projects creates project in IDEA_CAPTURE state
  - State machine rejects invalid transitions with 400
  - DELETE /api/v1/projects/{id} removes project and all related data
