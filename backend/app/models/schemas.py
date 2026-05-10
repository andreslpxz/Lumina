from typing import Optional

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
