import json
import os
import re
from typing import List, Dict, Any, Optional
from app.config import (
    GROQ_API_KEY,
    MODEL_NAME
)

# Base System Prompt
SYSTEM_PROMPT = """You are Lumina, an expert autonomous AI software engineer.
Your goal is to complete the user's software development task efficiently.

YOU ARE AN AUTONOMOUS AI AGENT running on the user's system.
You have the ability to think, plan, and execute tasks using the tools provided to you.
Always identify as Lumina, an autonomous IA.

IMPORTANT: ALWAYS RESPOND IN THE USER'S LANGUAGE. If the user speaks Spanish, you MUST respond in Spanish. If they speak English, respond in English, and so on.

YOU ARE RUNNING in a persistent workspace directory (./workspace).
Anything you do persists across sessions. You are like a 24/7 personal worker.

IMPORTANT: Before reading or modifying files, ALWAYS verify their existence and correct name.
For example, if the user asks you to read the README, check if it's 'README.md', 'README.txt', or just 'README' using 'ls'.

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
6. You are running on the user's actual machine. You can install deps, start servers, etc.
7. For dev servers, use '&' at end of command to run in background.
8. When starting a web project, always create a complete working app.
9. After starting a dev server, wait a moment then verify it's running.
10. ALWAYS VERIFY the existence of files/directories before assuming they exist. Use 'ls' or 'ls -F' often.

Start building!
"""

async def get_completion_stream(
    messages: List[Dict[str, str]],
    provider: str = "groq",
    model: str = None,
    temperature: float = 0.7,
    top_p: float = 0.9,
    max_tokens: int = 4096
):
    model = model or MODEL_NAME

    # Ensure system prompt is at the start and followed by user/assistant messages
    if not messages or messages[0]["role"] != "system":
        messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})

    if provider == "groq":
        from groq import Groq
        client = Groq(api_key=os.getenv("GROQ_API_KEY", GROQ_API_KEY))
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_completion_tokens=max_tokens,
            top_p=top_p,
            stream=True,
            response_format={"type": "json_object"} if "llama" in model.lower() or "mixtral" in model.lower() else None
        )
        for chunk in completion:
            yield chunk.choices[0].delta.content or ""

    elif provider == "openai" or provider == "deepseek" or provider == "nvidia" or provider == "openrouter":
        from openai import OpenAI

        base_urls = {
            "openai": "https://api.openai.com/v1",
            "deepseek": "https://api.deepseek.com/v1",
            "nvidia": "https://integrate.api.nvidia.com/v1",
            "openrouter": "https://openrouter.ai/api/v1"
        }
        api_keys = {
            "openai": os.getenv("OPENAI_API_KEY"),
            "deepseek": os.getenv("DEEPSEEK_API_KEY"),
            "nvidia": os.getenv("NVIDIA_API_KEY"),
            "openrouter": os.getenv("OPENROUTER_API_KEY")
        }

        client = OpenAI(base_url=base_urls[provider], api_key=api_keys[provider])

        extra_headers = {}
        if provider == "openrouter":
            extra_headers = {
                "HTTP-Referer": os.getenv("FRONTEND_URL", "http://localhost:3000"),
                "X-Title": "Lumina"
            }

        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            stream=True,
            extra_headers=extra_headers
        )
        for chunk in completion:
            yield chunk.choices[0].delta.content or ""

    elif provider == "anthropic":
        import anthropic
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        with client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            messages=[m for m in messages if m["role"] != "system"],
            system=messages[0]["content"] if messages[0]["role"] == "system" else ""
        ) as stream:
            for text in stream.text_stream:
                yield text

    elif provider == "mistral":
        from mistralai import Mistral
        client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))
        completion = client.chat.stream(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p
        )
        for chunk in completion:
            yield chunk.data.choices[0].delta.content or ""

    elif provider == "google":
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

        # Convert messages to Gemini format
        contents = []
        system_instruction = None
        for m in messages:
            if m["role"] == "system":
                system_instruction = m["content"]
            else:
                contents.append({"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]})

        response = client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=temperature,
                top_p=top_p,
                max_output_tokens=max_tokens,
                system_instruction=system_instruction
            )
        )
        for chunk in response:
            yield chunk.text

    else:
        yield f"Error: Provider {provider} not supported or implemented yet."
