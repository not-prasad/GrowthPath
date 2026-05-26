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
    
    return jsonify({
        "habit": {
            "id": habit_id,
            "trigger_habit": trigger,
            "new_habit": new_habit
        }
    }), 201

@bp.delete("/habits/<int:habit_id>")
@jwt_required()
def delete_habit(habit_id):
    user_id = int(get_jwt_identity())
    execute("DELETE FROM habit_stacks WHERE id=? AND user_id=?", (habit_id, user_id))
    return jsonify({"success": True})
