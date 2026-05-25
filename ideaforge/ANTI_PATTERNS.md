# ANTI_PATTERNS.md — IdeaForge AI
# NEVER DO THESE. VIOLATIONS BREAK THE PRODUCT.

## Security
- NEVER store JWT in localStorage → httpOnly cookies only
- NEVER log or return decrypted API keys in any response
- NEVER skip Fernet decryption error handling (key may be invalid)
- NEVER trust user_id from request body → always from JWT token
- NEVER skip input validation on any endpoint
- NEVER use plain text API keys in memory longer than the API call

## FastAPI
- NEVER use sync def for any DB or external API operation → async def only
- NEVER put business logic in routers → use services/
- NEVER return raw exceptions → always HTTPException with status code
- NEVER skip response_model on endpoint definitions
- NEVER use global state → use dependency injection

## SQLAlchemy 2.0
- NEVER use Query() API → use select() statements
  Wrong:  session.query(User).filter(User.id == id).first()
  Right:  await session.execute(select(User).where(User.id == id))
- NEVER use synchronous session in async context
- NEVER forget to await session operations
- NEVER use db.session Flask-style → use Depends(get_db)
- NEVER call session.execute() without await

## Pydantic v2
- NEVER use @validator → use @field_validator
- NEVER use .dict() → use .model_dump()
- NEVER use .json() → use .model_dump_json()
- NEVER use schema() → use model_json_schema()
- NEVER mix Pydantic v1 and v2 patterns

## Next.js 14 (App Router)
- NEVER use pages/ directory → use app/ only
- NEVER use getServerSideProps → use Server Components + fetch()
- NEVER use getStaticProps → use fetch() with cache options
- NEVER use _app.tsx → use app/layout.tsx
- NEVER import server-only code in client components

## Claude Code Subprocess
- NEVER let Claude Code attempt more than 1 self-fix → agent takeover
- NEVER let Claude modify files outside approved folder structure
- NEVER inject new task before previous task is fully complete
- NEVER skip drift verification after every fix
- NEVER trust Claude Code output without parsing + validating

## Execution Engine
- NEVER write files to disk before user approval
- NEVER advance state without explicit user action
- NEVER skip validation checks before showing user
- NEVER retry more than: parse(2x), validation(2x), API(3x)
- NEVER expose raw error stack traces to end users

## API Keys (BYOK)
- NEVER store API keys unencrypted
- NEVER return API key values in GET responses
- NEVER use platform owner's keys in production
- NEVER hardcode any API key anywhere in code

## GitHub
- NEVER push .env files → always in .gitignore
- NEVER push node_modules, __pycache__, .next, venv

## Versions
- NEVER use versions from Claude's memory → always from DEPENDENCIES.md
- NEVER install packages not listed in DEPENDENCIES.md
- NEVER mix async and sync SQLAlchemy patterns
