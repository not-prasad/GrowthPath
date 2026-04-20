from __future__ import annotations

from collections import defaultdict
from datetime import date as _date
from typing import Any, Dict, List, Optional

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..config import AppConfig
from ..database import execute, query_all, query_one
from ..services.scoring import ScoreInputs, compute_level, compute_performance_score, compute_xp
from ..utils.errors import ApiError
from ..utils.validation import (
    as_date_yyyy_mm_dd,
    as_enum,
    as_int,
    as_str,
    require_json,
)


bp = Blueprint("logs", __name__, url_prefix="/api")


def _resolve_goal_id(user_id: int, goal_id_raw: Optional[str]) -> int:
    if goal_id_raw:
        try:
            gid = int(goal_id_raw)
        except Exception:
            raise ApiError("bad_request", "goal_id must be an integer.", 400)
    else:
        u = query_one("SELECT active_goal_id FROM users WHERE id = ?", (user_id,))
        gid = int(u["active_goal_id"]) if u and u.get("active_goal_id") is not None else 0
    if not gid:
        raise ApiError("bad_request", "goal_id is required (no active goal set).", 400)
    owned = query_one("SELECT id, title FROM goals WHERE id = ? AND user_id = ?", (gid, user_id))
    if not owned:
        raise ApiError("forbidden", "Goal not found or not owned by user.", 403)
    return gid


@bp.post("/logs")
@jwt_required()
def upsert_daily_log():
    """
    Writes the daily summary for (user, goal, date), and recalculates performance_score deterministically
    using tasks completion for that date.
    """
    user_id = int(get_jwt_identity())
    data = require_json(request)

    goal_id = _resolve_goal_id(user_id, str(data.get("goal_id")) if data.get("goal_id") is not None else None)
    log_date = as_date_yyyy_mm_dd(data.get("log_date"), field="log_date", default=_date.today().isoformat())

    focus_level = float(data.get("focus_level", 3.0) or 3.0)
    energy_state = as_enum(data.get("energy_state", "Stable"), field="energy_state", allowed=("High", "Stable", "Low"), default="Stable")
    friction_count = as_int(data.get("friction_count", 0), field="friction_count", min_val=0, max_val=100, default=0)
    mood = data.get("mood")
    if mood is not None:
        mood = as_str(mood, field="mood", min_len=0, max_len=100)
    notes = data.get("notes")
    if notes is not None:
        notes = as_str(notes, field="notes", min_len=0, max_len=8000)
    hurdles = data.get("hurdles")
    if hurdles is not None:
        hurdles = as_str(hurdles, field="hurdles", min_len=0, max_len=2000)

    # Ensure log exists (insert if missing)
    existing = query_one(
        "SELECT id FROM daily_logs WHERE user_id = ? AND goal_id = ? AND log_date = ?",
        (user_id, goal_id, log_date),
    )
    if not existing:
        log_id = execute(
            """
            INSERT INTO daily_logs(user_id, goal_id, log_date, focus_level, energy_state, friction_count, mood, notes, hurdles)
            VALUES (?,?,?,?,?,?,?,?,?)
            """,
            (user_id, goal_id, log_date, focus_level, energy_state, friction_count, mood, notes, hurdles),
        )
    else:
        log_id = int(existing["id"])
        execute(
            """
            UPDATE daily_logs
            SET focus_level=?, energy_state=?, friction_count=?, mood=?, notes=?, hurdles=?, updated_at=datetime('now')
            WHERE id=? AND user_id=? AND goal_id=?
            """,
            (focus_level, energy_state, friction_count, mood, notes, hurdles, log_id, user_id, goal_id),
        )

    # Compute score from tasks completion for that date.
    # Planned tasks are stored in daily_tasks; completion flags are per task.
    counts = query_one(
        """
        SELECT
          SUM(CASE WHEN task_type='primary'  THEN 1 ELSE 0 END) AS primary_total,
          SUM(CASE WHEN task_type='primary'  AND is_completed=1 THEN 1 ELSE 0 END) AS primary_done,
          SUM(CASE WHEN task_type='support'  THEN 1 ELSE 0 END) AS support_total,
          SUM(CASE WHEN task_type='support'  AND is_completed=1 THEN 1 ELSE 0 END) AS support_done,
          SUM(CASE WHEN task_type='optimize' THEN 1 ELSE 0 END) AS optimize_total,
          SUM(CASE WHEN task_type='optimize' AND is_completed=1 THEN 1 ELSE 0 END) AS optimize_done
        FROM daily_tasks
        WHERE user_id=? AND goal_id=? AND log_date=?
        """,
        (user_id, goal_id, log_date),
    ) or {}

    primary_done = int(counts.get("primary_done", 0) or 0) > 0
    optimize_done = int(counts.get("optimize_done", 0) or 0) > 0
    support_total = int(counts.get("support_total", 0) or 0)
    support_done = int(counts.get("support_done", 0) or 0)

    score = compute_performance_score(
        ScoreInputs(
            primary_done=primary_done,
            support_done=support_done,
            support_total=support_total,
            optimize_done=optimize_done,
            focus_level=focus_level,
            friction_count=friction_count,
        )
    )
    xp_gained = compute_xp(score, primary_done=primary_done)

    execute(
        "UPDATE daily_logs SET performance_score=?, xp_gained=?, updated_at=datetime('now') WHERE id=?",
        (score, xp_gained, log_id),
    )

    # Update user xp/level idempotently for the day:
    # store xp_gained on the log; user's total_xp should be sum(logs.xp_gained) to avoid double-add bugs.
    totals = query_one("SELECT COALESCE(SUM(xp_gained),0) AS total_xp FROM daily_logs WHERE user_id=?", (user_id,))
    total_xp = int(totals.get("total_xp", 0) or 0) if totals else 0
    level = compute_level(total_xp)
    execute("UPDATE users SET total_xp=?, level=?, updated_at=datetime('now') WHERE id=?", (total_xp, level, user_id))

    log_row = query_one("SELECT * FROM daily_logs WHERE id = ?", (log_id,))
    return jsonify({"log": log_row, "total_xp": total_xp, "level": level}), 201


@bp.get("/logs")
@jwt_required()
def get_logs_grouped():
    """
    History endpoint: returns days grouped by date with tasks and performance score.
    Query params:
      - goal_id (optional, defaults to active goal)
      - from (YYYY-MM-DD)
      - to (YYYY-MM-DD)
      - limit (days)
      - offset (days)
    """
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))

    date_from = request.args.get("from")
    date_to = request.args.get("to")
    limit = request.args.get("limit")
    offset = request.args.get("offset")

    if date_from is not None:
        date_from = as_date_yyyy_mm_dd(date_from, field="from")
    if date_to is not None:
        date_to = as_date_yyyy_mm_dd(date_to, field="to")

    lim = AppConfig.DEFAULT_LOG_LIMIT
    if limit is not None:
        lim = as_int(limit, field="limit", min_val=1, max_val=AppConfig.MAX_LOG_LIMIT, default=AppConfig.DEFAULT_LOG_LIMIT)
    off = 0
    if offset is not None:
        off = as_int(offset, field="offset", min_val=0, max_val=100000, default=0)

    where = ["user_id=? AND goal_id=?"]
    params: List[Any] = [user_id, goal_id]
    if date_from:
        where.append("log_date >= ?")
        params.append(date_from)
    if date_to:
        where.append("log_date <= ?")
        params.append(date_to)

    logs = query_all(
        f"""
        SELECT * FROM daily_logs
        WHERE {' AND '.join(where)}
        ORDER BY log_date DESC
        LIMIT ? OFFSET ?
        """,
        tuple(params + [lim, off]),
    )

    if not logs:
        return jsonify({"goal_id": goal_id, "days": []})

    # Fetch tasks for those dates
    dates = [l["log_date"] for l in logs]
    placeholders = ",".join(["?"] * len(dates))
    tasks = query_all(
        f"""
        SELECT * FROM daily_tasks
        WHERE user_id=? AND goal_id=? AND log_date IN ({placeholders})
        ORDER BY log_date DESC, task_type ASC, created_at ASC
        """,
        tuple([user_id, goal_id] + dates),
    )

    tasks_by_date: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for t in tasks:
        tasks_by_date[str(t["log_date"])].append(t)

    days = []
    for l in logs:
        d = str(l["log_date"])
        days.append(
            {
                "date": d,
                "performance_score": float(l.get("performance_score", 0) or 0),
                "focus_level": float(l.get("focus_level", 0) or 0),
                "energy_state": l.get("energy_state"),
                "friction_count": int(l.get("friction_count", 0) or 0),
                "notes": l.get("notes"),
                "hurdles": l.get("hurdles"),
                "tasks": tasks_by_date.get(d, []),
            }
        )

    return jsonify({"goal_id": goal_id, "days": days})

