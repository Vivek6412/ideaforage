# task_02_database.md
# INJECT WITH: MASTER.md + STACK.md + SCHEMA.md + CONVENTIONS.md

Implement all database models and migrations.

Files to create:
  backend/app/models/user.py           (User, UserApiKey, UserIntegration)
  backend/app/models/project.py        (Project)
  backend/app/models/stage_output.py   (StageOutput)
  backend/app/models/execution_task.py (ExecutionTask)
  backend/app/models/execution_log.py  (ExecutionLog)
  backend/app/models/github_push.py    (GithubPush)
  backend/app/models/deployment.py     (Deployment)

Rules:
  - Implement EXACTLY as defined in SCHEMA.md
  - All models inherit from Base (database.py)
  - All UUID fields: server_default=text("gen_random_uuid()")
  - All TIMESTAMPTZ: server_default=text("NOW()")
  - All CHECK constraints implemented as CheckConstraint()
  - All foreign keys with correct ondelete behavior
  - All indexes from SCHEMA.md implemented
  - Import all models in a single backend/app/models/__init__.py

Migration setup:
  backend/migrations/env.py
    - Import all models, set target_metadata = Base.metadata
    - Use async engine for migrations
  
  backend/migrations/versions/001_initial.py
    - Create all tables in correct dependency order
    - Include all indexes

Done when:
  - alembic upgrade head completes without errors
  - All 9 tables exist in database
  - All indexes created
  - alembic current shows 001_initial as head
