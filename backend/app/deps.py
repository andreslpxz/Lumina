from fastapi import HTTPException, Request
from supabase import create_client, Client

from app.config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Service-role client for backend-only operations (bypasses RLS)
_service_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_service_client() -> Client:
    return _service_client


async def get_current_user(request: Request) -> dict:
    """Extract and verify the Supabase access token from the request."""
    token: str | None = None

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        resp = client.auth.get_user(token)
        if not resp or not resp.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = resp.user
        profile = (
            _service_client.table("profiles")
            .select("*")
            .eq("id", str(user.id))
            .single()
            .execute()
        )

        return {
            "id": str(user.id),
            "email": user.email,
            "name": profile.data.get("name", "") if profile.data else "",
            "role": profile.data.get("role", "user") if profile.data else "user",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Auth error: {exc}")
