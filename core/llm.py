"""Shared client for the OpenAI-compatible endpoint used by enrich and translate.

Both scripts previously built their own request and neither sent a User-Agent.
urllib's default (`Python-urllib/3.x`) is refused at the edge by the default
provider with a bare `error code: 1010`, which reads like an auth failure but is
not one — the same key succeeds as soon as the client identifies itself. Keeping
the request in one place means that class of bug is fixed once.
"""
from __future__ import annotations

import json
import os
import ssl
import time
from urllib.error import URLError
from urllib.request import Request, urlopen


USER_AGENT = "frontier/0.1 (+https://github.com/Alex-yang00/frontier)"
DEFAULT_ENDPOINT = "https://api.novita.ai/openai/v1/chat/completions"
DEFAULT_MODEL = "deepseek/deepseek-v3.2"
RETRIES = 3
RETRY_BACKOFF = 2.0


def api_key() -> str | None:
    return (
        os.environ.get("FRONTIER_TRANSLATION_API_KEY")
        or os.environ.get("NOVITA_API_KEY")
        or os.environ.get("OPENROUTER_API_KEY")
    )


def endpoint() -> str:
    value = os.environ.get("FRONTIER_TRANSLATION_ENDPOINT", DEFAULT_ENDPOINT).rstrip("/")
    return f"{value}/chat/completions" if value.endswith("/v1") else value


def model() -> str:
    return os.environ.get("FRONTIER_TRANSLATION_MODEL", DEFAULT_MODEL)


def complete(prompt: str, system: str, timeout: int = 90, temperature: float = 0) -> str:
    key = api_key()
    if not key:
        raise RuntimeError("LLM API key is not set")
    payload = {
        "model": model(),
        "temperature": temperature,
        # Bound hidden reasoning and output size. Without this, DeepSeek can
        # spend the entire request budget reasoning about a small JSON batch.
        "max_tokens": int(os.environ.get("FRONTIER_LLM_MAX_TOKENS", "4096")),
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    }
    request = Request(
        endpoint(),
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )
    # A long run makes tens of sequential calls and the endpoint intermittently
    # drops the TLS connection mid-handshake (observed: SSLEOFError on batch 12
    # of 38). These are transient, so a couple of spaced retries turn a failed
    # run into a slower one.
    last_error: Exception | None = None
    retry_count = max(1, int(os.environ.get("FRONTIER_LLM_RETRIES", str(RETRIES))))
    for attempt in range(retry_count):
        try:
            with urlopen(request, timeout=timeout) as response:
                return json.load(response)["choices"][0]["message"]["content"].strip()
        except (URLError, TimeoutError, ssl.SSLError) as error:
            last_error = error
            if attempt < retry_count - 1:
                time.sleep(RETRY_BACKOFF * (attempt + 1))
    raise RuntimeError(f"LLM request failed after {retry_count} attempts: {last_error}")


def parse_json_array(content: str) -> list:
    """Parse a model reply that should be a JSON array, tolerating code fences."""
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    parsed = json.loads(content)
    if isinstance(parsed, dict):
        parsed = parsed.get("items", [])
    if not isinstance(parsed, list):
        raise ValueError("model did not return a JSON array")
    return parsed


def parse_json_object(content: str) -> dict:
    """Parse a model reply that should be a JSON object, tolerating code fences."""
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    parsed = json.loads(content)
    if not isinstance(parsed, dict):
        raise ValueError("model did not return a JSON object")
    return parsed
