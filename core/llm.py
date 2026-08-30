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
from urllib.request import ProxyHandler, Request, build_opener, urlopen


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


def model_chain() -> list[str]:
    """Primary model followed by optional provider-supported fallbacks."""
    configured = os.environ.get("FRONTIER_LLM_FALLBACK_MODELS", "")
    values = [model(), *(value.strip() for value in configured.split(","))]
    return list(dict.fromkeys(value for value in values if value))


class TruncatedReply(RuntimeError):
    """The reply hit the token ceiling. Retrying as-is truncates again."""


class EmptyReply(RuntimeError):
    """The provider returned no content. Often transient, so worth a retry."""


def _content_of(body: dict) -> str:
    """Pull the reply text out, and name the two ways it arrives unusable.

    Both were previously invisible. The caller passes the text to json.loads,
    so an empty reply surfaced as "Expecting value: line 1 column 1 (char 0)"
    and a reply cut off at the token ceiling as "Unterminated string starting
    at: ...", neither of which points at the cause. Measured on run
    32341638589: 4 of 5 classify batches and every zh translate batch failed
    this way, and the ceiling was read as adequate because the truncation
    point (~1200 tokens) sat far below it -- the reasoning tokens that share
    the same budget are not visible in the reply.
    """
    choice = (body.get("choices") or [{}])[0]
    content = (choice.get("message") or {}).get("content") or ""
    usage = body.get("usage") or {}
    spent = usage.get("completion_tokens")
    reasoning = (usage.get("completion_tokens_details") or {}).get("reasoning_tokens")
    detail = f"completion_tokens={spent} reasoning_tokens={reasoning}"
    if choice.get("finish_reason") == "length":
        raise TruncatedReply(
            f"reply hit the token ceiling before finishing ({detail}); "
            "raise max_tokens or lower the batch size"
        )
    if not content.strip():
        raise EmptyReply(
            f"reply was empty, finish_reason={choice.get('finish_reason')!r} ({detail})"
        )
    return content.strip()


def complete(
    prompt: str,
    system: str,
    timeout: int = 90,
    temperature: float = 0,
    max_tokens: int | None = None,
    models: list[str] | None = None,
) -> str:
    key = api_key()
    if not key:
        raise RuntimeError("LLM API key is not set")
    payload = {
        "model": model(),
        "temperature": temperature,
        # Bound hidden reasoning and output size. Without this, DeepSeek can
        # spend the entire request budget reasoning about a small JSON batch.
        #
        # This ceiling covers reasoning AND the reply together, so a caller whose
        # reply is large must raise it or the JSON arrives truncated -- and a
        # truncated reply is a parse error that discards the whole batch, not a
        # short answer. The env var stays the default for callers that pass
        # nothing; an explicit argument wins so one heavy caller does not force
        # every other call to pay for headroom it never uses.
        "max_tokens": max_tokens or int(os.environ.get("FRONTIER_LLM_MAX_TOKENS", "4096")),
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    }
    # A long run makes tens of sequential calls and the endpoint intermittently
    # drops the TLS connection mid-handshake (observed: SSLEOFError on batch 12
    # of 38). These are transient, so a couple of spaced retries turn a failed
    # run into a slower one. An empty reply is retried on the same grounds.
    # TruncatedReply deliberately is not: the same request truncates again, so a
    # retry only spends the budget twice before failing identically.
    errors: list[str] = []
    retry_count = max(1, int(os.environ.get("FRONTIER_LLM_RETRIES", str(RETRIES))))
    candidates = models or model_chain()
    for candidate_model in candidates:
        payload["model"] = candidate_model
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
        direct_open = build_opener(ProxyHandler({})).open
        for attempt in range(retry_count):
            try:
                opener = urlopen if attempt == 0 else direct_open
                with opener(request, timeout=timeout) as response:
                    return _content_of(json.load(response))
            except TruncatedReply as error:
                errors.append(f"{candidate_model}: {error}")
                break
            except (URLError, TimeoutError, ssl.SSLError, EmptyReply) as error:
                errors.append(f"{candidate_model}: {error}")
                if attempt < retry_count - 1:
                    time.sleep(RETRY_BACKOFF * (attempt + 1))
        if len(candidates) > 1:
            print(f"  model {candidate_model} unavailable; trying fallback")
    raise RuntimeError(
        f"LLM request failed across {len(candidates)} model(s): "
        + "; ".join(errors[-len(candidates):])
    )


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
