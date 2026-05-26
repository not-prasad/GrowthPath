from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..database import execute, query_all, query_one
from ..utils.errors import ApiError
from ..utils.validation import require_json, as_bool, as_enum, as_int, as_str


bp = Blueprint("goals", __name__, url_prefix="/api")


@bp.post("/goals")
@jwt_required()
def create_goal():
    user_id = int(get_jwt_identity())
    data = require_json(request)

    title = as_str(data.get("title"), field="title", min_len=2, max_len=200)
    category = data.get("category")
    if category is not None:
        category = as_str(category, field="category", min_len=1, max_len=80)

    deadline_days = as_int(data.get("deadline_days", 30), field="deadline_days", min_val=1, max_val=3650, default=30)
    commitment = data.get("commitment")
    if commitment is not None:
        commitment = as_str(commitment, field="commitment", min_len=0, max_len=2000)
    difficulty = data.get("difficulty")
    if difficulty is not None:
        difficulty = as_str(difficulty, field="difficulty", min_len=0, max_len=2000)
    motivation = data.get("motivation")
    if motivation is not None:
        motivation = as_str(motivation, field="motivation", min_len=0, max_len=5000)

    status = as_enum(data.get("status", "active"), field="status", allowed=("active", "completed", "archived"), default="active")
    set_active = as_bool(data.get("set_active", True), field="set_active", default=True)

    goal_id = execute(
        """
        INSERT INTO goals(user_id, title, category, deadline_days, commitment, difficulty, motivation, status)
        VALUES (?,?,?,?,?,?,?,?)
        """,
        (user_id, title, category, deadline_days, commitment, difficulty, motivation, status),
    )

    if set_active:
        execute("UPDATE users SET active_goal_id = ? WHERE id = ?", (goal_id, user_id))

    goal = query_one("SELECT * FROM goals WHERE id = ? AND user_id = ?", (goal_id, user_id))
    return jsonify({"goal": goal}), 201


@bp.get("/goals")
@jwt_required()
def list_goals():
    user_id = int(get_jwt_identity())
    status = request.args.get("status")
    if status:
        if status not in ("active", "completed", "archived"):
            raise ApiError("bad_request", "Invalid status filter.", 400)
        goals = query_all("SELECT * FROM goals WHERE user_id = ? AND status = ? ORDER BY created_at DESC", (user_id, status))
    else:
        goals = query_all("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC", (user_id,))

    user = query_one("SELECT active_goal_id FROM users WHERE id = ?", (user_id,))
    return jsonify({"goals": goals, "active_goal_id": user.get("active_goal_id") if user else None})


@bp.put("/goals/active")
@jwt_required()
def set_active_goal():
    user_id = int(get_jwt_identity())
    data = require_json(request)
    goal_id = as_int(data.get("goal_id"), field="goal_id")

    # Verify goal belongs to user
    goal = query_one("SELECT id FROM goals WHERE id = ? AND user_id = ?", (goal_id, user_id))
    if not goal:
        raise ApiError("not_found", "Goal not found.", 404)

    execute("UPDATE users SET active_goal_id = ?, updated_at = datetime('now') WHERE id = ?", (goal_id, user_id))
    return jsonify({"success": True, "active_goal_id": goal_id})

