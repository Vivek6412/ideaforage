# FOLDER_STRUCTURE.md — IdeaForge AI
# CREATE EXACTLY THIS. NO ADDITIONS. NO REMOVALS.

```
ideaforge/
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx              ← project list
│   │   ├── projects/
│   │   │   ├── new/
│   │   │   │   └── page.tsx          ← idea capture wizard
│   │   │   └── [id]/
│   │   │       ├── page.tsx          ← project overview
│   │   │       ├── blueprint/
│   │   │       │   └── page.tsx      ← blueprint review
│   │   │       ├── prompts/
│   │   │       │   └── page.tsx      ← prompt review
│   │   │       └── execution/
│   │   │           └── page.tsx      ← execution + live progress
│   │   ├── settings/
│   │   │   └── page.tsx              ← API keys, GitHub, profile
│   │   ├── layout.tsx                ← root layout
│   │   ├── page.tsx                  ← landing page
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                       ← reusable primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Spinner.tsx
│   │   ├── idea/
│   │   │   ├── IdeaInputBox.tsx      ← text input
│   │   │   ├── VoiceRecorder.tsx     ← voice input
│   │   │   ├── FileUploader.tsx      ← file input
│   │   │   ├── ImageUploader.tsx     ← image input
│   │   │   ├── ClarifyingQuestions.tsx
│   │   │   └── StructuredIdeaCard.tsx
│   │   ├── blueprint/
│   │   │   ├── BlueprintCard.tsx
│   │   │   ├── TechStackEditor.tsx
│   │   │   ├── MermaidDiagram.tsx
│   │   │   ├── SchemaViewer.tsx
│   │   │   └── ApiSpecViewer.tsx
│   │   ├── execution/
│   │   │   ├── ExecutionQueue.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── CodeViewer.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── ErrorDisplay.tsx
│   │   ├── prompts/
│   │   │   ├── PromptCard.tsx
│   │   │   └── PromptList.tsx
│   │   └── layout/
│   │       ├── Navbar.tsx
│   │       ├── Sidebar.tsx
│   │       └── Footer.tsx
│   ├── lib/
│   │   ├── supabase.ts               ← supabase client
│   │   ├── api.ts                    ← all backend API calls
│   │   └── websocket.ts              ← WebSocket client
│   ├── hooks/
│   │   ├── useProject.ts
│   │   ├── useExecution.ts
│   │   └── useWebSocket.ts
│   ├── types/
│   │   └── index.ts                  ← all TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── next.config.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py                   ← FastAPI app, CORS, routers, WebSocket
│   │   ├── config.py                 ← pydantic-settings BaseSettings
│   │   ├── database.py               ← async SQLAlchemy engine + session
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── stage_output.py
│   │   │   ├── execution_task.py
│   │   │   ├── execution_log.py
│   │   │   ├── github_push.py
│   │   │   ├── deployment.py
│   │   │   └── user_integration.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── project.py
│   │   │   ├── idea.py
│   │   │   ├── blueprint.py
│   │   │   ├── prompt.py
│   │   │   ├── execution.py
│   │   │   ├── github.py
│   │   │   └── deploy.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   ├── idea.py
│   │   │   ├── blueprint.py
│   │   │   ├── prompts.py
│   │   │   ├── execution.py
│   │   │   ├── github.py
│   │   │   └── deploy.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── idea_service.py        ← Stage 1 logic
│   │   │   ├── blueprint_service.py   ← Stage 2 logic
│   │   │   ├── version_service.py     ← PyPI/npm checks
│   │   │   ├── prompt_service.py      ← Stage 3 logic
│   │   │   ├── execution_service.py   ← Stage 4 orchestration
│   │   │   ├── claude_code_service.py ← subprocess management
│   │   │   ├── error_classifier.py    ← error → surgical prompt
│   │   │   ├── file_generator.py      ← 12 context files
│   │   │   ├── github_service.py      ← Stage 5
│   │   │   └── deploy_service.py      ← Stage 6
│   │   ├── core/
│   │   │   ├── ai_client.py           ← Claude/OpenAI/Gemini abstraction
│   │   │   ├── encryption.py          ← Fernet key encryption
│   │   │   ├── state_machine.py       ← project state transitions
│   │   │   └── websocket_manager.py   ← WebSocket broadcast
│   │   └── middleware/
│   │       └── auth.py                ← JWT validation dependency
│   ├── migrations/
│   │   ├── env.py
│   │   └── versions/
│   ├── tests/
│   │   ├── test_auth.py
│   │   ├── test_idea.py
│   │   ├── test_blueprint.py
│   │   └── test_execution.py
│   ├── requirements.txt
│   └── .env.example
│
├── .gitignore
├── README.md
└── docker-compose.yml                 ← local dev (optional)
```
