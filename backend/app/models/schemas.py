from typing import Optional, List

from pydantic import BaseModel


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


# ── Skills ──────────────────────────────────────────────

class SkillCreateReq(BaseModel):
    name: str
    description: Optional[str] = None
    prompt: str
    category: Optional[str] = "custom"
    is_public: Optional[bool] = False
    tags: Optional[List[str]] = []


class SkillUpdateReq(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None
    category: Optional[str] = None
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None
