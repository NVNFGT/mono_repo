from sanic import Blueprint, json
from sqlalchemy import select, func, asc, desc
from datetime import datetime
from db import AsyncSessionLocal, Task, StatusEnum, PriorityEnum
from core.decorators import require_auth
from logger import logger

task_bp = Blueprint('tasks', url_prefix='/tasks')

def serialize_task(t: Task):
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "status": t.status.value if t.status else None,
        "priority": t.priority.value if t.priority else None,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }

@task_bp.post("/")
@require_auth
async def create_task(request):
    logger.info(f"[TASK/CREATE] User={request.ctx.user.username} creating task.")
    data = request.json or {}
    title = data.get("title")

    if not title:
        logger.warning("[TASK/CREATE] Missing title.")
        return json({"error": "title is required"}, status=400)

    description = data.get("description", "")
    status = data.get("status", "pending")
    priority = data.get("priority", "medium")
    due_date_raw = data.get("due_date")

    # Parse due_date
    due_dt = None
    if due_date_raw:
        try:
            due_dt = datetime.fromisoformat(due_date_raw)
        except Exception:
            logger.error("[TASK/CREATE] Invalid due_date format.")
            return json({"error": "invalid due_date format, use ISO format"}, status=400)

    try:
        status_enum = StatusEnum(status)
        priority_enum = PriorityEnum(priority)
    except ValueError as e:
        logger.error(f"[TASK/CREATE] Invalid enum value: {e}")
        return json({"error": "invalid status or priority value"}, status=400)

    async with AsyncSessionLocal() as session:
        task = Task(
            user_id=request.ctx.user.id,
            title=title,
            description=description,
            status=status_enum,
            priority=priority_enum,
            due_date=due_dt
        )
        session.add(task)
        await session.commit()
        await session.refresh(task)
        logger.success(f"[TASK/CREATE] Task created successfully: id={task.id}, title={task.title}")
        return json(serialize_task(task), status=201)

@task_bp.get("/")
@require_auth
async def list_tasks(request):
    logger.debug(f"[TASK/LIST] Listing tasks for user={request.ctx.user.username}")
    args = request.args or {}
    status = args.get("status")
    priority = args.get("priority")
    search = args.get("search")
    sort_by = args.get("sort_by", "due_date")
    order = args.get("order", "asc")
    page = int(args.get("page") or 1)
    per_page = int(args.get("per_page") or 10)
    offset = (page - 1) * per_page

    q = select(Task).where(Task.user_id == request.ctx.user.id)

    # Filtering
    if status:
        try:
            q = q.where(Task.status == StatusEnum(status))
        except ValueError:
            logger.error(f"[TASK/LIST] Invalid status filter: {status}")
            return json({"error": "invalid status filter"}, status=400)
    if priority:
        try:
            q = q.where(Task.priority == PriorityEnum(priority))
        except ValueError:
            logger.error(f"[TASK/LIST] Invalid priority filter: {priority}")
            return json({"error": "invalid priority filter"}, status=400)
    if search:
        q = q.where(Task.title.ilike(f"%{search}%"))

    if not hasattr(Task, sort_by):
        logger.error(f"[TASK/LIST] Invalid sort_by field: {sort_by}")
        return json({"error": "invalid sort_by field"}, status=400)

    col = getattr(Task, sort_by)
    q = q.order_by(asc(col) if order == "asc" else desc(col))

    count_q = select(func.count()).select_from(Task).where(Task.user_id == request.ctx.user.id)
    q = q.offset(offset).limit(per_page)

    async with AsyncSessionLocal() as session:
        res = await session.execute(q)
        tasks = res.scalars().all()
        total_res = await session.execute(count_q)
        total = total_res.scalar() or 0

    logger.info(f"[TASK/LIST] Returned {len(tasks)} tasks for user={request.ctx.user.username}")
    return json({
        "items": [serialize_task(t) for t in tasks],
        "page": page,
        "per_page": per_page,
        "total": total
    })

@task_bp.get("/<task_id:int>")
@require_auth
async def get_task(request, task_id):
    logger.debug(f"[TASK/GET] Fetching task_id={task_id} for user={request.ctx.user.username}")
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Task).where(Task.id == task_id, Task.user_id == request.ctx.user.id))
        task = res.scalars().first()
        if not task:
            logger.warning(f"[TASK/GET] Task not found: {task_id}")
            return json({"error": "not found"}, status=404)
        return json(serialize_task(task))

@task_bp.put("/<task_id:int>")
@require_auth
async def update_task(request, task_id):
    logger.info(f"[TASK/UPDATE] Updating task_id={task_id} for user={request.ctx.user.username}")
    data = request.json or {}
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Task).where(Task.id == task_id, Task.user_id == request.ctx.user.id))
        task = res.scalars().first()
        if not task:
            logger.warning(f"[TASK/UPDATE] Task not found: {task_id}")
            return json({"error": "not found"}, status=404)

        for field in ["title", "description", "status", "priority", "due_date"]:
            if field in data:
                logger.debug(f"[TASK/UPDATE] Updating {field} -> {data[field]}")

        if "title" in data:
            task.title = data.get("title")
        if "description" in data:
            task.description = data.get("description")
        if "status" in data:
            try:
                task.status = StatusEnum(data["status"])
            except ValueError:
                return json({"error": "invalid status"}, status=400)
        if "priority" in data:
            try:
                task.priority = PriorityEnum(data["priority"])
            except ValueError:
                return json({"error": "invalid priority"}, status=400)
        if "due_date" in data:
            if data["due_date"] is None:
                task.due_date = None
            else:
                try:
                    task.due_date = datetime.fromisoformat(data["due_date"])
                except Exception:
                    logger.error("[TASK/UPDATE] Invalid due_date format")
                    return json({"error": "invalid due_date format"}, status=400)

        session.add(task)
        await session.commit()
        await session.refresh(task)
        logger.success(f"[TASK/UPDATE] Task updated successfully: id={task.id}")
        return json(serialize_task(task))

@task_bp.delete("/<task_id:int>")
@require_auth
async def delete_task(request, task_id):
    logger.warning(f"[TASK/DELETE] Deleting task_id={task_id} for user={request.ctx.user.username}")
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Task).where(Task.id == task_id, Task.user_id == request.ctx.user.id))
        task = res.scalars().first()
        if not task:
            logger.warning(f"[TASK/DELETE] Task not found: {task_id}")
            return json({"error": "not found"}, status=404)
        await session.delete(task)
        await session.commit()
        logger.success(f"[TASK/DELETE] Task deleted successfully: id={task.id}")
        return json({}, status=204)