from fastapi import APIRouter, HTTPException, Depends

from app.deps import get_current_user, get_service_client
from app.models.schemas import RegisterReq, LoginReq
from app.config import SUPABASE_URL, SUPABASE_ANON_KEY

from supabase import create_client

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(body: RegisterReq):
    try:
        client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        resp = client.auth.sign_up(
            {
                "email": body.email.strip().lower(),
                "password": body.password,
                "options": {"data": {"name": body.name.strip()}},
            }
        )

        if not resp.user:
            raise HTTPException(status_code=400, detail="Registration failed")

        return {
            "id": str(resp.user.id),
            "email": resp.user.email,
            "name": body.name.strip(),
            "role": "user",
            "access_token": resp.session.access_token if resp.session else None,
            "refresh_token": resp.session.refresh_token if resp.session else None,
        }
    except HTTPException:
        raise
    except Exception as exc:
        msg = str(exc)
        if "already registered" in msg.lower() or "already been registered" in msg.lower():
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=400, detail=f"Registration failed: {msg}")


@router.post("/login")
async def login(body: LoginReq):
    try:
        client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        resp = client.auth.sign_in_with_password(
            {"email": body.email.strip().lower(), "password": body.password}
        )

        if not resp.user or not resp.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        svc = get_service_client()
        profile = (
            svc.table("profiles")
            .select("name, role")
            .eq("id", str(resp.user.id))
            .single()
            .execute()
        )

        return {
            "id": str(resp.user.id),
            "email": resp.user.email,
            "name": profile.data.get("name", "") if profile.data else "",
            "role": profile.data.get("role", "user") if profile.data else "user",
            "access_token": resp.session.access_token,
            "refresh_token": resp.session.refresh_token,
        }
    except HTTPException:
        raise
    except Exception as exc:
        msg = str(exc)
        if "invalid" in msg.lower():
            raise HTTPException(status_code=401, detail="Invalid credentials")
        raise HTTPException(status_code=401, detail=f"Login failed: {msg}")


@router.post("/logout")
async def logout():
    return {"message": "Logged out"}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/refresh")
async def refresh_token_endpoint(body: dict):
    refresh_tok = body.get("refresh_token")
    if not refresh_tok:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        resp = client.auth.refresh_session(refresh_tok)

        if not resp.session:
            raise HTTPException(status_code=401, detail="Refresh failed")

        return {
            "access_token": resp.session.access_token,
            "refresh_token": resp.session.refresh_token,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Refresh failed: {exc}")

@router.patch("/settings")
async def update_settings(body: dict, user: dict = Depends(get_current_user)):
    svc = get_service_client()
    result = svc.table("profiles").update({"settings": body}).eq("id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Update failed")
    return {"status": "success", "settings": body}

@router.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    svc = get_service_client()
    result = svc.table("profiles").select("settings").eq("id", user["id"]).single().execute()
    if not result.data:
        # Return defaults if not set (though we added a default to the table)
        return {
            "provider": "groq",
            "model": "llama-3.3-70b-versatile",
            "temperature": 0.7,
            "top_p": 0.9,
            "max_tokens": 4096,
            "theme": "dark",
            "language": "es",
            "enter_to_send": true,
            "skills": {
                "internet": true,
                "sandbox": true,
                "files": true
            }
        }
    return result.data.get("settings", {})
