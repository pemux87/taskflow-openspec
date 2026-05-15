from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.database import get_db
from api.models import User, Task
from api.schemas import TaskCreateRequest, TaskUpdateRequest, TaskStatusRequest, TaskOut
from api.auth import get_current_user
from api.routers.teams import get_team_member
from api import errors

router = APIRouter(tags=["tasks"])


def _task_out(t: Task) -> dict:
    return {
        "id": t.id,
        "team_id": t.team_id,
        "title": t.title,
        "status": t.status,
        "creator_id": t.creator_id,
        "assignee_id": t.assignee_id,
        "created_at": t.created_at,
    }


@router.get("/api/teams/{id}/tasks")
async def list_tasks(
    id: int,
    filter: Optional[str] = Query(None),
    team=Depends(get_team_member),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Task).where(Task.team_id == id)
    if filter == "me":
        q = q.where(Task.assignee_id == current_user.id)
    elif filter == "unassigned":
        q = q.where(Task.assignee_id == None)
    q = q.order_by(Task.created_at.desc())
    result = await db.execute(q)
    return [_task_out(t) for t in result.scalars().all()]


@router.post("/api/teams/{id}/tasks", status_code=201)
async def create_task(
    id: int,
    body: TaskCreateRequest,
    team=Depends(get_team_member),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = Task(
        team_id=id,
        title=body.title,
        status="TODO",
        creator_id=current_user.id,
        assignee_id=body.assignee_id,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return _task_out(task)


@router.get("/api/tasks/{task_id}")
async def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=404,
            detail={"code": errors.NOT_FOUND, "message": "태스크를 찾을 수 없습니다"},
        )
    if task.team_id != current_user.team_id:
        raise HTTPException(
            status_code=403,
            detail={"code": errors.FORBIDDEN, "message": "권한이 없습니다"},
        )
    return _task_out(task)


@router.put("/api/tasks/{task_id}")
async def update_task(
    task_id: int,
    body: TaskUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task or task.team_id != current_user.team_id:
        raise HTTPException(
            status_code=404,
            detail={"code": errors.NOT_FOUND, "message": "태스크를 찾을 수 없습니다"},
        )
    if body.title is not None:
        task.title = body.title
    if "assignee_id" in body.model_fields_set:
        task.assignee_id = body.assignee_id
    await db.commit()
    await db.refresh(task)
    return _task_out(task)


@router.patch("/api/tasks/{task_id}/status")
async def update_task_status(
    task_id: int,
    body: TaskStatusRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task or task.team_id != current_user.team_id:
        raise HTTPException(
            status_code=404,
            detail={"code": errors.NOT_FOUND, "message": "태스크를 찾을 수 없습니다"},
        )
    task.status = body.status
    await db.commit()
    await db.refresh(task)
    return _task_out(task)


@router.delete("/api/tasks/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task or task.team_id != current_user.team_id:
        raise HTTPException(
            status_code=404,
            detail={"code": errors.NOT_FOUND, "message": "태스크를 찾을 수 없습니다"},
        )
    from sqlalchemy import select as sel
    from api.models import Team
    team_result = await db.execute(sel(Team).where(Team.id == task.team_id))
    team = team_result.scalar_one_or_none()
    is_owner = team and team.owner_id == current_user.id
    if task.creator_id != current_user.id and not is_owner:
        raise HTTPException(
            status_code=403,
            detail={"code": errors.FORBIDDEN, "message": "권한이 없습니다"},
        )
    await db.delete(task)
    await db.commit()
