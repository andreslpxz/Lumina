from dotenv import load_dotenv
load_dotenv()

import os
import json
import bcrypt
import jwt
import secrets
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient

# ─── Config ─────────────────────────────────────────────────────────────
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
GROQ_API_KEY = os.environ["GROQ_API_KEY"]
E2B_API_KEY = os.environ["E2B_API_KEY"]
TAVILY_API_KEY = os.environ["TAVILY_API_KEY"]
MODEL_NAME = os.environ.get("MODEL_NAME", "llama-3.3-70b-versatile")

# ─── App ─────────────────────────────────────────────────────────────────
app = FastAPI(title="Axon Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ─── Password Hashing ───────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

# ─── JWT ─────────────────────────────────────────────────────────────────
def create_access_token(user_id: str, email: str) -> str:
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"},
        JWT_SECRET, algorithm=JWT_ALGORITHM,
    )

def create_refresh_token(user_id: str) -> str:
    return jwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"},
        JWT_SECRET, algorithm=JWT_ALGORITHM,
    )

# ─── Auth Dependency ─────────────────────────────────────────────────────
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── Pydantic Models ────────────────────────────────────────────────────
class RegisterReq(BaseModel):
    name: str
    email: str
    password: str

class LoginReq(BaseModel):
    email: str
    password: str

class ChatCreateReq(BaseModel):
    title: Optional[str] = None

class MessageReq(BaseModel):
    content: str
    chat_id: str

# ─── Auth Endpoints ─────────────────────────────────────────────────────
@app.post("/api/auth/register")
async def register(body: RegisterReq):
    email = body.email.strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    uid = str(result.inserted_id)
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    resp = JSONResponse({"id": uid, "email": email, "name": body.name.strip(), "role": "user"})
    resp.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return resp

@app.post("/api/auth/login")
async def login(body: LoginReq):
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    resp = JSONResponse({"id": uid, "email": email, "name": user.get("name", ""), "role": user.get("role", "user")})
    resp.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return resp

@app.post("/api/auth/logout")
async def logout():
    resp = JSONResponse({"message": "Logged out"})
    resp.delete_cookie("access_token", path="/")
    resp.delete_cookie("refresh_token", path="/")
    return resp

@app.get("/api/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

@app.post("/api/auth/refresh")
async def refresh_token(request: Request):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        uid = str(user["_id"])
        access = create_access_token(uid, user["email"])
        resp = JSONResponse({"message": "Token refreshed"})
        resp.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return resp
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ─── Chat Endpoints ─────────────────────────────────────────────────────
@app.post("/api/chats")
async def create_chat(body: ChatCreateReq, user: dict = Depends(get_current_user)):
    chat_doc = {
        "user_id": user["_id"],
        "title": body.title or "New Chat",
        "messages": [],
        "preview_url": None,
        "sandbox_id": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.chats.insert_one(chat_doc)
    chat_doc["_id"] = str(result.inserted_id)
    return chat_doc

@app.get("/api/chats")
async def list_chats(user: dict = Depends(get_current_user)):
    chats = await db.chats.find(
        {"user_id": user["_id"]},
        {"messages": 0}
    ).sort("updated_at", -1).to_list(100)
    for c in chats:
        c["_id"] = str(c["_id"])
    return chats

@app.get("/api/chats/{chat_id}")
async def get_chat(chat_id: str, user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": ObjectId(chat_id), "user_id": user["_id"]})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    chat["_id"] = str(chat["_id"])
    return chat

@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str, user: dict = Depends(get_current_user)):
    result = await db.chats.delete_one({"_id": ObjectId(chat_id), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"message": "Chat deleted"}

@app.patch("/api/chats/{chat_id}/title")
async def update_chat_title(chat_id: str, request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title required")
    await db.chats.update_one(
        {"_id": ObjectId(chat_id), "user_id": user["_id"]},
        {"$set": {"title": title, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Title updated"}

# ─── E2B Sandbox Management ─────────────────────────────────────────────
sandbox_registry = {}  # chat_id -> sandbox instance

async def get_or_create_sandbox(chat_id: str):
    from e2b_code_interpreter import Sandbox
    if chat_id in sandbox_registry:
        try:
            sandbox_registry[chat_id].commands.run("echo 1")
            return sandbox_registry[chat_id]
        except Exception:
            del sandbox_registry[chat_id]
    sandbox = Sandbox(api_key=E2B_API_KEY)
    sandbox_registry[chat_id] = sandbox
    # Save sandbox_id to chat
    await db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {"$set": {"sandbox_id": sandbox.sandbox_id}}
    )
    return sandbox

def detect_port(output: str) -> Optional[int]:
    import re
    match = re.search(r'(?:localhost:|127\.0\.0\.1:|port\s*:?\s*)(\d{4,5})', output, re.I)
    return int(match.group(1)) if match else None

async def execute_tool_call(tool_call: dict, chat_id: str) -> dict:
    name = tool_call.get("name", "")
    args = tool_call.get("arguments", {})

    if name == "run_command":
        sandbox = await get_or_create_sandbox(chat_id)
        command = args.get("command", "")
        is_bg = "&" in command or "npm run dev" in command or "npm start" in command
        try:
            result = sandbox.commands.run(command)
            stdout = result.stdout or ""
            stderr = result.stderr or ""
            port = detect_port(stdout) or detect_port(stderr)
            if port:
                preview_url = f"https://{sandbox.sandbox_id}-{port}.e2b.dev"
                await db.chats.update_one(
                    {"_id": ObjectId(chat_id)},
                    {"$set": {"preview_url": preview_url, "updated_at": datetime.now(timezone.utc)}}
                )
            return {"stdout": stdout, "stderr": stderr, "exitCode": result.exit_code}
        except Exception as e:
            return {"error": str(e)}

    elif name == "write_file":
        sandbox = await get_or_create_sandbox(chat_id)
        path = args.get("path", "")
        content = args.get("content", "")
        try:
            dir_path = path.rsplit("/", 1)[0] if "/" in path else ""
            if dir_path:
                sandbox.commands.run(f"mkdir -p {dir_path}")
            sandbox.files.write(path, content)
            return {"success": True, "message": f"File written to {path}"}
        except Exception as e:
            return {"error": str(e)}

    elif name == "read_file":
        sandbox = await get_or_create_sandbox(chat_id)
        path = args.get("path", "")
        try:
            content = sandbox.files.read(path)
            lines = content.split("\n")
            if len(lines) > 200:
                half = 100
                content = "\n".join(lines[:half]) + f"\n\n... [{len(lines)-200} lines truncated] ...\n\n" + "\n".join(lines[-half:])
            return {"content": content}
        except Exception as e:
            return {"error": str(e)}

    elif name == "search_web":
        query = args.get("query", "")
        try:
            async with httpx.AsyncClient() as client_http:
                resp = await client_http.post(
                    "https://api.tavily.com/search",
                    json={"api_key": TAVILY_API_KEY, "query": query, "include_answer": True},
                    timeout=15,
                )
                data = resp.json()
                return {"answer": data.get("answer", ""), "results": data.get("results", [])[:3]}
        except Exception as e:
            return {"error": str(e)}

    elif name == "load_skill":
        return {"success": True, "message": f"Skill {args.get('skill_name','')} loaded."}

    return {"error": f"Tool {name} not implemented"}

# ─── System Prompt ───────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are Axon, an expert autonomous AI software engineer.
Your goal is to complete the user's software development task efficiently.

You operate in a ReAct loop (Reason-Act).
For EVERY step, you must output a valid JSON object.
DO NOT write anything outside the JSON object. Do not wrap the JSON in markdown code blocks.

Your JSON output MUST match this exact schema:
{
  "thought": "Brief internal reasoning (hidden from user).",
  "message": "OPTIONAL. A friendly message to the user explaining what you are doing or announcing completion.",
  "tool_calls": [
    {
      "name": "tool_name",
      "arguments": {
        "arg1": "value1"
      }
    }
  ]
}

Available Tools:
1. run_command - Execute shell command. Use & for background processes (dev servers).
   Args: {"command": "string"}
2. write_file - Write content to a file path.
   Args: {"path": "string", "content": "string"}
3. read_file - Read file content.
   Args: {"path": "string"}
4. search_web - Search the web for docs/solutions.
   Args: {"query": "string"}
5. load_skill - Load additional capability: database_skill, web_search_skill, git_skill
   Args: {"skill_name": "string"}

Instructions:
1. Think step-by-step in 'thought'.
2. Use 'tool_calls' array for actions. Multiple calls allowed.
3. To just talk, provide 'message' with empty 'tool_calls': [].
4. USE 'message' to communicate clearly and announce completion.
5. On errors, analyze in next 'thought' and attempt fix.
6. You have a secure isolated sandbox. Create files, install deps, start servers freely.
7. For dev servers, use '&' at end of command to run in background.
8. When starting a web project, always create a complete working app.
9. After starting a dev server, wait a moment then verify it's running.

Start building!
"""

# ─── Chat Message Endpoint (Streaming) ──────────────────────────────────
@app.post("/api/chat")
async def chat_message(body: MessageReq, user: dict = Depends(get_current_user)):
    chat_id = body.chat_id
    content = body.content.strip()

    # Verify chat belongs to user
    chat = await db.chats.find_one({"_id": ObjectId(chat_id), "user_id": user["_id"]})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Save user message to DB
    user_msg = {"role": "user", "content": content, "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {"$push": {"messages": user_msg}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )

    # Auto-title if first message
    if len(chat.get("messages", [])) == 0:
        title = content[:50] + ("..." if len(content) > 50 else "")
        await db.chats.update_one({"_id": ObjectId(chat_id)}, {"$set": {"title": title}})

    # Build conversation from DB history
    messages_history = chat.get("messages", [])
    conversation = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in messages_history:
        conversation.append({"role": m["role"], "content": m["content"]})
    conversation.append({"role": "user", "content": content})

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
            assistant_msg = {
                "role": "assistant",
                "content": full_content,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            await db.chats.update_one(
                {"_id": ObjectId(chat_id)},
                {"$push": {"messages": assistant_msg}, "$set": {"updated_at": datetime.now(timezone.utc)}}
            )

            # Execute tool calls
            tool_calls = parsed.get("tool_calls", [])
            if tool_calls:
                for tc in tool_calls:
                    yield f"data: {json.dumps({'type': 'tool_start', 'toolCall': tc})}\n\n"
                    result = await execute_tool_call(tc, chat_id)
                    yield f"data: {json.dumps({'type': 'tool_result', 'toolCall': tc, 'result': result})}\n\n"

                    # Save tool result to messages
                    tool_msg = {
                        "role": "user",
                        "content": f"Tool Result ({tc['name']}): {json.dumps(result)[:2000]}",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                    await db.chats.update_one(
                        {"_id": ObjectId(chat_id)},
                        {"$push": {"messages": tool_msg}}
                    )

            # Send preview URL if available
            updated_chat = await db.chats.find_one({"_id": ObjectId(chat_id)}, {"preview_url": 1})
            if updated_chat and updated_chat.get("preview_url"):
                yield f"data: {json.dumps({'type': 'preview_url', 'url': updated_chat['preview_url']})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")

# ─── Preview URL ─────────────────────────────────────────────────────────
@app.get("/api/chats/{chat_id}/preview")
async def get_preview(chat_id: str, user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one(
        {"_id": ObjectId(chat_id), "user_id": user["_id"]},
        {"preview_url": 1, "sandbox_id": 1}
    )
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"url": chat.get("preview_url"), "sandbox_id": chat.get("sandbox_id")}

# ─── Health ──────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "axon-agent"}

# ─── Startup ─────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@axon.dev")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n")
