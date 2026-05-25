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

CREATE TABLE user_integrations (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES users(id) ON DELETE CASCADE,
provider VARCHAR(30) NOT NULL CHECK (provider IN ('github','vercel','railway')),
access_token TEXT NOT NULL,
username VARCHAR(255),
created_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE (user_id, provider)
);
