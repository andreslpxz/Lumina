import re
from typing import Optional
from .local_sandbox import get_local_sandbox

def get_or_create_sandbox(chat_id: str):
    # Ignoring chat_id to maintain a single workspace as requested ("mismo trabajador")
    return get_local_sandbox()

def detect_port(output: str) -> Optional[int]:
    match = re.search(
        r"(?:localhost:|127\.0\.0\.1:|port\s*:?\s*)(\d{4,5})", output, re.I
    )
    return int(match.group(1)) if match else None
