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
    
    try:
        data = request.json or {}
        logger.info(f"[TASK/CREATE] Request data: {data}")
        
        title = data.get("title")

        if not title:
            logger.warning("[TASK/CREATE] Missing title.")
            return json({"error": "title is required"}, status=400)

        description = data.get("description", "")
        status = data.get("status", "pending")
        priority = data.get("priority", "medium")
        due_date_raw = data.get("due_date")

        logger.info(f"[TASK/CREATE] Parsed data - title: {title}, status: {status}, priority: {priority}, due_date: {due_date_raw}")

        # Parse due_date
        due_dt = None
        if due_date_raw:
            try:
                # Handle both ISO string and None/empty values
                if isinstance(due_date_raw, str) and due_date_raw.strip():
                    # Handle different ISO formats
                    date_str = due_date_raw.replace('Z', '+00:00')
                    # If it's just a date, add time component
                    if 'T' not in date_str:
                        date_str += 'T00:00:00'
                    due_dt = datetime.fromisoformat(date_str)
                    # Convert to naive datetime (remove timezone info for database)
                    if due_dt.tzinfo is not None:
                        due_dt = due_dt.replace(tzinfo=None)
                    logger.info(f"[TASK/CREATE] Parsed due_date: {due_dt}")
            except Exception as e:
                logger.error(f"[TASK/CREATE] Invalid due_date format: {due_date_raw}, error: {e}")
                return json({"error": f"invalid due_date format: {due_date_raw}, use ISO format"}, status=400)

        try:
            status_enum = StatusEnum(status)
            priority_enum = PriorityEnum(priority)
            logger.info(f"[TASK/CREATE] Enums created - status: {status_enum}, priority: {priority_enum}")
        except ValueError as e:
            logger.error(f"[TASK/CREATE] Invalid enum value: {e}")
            return json({"error": "invalid status or priority value"}, status=400)

        session = AsyncSessionLocal()
        try:
            logger.info("[TASK/CREATE] Creating task in database...")
            task = Task(
                user_id=request.ctx.user.id,
                title=title,
                description=description or "",
                status=status_enum,
                priority=priority_enum,
                due_date=due_dt
            )
            session.add(task)
            logger.info("[TASK/CREATE] Task added to session, committing...")
            
            await session.commit()
            logger.info("[TASK/CREATE] Commit successful, refreshing task...")
            
            await session.refresh(task)
            task_data = serialize_task(task)
            logger.success(f"[TASK/CREATE] Task created successfully: id={task.id}, title={task.title}")
            return json(task_data, status=201)
            
        except Exception as db_error:
            logger.error(f"[TASK/CREATE] Database error: {db_error}")
            await session.rollback()
            raise db_error
        finally:
            await session.close()
            
    except Exception as e:
        logger.exception(f"[TASK/CREATE] Unexpected error creating task: {e}")
        return json({"error": "Internal server error"}, status=500)

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
    
    try:
        data = request.json or {}
        logger.info(f"[TASK/UPDATE] Request data: {data}")
        
        session = AsyncSessionLocal()
        try:
            res = await session.execute(select(Task).where(Task.id == task_id, Task.user_id == request.ctx.user.id))
            task = res.scalars().first()
            if not task:
                logger.warning(f"[TASK/UPDATE] Task not found: {task_id}")
                return json({"error": "not found"}, status=404)

            logger.info(f"[TASK/UPDATE] Found task: {task.title}")

            # Update fields
            if "title" in data:
                task.title = data["title"]
                logger.debug(f"[TASK/UPDATE] Updated title: {task.title}")
                
            if "description" in data:
                task.description = data["description"]
                logger.debug(f"[TASK/UPDATE] Updated description")
                
            if "status" in data:
                try:
                    task.status = StatusEnum(data["status"])
                    logger.debug(f"[TASK/UPDATE] Updated status: {task.status}")
                except ValueError as e:
                    logger.error(f"[TASK/UPDATE] Invalid status: {data['status']}")
                    return json({"error": "invalid status"}, status=400)
                    
            if "priority" in data:
                try:
                    task.priority = PriorityEnum(data["priority"])
                    logger.debug(f"[TASK/UPDATE] Updated priority: {task.priority}")
                except ValueError as e:
                    logger.error(f"[TASK/UPDATE] Invalid priority: {data['priority']}")
                    return json({"error": "invalid priority"}, status=400)
                    
            if "due_date" in data:
                if data["due_date"] is None or data["due_date"] == "":
                    task.due_date = None
                    logger.debug("[TASK/UPDATE] Cleared due_date")
                else:
                    try:
                        # Handle timezone similar to create task
                        date_str = data["due_date"].replace('Z', '+00:00')
                        if 'T' not in date_str:
                            date_str += 'T00:00:00'
                        due_dt = datetime.fromisoformat(date_str)
                        # Convert to naive datetime for database
                        if due_dt.tzinfo is not None:
                            due_dt = due_dt.replace(tzinfo=None)
                        task.due_date = due_dt
                        logger.debug(f"[TASK/UPDATE] Updated due_date: {task.due_date}")
                    except Exception as e:
                        logger.error(f"[TASK/UPDATE] Invalid due_date format: {data['due_date']}, error: {e}")
                        return json({"error": "invalid due_date format"}, status=400)

            session.add(task)
            await session.commit()
            await session.refresh(task)
            task_data = serialize_task(task)
            logger.success(f"[TASK/UPDATE] Task updated successfully: id={task.id}")
            return json(task_data)
            
        except Exception as db_error:
            logger.error(f"[TASK/UPDATE] Database error: {db_error}")
            await session.rollback()
            raise db_error
        finally:
            await session.close()
            
    except Exception as e:
        logger.exception(f"[TASK/UPDATE] Unexpected error updating task: {e}")
        return json({"error": "Internal server error"}, status=500)

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