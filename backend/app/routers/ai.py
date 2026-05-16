import json
import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import GROQ_API_KEY, MODEL_NAME
from app.deps import get_current_user, get_service_client
from app.models.schemas import MessageReq
from app.services.ai_engine import SYSTEM_PROMPT
from app.services.tools import execute_tool_call

router = APIRouter(prefix="/api", tags=["ai"])

SKILL_REF_RE = re.compile(r"@([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)", re.IGNORECASE)

class ToolExecuteReq(BaseModel):
    chat_id: str
    tool_call: dict

def _resolve_skill_prompts(content: str, user_id: str) -> str:
    """Find @skill-slug references and prepend their prompts."""
    slugs = SKILL_REF_RE.findall(content)
    if not slugs:
        return content

    svc = get_service_client()
    result = (
        svc.table("skills")
        .select("slug, name, prompt, usage_count")
        .in_("slug", [s.lower() for s in slugs])
        .or_(f"user_id.eq.{user_id},is_public.eq.true")
        .execute()
    )
    if not result.data:
        return content

    skill_context = ""
    for skill in result.data:
        skill_context += (
            f"\n[SKILL: {skill['name']}]\n{skill['prompt']}\n[/SKILL]\n"
        )
        svc.table("skills").update(
            {"usage_count": (skill.get("usage_count") or 0) + 1}
        ).eq("slug", skill["slug"]).execute()

    cleaned = SKILL_REF_RE.sub("", content).strip()
    return f"{skill_context}\nUser request: {cleaned}"


@router.post("/chat")
async def chat_message(body: MessageReq, user: dict = Depends(get_current_user)):
    chat_id = body.chat_id
    raw_content = body.content.strip()
    svc = get_service_client()

    # Verify chat belongs to user
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

    # Save original user message (with @skill refs visible)
    # Check if it's a tool result (prefixed or structured)
    is_tool_result = raw_content.startswith("Tool Result")

    svc.table("messages").insert(
        {"chat_id": chat_id, "role": "user", "content": raw_content}
    ).execute()

    # Resolve @skill references into actual prompts for the LLM
    content = _resolve_skill_prompts(raw_content, user["id"])

    # Update chat timestamp
    svc.table("chats").update(
        {"updated_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", chat_id).execute()

    # Auto-title if first message
    existing_msgs = (
        svc.table("messages")
        .select("id")
        .eq("chat_id", chat_id)
        .limit(2)
        .execute()
    )
    if len(existing_msgs.data or []) <= 1:
        title = raw_content[:50] + ("..." if len(raw_content) > 50 else "")
        svc.table("chats").update({"title": title}).eq("id", chat_id).execute()

    # Build conversation from DB history
    history = (
        svc.table("messages")
        .select("role, content")
        .eq("chat_id", chat_id)
        .order("created_at")
        .execute()
    )

    conversation = [{"role": "system", "content": SYSTEM_PROMPT}]
    for i, m in enumerate(history.data or []):
        msg_content = m["content"]
        if m["role"] == "user" and i == len(history.data) - 1:
            msg_content = content
        conversation.append({"role": m["role"], "content": msg_content})

    async def stream_response():
        import groq as groq_module

        groq_client = groq_module.Groq(api_key=GROQ_API_KEY)

        try:
            completion = groq_client.chat.completions.create(
                model=MODEL_NAME,
                messages=conversation,
                stream=True,
                temperature=0.2,
                response_format={"type": "json_object"},
            )

            full_content = ""
            for chunk in completion:
                token = chunk.choices[0].delta.content or ""
                if token:
                    full_content += token
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

            # Parse JSON response
            try:
                parsed = json.loads(full_content)
            except json.JSONDecodeError:
                yield f"data: {json.dumps({'type': 'error', 'content': 'Failed to parse LLM response'})}\n\n"
                return

            yield f"data: {json.dumps({'type': 'parsed', 'data': parsed})}\n\n"

            # Save assistant message
            svc.table("messages").insert(
                {"chat_id": chat_id, "role": "assistant", "content": full_content}
            ).execute()

            svc.table("chats").update(
                {"updated_at": datetime.now(timezone.utc).isoformat()}
            ).eq("id", chat_id).execute()

            # We NO LONGER execute tools automatically here.
            # The frontend will receive 'parsed' which contains 'tool_calls'.
            # It will ask the user for permission.

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")


@router.post("/execute_tool")
async def execute_tool(body: ToolExecuteReq, user: dict = Depends(get_current_user)):
    chat_id = body.chat_id
    tc = body.tool_call
    svc = get_service_client()

    # Verify chat belongs to user
    chat = (
        svc.table("chats")
        .select("id")
        .eq("id", chat_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not chat.data:
        raise HTTPException(status_code=404, detail="Chat not found")

    result = await execute_tool_call(tc, chat_id)

    # Send preview URL if available after execution
    preview_url = None
    updated_chat = (
        svc.table("chats")
        .select("preview_url")
        .eq("id", chat_id)
        .single()
        .execute()
    )
    if updated_chat.data:
        preview_url = updated_chat.data.get("preview_url")

    return {"result": result, "preview_url": preview_url}
