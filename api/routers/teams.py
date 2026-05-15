import random
import string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from api.database import get_db
from api.models import User, Team
from api.schemas import TeamCreateRequest, TeamJoinRequest, TeamOut, MemberOut
from api.auth import get_current_user
from api import errors

router = APIRouter(prefix="/api/teams", tags=["teams"])


def _generate_invite_code() -> str:
    letters = "".join(random.choices(string.ascii_uppercase, k=4))
    digits = "".join(random.choices(string.digits, k=4))
    return f"{letters}-{digits}"


async def _get_member_count(db: AsyncSession, team_id: int) -> int:
    result = await db.execute(select(func.count()).select_from(User).where(User.team_id == team_id))
    return result.scalar() or 0


async def get_team_member(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.team_id != id:
        raise HTTPException(
            status_code=403,
            detail={"code": errors.FORBIDDEN, "message": "이 팀의 멤버가 아닙니다"},
        )
    result = await db.execute(select(Team).where(Team.id == id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(
            status_code=404,
            detail={"code": errors.NOT_FOUND, "message": "팀을 찾을 수 없습니다"},
        )
    return team


@router.post("", status_code=201)
async def create_team(
    body: TeamCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.team_id is not None:
        raise HTTPException(
            status_code=409,
            detail={"code": errors.ALREADY_IN_TEAM, "message": "이미 팀에 소속되어 있습니다"},
        )
    invite_code = _generate_invite_code()
    team = Team(name=body.name, invite_code=invite_code, owner_id=current_user.id)
    db.add(team)
    await db.flush()
    current_user.team_id = team.id
    await db.commit()
    await db.refresh(team)
    return {
        "id": team.id,
        "name": team.name,
        "invite_code": team.invite_code,
        "owner_id": team.owner_id,
        "created_at": team.created_at,
    }


@router.post("/join")
async def join_team(
    body: TeamJoinRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.team_id is not None:
        raise HTTPException(
            status_code=409,
            detail={"code": errors.ALREADY_IN_TEAM, "message": "이미 다른 팀에 소속되어 있습니다"},
        )
    result = await db.execute(select(Team).where(Team.invite_code == body.invite_code))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(
            status_code=404,
            detail={"code": errors.NOT_FOUND, "message": "해당 초대코드를 찾을 수 없습니다"},
        )
    current_user.team_id = team.id
    await db.commit()
    member_count = await _get_member_count(db, team.id)
    return {
        "team": {"id": team.id, "name": team.name, "member_count": member_count},
        "redirect": f"/teams/{team.id}",
    }


@router.get("/{id}")
async def get_team(team: Team = Depends(get_team_member), db: AsyncSession = Depends(get_db)):
    member_count = await _get_member_count(db, team.id)
    return {
        "id": team.id,
        "name": team.name,
        "invite_code": team.invite_code,
        "owner_id": team.owner_id,
        "member_count": member_count,
        "created_at": team.created_at,
    }


@router.get("/{id}/members")
async def get_members(team: Team = Depends(get_team_member), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.team_id == team.id))
    members = result.scalars().all()
    return [
        {
            "id": m.id,
            "email": m.email,
            "role": "owner" if m.id == team.owner_id else "member",
            "joined_at": m.created_at,
        }
        for m in members
    ]


@router.delete("/{id}/leave")
async def leave_team(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.team_id != id:
        raise HTTPException(
            status_code=403,
            detail={"code": errors.FORBIDDEN, "message": "이 팀의 멤버가 아닙니다"},
        )
    result = await db.execute(select(Team).where(Team.id == id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(
            status_code=404,
            detail={"code": errors.NOT_FOUND, "message": "팀을 찾을 수 없습니다"},
        )
    if team.owner_id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail={"code": errors.FORBIDDEN, "message": "팀 owner는 탈퇴할 수 없습니다"},
        )
    current_user.team_id = None
    await db.commit()
    return {}
