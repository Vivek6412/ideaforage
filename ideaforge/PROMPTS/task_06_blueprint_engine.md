# task_06_blueprint_engine.md
# INJECT WITH: MASTER.md + STACK.md + SCHEMA.md (stage_outputs) + API_SPEC.md (STAGE 2) + BUSINESS_LOGIC.md (Stage 2 Rules) + CONVENTIONS.md

Implement blueprint generation with version verification + context file generation.

Files to create:
  backend/app/services/version_service.py
    - fetch_pypi_version(package: str) → str  (GET pypi.org/pypi/{pkg}/json)
    - fetch_npm_version(package: str) → str   (GET registry.npmjs.org/{pkg}/latest)
    - get_verified_versions(stack: dict) → dict
        Fetches all packages relevant to chosen stack
        Returns {package: latest_stable_version}
    - check_compatibility(stack, versions) → list[str]
        Known pairs: pydantic@2 requires fastapi>=0.100,
        next@14 requires react@18+, etc.
    - get_deprecation_flags(stack, versions) → list[dict]
        Returns framework-version-specific deprecation rules

  backend/app/services/blueprint_service.py
    - generate_blueprint(db, project_id, user_keys) → dict
        1. Get structured idea from stage_outputs
        2. Call version_service.get_verified_versions()
        3. Call version_service.get_deprecation_flags()
        4. Single Claude call with BLUEPRINT_PROMPT
        5. Generate Mermaid diagram source from blueprint JSON
        6. Return { blueprint, mermaid_source, warnings }
    - edit_blueprint_section(db, project_id, section, changes, user_keys) → dict
        Regenerate only specified section with single Claude call
        Merge back into full blueprint
    - confirm_blueprint(db, project_id) → list[dict]
        1. Save to stage_outputs
        2. Call file_generator.generate_all_files()
        3. Upload to Supabase Storage
        4. Advance state to BLUEPRINT_CONFIRMED
        5. Return list of generated file URLs

  backend/app/routers/blueprint.py
    - All routes from API_SPEC.md STAGE 2 section

  BLUEPRINT_PROMPT (in blueprint_service.py):
    """
    Role: software architect
    Input: structured_idea={idea_json}, verified_versions={versions},
           deprecations={dep_flags}
    Task: generate complete technical blueprint
    Rules:
    - monolithic default for MVPs
    - use ONLY versions from verified_versions (never assume)
    - inject deprecation flags into anti_patterns field
    - real DB schema (not placeholder) with exact types + constraints
    - real API endpoints (versioned /api/v1/)
    - reasoning per tech choice: max 10 words
    - complexity: Low|Medium|High (honest assessment)
    - return ONLY valid JSON:
    {
      "architecture": {"type":"","reasoning":"","diagram_description":""},
      "tech_stack": {"frontend":{"tech":"","reasoning":""},...},
      "modules": [{"name":"","description":"","sub_components":[],"depends_on":[]}],
      "database_schema": {"tables":[{"name":"","fields":[],"relationships":[]}]},
      "api_endpoints": [{"method":"","route":"","description":""}],
      "folder_structure": "",
      "third_party_integrations": [],
      "anti_patterns": [],
      "complexity_estimate": "",
      "estimated_modules_count": 0
    }
    """

Done when:
  - POST /generate returns full blueprint with verified versions
  - Mermaid source generated from blueprint
  - PATCH /edit regenerates only specified section
  - POST /confirm generates all 12 context files + uploads to Supabase Storage
  - State advances to BLUEPRINT_CONFIRMED