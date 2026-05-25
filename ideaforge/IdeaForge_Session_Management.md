# IdeaForge AI — Session Management + Revised Tool Strategy
# CRITICAL: Read this before starting any build session.

---

# YOUR ACTUAL TOOL STACK (REVISED)

## What You Have
```
Claude.ai free    → Sonnet 4.6 + Haiku 4.5 (limited messages/day)
ChatGPT Plus      → GPT-4o + o1 (high limits, memory feature)
Gemini Pro        → Gemini 2.5 Pro (high limits, CLI execution)
```

## Tool Assignment (Final — Use Exactly This)

| Task Type | Use This | Why |
|---|---|---|
| Execution engine, error classifier, state machine, ai_client | Claude Sonnet 4.6 | Best complex logic |
| Auth, encryption, subprocess service | Claude Sonnet 4.6 | Security-critical |
| Debug session mid-error (long back-and-forth) | ChatGPT Plus GPT-4o | Memory helps, no session limit |
| Simple routers, Pydantic schemas | Claude Haiku 4.5 | Saves Sonnet quota |
| Simple React components, basic hooks | ChatGPT Plus GPT-4o | High limit, good frontend |
| Architecture questions, planning | ChatGPT Plus o1 | Best reasoning |
| Write files to disk, run terminal | Gemini CLI (Pro) | Only tool that executes |
| Test endpoints, install deps, run migrations | Gemini CLI | Same |
| Fix Gemini CLI errors | Claude or ChatGPT | Analyze → inject fix |
| Claude quota exhausted | ChatGPT Plus GPT-4o | Strong fallback |
| All quotas exhausted | Gemini Advanced (web) | Last resort |

---

# UNDERSTANDING SESSION LIMITS

## Claude.ai Free — What Actually Expires
```
CONTEXT WINDOW (per tab):
  - Stays alive as long as browser tab is open
  - Close the tab → ALL context lost
  - Computer sleep/crash → context at risk
  - Very long conversation → Claude starts losing early context
  - Practical limit: ~30-40 back-and-forth messages before drift

MESSAGE QUOTA (daily):
  - Sonnet 4.6: roughly 10-15 messages per day (Anthropic doesn't publish exact number)
  - Haiku 4.5: roughly 30-40 messages per day
  - Resets: midnight (your local time, approximately)
  - Hit limit → message box grays out → switch tool
  - Sonnet limit hit → switch to Haiku or ChatGPT

WHAT "CONTEXT LOST" MEANS:
  - Claude forgets everything you said earlier in the tab
  - Your code files are not saved inside Claude
  - Errors you showed Claude → gone
  - Decisions you made together → gone
  - Solution: keep a SESSION STATE FILE (see below)
```

## ChatGPT Plus — Limits
```
GPT-4o: ~80 messages per 3 hours (then auto-resets)
o1: ~50 messages per week (use sparingly for architecture)
Memory: ON by default → remembers across sessions (useful)
Context window: large, rarely a problem in practice
Best for: long debugging sessions (no daily reset, just 3hr rolling)
```

## Gemini Pro — Limits
```
Gemini CLI with Pro: very high rate limits
Gemini Advanced web: high limits
Practically no blocking issue for this project size
Best for: all execution tasks (writing files, running commands)
```

---

# THE SESSION STATE FILE — MOST IMPORTANT THING

## What It Is
A single file you update manually throughout the day.
When any session expires → paste this file → instantly recovered.

## Create This File Now
```
Create a file in your ideaforge/ folder:
SESSION_STATE.md

Update it at the end of every build session (15-20 min intervals).
```

## SESSION_STATE.md Template
```markdown
# IdeaForge Build Session State
Last updated: [DATE TIME]

## CURRENT STATUS
Phase: [0/1/2/3/4/5]
Day: [day number]
Current task: [task name, e.g. task_03_auth_byok]
Status: [in progress / completed / blocked]

## COMPLETED TASKS (working + tested)
- [x] task_01_project_setup — both servers start
- [x] task_02_database — all 9 tables created, alembic migrated
- [ ] task_03_auth_byok — IN PROGRESS

## FILES COMPLETED (don't regenerate these)
backend/app/main.py ✅
backend/app/config.py ✅
backend/app/database.py ✅
backend/app/models/user.py ✅
backend/app/models/project.py ✅
[add every file as you complete it]

## CURRENT ERROR (if mid-error when session died)
File with error: [exact path]
Error message: [paste exact error]
What was tried: [what fixes were attempted]
Last fix that didn't work: [describe]

## DECISIONS MADE
- Using Fernet key: [saved separately in .env, not here]
- GitHub OAuth app created: [yes/no]
- Supabase project URL: [paste here]

## WHAT TO DO NEXT
1. [exact next step]
2. [step after that]

## SERVERS STATUS
Backend: [running/stopped] on port 8000
Frontend: [running/stopped] on port 3000
DB: Supabase hosted (always running)
```

---

# SESSION RECOVERY — EXACT STEPS

## When Claude Session Expires Mid-Error

### Step 1: Don't Panic
```
Your code files are on disk (VS Code).
Only Claude's memory of your conversation is lost.
Everything you saved to disk is safe.
```

### Step 2: Open Fresh Claude Tab

### Step 3: Paste This Recovery Message
```
---SESSION RECOVERY---
I was in the middle of fixing an error. Here's the full context:

PROJECT: IdeaForge AI (see MASTER.md below)

CURRENT STATE:
[paste your SESSION_STATE.md content]

THE ERROR I WAS FIXING:
[paste exact error message + stack trace]

THE FILE WITH THE ERROR:
Path: [exact file path]
Content:
[paste FULL file content]

CONTEXT FILES:
[paste MASTER.md]
[paste ANTI_PATTERNS.md]
[paste the 1-2 most relevant spec files for this error]

Fix this error. Return corrected file with path as heading.
No explanation needed, just the fix.
---
```

### Step 4: Apply Fix → Update SESSION_STATE.md

---

## When Claude Quota Hits Mid-Task (Not Mid-Error)

### Switch to ChatGPT Plus
```
Open ChatGPT (you have Plus, GPT-4o)

Paste this at start:
---CONTEXT---
I am building IdeaForge AI. Full spec below.
I was working on: [task name]
[paste MASTER.md]
[paste task-relevant spec files]
[paste task prompt file]
---

Generate the files for this task.
Return each file with exact path as heading.
Complete files, no truncation.
```

GPT-4o is strong enough for most tasks except the most complex logic.

### Use o1 For These Specific Cases Only
```
ChatGPT → switch to o1 model for:
- Designing the topological sort algorithm
- Reviewing execution engine architecture
- Debugging complex async issues
- Planning error classification logic
Don't use o1 for generating boilerplate → wastes weekly quota
```

---

# REVISED PHASE-BY-PHASE TOOL ASSIGNMENT

## Phase 0 — Foundation (Days 1-3)

| Task | Tool | Why |
|---|---|---|
| Project setup files | Claude Haiku 4.5 | Simple, saves Sonnet |
| Database models | Claude Haiku 4.5 | Schema-based, straightforward |
| Auth + encryption | Claude Sonnet 4.6 | Security logic, complex |
| State machine | Claude Haiku 4.5 | Simple state dict |
| Running + testing everything | Gemini CLI | Only executor |
| Any error that takes >3 messages | ChatGPT GPT-4o | No session limit |

## Phase 1 — Idea + Blueprint (Days 4-8)

| Task | Tool | Why |
|---|---|---|
| AI client abstraction | Claude Sonnet 4.6 | Complex async + fallback logic |
| Version service | Claude Haiku 4.5 | Simple HTTP calls |
| Idea preprocessors (file/voice) | Claude Haiku 4.5 | Straightforward |
| Idea extraction logic | Claude Sonnet 4.6 | Complex prompt engineering |
| Blueprint generation | Claude Sonnet 4.6 | Most complex service |
| File generator (12 files) | ChatGPT GPT-4o | Long but repetitive, GPT handles well |
| Prompt engine | Claude Sonnet 4.6 | Token optimization matters here |
| All testing | Gemini CLI | Executor |

## Phase 2 — Execution Engine (Days 9-15)

| Task | Tool | Why |
|---|---|---|
| WebSocket manager | Claude Haiku 4.5 | Simple pub/sub |
| Error classifier | Claude Sonnet 4.6 | Critical logic, precision needed |
| Execution service | Claude Sonnet 4.6 | Most complex file |
| Claude Code subprocess | Claude Sonnet 4.6 | Async subprocess, tricky |
| GitHub service | ChatGPT GPT-4o | Straightforward API calls |
| Deploy service | ChatGPT GPT-4o | Straightforward API calls |
| All testing + execution | Gemini CLI | Executor |

## Phase 3 — Frontend (Days 16-20)

| Task | Tool | Why |
|---|---|---|
| Layout + lib files | Claude Haiku 4.5 | Simple structure |
| Idea wizard UI | ChatGPT GPT-4o | Complex multi-modal UI, GPT good at React |
| Blueprint view UI | ChatGPT GPT-4o | Component-heavy, GPT handles well |
| Execution view (WebSocket UI) | Claude Sonnet 4.6 | Real-time state management, complex |
| Dashboard + settings | ChatGPT GPT-4o | Standard CRUD UI |
| All frontend testing | Gemini CLI | Runs npm commands |

## Phase 4-5 — Integration + Deploy (Days 21-30)

| Task | Tool | Why |
|---|---|---|
| End-to-end debugging | ChatGPT GPT-4o | Long sessions, memory helps |
| Production deploy issues | Claude Sonnet 4.6 | Precise fixes needed |
| All curl testing | Gemini CLI | Executor |
| All npm/pip commands | Gemini CLI | Executor |

---

# DAILY SESSION STRUCTURE (Free Limit Optimized)

## Morning Session (Claude Sonnet — use when fresh/reset)
```
Time: First thing after daily limit resets

Use Sonnet for the HARDEST task of the day only:
- Execution engine logic
- Error classifier
- Complex async services
- Security-critical code

1 Sonnet session = 1 complex file or 2 medium files
Save SESSION_STATE.md immediately after
```

## Midday Session (Claude Haiku or ChatGPT)
```
Use Haiku for:
- Simple routers
- Pydantic schemas
- Basic services

Use ChatGPT GPT-4o for:
- Frontend components
- Debugging sessions
- Anything requiring back-and-forth
```

## Afternoon Session (Gemini CLI)
```
All execution with Gemini:
- Run what was generated in morning
- Install dependencies
- Run migrations
- Test endpoints
- Fix runtime errors
```

## Evening Session (ChatGPT)
```
Use ChatGPT Plus for:
- Fixing errors Gemini found
- Frontend generation
- Planning next day's tasks
- Reviewing code generated today
```

---

# PREVENTING CONTEXT OVERFLOW

## Signs Claude Is Losing Context
```
- Starts ignoring your ANTI_PATTERNS.md rules
- Uses deprecated syntax (getServerSideProps, @validator)
- Forgets the tech stack you specified
- Gives generic answers instead of project-specific ones
- Returns shorter, less precise responses
```

## Prevention Rules
```
1. NEVER do debugging + generation in the same Claude tab
   Debug tab: paste error → get fix → close tab
   Generation tab: paste task → get code → close tab

2. Keep Claude tabs SHORT (max 10 messages per tab)
   Open new tab for every new task
   Paste context fresh every time (don't rely on previous messages)

3. ALWAYS paste MASTER.md in every new Claude tab
   Never assume Claude remembers from previous tab

4. One task = one tab
   Don't chain: "now do the next task" in same tab
   Open new tab → fresh context paste → clean output

5. Save generated code to disk BEFORE asking follow-up questions
   Never: "fix this file" on a file that only exists in Claude's response
   Always: save to disk first → paste from disk if needing changes
```

---

# CHATGPT PLUS — HOW TO USE EFFECTIVELY

## Memory Setup (Do This Once)
```
Go to ChatGPT → Settings → Personalization → Memory → ON

Tell it once (it will remember):
"I am building IdeaForge AI — a SaaS platform that converts
vague ideas into deployed products via AI. Tech stack:
Python 3.11 + FastAPI + SQLAlchemy 2.0 async + Pydantic v2 + 
Next.js 14 (App Router) + TypeScript + Tailwind + Supabase.
Always use async/await for DB, Pydantic v2 syntax only,
Next.js App Router only (never pages/)"

ChatGPT will remember this across all sessions.
You still paste spec files for specific tasks.
```

## ChatGPT Message Format (Same As Claude)
```
---CONTEXT START---
[paste relevant spec files]
---CONTEXT END---

[paste task prompt]

Return each file with exact path as heading.
Complete files. No truncation.
```

## When ChatGPT Output Differs From Spec
```
"You used [wrong thing]. According to ANTI_PATTERNS.md / STACK.md:
[paste relevant rule]
Regenerate [filename] following this rule exactly."
```

---

# GEMINI CLI — SESSION MANAGEMENT

## Gemini CLI Has No Session Limit Issues
```
Each gemini command is stateless (no memory between commands).
This is actually good: no context overflow.
But: you must give full context every command.
```

## Gemini Command Template
```bash
gemini "
CONTEXT: I am building IdeaForge AI.
Tech stack: FastAPI 0.111 + Python 3.11 + SQLAlchemy 2.0 async.
Project is in: /path/to/ideaforge/

TASK: [exact thing to do]

FILES TO READ FIRST: [list files Gemini should read]

STEPS: 
1. [step 1]
2. [step 2]
3. [step 3]

Report result of each step.
"
```

## When Gemini Gets Stuck In A Loop
```
Gemini sometimes tries to fix the same error repeatedly.
Signs: 3+ attempts on same issue, circular reasoning.

Solution:
1. Kill Gemini: Ctrl+C
2. Copy the error Gemini kept hitting
3. Go to Claude or ChatGPT
4. Paste: "[error] + [file content]" → get precise fix
5. Apply fix manually in VS Code
6. Come back to Gemini with: "I fixed [issue]. Continue from step [N]"
```

---

# ERROR MID-SESSION — COMPLETE DECISION TREE

```
Error found
    │
    ├── Can Gemini fix it in 1-2 attempts?
    │   YES → let Gemini fix it
    │   NO  → proceed below
    │
    ├── Is Claude tab still alive (context not expired)?
    │   YES:
    │   │   Is it a simple error (missing import, syntax, typo)?
    │   │   YES → paste error + file to CURRENT Claude tab
    │   │   NO  → open NEW Claude tab (fresh context)
    │   │         paste: MASTER.md + ANTI_PATTERNS.md
    │   │              + relevant spec file
    │   │              + error + broken file
    │   │
    │   NO (tab expired/closed):
    │       → Paste SESSION RECOVERY message to new Claude tab
    │         (see Session Recovery section above)
    │
    ├── Is Claude quota exhausted?
    │   YES → use ChatGPT GPT-4o
    │   │     paste: MASTER.md + ANTI_PATTERNS.md
    │   │          + relevant spec file
    │   │          + error + broken file
    │   │
    │
    └── Are ALL quotas exhausted for today?
        → Use Gemini Advanced (gemini.google.com, you have Pro)
          Same context paste format
          Quality slightly lower but sufficient for error fixing
```

---

# DAILY QUOTA BUDGET (Optimized For Your Plans)

## How To Spend Claude Free Quota Each Day
```
SONNET 4.6 (~12 messages/day budget):
  Morning: 4 messages → 1 complex service file
  Midday:  4 messages → 1 complex router + schema pair
  Evening: 4 messages → debugging if needed
  NEVER use Sonnet for: simple schemas, basic components, boilerplate

HAIKU 4.5 (~35 messages/day budget):
  Use for everything that isn't complex logic
  Simple routers, Pydantic models, basic components
  Quick error fixes on simple files
```

## ChatGPT Plus Daily Budget
```
GPT-4o: 80 messages / 3 hours (resets every 3 hours)
Use for: frontend, debugging sessions, GitHub/deploy services
o1: 50/week → use ONLY for architecture decisions
Don't waste on boilerplate
```

## Gemini Pro Daily Budget
```
Effectively unlimited for this project size
Use freely for all execution tasks
```

---

# WHAT TO DO IF YOU HIT ALL LIMITS

```
All Claude messages used AND
ChatGPT 3hr limit hit AND  
Gemini web limit hit?

Options:
1. Wait (Claude resets daily, ChatGPT resets every 3hr)
   Use waiting time:
   - Read code you generated today
   - Update SESSION_STATE.md
   - Test manually (no AI needed for clicking through UI)
   - Plan tomorrow's Claude sessions

2. Use gemini.google.com directly (you have Pro)
   Paste same context + task → get code → copy-paste

3. Write simple code yourself (seriously)
   After seeing Claude/ChatGPT output patterns for a week,
   you'll recognize the patterns and can write simple files manually
   This actually speeds up development
```

---

# SESSION STATE UPDATE REMINDER

```
Set a phone reminder every 20 minutes while coding:
"Update SESSION_STATE.md"

Takes 2 minutes.
Saves hours if session crashes.

Minimum to update:
1. Which task are you on
2. Which files are done
3. What error are you currently fixing (if any)
4. What was the last thing that worked
```
