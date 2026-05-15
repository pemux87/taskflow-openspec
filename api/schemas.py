from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ── Auth ──────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    team_id: Optional[int]


class TokenResponse(BaseModel):
    token: str
    user: UserOut


# ── Teams ─────────────────────────────────────────────────────────────────────

class TeamCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=30)


class TeamJoinRequest(BaseModel):
    invite_code: str = Field(pattern=r"^[A-Z]{4}-[0-9]{4}$")


class TeamOut(BaseModel):
    id: int
    name: str
    invite_code: str
    owner_id: int
    member_count: int
    created_at: datetime


class MemberOut(BaseModel):
    id: int
    email: str
    role: str  # "owner" | "member"
    joined_at: datetime


# ── Tasks ─────────────────────────────────────────────────────────────────────

class TaskCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    assignee_id: Optional[int] = None


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    assignee_id: Optional[int] = None


class TaskStatusRequest(BaseModel):
    status: str = Field(pattern=r"^(TODO|DOING|DONE)$")


class TaskOut(BaseModel):
    id: int
    team_id: int
    title: str
    status: str
    creator_id: int
    assignee_id: Optional[int]
    created_at: datetime


# ── Messages ──────────────────────────────────────────────────────────────────

class MessageCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=1000)


class MessageOut(BaseModel):
    id: int
    team_id: int
    user_id: int
    user_email: str
    content: str
    created_at: datetime


# ── Errors ────────────────────────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail
