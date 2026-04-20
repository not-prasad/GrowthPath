from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..config import AppConfig
from ..database import query_all
from ..services.analytics_engine import compute_trends
from ..utils.validation import as_int
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

