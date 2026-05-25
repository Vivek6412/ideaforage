# CONVENTIONS.md — IdeaForge AI
# FOLLOW EXACTLY. NO EXCEPTIONS.

## Python (Backend)
files:        snake_case         (idea_service.py)
classes:      PascalCase         (IdeaService)
functions:    snake_case         (process_idea_input)
variables:    snake_case         (user_api_key)
constants:    UPPER_SNAKE        (MAX_RETRY_COUNT = 3)
async:        all DB + API calls must be async def
type hints:   required on all function signatures
docstrings:   one-line for simple functions, skip for obvious

## TypeScript (Frontend)
files:        PascalCase.tsx     (IdeaInputBox.tsx) for components
files:        camelCase.ts       (useProject.ts) for hooks/lib
components:   PascalCase         (IdeaInputBox)
functions:    camelCase          (processIdeaInput)
variables:    camelCase          (userApiKey)
types/interfaces: PascalCase     (StructuredIdea, BlueprintData)
constants:    UPPER_SNAKE        (MAX_ROUNDS = 3)

## Database
tables:       snake_case plural  (execution_tasks)
columns:      snake_case         (created_at, user_id)
indexes:      idx_table_column   (idx_projects_user_id)
constraints:  chk_table_column   (chk_users_tier)

## API Routes
all routes:   kebab-case         (/api/v1/stage-outputs)
route params: snake_case         (/{project_id}/idea)

## FastAPI Patterns
- One router per domain (routers/)
- Business logic in services/ (never in routers)
- DB models in models/ (SQLAlchemy)
- Request/response in schemas/ (Pydantic)
- Shared utilities in core/
- Dependency injection for auth: Depends(get_current_user)
- Dependency injection for DB: Depends(get_db)

## Error Response Format (consistent across all endpoints)
```json
{
  "detail": "Human readable error message",
  "code": "MACHINE_READABLE_CODE",
  "field": "field_name (if validation error)"
}
```

## Git
commits:      "type: description"
              feat: add idea capture multi-modal input
              fix: resolve pydantic v2 validator syntax
              refactor: extract error classifier to separate service
branch:       main only (V1, solo dev)
