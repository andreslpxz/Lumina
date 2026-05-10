import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from app.config import GROQ_API_KEY, MODEL_NAME
from app.deps import get_current_user, get_service_client
from app.models.schemas import MessageReq
from app.services.ai_engine import SYSTEM_PROMPT
from app.services.tools import execute_tool_call

router = APIRouter(prefix="/api", tags=["ai"])


@router.post("/chat")
async def chat_message(body: MessageReq, user: dict = Depends(get_current_user)):
    chat_id = body.chat_id
    content = body.content.strip()
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

    # Save user message
    svc.table("messages").insert(
        {"chat_id": chat_id, "role": "user", "content": content}
    ).execute()

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
        title = content[:50] + ("..." if len(content) > 50 else "")
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
    for m in history.data or []:
        conversation.append({"role": m["role"], "content": m["content"]})

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

            # Execute tool calls
            tool_calls = parsed.get("tool_calls", [])
            if tool_calls:
                for tc in tool_calls:
                    yield f"data: {json.dumps({'type': 'tool_start', 'toolCall': tc})}\n\n"
                    result = await execute_tool_call(tc, chat_id)
                    yield f"data: {json.dumps({'type': 'tool_result', 'toolCall': tc, 'result': result})}\n\n"

                    # Save tool result as message
                    svc.table("messages").insert(
                        {
                            "chat_id": chat_id,
                            "role": "user",
                            "content": f"Tool Result ({tc['name']}): {json.dumps(result)[:2000]}",
                        }
                    ).execute()

            # Send preview URL if available
            updated_chat = (
                svc.table("chats")
                .select("preview_url")
                .eq("id", chat_id)
                .single()
                .execute()
            )
            if updated_chat.data and updated_chat.data.get("preview_url"):
                yield f"data: {json.dumps({'type': 'preview_url', 'url': updated_chat.data['preview_url']})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")
