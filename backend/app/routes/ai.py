from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..database import query_all, query_one
from ..services.ai_engine import get_ai_brief, get_ai_insights
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
from .logs import _resolve_goal_id


bp = Blueprint("ai", __name__, url_prefix="/api")


@bp.get("/ai/insights")
@jwt_required()
def ai_insights():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))

    goal = query_one("SELECT title FROM goals WHERE id=? AND user_id=?", (goal_id, user_id))
    rows = query_all(
        """
        SELECT log_date, performance_score, focus_level, energy_state
        FROM daily_logs
        WHERE user_id=? AND goal_id=?
        ORDER BY log_date DESC
        LIMIT 14
        """,
        (user_id, goal_id),
    )
    trends = compute_trends(rows, days=min(7, len(rows) or 7))
    recent_days = trends.get("data", [])[-7:]

    insights = get_ai_insights(goal_title=(goal["title"] if goal else "Unknown"), trends=trends, recent_days=recent_days)
    return jsonify({"goal_id": goal_id, "insights": insights})


@bp.get("/ai/brief")
@jwt_required()
def ai_brief():
    """
    Returns suggestion-only AI content:
    1) Daily Analyst Brief
    2) Root Cause Dip Detection
    3) Weekly Retro
    """
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))

    goal = query_one("SELECT title FROM goals WHERE id=? AND user_id=?", (goal_id, user_id))
    logs = query_all(
        """
        SELECT log_date, performance_score, focus_level, friction_count, energy_state
        FROM daily_logs
        WHERE user_id=? AND goal_id=?
        ORDER BY log_date ASC
        LIMIT 120
        """,
        (user_id, goal_id),
    )
    tasks = query_all(
        """
        SELECT log_date, task_type, is_completed
        FROM daily_tasks
        WHERE user_id=? AND goal_id=?
        """,
        (user_id, goal_id),
    )

    line = interpret_line(compute_line_chart(logs))
    boxplot = interpret_boxplot(compute_boxplot(logs))
    category = interpret_category_completion(compute_completion_by_category(tasks))
    weekday = interpret_weekday(compute_weekday_analysis(logs))
    focus_scatter = interpret_scatter(compute_scatter_focus_vs_score(logs), kind="focus")
    friction_scatter = interpret_scatter(compute_scatter_friction_vs_score(logs), kind="friction")

    context = {
        "goal_title": (goal["title"] if goal else "Unknown"),
        "line_stats": line.get("stats", {}),
        "line_interpretation": line.get("interpretation", ""),
        "boxplot_stats": boxplot.get("stats", {}),
        "boxplot_interpretation": boxplot.get("interpretation", ""),
        "category_stats": category.get("stats", {}),
        "category_interpretation": category.get("interpretation", ""),
        "weekday_stats": weekday.get("stats", {}),
        "weekday_interpretation": weekday.get("interpretation", ""),
        "focus_scatter_stats": focus_scatter.get("stats", {}),
        "focus_scatter_interpretation": focus_scatter.get("interpretation", ""),
        "friction_scatter_stats": friction_scatter.get("stats", {}),
        "friction_scatter_interpretation": friction_scatter.get("interpretation", ""),
        "samples": {
            "log_count": len(logs),
            "task_count": len(tasks),
        },
    }

    brief = get_ai_brief(user_id=user_id, goal_id=goal_id, context=context)
    return jsonify({"goal_id": goal_id, "brief": brief})

