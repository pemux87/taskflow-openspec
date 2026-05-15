from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.database import get_db
from api.models import User
from api.schemas import SignupRequest, LoginRequest, TokenResponse, UserOut
from api.auth import hash_password, verify_password, create_token, get_current_user
from api import errors

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=201)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail={"code": errors.EMAIL_TAKEN, "message": "이미 가입된 이메일입니다"},
        )
    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"token": create_token(user.id), "user": UserOut(id=user.id, email=user.email, team_id=user.team_id)}


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail={"code": errors.INVALID_CREDENTIALS, "message": "이메일 또는 비밀번호가 일치하지 않습니다"},
        )
    return {"token": create_token(user.id), "user": UserOut(id=user.id, email=user.email, team_id=user.team_id)}


@router.post("/logout")
async def logout():
    return {}


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut(id=current_user.id, email=current_user.email, team_id=current_user.team_id)
