# task_14_frontend_layout.md
# INJECT WITH: MASTER.md + STACK.md + FOLDER_STRUCTURE.md + CONVENTIONS.md

Implement root layout, navigation, auth guard, Supabase client.

Files to create:
  frontend/lib/supabase.ts
    - createClient() using NEXT_PUBLIC_SUPABASE_URL + ANON_KEY
    - Server-side client using @supabase/ssr

  frontend/lib/api.ts
    - apiClient: axios or fetch wrapper
    - Base URL: NEXT_PUBLIC_API_URL
    - Auto-include credentials: true (for httpOnly cookie)
    - Error handling: throw with { message, code }
    - Methods: get, post, patch, delete, postForm (multipart)

  frontend/lib/websocket.ts
    - createProjectWS(projectId): WebSocket to NEXT_PUBLIC_WS_URL
    - onEvent(type, handler): event listener
    - disconnect()

  frontend/types/index.ts
    - All TypeScript interfaces matching API_SPEC.md response shapes:
      User, Project, StageOutput, ExecutionTask, BlueprintData,
      StructuredIdea, PromptSet, GithubPush, Deployment
    - ProjectState enum: all states from BUSINESS_LOGIC.md

  frontend/app/layout.tsx
    - Root layout with Tailwind globals
    - Navbar component (shows user email + logout if logged in)
    - Clean minimal design

  frontend/components/layout/Navbar.tsx
    - Logo left, nav links center, user menu right
    - Links: Dashboard, Settings
    - Logout: DELETE /api/v1/auth/logout → redirect to /login

  frontend/app/page.tsx
    - Landing page: product name, one-liner, CTA → /register
    - Simple, clean, not complex

  Auth guard pattern:
    - Middleware (frontend/middleware.ts): redirect /dashboard → /login if no cookie
    - All /projects/* routes protected

Done when:
  - npm run dev starts without TypeScript errors
  - / shows landing page
  - /login, /register pages render (can be empty for now)
  - /dashboard redirects to /login without auth


---

# task_15_frontend_idea_wizard.md
# INJECT WITH: MASTER.md + STACK.md + FOLDER_STRUCTURE.md + API_SPEC.md (STAGE 1) + CONVENTIONS.md

Implement multi-modal idea capture UI.

Files to create:
  frontend/app/projects/new/page.tsx
    - Multi-step wizard (Step 1: input, Step 2: clarify, Step 3: confirm)

  frontend/components/idea/IdeaInputBox.tsx
    - Large textarea for text input
    - Four mode buttons: Text, Voice, File, Image (can combine)
    - Submit button: "Process Idea"
    - Calls POST /api/v1/projects/{id}/idea/process (multipart)

  frontend/components/idea/VoiceRecorder.tsx
    - Use MediaRecorder API (browser built-in)
    - Record button → shows waveform/timer → Stop
    - Show transcript preview after recording
    - Attach as audio blob to form

  frontend/components/idea/FileUploader.tsx
    - Drag & drop or click upload
    - Accepted: .md, .txt, .pdf, .docx only
    - Show filename + size on upload
    - Reject unsupported types with message

  frontend/components/idea/ImageUploader.tsx
    - Drag & drop or click
    - Preview thumbnail on upload
    - Accepted: .png, .jpg, .webp
    - Show "Extracting..." spinner after upload

  frontend/components/idea/ClarifyingQuestions.tsx
    - Left panel: "What I understood" (StructuredIdeaCard)
    - Right panel: Questions list with input per question
    - Warnings displayed as yellow/amber cards (advisory, dismissible)
    - IDK button per question → shows 5 suggestion chips to pick from
    - "Looks Good" button → POST /confirm

  frontend/components/idea/StructuredIdeaCard.tsx
    - Display structured idea fields as clean cards
    - Problem, Users, Features (as chips), Platform, Scope
    - "Edit this field" inline for corrections

Done when:
  - User can type idea + click Process → sees structured idea + questions
  - Voice recording works in browser
  - File upload extracts content (shows in textarea preview)
  - IDK shows 5 suggestion chips
  - Warnings shown as advisory cards
  - Confirm → project moves to BLUEPRINT_DRAFT state


---

# task_16_frontend_blueprint_view.md
# INJECT WITH: MASTER.md + STACK.md + FOLDER_STRUCTURE.md + API_SPEC.md (STAGE 2) + CONVENTIONS.md

Implement blueprint review + edit UI.

Files to create:
  frontend/app/projects/[id]/blueprint/page.tsx
    - View toggle: [Plain English] [Technical] [Both]
    - Section-by-section display with approve/edit per section
    - "Approve All" button at bottom
    - Triggers POST /generate on mount if state = BLUEPRINT_DRAFT

  frontend/components/blueprint/BlueprintCard.tsx
    - Renders one blueprint section (architecture, stack, modules, etc.)
    - Status badge: pending_review | approved
    - [Edit] button → opens inline edit form
    - [Approve] button → marks section approved

  frontend/components/blueprint/TechStackEditor.tsx
    - Shows current stack as editable cards
    - Curated dropdown per category (from STACK.md curated options)
    - Custom input option → shows evaluation warning inline
    - PATCH /blueprint/edit on save

  frontend/components/blueprint/MermaidDiagram.tsx
    - Renders Mermaid source from blueprint.mermaid_source
    - Uses mermaid npm package (already in dependencies)
    - Export as PNG button

  frontend/components/blueprint/SchemaViewer.tsx
    - Toggle: [Standard] [Detailed / Industry Level]
    - Standard: table name + field names
    - Detailed: full SQL with types + constraints (syntax highlighted)

  frontend/components/blueprint/ApiSpecViewer.tsx
    - Grouped by domain (Auth, Projects, etc.)
    - Method badge colored (GET=blue, POST=green, PATCH=yellow, DELETE=red)
    - Expandable per endpoint showing request/response

Done when:
  - Blueprint auto-loads after idea confirmation
  - Mermaid diagram renders from mermaid_source
  - Tech stack editable, partial regeneration works
  - Both plain English and technical views work
  - Approve All → POST /confirm → state = BLUEPRINT_CONFIRMED


---

# task_17_frontend_execution_view.md
# INJECT WITH: MASTER.md + STACK.md + FOLDER_STRUCTURE.md + API_SPEC.md (STAGE 4 + WEBSOCKET) + CONVENTIONS.md

Implement execution progress UI with real-time WebSocket updates.

Files to create:
  frontend/app/projects/[id]/execution/page.tsx
    - Task queue sidebar (left)
    - Current task detail (right)
    - Real-time updates via WebSocket
    - "Start Execution" button (first time)
    - "Pause" / "Resume" controls

  frontend/components/execution/ExecutionQueue.tsx
    - Vertical list of all tasks
    - Status icons: ⏳ pending, ⚡ running, 👁 review, ✅ approved, ❌ failed
    - Click task → shows detail in right panel
    - Shows retry count if >0

  frontend/components/execution/TaskCard.tsx
    - Task name + status badge
    - File list (each file as expandable tab)
    - CodeViewer per file (syntax highlighted)
    - [Approve & Continue] button
    - [Request Fix] button → text input for feedback → submit
    - Validation result display (✅ passed or ⚠️ issues list)
    - Error display if task_failed event received

  frontend/components/execution/CodeViewer.tsx
    - react-syntax-highlighter (already in dependencies)
    - Language auto-detected from file extension
    - Copy button per file
    - Line numbers shown

  frontend/components/execution/ProgressBar.tsx
    - Overall progress: approved_tasks / total_tasks
    - Animated fill

  frontend/hooks/useExecution.ts
    - Connects WebSocket on mount
    - Handles all WebSocket events → updates local state
    - Provides: tasks, currentTask, approve(taskId), fix(taskId, feedback)

Done when:
  - WebSocket connects on page load
  - Real-time task_started, task_pending_review events update UI
  - Code displayed per file with syntax highlighting
  - Approve button advances queue
  - Fix request sends feedback, shows task_retrying state
  - All 5 execution states visible in queue


---

# task_18_frontend_dashboard.md
# INJECT WITH: MASTER.md + STACK.md + FOLDER_STRUCTURE.md + API_SPEC.md (PROJECTS) + CONVENTIONS.md

Implement project dashboard + settings page.

Files to create:
  frontend/app/dashboard/page.tsx
    - List all user projects (GET /api/v1/projects)
    - Project card: name, current_state badge, created_at, actions
    - "New Project" button → /projects/new
    - Empty state: illustration + CTA

  frontend/app/settings/page.tsx
    - Tabs: API Keys | Integrations | Profile
    - API Keys tab:
        Provider cards (Anthropic, OpenAI, Gemini)
        Each: has_key indicator, [Add Key] or [Remove] + [Verify]
        Key input masked (password type)
    - Integrations tab:
        GitHub: [Connect] → OAuth flow | [Disconnect] if connected
        Vercel: token input + [Connect] / [Disconnect]
        Railway: token input + [Connect] / [Disconnect]
    - Profile tab:
        Name, email (read-only), plan tier badge

  frontend/app/projects/[id]/page.tsx
    - Project overview: name, state, progress
    - Stage checklist with status + [Go to stage] links
    - Download buttons: context files, prompts (ZIP)
    - GitHub repo link (if pushed)
    - Deploy URLs (if deployed)

Done when:
  - Dashboard shows all projects with correct states
  - Settings API keys: add/remove/verify all 3 providers
  - GitHub OAuth flow completes (redirects back to settings)
  - Project overview shows all stage statuses
