// ── Enums ────────────────────────────────────────────────────────────────────

export enum ProjectState {
  IDEA_CAPTURE = "IDEA_CAPTURE",
  IDEA_CONFIRMED = "IDEA_CONFIRMED",
  BLUEPRINT_DRAFT = "BLUEPRINT_DRAFT",
  BLUEPRINT_CONFIRMED = "BLUEPRINT_CONFIRMED",
  PROMPTS_GENERATED = "PROMPTS_GENERATED",
  PROMPTS_CONFIRMED = "PROMPTS_CONFIRMED",
  EXECUTION_RUNNING = "EXECUTION_RUNNING",
  EXECUTION_COMPLETE = "EXECUTION_COMPLETE",
  GITHUB_PUSHED = "GITHUB_PUSHED",
  DEPLOYED = "DEPLOYED",
  PAUSED = "PAUSED",
  FAILED = "FAILED",
}

export type TaskStatus =
  | "pending"
  | "running"
  | "pending_review"
  | "approved"
  | "failed"
  | "skipped";

export type BuildStatus = "pending" | "building" | "success" | "failed";
export type DeployPlatform = "vercel" | "railway";
export type ServiceType = "frontend" | "backend";
export type IntegrationProvider = "github" | "vercel" | "railway";
export type PushStatus = "pending" | "success" | "failed";

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  tier: string;
  created_at: string;
}

export interface AuthResponse {
  message: string;
  user: User;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  current_state: ProjectState;
  structured_idea: StructuredIdea | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

// ── Idea ──────────────────────────────────────────────────────────────────────

export interface ClarifyingQuestion {
  id: string;
  question: string;
  purpose: string;
}

export interface StructuredIdea {
  core_idea: string;
  target_users: string;
  key_features: string[];
  tech_preferences: string[];
  constraints: string[];
  success_criteria: string[];
}

export interface IdeaResponse {
  stage: "clarifying" | "confirmed";
  questions?: ClarifyingQuestion[];
  structured_idea?: StructuredIdea;
  message?: string;
}

// ── Blueprint ─────────────────────────────────────────────────────────────────

export interface TechStack {
  frontend: string;
  backend: string;
  database: string;
  auth: string;
  hosting: string;
  [key: string]: string;
}

export interface BlueprintData {
  product_summary: string;
  tech_stack: TechStack;
  architecture_diagram: string;   // Mermaid markdown
  database_schema: string;        // SQL DDL
  api_spec: ApiEndpoint[];
  folder_structure: string;
  key_flows: string[];
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  request_body?: Record<string, unknown>;
  response?: Record<string, unknown>;
}

export interface StageOutput {
  id: string;
  project_id: string;
  stage: string;
  output_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Prompts ───────────────────────────────────────────────────────────────────

export interface Prompt {
  id: string;
  task_name: string;
  prompt_text: string;
  depends_on: string[];
  estimated_files: string[];
}

export interface PromptSet {
  prompts: Prompt[];
  master_prompt: string;
  total_tasks: number;
}

// ── Execution ─────────────────────────────────────────────────────────────────

export interface ExecutionTask {
  id: string;
  project_id: string;
  task_name: string;
  task_order: number;
  status: TaskStatus;
  depends_on: string[];
  prompt_used: string | null;
  generated_files: GeneratedFile[] | null;
  tool_used: string | null;
  retry_count: number;
  error_log: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface ExecutionStatus {
  tasks: ExecutionTask[];
  project_state: ProjectState;
}

// ── GitHub ────────────────────────────────────────────────────────────────────

export interface GithubPush {
  id: string;
  project_id: string;
  repo_url: string;
  repo_name: string;
  branch: string;
  is_private: boolean;
  commit_sha: string;
  status: PushStatus;
  error_log: string | null;
  pushed_at: string;
}

export interface GithubPreview {
  files: string[];
  auto_generated: string[];
  total: number;
}

export interface PushResponse {
  repo_url: string;
  commit_sha: string;
}

// ── Integrations ──────────────────────────────────────────────────────────────

export interface Integration {
  provider: IntegrationProvider;
  connected: boolean;
  username: string | null;
}

export interface OAuthUrlResponse {
  url: string;
}

// ── Deployments ───────────────────────────────────────────────────────────────

export interface Deployment {
  id: string;
  project_id: string;
  platform: DeployPlatform;
  service_type: ServiceType;
  deploy_url: string | null;
  platform_project_id: string | null;
  build_status: BuildStatus;
  error_log: string | null;
  deployed_at: string;
  updated_at: string;
}

export interface DeployStartResponse {
  deploy_id: string;
  status: BuildStatus;
  status_url: string;
}

export interface ServiceStatusItem {
  url: string | null;
  status: BuildStatus | "not_started";
  platform: DeployPlatform | null;
}

export interface DeployStatusResponse {
  frontend: ServiceStatusItem;
  backend: ServiceStatusItem;
}

export interface HealthResponse {
  frontend: boolean;
  backend: boolean;
  db: boolean;
  auth: boolean;
}

// ── WebSocket events ──────────────────────────────────────────────────────────

export interface WsEvent {
  event: string;
  task_id?: string;
  task_name?: string;
  files?: string[];
  error?: string;
  status?: string;
  deploy_url?: string;
  platform?: string;
  service_type?: string;
  reason?: string;
  attempt?: number;
}

// ── API keys ──────────────────────────────────────────────────────────────────

export interface ApiKeyProvider {
  provider: string;
  has_key: boolean;
}

export interface UserKeys {
  keys: ApiKeyProvider[];
}