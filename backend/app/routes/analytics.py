from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..config import AppConfig
from ..database import query_all
from ..services.analytics_engine import (
    compute_boxplot,
    compute_completion_by_category,
    compute_line_chart,
    compute_scatter_focus_vs_score,
    compute_scatter_friction_vs_score,
    compute_trends,
    compute_weekday_analysis,
    interpret_boxplot,
    interpret_category_completion,
    interpret_line,
    interpret_scatter,
    interpret_weekday,
)
from ..utils.validation import as_date_yyyy_mm_dd, as_int
from .logs import _resolve_goal_id


bp = Blueprint("analytics", __name__, url_prefix="/api")


@bp.get("/performance/trends")
@jwt_required()
def performance_trends():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    days = request.args.get("days")
    n = AppConfig.DEFAULT_TRENDS_DAYS
    if days is not None:
        n = as_int(days, field="days", min_val=1, max_val=365, default=AppConfig.DEFAULT_TRENDS_DAYS)

    rows = query_all(
        """
        SELECT log_date, performance_score, focus_level, energy_state
        FROM daily_logs
        WHERE user_id=? AND goal_id=?
        ORDER BY log_date DESC
        """,
        (user_id, goal_id),
    )
    return jsonify({"goal_id": goal_id, "trends": compute_trends(rows, days=n)})


def _load_logs(user_id: int, goal_id: int):
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
    params = [user_id, goal_id]
    if date_from:
        where.append("log_date >= ?")
        params.append(date_from)
    if date_to:
        where.append("log_date <= ?")
        params.append(date_to)

    rows = query_all(
        f"""
        SELECT log_date, performance_score, focus_level, friction_count, energy_state
        FROM daily_logs
        WHERE {' AND '.join(where)}
        ORDER BY log_date ASC
        LIMIT ? OFFSET ?
        """,
        tuple(params + [lim, off]),
    )
    return rows


def _load_tasks(user_id: int, goal_id: int):
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    if date_from is not None:
        date_from = as_date_yyyy_mm_dd(date_from, field="from")
    if date_to is not None:
        date_to = as_date_yyyy_mm_dd(date_to, field="to")

    where = ["user_id=? AND goal_id=?"]
    params = [user_id, goal_id]
    if date_from:
        where.append("log_date >= ?")
        params.append(date_from)
    if date_to:
        where.append("log_date <= ?")
        params.append(date_to)

    rows = query_all(
        f"""
        SELECT log_date, task_type, is_completed
        FROM daily_tasks
        WHERE {' AND '.join(where)}
        """,
        tuple(params),
    )
    return rows


@bp.get("/analytics/line")
@jwt_required()
def viz_line():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    logs = _load_logs(user_id, goal_id)
    return jsonify({"goal_id": goal_id, "line": interpret_line(compute_line_chart(logs))})


@bp.get("/analytics/boxplot")
@jwt_required()
def viz_boxplot():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    logs = _load_logs(user_id, goal_id)
    return jsonify({"goal_id": goal_id, "boxplot": interpret_boxplot(compute_boxplot(logs))})


@bp.get("/analytics/category-completion")
@jwt_required()
def viz_category_completion():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    tasks = _load_tasks(user_id, goal_id)
    return jsonify({"goal_id": goal_id, "bar": interpret_category_completion(compute_completion_by_category(tasks))})


@bp.get("/analytics/weekday")
@jwt_required()
def viz_weekday():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    threshold_raw = request.args.get("completion_threshold")
    threshold = 70.0
    if threshold_raw is not None:
        try:
            threshold = float(threshold_raw)
        except Exception:
            threshold = 70.0
    logs = _load_logs(user_id, goal_id)
    return jsonify({"goal_id": goal_id, "weekday": interpret_weekday(compute_weekday_analysis(logs, completion_threshold=threshold))})


@bp.get("/analytics/scatter/focus")
@jwt_required()
def viz_scatter_focus():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    logs = _load_logs(user_id, goal_id)
    return jsonify({"goal_id": goal_id, "scatter": interpret_scatter(compute_scatter_focus_vs_score(logs), kind="focus")})


@bp.get("/analytics/scatter/friction")
@jwt_required()
def viz_scatter_friction():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    logs = _load_logs(user_id, goal_id)
    return jsonify({"goal_id": goal_id, "scatter": interpret_scatter(compute_scatter_friction_vs_score(logs), kind="friction")})

