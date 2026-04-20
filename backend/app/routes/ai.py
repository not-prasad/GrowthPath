from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..database import query_all, query_one
from ..services.ai_engine import get_ai_insights
from ..services.analytics_engine import compute_trends
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

