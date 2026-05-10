from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Request

from app.deps import get_current_user, get_service_client
from app.models.schemas import ChatCreateReq

router = APIRouter(prefix="/api/chats", tags=["chats"])


@router.post("")
async def create_chat(body: ChatCreateReq, user: dict = Depends(get_current_user)):
    svc = get_service_client()
    result = (
        svc.table("chats")
        .insert(
            {
                "user_id": user["id"],
                "title": body.title or "New Chat",
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create chat")

    chat = result.data[0]
    return chat


@router.get("")
async def list_chats(user: dict = Depends(get_current_user)):
    svc = get_service_client()
    result = (
        svc.table("chats")
        .select("id, user_id, title, preview_url, sandbox_id, created_at, updated_at")
        .eq("user_id", user["id"])
        .order("updated_at", desc=True)
        .limit(100)
        .execute()
    )
    return result.data or []


@router.get("/{chat_id}")
async def get_chat(chat_id: str, user: dict = Depends(get_current_user)):
    svc = get_service_client()

    chat = (
        svc.table("chats")
        .select("*")
        .eq("id", chat_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )

    if not chat.data:
        raise HTTPException(status_code=404, detail="Chat not found")

    messages = (
        svc.table("messages")
        .select("id, role, content, created_at")
        .eq("chat_id", chat_id)
        .order("created_at")
        .execute()
    )

    chat_data = chat.data
    chat_data["messages"] = messages.data or []
    return chat_data


@router.delete("/{chat_id}")
async def delete_chat(chat_id: str, user: dict = Depends(get_current_user)):
    svc = get_service_client()

    existing = (
        svc.table("chats")
        .select("id")
        .eq("id", chat_id)
        .eq("user_id", user["id"])
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Chat not found")

    svc.table("chats").delete().eq("id", chat_id).execute()
    return {"message": "Chat deleted"}


@router.patch("/{chat_id}/title")
async def update_chat_title(
    chat_id: str, request: Request, user: dict = Depends(get_current_user)
):
    body = await request.json()
    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title required")

    svc = get_service_client()
    svc.table("chats").update(
        {"title": title, "updated_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", chat_id).eq("user_id", user["id"]).execute()

    return {"message": "Title updated"}


@router.get("/{chat_id}/preview")
async def get_preview(chat_id: str, user: dict = Depends(get_current_user)):
    svc = get_service_client()
    chat = (
        svc.table("chats")
        .select("preview_url, sandbox_id")
        .eq("id", chat_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )

    if not chat.data:
        raise HTTPException(status_code=404, detail="Chat not found")

    return {
        "url": chat.data.get("preview_url"),
        "sandbox_id": chat.data.get("sandbox_id"),
    }
