from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.database import get_db
from api.models import User, Message
from api.schemas import MessageCreateRequest
from api.auth import get_current_user
from api.routers.teams import get_team_member
from api import errors

router = APIRouter(tags=["messages"])


def _msg_out(m: Message, user_email: str) -> dict:
    return {
        "id": m.id,
        "team_id": m.team_id,
        "user_id": m.user_id,
        "user_email": user_email,
        "content": m.content,
        "created_at": m.created_at,
    }


@router.get("/api/teams/{id}/messages")
async def list_messages(
    id: int,
    since: Optional[str] = Query(None),
    team=Depends(get_team_member),
    db: AsyncSession = Depends(get_db),
):
    q = select(Message).where(Message.team_id == id)
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            q = q.where(Message.created_at > since_dt)
        except ValueError:
            pass
    else:
        q = q.order_by(Message.created_at.desc()).limit(50)
        result = await db.execute(q)
        msgs = list(reversed(result.scalars().all()))
        return await _enrich(msgs, db)

    q = q.order_by(Message.created_at.asc())
    result = await db.execute(q)
    return await _enrich(result.scalars().all(), db)


async def _enrich(msgs, db: AsyncSession):
    if not msgs:
        return []
    user_ids = list({m.user_id for m in msgs})
    result = await db.execute(select(User).where(User.id.in_(user_ids)))
    email_map = {u.id: u.email for u in result.scalars().all()}
    return [_msg_out(m, email_map.get(m.user_id, "")) for m in msgs]


@router.post("/api/teams/{id}/messages", status_code=201)
async def send_message(
    id: int,
    body: MessageCreateRequest,
    team=Depends(get_team_member),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if len(body.content) > 1000:
        raise HTTPException(
            status_code=400,
            detail={"code": errors.TOO_LONG, "message": "메시지는 1000자 이내여야 합니다", "limit": 1000, "actual": len(body.content)},
        )
    msg = Message(team_id=id, user_id=current_user.id, content=body.content)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return _msg_out(msg, current_user.email)


@router.delete("/api/messages/{msg_id}", status_code=204)
async def delete_message(
    msg_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Message).where(Message.id == msg_id))
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(
            status_code=404,
            detail={"code": errors.NOT_FOUND, "message": "메시지를 찾을 수 없습니다"},
        )
    if msg.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail={"code": errors.NOT_OWNER, "message": "본인의 메시지만 삭제할 수 있습니다"},
        )
    await db.delete(msg)
    await db.commit()
