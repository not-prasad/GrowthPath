from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Any, Dict, Optional

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

import json
from ..database import execute, query_one, query_all
from ..utils.errors import ApiError
from ..utils.validation import as_bool, as_date_yyyy_mm_dd, as_enum, as_str, require_json
from .logs import _resolve_goal_id, recalculate_log_stats
from ..services.ai_engine import generate_ai_tasks
from ..services.youtube import fetch_youtube_tutorial


bp = Blueprint("tasks", __name__, url_prefix="/api")


def _dedupe_key(task_type: str, title: str) -> str:
    s = f"{task_type.strip().lower()}|{title.strip().lower()}"
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:24]


def _ensure_log(user_id: int, goal_id: int, log_date: str) -> int:
    row = query_one(
        "SELECT id FROM daily_logs WHERE user_id=? AND goal_id=? AND log_date=?",
        (user_id, goal_id, log_date),
    )
    if row:
        return int(row["id"])
    # Create shell log row; score computed when /api/logs POST is called (or later recalculated).
    return execute(
        "INSERT INTO daily_logs(user_id, goal_id, log_date) VALUES (?,?,?)",
        (user_id, goal_id, log_date),
    )


@bp.post("/tasks/custom")
@jwt_required()
def add_custom_task():
    """
    Adds a planned protocol task for a given goal+date.
    Prevents duplicates via (log_id, dedupe_key).
    """
    user_id = int(get_jwt_identity())
    data = require_json(request)

    goal_id = _resolve_goal_id(user_id, str(data.get("goal_id")) if data.get("goal_id") is not None else None)
    log_date = as_date_yyyy_mm_dd(data.get("log_date"), field="log_date")
    task_type = as_enum(data.get("task_type", "custom"), field="task_type", allowed=("primary", "support", "optimize", "custom"), default="custom")
    title = as_str(data.get("title"), field="title", min_len=2, max_len=300)
    details = data.get("details")
    if details is not None:
        details = as_str(details, field="details", min_len=0, max_len=2000)
    is_completed = as_bool(data.get("is_completed", False), field="is_completed", default=False)

    log_id = _ensure_log(user_id, goal_id, log_date)
    key = _dedupe_key(task_type, title)

    now = datetime.utcnow().isoformat()
    task_id = execute(
        """
        INSERT INTO daily_tasks(user_id, goal_id, log_id, log_date, task_type, title, details, is_completed, completed_at, dedupe_key)
        VALUES (?,?,?,?,?,?,?,?,?,?)
        """,
        (
            user_id,
            goal_id,
            log_id,
            log_date,
            task_type,
            title,
            details,
            1 if is_completed else 0,
            now if is_completed else None,
            key,
        ),
    )

    recalculate_log_stats(user_id, goal_id, log_date)

    task = query_one("SELECT * FROM daily_tasks WHERE id = ?", (task_id,))
    totals = query_one("SELECT total_xp, level FROM users WHERE id=?", (user_id,))
    return jsonify({"task": task, "total_xp": totals["total_xp"], "level": totals["level"]}), 201


@bp.put("/tasks/<int:task_id>/toggle")
@jwt_required()
def toggle_task(task_id: int):
    """
    Toggle completion status for a daily_task owned by the current user.
    """
    user_id = int(get_jwt_identity())
    row = query_one("SELECT id, is_completed, goal_id, log_date FROM daily_tasks WHERE id=? AND user_id=?", (task_id, user_id))
    if not row:
        raise ApiError("not_found", "Task not found.", 404)

    row_goal_id = int(row["goal_id"])
    row_log_date = str(row["log_date"])

    is_completed = 0 if int(row.get("is_completed", 0) or 0) == 1 else 1
    completed_at = datetime.utcnow().isoformat() if is_completed == 1 else None

    execute(
        "UPDATE daily_tasks SET is_completed=?, completed_at=?, updated_at=datetime('now') WHERE id=? AND user_id=?",
        (is_completed, completed_at, task_id, user_id),
    )
    recalculate_log_stats(user_id, row_goal_id, row_log_date)

    task = query_one("SELECT * FROM daily_tasks WHERE id = ?", (task_id,))
    totals = query_one("SELECT total_xp, level FROM users WHERE id=?", (user_id,))
    return jsonify({"task": task, "total_xp": totals["total_xp"], "level": totals["level"]}), 200




@bp.post("/tasks/generate")
@jwt_required()
def generate_tasks():
    """
    Triggers AI to generate 4-5 tasks for a goal+date.
    """
    user_id = int(get_jwt_identity())
    data = require_json(request)

    goal_id = _resolve_goal_id(user_id, str(data.get("goal_id")) if data.get("goal_id") is not None else None)
    log_date = as_date_yyyy_mm_dd(data.get("log_date"), field="log_date")

    goal = query_one("SELECT id, title, category, deadline_days, difficulty, commitment, motivation, created_at FROM goals WHERE id=? AND user_id=?", (goal_id, user_id))
    if not goal:
        raise ApiError("not_found", "Goal not found.", 404)

    # Calculate day number
    try:
        created_dt = datetime.strptime(goal["created_at"][:10], "%Y-%m-%d").date()
        day_number = max(1, (log_date - created_dt).days + 1)
    except Exception:
        day_number = 1

    # Calculate consistency (past 3 days)
    past_logs = query_all("SELECT id FROM daily_logs WHERE user_id=? AND goal_id=? ORDER BY log_date DESC LIMIT 3", (user_id, goal_id))
    consistency_score = 1.0
    if past_logs:
        log_ids = tuple([l["id"] for l in past_logs])
        placeholders = ",".join(["?"] * len(log_ids))
        total_tasks = query_one(f"SELECT COUNT(*) as c FROM daily_tasks WHERE log_id IN ({placeholders})", log_ids)
        completed_tasks = query_one(f"SELECT COUNT(*) as c FROM daily_tasks WHERE log_id IN ({placeholders}) AND is_completed=1", log_ids)
        
        tc = total_tasks["c"] if total_tasks else 0
        cc = completed_tasks["c"] if completed_tasks else 0
        if tc > 0:
            consistency_score = cc / tc
        else:
            # They haven't had any tasks yet, give them benefit of the doubt
            consistency_score = 1.0

    # Generate tasks via AI
    generated_tasks = generate_ai_tasks(
        goal_title=goal["title"],
        deadline_days=goal["deadline_days"],
        day_number=day_number,
        consistency_score=consistency_score,
        category=goal.get("category"),
        difficulty=goal.get("difficulty"),
        commitment=goal.get("commitment"),
        motivation=goal.get("motivation")
    )

    log_id = _ensure_log(user_id, goal_id, log_date)
    created_tasks = []

    for t_obj in generated_tasks:
        title = t_obj.get("title", "")
        if not title:
            continue
            
        key = _dedupe_key("optimize", title)
        # Check if already exists to avoid duplicates on re-gen
        existing = query_one("SELECT id FROM daily_tasks WHERE log_id=? AND dedupe_key=?", (log_id, key))
        if existing:
            continue

        yt_query = t_obj.get("youtube_search_query")
        tutorial_data = fetch_youtube_tutorial(yt_query) if yt_query else None
        
        details_dict = {
            "description": t_obj.get("description"),
            "estimated_time": t_obj.get("estimated_time"),
            "difficulty": t_obj.get("difficulty"),
            "tutorial": tutorial_data
        }
        details_json = json.dumps(details_dict)

        tid = execute(
            """
            INSERT INTO daily_tasks(user_id, goal_id, log_id, log_date, task_type, title, details, is_completed, dedupe_key)
            VALUES (?,?,?,?,?,?,?,?,?)
            """,
            (user_id, goal_id, log_id, log_date, "optimize", title, details_json, 0, key)
        )
        created_tasks.append(tid)

    # Return the full list of tasks for the day
    tasks = query_all("SELECT * FROM daily_tasks WHERE log_id=? ORDER BY created_at ASC", (log_id,))
    return jsonify({"tasks": tasks}), 200
@bp.delete("/tasks/<int:task_id>")
@jwt_required()
def delete_task(task_id: int):
    """
    Delete a daily_task.
    """
    user_id = int(get_jwt_identity())
    row = query_one("SELECT id, goal_id, log_date FROM daily_tasks WHERE id=? AND user_id=?", (task_id, user_id))
    if not row:
        raise ApiError("not_found", "Task not found.", 404)

    row_goal_id = int(row["goal_id"])
    row_log_date = str(row["log_date"])

    execute("DELETE FROM daily_tasks WHERE id=? AND user_id=?", (task_id, user_id))
    recalculate_log_stats(user_id, row_goal_id, row_log_date)

    totals = query_one("SELECT total_xp, level FROM users WHERE id=?", (user_id,))
    return jsonify({
        "success": True, 
        "total_xp": totals["total_xp"], 
        "level": totals["level"]
    }), 200
