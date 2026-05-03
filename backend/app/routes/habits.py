from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from ..database import query_all, query_one, execute
from .logs import _resolve_goal_id

bp = Blueprint("habits", __name__, url_prefix="/api")

@bp.get("/habits")
@jwt_required()
def list_habits():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    
    rows = query_all(
        "SELECT id, trigger_habit, new_habit, created_at FROM habit_stacks WHERE user_id=? AND goal_id=? ORDER BY created_at DESC",
        (user_id, goal_id)
    )
    return jsonify(rows)

@bp.post("/habits")
@jwt_required()
def create_habit():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    
    data = request.get_json()
    trigger = data.get("trigger_habit")
    new_habit = data.get("new_habit")
    
    if not trigger or not new_habit:
        return jsonify({"error": "Missing habit data"}), 400
        
    habit_id = execute(
        "INSERT INTO habit_stacks(user_id, goal_id, trigger_habit, new_habit) VALUES (?,?,?,?)",
        (user_id, goal_id, trigger, new_habit)
    )
    
    # AWARD XP for setting up a habit (Psychological Reward)
    u = query_one("SELECT total_xp, level FROM users WHERE id=?", (user_id,))
    if u:
        new_xp = (u['total_xp'] or 0) + 50
        from ..services.scoring import compute_level
        execute("UPDATE users SET total_xp=?, level=? WHERE id=?", (new_xp, compute_level(new_xp), user_id))
    
    # Get updated user stats to return to frontend
    user_stats = query_one("SELECT total_xp, level FROM users WHERE id=?", (user_id,))
    
    return jsonify({
        "habit": {
            "id": habit_id,
            "trigger_habit": trigger,
            "new_habit": new_habit,
            "xp_bonus": 50
        },
        "total_xp": user_stats["total_xp"],
        "level": user_stats["level"]
    }), 201

@bp.delete("/habits/<int:habit_id>")
@jwt_required()
def delete_habit(habit_id):
    user_id = int(get_jwt_identity())
    execute("DELETE FROM habit_stacks WHERE id=? AND user_id=?", (habit_id, user_id))
    return jsonify({"success": True})
