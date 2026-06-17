from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

_BACKOFF_DELAYS: list[int] = [5, 15, 30]

# OpenRouter endpoint + default model when routing through it
_OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
_OPENROUTER_MODEL: str = "anthropic/claude-sonnet-4-5"

# ── Gemini Multi-Model Configuration ──────────────────────────────────────────

# Models in prioritized order for fallback
GEMINI_MODELS: list[str] = [
    "gemini-3.5-flash",           # Outstanding performance (Stable)
    "gemini-3.1-flash-lite",      # Ultra-fast, high-volume (Stable)
    "gemini-3-flash-preview",     # 3-series Preview
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-pro",             # Complex reviews, heavy logic (Free tier 5 RPM)
    "gemini-2.5-flash",           # Mature all-rounder (Free tier 15 RPM)
    "gemini-2.5-flash-lite",      # Lightweight, fast (Free tier 15 RPM)
    "gemini-3.1-flash-live-preview",
    "gemini-3.1-flash-tts-preview",
]


class AIClient:
    """
    Single-provider AI caller with exponential backoff on rate limits.
    Auto-detects OpenRouter keys (sk-or-*) and routes to OpenRouter endpoint.
    Never logs api_key values.
    """

    async def call(
        self,
        api_key: str,
        provider: str,
        system: str,
        user: str,
        max_tokens: int = 2000,
    ) -> str:
        """
        Call one specific provider with exponential backoff on rate limits.
        Non-rate-limit errors raise immediately.
        """
        for attempt in range(len(_BACKOFF_DELAYS) + 1):
            if attempt > 0:
                delay = _BACKOFF_DELAYS[attempt - 1]
                logger.info("Rate limit provider=%s — backing off %ds", provider, delay)
                await asyncio.sleep(delay)
            try:
                if provider == "anthropic":
                    return await self._call_anthropic(api_key, system, user, max_tokens)
                elif provider == "openai":
                    return await self._call_openai(api_key, system, user, max_tokens)
                elif provider == "gemini":
                    # For Gemini, use the multi-model fallback chain
                    return await self._call_gemini_with_fallback(api_key, system, user, max_tokens)
                else:
                    raise ValueError(f"Unknown provider: {provider}")
            except _rate_limit_errors() as exc:
                if attempt == len(_BACKOFF_DELAYS):
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "detail": f"Rate limit exceeded after {len(_BACKOFF_DELAYS)} retries for {provider}",
                            "code": "RATE_LIMIT_EXCEEDED",
                        },
                    ) from exc
                continue

    async def call_with_fallback(
        self,
        user_keys: dict[str, str],
        system: str,
        user: str,
        max_tokens: int = 2000,
    ) -> str:
        """
        Try providers: anthropic → openai → gemini.
        OpenRouter keys (sk-or-*) stored under 'openai' slot are auto-detected.
        """
        last_error: str = "No API keys configured"
        for provider in ("anthropic", "openai", "gemini"):
            api_key = user_keys.get(provider)
            if not api_key:
                continue
            try:
                return await self.call(api_key, provider, system, user, max_tokens)
            except HTTPException as exc:
                last_error = (
                    exc.detail.get("detail", str(exc))
                    if isinstance(exc.detail, dict)
                    else str(exc.detail)
                )
                logger.warning("Provider %s failed — trying next. error=%s", provider, last_error)
            except Exception as exc:
                last_error = str(exc)
                logger.warning("Provider %s failed — trying next. error=%s", provider, last_error)

        raise HTTPException(
            status_code=503,
            detail={
                "detail": f"All AI providers failed: {last_error}",
                "code": "AI_UNAVAILABLE",
            },
        )

    # ── Provider implementations ──────────────────────────────────────────────

    async def _call_anthropic(
        self, api_key: str, system: str, user: str, max_tokens: int
    ) -> str:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=api_key)
        kwargs: dict[str, Any] = {
            "model": "claude-sonnet-4-5",
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": user}],
        }
        if system:
            kwargs["system"] = system
        response = await client.messages.create(**kwargs)
        return response.content[0].text

    async def _call_openai(
        self, api_key: str, system: str, user: str, max_tokens: int
    ) -> str:
        from openai import AsyncOpenAI

        # Auto-detect OpenRouter keys — route to OpenRouter endpoint
        is_openrouter = api_key.startswith("sk-or-")
        client = AsyncOpenAI(
            api_key=api_key,
            base_url=_OPENROUTER_BASE_URL if is_openrouter else "https://api.openai.com/v1",
            default_headers=(
                {"HTTP-Referer": "https://ideaforge.ai", "X-Title": "IdeaForge"}
                if is_openrouter
                else {}
            ),
        )
        model = _OPENROUTER_MODEL if is_openrouter else "gpt-4o"

        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": user})

        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    async def _call_gemini_with_fallback(
        self, api_key: str, system: str, user: str, max_tokens: int
    ) -> str:
        """Iterate through prioritized Gemini models if 429 or 503 occurs."""
        last_err = ""
        for model_name in GEMINI_MODELS:
            try:
                return await self._call_gemini_raw(api_key, model_name, system, user, max_tokens)
            except (RuntimeError, _GeminiRateLimitError) as exc:
                last_err = str(exc)
                if "429" in last_err or "503" in last_err:
                    logger.warning("Gemini model %s failed (%s) — trying next model in line", model_name, last_err)
                    continue
                raise # Re-raise if it's a fatal error (like 400 Bad Request)

        raise RuntimeError(f"All Gemini models exhausted. Last error: {last_err}")

    async def _call_gemini_raw(
        self, api_key: str, model_name: str, system: str, user: str, max_tokens: int
    ) -> str:
        if system:
            user = f"System Instructions:\n{system}\n\nUser Input:\n{user}"
            
        payload: dict[str, Any] = {
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {"maxOutputTokens": max_tokens},
        }

        # Determine endpoint based on model version/type
        version = "v1" if "2.5" in model_name or "3.5" in model_name else "v1beta"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/{version}/models/{model_name}:generateContent?key={api_key}",
                json=payload,
            )
        
        if resp.status_code == 429:
            raise _GeminiRateLimitError(f"Gemini 429: {resp.text[:100]}")
        if resp.status_code == 503:
            raise RuntimeError(f"Gemini 503: Service Unavailable/High Demand")
        if resp.status_code != 200:
            raise RuntimeError(f"Gemini error {resp.status_code}: {resp.text[:200]}")
            
        data = resp.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise RuntimeError(f"Gemini returned unexpected structure: {json.dumps(data)[:200]}")


# ── Rate-limit helpers ────────────────────────────────────────────────────────

class _GeminiRateLimitError(Exception):
    pass


def _rate_limit_errors() -> tuple[type[Exception], ...]:
    try:
        from anthropic import RateLimitError as ARL
    except ImportError:
        ARL = Exception  # type: ignore[assignment,misc]
    try:
        from openai import RateLimitError as ORL
    except ImportError:
        ORL = Exception  # type: ignore[assignment,misc]
    return (ARL, ORL, _GeminiRateLimitError)


ai_client = AIClient()
