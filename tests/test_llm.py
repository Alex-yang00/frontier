import json

from core import llm


def _payload_of(monkeypatch, **kwargs) -> dict:
    """Capture the request body complete() would send."""
    seen: dict = {}

    class FakeResponse:
        def read(self):
            return json.dumps({"choices": [{"message": {"content": "ok"}}]}).encode()

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    def fake_urlopen(request, timeout=None, context=None):
        seen.update(json.loads(request.data))
        return FakeResponse()

    monkeypatch.setattr(llm, "urlopen", fake_urlopen)
    monkeypatch.setenv("FRONTIER_TRANSLATION_API_KEY", "test-key")
    llm.complete("prompt", "system", **kwargs)
    return seen


def test_a_heavy_caller_can_raise_the_token_ceiling(monkeypatch):
    """The ceiling covers reasoning and reply together, so the classify call needs
    more than the shared default; a truncated reply loses its whole batch."""
    assert _payload_of(monkeypatch, max_tokens=8192)["max_tokens"] == 8192


def test_callers_that_pass_nothing_keep_the_default(monkeypatch):
    monkeypatch.delenv("FRONTIER_LLM_MAX_TOKENS", raising=False)

    assert _payload_of(monkeypatch)["max_tokens"] == 4096


def test_the_env_override_still_applies(monkeypatch):
    monkeypatch.setenv("FRONTIER_LLM_MAX_TOKENS", "2048")

    assert _payload_of(monkeypatch)["max_tokens"] == 2048
