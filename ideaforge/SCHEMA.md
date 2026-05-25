# SCHEMA.md — IdeaForge AI

# IMPLEMENT EXACTLY. ALL CONSTRAINTS REQUIRED.

## users

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
email           VARCHAR(255) UNIQUE NOT NULL
password_hash   TEXT NOT NULL
full_name       VARCHAR(255)
tier            VARCHAR(20) DEFAULT 'free'
                CHECK (tier IN ('free','pro','team'))
is_verified     BOOLEAN DEFAULT FALSE
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

## user_api_keys

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID REFERENCES users(id) ON DELETE CASCADE
provider        VARCHAR(30) NOT NULL
                CHECK (provider IN ('anthropic','openai','gemini'))
encrypted_key   TEXT NOT NULL
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
UNIQUE (user_id, provider)
```

## user_integrations

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID REFERENCES users(id) ON DELETE CASCADE
provider        VARCHAR(30) NOT NULL
                CHECK (provider IN ('github','vercel','railway'))
access_token    TEXT NOT NULL              ← AES encrypted
username        VARCHAR(255)
created_at      TIMESTAMPTZ DEFAULT NOW()
UNIQUE (user_id, provider)
```

## projects

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID REFERENCES users(id) ON DELETE CASCADE
name            VARCHAR(255) NOT NULL
raw_idea        TEXT
current_state   VARCHAR(50) NOT NULL DEFAULT 'IDEA_CAPTURE'
                CHECK (current_state IN (
                  'IDEA_CAPTURE','IDEA_CONFIRMED',
                  'BLUEPRINT_DRAFT','BLUEPRINT_CONFIRMED',
                  'PROMPTS_GENERATED','PROMPTS_CONFIRMED',
                  'EXECUTION_RUNNING','EXECUTION_COMPLETE',
                  'GITHUB_PUSHED','DEPLOYED','PAUSED'
                ))
paused_reason   TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

## stage_outputs

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id      UUID REFERENCES projects(id) ON DELETE CASCADE
stage           VARCHAR(50) NOT NULL
                CHECK (stage IN (
                  'idea_capture','blueprint',
                  'prompts','execution','github','deploy'
                ))
output_json     JSONB NOT NULL
status          VARCHAR(30) DEFAULT 'pending_review'
                CHECK (status IN (
                  'pending_review','approved','revision_requested'
                ))
user_feedback   TEXT
round_number    INT DEFAULT 1
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
UNIQUE (project_id, stage, round_number)
```

## execution_tasks

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id      UUID REFERENCES projects(id) ON DELETE CASCADE
task_name       VARCHAR(100) NOT NULL
task_order      INT NOT NULL
depends_on      UUID[]                     ← array of task IDs
prompt_used     TEXT
generated_files JSONB                      ← [{path, content}]
status          VARCHAR(30) DEFAULT 'pending'
                CHECK (status IN (
                  'pending','running','pending_review',
                  'approved','failed','skipped'
                ))
retry_count     INT DEFAULT 0
error_log       TEXT
tool_used       VARCHAR(30)
                CHECK (tool_used IN (
                  'anthropic','openai','gemini','claude_code'
                ))
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

## execution_logs

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id      UUID REFERENCES projects(id) ON DELETE CASCADE
task_id         UUID REFERENCES execution_tasks(id)
event           VARCHAR(50) NOT NULL
                CHECK (event IN (
                  'task_started','api_call','parse_error',
                  'validation_error','retry','fallback',
                  'claude_code_output','fix_injected',
                  'drift_detected','user_fix_requested',
                  'task_approved','task_failed','task_paused'
                ))
detail          JSONB
created_at      TIMESTAMPTZ DEFAULT NOW()
```

## github_pushes

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id      UUID REFERENCES projects(id) ON DELETE CASCADE
repo_url        TEXT
repo_name       VARCHAR(255)
branch          VARCHAR(100) DEFAULT 'main'
is_private      BOOLEAN DEFAULT TRUE
commit_sha      TEXT
status          VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending','success','failed'))
error_log       TEXT
pushed_at       TIMESTAMPTZ DEFAULT NOW()
```

## deployments

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id      UUID REFERENCES projects(id) ON DELETE CASCADE
platform        VARCHAR(20) NOT NULL
                CHECK (platform IN ('vercel','railway'))
service_type    VARCHAR(20) NOT NULL
                CHECK (service_type IN ('frontend','backend'))
deploy_url      TEXT
platform_project_id TEXT
build_status    VARCHAR(20) DEFAULT 'pending'
                CHECK (build_status IN (
                  'pending','building','success','failed'
                ))
error_log       TEXT
deployed_at     TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

## INDEXES (create all)

```sql
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_state ON projects(current_state);
CREATE INDEX idx_stage_outputs_project ON stage_outputs(project_id);
CREATE INDEX idx_execution_tasks_project ON execution_tasks(project_id);
CREATE INDEX idx_execution_tasks_status ON execution_tasks(status);
CREATE INDEX idx_execution_logs_project ON execution_logs(project_id);
CREATE INDEX idx_execution_logs_task ON execution_logs(task_id);
CREATE INDEX idx_deployments_project ON deployments(project_id);
```

CORRECTED QUERY BELOW

CREATE TABLE users (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
email VARCHAR(255) UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
full_name VARCHAR(255),
tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free','pro','team')),
is_verified BOOLEAN DEFAULT FALSE,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_api_keys (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES users(id) ON DELETE CASCADE,
provider VARCHAR(30) NOT NULL CHECK (provider IN ('anthropic','openai','gemini')),
encrypted_key TEXT NOT NULL,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE (user_id, provider)
);

CREATE TABLE user_integrations (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES users(id) ON DELETE CASCADE,
provider VARCHAR(30) NOT NULL CHECK (provider IN ('github','vercel','railway')),
access_token TEXT NOT NULL,
username VARCHAR(255),
created_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE (user_id, provider)
);

CREATE TABLE projects (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES users(id) ON DELETE CASCADE,
name VARCHAR(255) NOT NULL,
raw_idea TEXT,
current_state VARCHAR(50) NOT NULL DEFAULT 'IDEA_CAPTURE' CHECK (current_state IN (
'IDEA_CAPTURE','IDEA_CONFIRMED',
'BLUEPRINT_DRAFT','BLUEPRINT_CONFIRMED',
'PROMPTS_GENERATED','PROMPTS_CONFIRMED',
'EXECUTION_RUNNING','EXECUTION_COMPLETE',
'GITHUB_PUSHED','DEPLOYED','PAUSED'
)),
paused_reason TEXT,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stage_outputs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
stage VARCHAR(50) NOT NULL CHECK (stage IN (
'idea_capture','blueprint',
'prompts','execution','github','deploy'
)),
output_json JSONB NOT NULL,
status VARCHAR(30) DEFAULT 'pending_review' CHECK (status IN (
'pending_review','approved','revision_requested'
)),
user_feedback TEXT,
round_number INT DEFAULT 1,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE (project_id, stage, round_number)
);

CREATE TABLE execution_tasks (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
task_name VARCHAR(100) NOT NULL,
task_order INT NOT NULL,
depends_on UUID[],
prompt_used TEXT,
generated_files JSONB,
status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
'pending','running','pending_review',
'approved','failed','skipped'
)),
retry_count INT DEFAULT 0,
error_log TEXT,
tool_used VARCHAR(30) CHECK (tool_used IN (
'anthropic','openai','gemini','claude_code'
)),
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE execution_logs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
task_id UUID REFERENCES execution_tasks(id),
event VARCHAR(50) NOT NULL CHECK (event IN (
'task_started','api_call','parse_error',
'validation_error','retry','fallback',
'claude_code_output','fix_injected',
'drift_detected','user_fix_requested',
'task_approved','task_failed','task_paused'
)),
detail JSONB,
created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE github_pushes (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
repo_url TEXT,
repo_name VARCHAR(255),
branch VARCHAR(100) DEFAULT 'main',
is_private BOOLEAN DEFAULT TRUE,
commit_sha TEXT,
status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
error_log TEXT,
pushed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deployments (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
platform VARCHAR(20) NOT NULL CHECK (platform IN ('vercel','railway')),
service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('frontend','backend')),
deploy_url TEXT,
platform_project_id TEXT,
build_status VARCHAR(20) DEFAULT 'pending' CHECK (build_status IN (
'pending','building','success','failed'
)),
error_log TEXT,
deployed_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_state ON projects(current_state);
CREATE INDEX idx_stage_outputs_project ON stage_outputs(project_id);
CREATE INDEX idx_execution_tasks_project ON execution_tasks(project_id);
CREATE INDEX idx_execution_tasks_status ON execution_tasks(status);
CREATE INDEX idx_execution_logs_project ON execution_logs(project_id);
CREATE INDEX idx_execution_logs_task ON execution_logs(task_id);
CREATE INDEX idx_deployments_project ON deployments(project_id);
