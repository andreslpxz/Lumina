# Backwards-compatible entrypoint.
# The actual application lives in app/main.py
from app.main import app  # noqa: F401
