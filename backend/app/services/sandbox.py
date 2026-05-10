import re
from typing import Optional

from e2b_code_interpreter import Sandbox

from app.config import E2B_API_KEY

# In-memory sandbox registry.
# TODO: Replace with Redis for multi-instance deployments.
_sandbox_registry: dict[str, Sandbox] = {}


def get_or_create_sandbox(chat_id: str) -> Sandbox:
    if chat_id in _sandbox_registry:
        try:
            _sandbox_registry[chat_id].commands.run("echo 1")
            return _sandbox_registry[chat_id]
        except Exception:
            del _sandbox_registry[chat_id]

    sandbox = Sandbox(api_key=E2B_API_KEY)
    _sandbox_registry[chat_id] = sandbox
    return sandbox


def detect_port(output: str) -> Optional[int]:
    match = re.search(
        r"(?:localhost:|127\.0\.0\.1:|port\s*:?\s*)(\d{4,5})", output, re.I
    )
    return int(match.group(1)) if match else None
