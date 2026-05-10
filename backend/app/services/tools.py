from datetime import datetime, timezone
from typing import Optional

import httpx

from app.config import TAVILY_API_KEY
from app.services.sandbox import get_or_create_sandbox, detect_port
from app.deps import get_service_client


async def execute_tool_call(tool_call: dict, chat_id: str) -> dict:
    name = tool_call.get("name", "")
    args = tool_call.get("arguments", {})

    if name == "run_command":
        sandbox = get_or_create_sandbox(chat_id)
        command = args.get("command", "")
        try:
            result = sandbox.commands.run(command)
            stdout = result.stdout or ""
            stderr = result.stderr or ""
            port = detect_port(stdout) or detect_port(stderr)
            if port:
                preview_url = f"https://{sandbox.sandbox_id}-{port}.e2b.dev"
                svc = get_service_client()
                svc.table("chats").update(
                    {
                        "preview_url": preview_url,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                ).eq("id", chat_id).execute()
            return {"stdout": stdout, "stderr": stderr, "exitCode": result.exit_code}
        except Exception as e:
            return {"error": str(e)}

    elif name == "write_file":
        sandbox = get_or_create_sandbox(chat_id)
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
        sandbox = get_or_create_sandbox(chat_id)
        path = args.get("path", "")
        try:
            content = sandbox.files.read(path)
            lines = content.split("\n")
            if len(lines) > 200:
                half = 100
                content = (
                    "\n".join(lines[:half])
                    + f"\n\n... [{len(lines) - 200} lines truncated] ...\n\n"
                    + "\n".join(lines[-half:])
                )
            return {"content": content}
        except Exception as e:
            return {"error": str(e)}

    elif name == "search_web":
        query = args.get("query", "")
        try:
            async with httpx.AsyncClient() as client_http:
                resp = await client_http.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": TAVILY_API_KEY,
                        "query": query,
                        "include_answer": True,
                    },
                    timeout=15,
                )
                data = resp.json()
                return {
                    "answer": data.get("answer", ""),
                    "results": data.get("results", [])[:3],
                }
        except Exception as e:
            return {"error": str(e)}

    elif name == "load_skill":
        return {
            "success": True,
            "message": f"Skill {args.get('skill_name', '')} loaded.",
        }

    return {"error": f"Tool {name} not implemented"}
