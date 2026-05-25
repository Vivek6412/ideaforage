# task_03_auth_byok.md
# INJECT WITH: MASTER.md + STACK.md + SCHEMA.md (users+user_api_keys+user_integrations) + API_SPEC.md (AUTH+API KEYS) + CONVENTIONS.md

Implement auth system + BYOK API key management + OAuth integration storage.

Files to create:
  backend/app/core/encryption.py
    - generate_fernet_key() → str
    - encrypt(value: str) → str
    - decrypt(encrypted: str) → str
    - Uses FERNET_KEY from settings

  backend/app/middleware/auth.py
    - get_current_user(request: Request, db: AsyncSession) → User
    - Reads JWT from httpOnly cookie named 'access_token'
    - Decodes with JWT_SECRET + JWT_ALGORITHM
    - Returns User or raises HTTPException(401)

  backend/app/schemas/auth.py
    - RegisterRequest: email, password (min 8 chars), full_name
    - LoginRequest: email, password
    - UserResponse: id, email, full_name, tier, is_verified, created_at
    - ApiKeyRequest: provider, api_key
    - ApiKeyResponse: provider, has_key, created_at (never return key)
    - IntegrationResponse: provider, connected, username

  backend/app/services/auth_service.py
    - register(db, data) → User (hash password bcrypt, create user)
    - login(db, data) → (User, jwt_token)
    - get_user_by_id(db, id) → User
    - verify_token(token: str) → dict (payload)
    - save_api_key(db, user_id, provider, raw_key) → encrypt + upsert
    - get_api_key(db, user_id, provider) → decrypted key (str)
    - delete_api_key(db, user_id, provider) → None
    - verify_api_key(raw_key, provider) → bool (test minimal API call)
    - save_integration(db, user_id, provider, token, username) → None
    - get_integration(db, user_id, provider) → decrypted token

  backend/app/routers/auth.py
    - Implement all routes from API_SPEC.md AUTH + API KEYS + INTEGRATIONS
    - POST /register: create user, return UserResponse
    - POST /login: create JWT, set httpOnly cookie (7 days), return user
    - POST /logout: clear cookie
    - GET /me: return current user (Depends(get_current_user))
    - GET /keys: return [ApiKeyResponse] (has_key bool only, no raw key)
    - POST /keys: encrypt + upsert, verify key, return message
    - DELETE /keys/{provider}: delete
    - POST /keys/verify: test call with stored key
    - GET /integrations: return connection status per provider
    - GET /integrations/github/oauth-url: build GitHub OAuth URL
    - POST /integrations/github/callback: exchange code → token → store
    - DELETE /integrations/{provider}: delete

Security:
  - Passwords: bcrypt via passlib
  - JWT: python-jose, httpOnly cookie, SameSite=Lax, Secure in production
  - API keys: Fernet encrypted before any DB write
  - Never log decrypted keys
  - verify_api_key: minimal test call (list models or similar)

Done when:
  - POST /api/v1/auth/register creates user, returns 201
  - POST /api/v1/auth/login sets httpOnly cookie, returns user
  - GET /api/v1/auth/me returns user with valid cookie, 401 without
  - POST /api/v1/keys saves encrypted key, GET /keys shows has_key=true
  - POST /api/v1/keys/verify returns valid: true with valid key
  - pytest tests/test_auth.py passes all tests
