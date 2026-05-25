from __future__ import annotations

from fastapi import HTTPException

from app.models.project import Project

VALID_STATES: list[str] = [
    "IDEA_CAPTURE",
    "IDEA_CONFIRMED",
    "BLUEPRINT_DRAFT",
    "BLUEPRINT_CONFIRMED",
    "PROMPTS_GENERATED",
    "PROMPTS_CONFIRMED",
    "EXECUTION_RUNNING",
    "EXECUTION_COMPLETE",
    "GITHUB_PUSHED",
    "DEPLOYED",
    "PAUSED",
]

# "any → PAUSED" encoded by adding PAUSED to every source state.
# "PAUSED → previous_state" handled in project_service.resume_project
# via paused_reason JSON; PAUSED maps to all states here to allow it.
VALID_TRANSITIONS: dict[str, set[str]] = {
    "IDEA_CAPTURE":        {"IDEA_CONFIRMED", "PAUSED"},
    "IDEA_CONFIRMED":      {"BLUEPRINT_DRAFT", "PAUSED"},
    "BLUEPRINT_DRAFT":     {"BLUEPRINT_CONFIRMED", "PAUSED"},
    "BLUEPRINT_CONFIRMED": {"PROMPTS_GENERATED", "PAUSED"},
    "PROMPTS_GENERATED":   {"PROMPTS_CONFIRMED", "PAUSED"},
    "PROMPTS_CONFIRMED":   {"EXECUTION_RUNNING", "PAUSED"},
    "EXECUTION_RUNNING":   {"EXECUTION_COMPLETE", "PAUSED"},
    "EXECUTION_COMPLETE":  {"GITHUB_PUSHED", "PAUSED"},
    "GITHUB_PUSHED":       {"DEPLOYED", "PAUSED"},
    "DEPLOYED":            {"PAUSED"},
    "PAUSED":              set(VALID_STATES),  # resume → any prior valid state
}


def advance_state(project: Project, new_state: str) -> Project:
    """
    Validate transition and mutate project.current_state in place.
    Raises HTTPException(400) on invalid transition or same-state call.
    """
    current = project.current_state

    if new_state not in VALID_STATES:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": f"Unknown state: {new_state}",
                "code": "UNKNOWN_STATE",
            },
        )

    if current == new_state:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": f"Project is already in state {current}",
                "code": "ALREADY_IN_STATE",
            },
        )

    allowed = VALID_TRANSITIONS.get(current, set())
    if new_state not in allowed:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": f"Invalid transition: {current} → {new_state}",
                "code": "INVALID_STATE_TRANSITION",
            },
        )

    project.current_state = new_state
    return project