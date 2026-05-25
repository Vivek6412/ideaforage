# task_05_idea_capture_engine.md
# INJECT WITH: MASTER.md + STACK.md + SCHEMA.md (stage_outputs) + API_SPEC.md (STAGE 1) + BUSINESS_LOGIC.md (Stage 1 Rules) + CONVENTIONS.md

Implement multi-modal idea capture + Claude-powered clarification.

Files to create:
  backend/app/core/ai_client.py
    - AIClient class with methods:
      call(api_key, provider, system, user, max_tokens) → str
      Supports: anthropic, openai, gemini
      Fallback chain: try anthropic → openai → gemini
      Exponential backoff: 2s, 4s, 8s on rate limit/timeout
      Returns parsed text content only

  backend/app/services/idea_service.py
    - preprocess_text(text: str) → str
    - preprocess_voice(audio: bytes, openai_key: str) → str (Whisper API)
    - preprocess_file(file: UploadFile) → str
        .md/.txt: decode UTF-8
        .pdf: PyMuPDF text extraction (no Claude tokens)
        .docx: python-docx paragraph extraction
    - preprocess_image(image: UploadFile, anthropic_key: str) → str
        Claude Vision call, max 200 words output
    - merge_inputs(text, voice, file, image) → str
    - process_idea(db, project_id, merged_input, user_keys) → dict
        Single Claude call with IDEA_EXTRACTION_PROMPT
        Returns: { understood, clarifying_questions, warnings, ready_to_confirm }
    - refine_idea(db, project_id, answers, corrections, round) → dict
        Partial correction: update only changed fields
        Enforces max 3 rounds (force confirm on round 4)
        Returns same schema as process_idea
    - confirm_idea(db, project_id) → None
        Saves to stage_outputs with status=approved
        Advances state to IDEA_CONFIRMED

  backend/app/routers/idea.py
    - All routes from API_SPEC.md STAGE 1 section
    - POST /process: multipart/form-data handler
    - POST /refine: JSON body
    - POST /confirm: no body needed

  IDEA_EXTRACTION_PROMPT (in idea_service.py):
    """
    Role: product analyst
    Task: extract structured idea from user input
    Rules:
    - ask max {max_questions} clarifying questions
    - never re-ask answered fields
    - idk response: generate exactly 5 context-specific suggestions
    - warn if: features>8 (too_broad), ML/blockchain/hardware (infeasible),
      exact major platform clone (crowded_market)
    - warnings advisory only, never block
    - return ONLY valid JSON:
    {
      "understood": {
        "problem": "", "target_users": [], "core_features": [],
        "business_model": "", "platform": "", "scope": "", "out_of_scope": []
      },
      "clarifying_questions": [],
      "idk_suggestions": {"field": "", "options": []},
      "warnings": [{"type": "", "message": "", "suggestion": ""}],
      "ready_to_confirm": false
    }
    """

Done when:
  - POST /process with text input returns structured idea + questions
  - POST /process with PDF file extracts text correctly
  - POST /refine with answers refines only specified fields
  - Round 4 auto-confirms regardless
  - POST /confirm saves to stage_outputs, state → IDEA_CONFIRMED
