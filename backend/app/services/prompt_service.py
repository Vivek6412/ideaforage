from __future__ import annotations

import json
import logging
from collections import deque
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai_client import ai_client
from app.core.state_machine import advance_state
from app.models.execution_task import ExecutionTask
from app.models.project import Project
from app.models.stage_output import StageOutput

logger = logging.getLogger(__name__)

# ── Prompt generation constants ───────────────────────────────────────────────

PROMPT_GEN_PROMPT: str = """Role: prompt engineer
Input: blueprint={blueprint_json}, modules={module_list}
Task: generate complete prompt set for building this product
Rules:
- master prompt: max 1000 tokens, full project context
- task prompts: max 1500 tokens each. The VERY FIRST task MUST be 'Project Setup' (id: 'setup', depends_on: []) which initializes the repos, frameworks, and databases. Then, create one task per module.
- content field MUST use rich Markdown formatting. Include a 'Files to generate:' section (with exact paths and inline bullet logic) and a 'Done when:' section (with strict testable conditions).
- inject_files: array of context file names (e.g. ["STACK.md", "SCHEMA.md", "CONVENTIONS.md"]) that must be injected into the LLM context for this specific task.
- debug prompts: max 150 tokens, cover top 5 error types
- return ONLY valid JSON:
{{
  "master_prompt": "string",
  "task_prompts": [{{"id":"string","name":"string","content":"string","depends_on":[], "inject_files":[]}}],
  "integration_prompts": [{{"id":"string","name":"string","content":"string","depends_on":[], "inject_files":[]}}],
  "debug_prompts": [{{"id":"string","name":"string","content":"string"}}]
}}"""

BUILD_GUIDE_PROMPT = """Role: senior architect
Input: blueprint={blueprint_json}
Task: Write a highly detailed, step-by-step Build Guide (Markdown) for setting up the environment, databases, API keys, and scaffolding the project. Include explicit instructions for both backend and frontend. Model it after enterprise-grade documentation. Max 3000 words.
"""

TESTING_GUIDE_PROMPT = """Role: senior QA engineer
Input: blueprint={blueprint_json}
Task: Write a comprehensive Testing Guide (Markdown) for this product. Include curl commands for API endpoints, frontend testing steps, and database verification steps. Max 3000 words.
"""


# ── Internal AI helpers ───────────────────────────────────────────────────────

async def _ai_json(
    user_keys: dict[str, str],
    system: str,
    user_prompt: str,
    max_tokens: int = 8192,
) -> dict[str, Any]:
    raw = await ai_client.call_with_fallback(user_keys, system, user_prompt, max_tokens)
    
    # Try to extract JSON from markdown fences
    cleaned = raw.strip()
    if "```json" in cleaned:
        cleaned = cleaned.split("```json")[1].split("```")[0].strip()
    elif "```" in cleaned:
        cleaned = cleaned.split("```")[1].split("```")[0].strip()
        
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error("AI returned invalid JSON: %s", raw)
        raise HTTPException(
            status_code=502,
            detail={"detail": "AI failed to generate valid prompt JSON", "error": str(e)}
        )


# ── Service functions ─────────────────────────────────────────────────────────

async def generate_prompts(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
    user_keys: dict[str, str],
) -> dict[str, Any]:
    """Generate the full prompt set from the technical blueprint."""
    # 1. Fetch project + blueprint
    proj_res = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    bp_res = await db.execute(
        select(StageOutput).where(
            StageOutput.project_id == project_id,
            StageOutput.stage == "blueprint",
        ).order_by(StageOutput.created_at.desc()).limit(1)
    )
    bp_record = bp_res.scalar_one_or_none()
    if not bp_record:
        raise HTTPException(status_code=400, detail="Blueprint not found. Generate blueprint first.")

    blueprint = bp_record.output_json.get("blueprint", {})
    modules = [m.get("name") for m in blueprint.get("modules", [])]

    # 2. Call AI
    system = "You are an expert prompt engineer for AI coding agents."
    user_content = PROMPT_GEN_PROMPT.format(
        blueprint_json=json.dumps(blueprint, indent=2),
        module_list=", ".join(modules)
    )

    prompt_data = await _ai_json(user_keys, system, user_content)

    import asyncio
    
    build_guide_task = ai_client.call_with_fallback(user_keys, "You are a senior architect", BUILD_GUIDE_PROMPT.format(blueprint_json=json.dumps(blueprint)), 4000)
    testing_guide_task = ai_client.call_with_fallback(user_keys, "You are a QA engineer", TESTING_GUIDE_PROMPT.format(blueprint_json=json.dumps(blueprint)), 4000)
    
    build_guide_md, testing_guide_md = await asyncio.gather(build_guide_task, testing_guide_task)
    
    # Generate FILE_INJECTION_GUIDE.md dynamically from the prompt mappings
    injection_lines = ["# FILE_INJECTION_GUIDE.md\n\n## ALWAYS INJECT\n- MASTER.md\n- ANTI_PATTERNS.md\n\n## TASK MAPPINGS\n"]
    for p in (prompt_data.get("task_prompts") or []):
        inj_list = p.get("inject_files") or []
        inj = ", ".join(str(i) for i in inj_list) if inj_list else "None specified"
        injection_lines.append(f"### {p.get('id')} ({p.get('name')})\nInject: {inj}\n")
    injection_md = "\n".join(injection_lines)
    
    # Upload guides to Supabase
    from app.services.file_generator import upload_to_storage
    files_to_upload = {
        "Detailed_Build_Guide.md": build_guide_md,
        "Testing_Guide.md": testing_guide_md,
        "FILE_INJECTION_GUIDE.md": injection_md
    }
    
    try:
        uploaded_guides = await upload_to_storage(project_id, files_to_upload)
        prompt_data["generated_guides"] = uploaded_guides
    except Exception as e:
        logger.error(f"Failed to upload guides: {e}")
        prompt_data["generated_guides"] = []

    # 3. Save to StageOutput
    res = await db.execute(
        select(StageOutput).where(
            StageOutput.project_id == project_id,
            StageOutput.stage == "prompts",
            StageOutput.round_number == 1,
        )
    )
    so = res.scalar_one_or_none()
    if so:
        so.output_json = prompt_data
        so.status = "pending_review"
    else:
        so = StageOutput(
            project_id=project_id,
            stage="prompts",
            output_json=prompt_data,
            status="pending_review",
            round_number=1,
        )
        db.add(so)
    
    # Advance state if not already past
    if project.current_state == "BLUEPRINT_CONFIRMED":
        advance_state(project, "PROMPTS_GENERATED")
        
    await db.commit()
    await db.refresh(so)

    # Return flattened list for UI
    flattened = []
    flattened.append({
        "id": "master",
        "name": "Master Context",
        "type": "master",
        "content": prompt_data.get("master_prompt", ""),
        "depends_on": []
    })
    
    for t in (prompt_data.get("task_prompts") or []):
        flattened.append({**t, "type": "task"})
    for i in (prompt_data.get("integration_prompts") or []):
        flattened.append({**i, "type": "integration"})
    for idx, d in enumerate(prompt_data.get("debug_prompts") or []):
        flattened.append({
            "id": f"D{idx + 1}", 
            "name": "Debug Rule",
            "type": "debug",
            "content": d.get("content", str(d)),
            "depends_on": []
        })

    return {"prompts": flattened}


async def confirm_prompts(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
) -> dict[str, Any]:
    """Approve prompts and build the execution queue."""
    # 1. Fetch project + latest prompts
    proj_res = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    so_res = await db.execute(
        select(StageOutput).where(
            StageOutput.project_id == project_id,
            StageOutput.stage == "prompts",
        ).order_by(StageOutput.created_at.desc()).limit(1)
    )
    so_record = so_res.scalar_one_or_none()
    if not so_record:
        raise HTTPException(status_code=400, detail="No prompts found to confirm.")

    prompt_data = so_record.output_json

    # 2. Clear existing tasks for this project
    await db.execute(
        ExecutionTask.__table__.delete().where(ExecutionTask.project_id == project_id)
    )
    
    await db.execute(
        Project.__table__.update()
        .where(Project.id == project_id)
        .values(current_state="PROMPTS_CONFIRMED")
    )
    
    # 3. Build topological queue
    tasks = prompt_data.get("task_prompts", [])
    integration = prompt_data.get("integration_prompts", [])
    
    # Simple dependency sort
    # In a real system, we'd use a proper graph lib. For MVP, we use a basic ordered list.
    # We combine tasks + integrations for the queue
    all_items = tasks + integration
    
    # Sort helper
    def get_order(items):
        ordered = []
        visited = set()
        
        def visit(item_id):
            if item_id in visited: return
            item = next((x for x in items if x['id'] == item_id or x['name'] == item_id), None)
            if not item: return
            
            for dep in item.get('depends_on', []):
                visit(dep)
            
            visited.add(item_id)
            if item not in ordered:
                ordered.append(item)
                
        for it in items:
            visit(it['id'])
        return ordered

    sorted_tasks = get_order(all_items)
    
    # 4. Create ExecutionTask records
    import uuid
    
    # Pre-generate UUIDs for mapping string ID to database UUID
    id_map = {t["id"]: uuid.uuid4() for t in sorted_tasks}
    
    execution_queue = []
    for i, t in enumerate(sorted_tasks):
        # Map string dependencies to their corresponding UUIDs
        mapped_deps = [
            id_map[dep] for dep in t.get("depends_on", []) 
            if dep in id_map
        ]
        
        new_task = ExecutionTask(
            id=id_map[t["id"]],
            project_id=project_id,
            task_name=t.get("name", "Unnamed Task"),
            task_order=i,
            prompt_used=t.get("content", ""),
            depends_on=mapped_deps,
            status="pending"
        )
        db.add(new_task)
        execution_queue.append({
            "id": t.get("id"),
            "name": new_task.task_name,
            "type": "task" if t in tasks else "integration",
            "order_index": i,
            "depends_on": t.get("depends_on", []) # Keep string IDs for the UI response
        })

    so_record.status = "approved"
    advance_state(project, "PROMPTS_CONFIRMED")
    await db.commit()

    return {
        "message": "Prompts confirmed. Execution queue built in dependency order.",
        "execution_queue": execution_queue,
    }
