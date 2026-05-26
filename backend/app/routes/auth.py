import bcrypt
from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from ..database import query_one, execute
from ..utils.errors import ApiError
from ..utils.validation import require_json, as_str


bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/register")
def register():
    data = require_json(request)
    email = as_str(data.get("email"), field="email", min_len=3, max_len=320)
    password = as_str(data.get("password"), field="password", min_len=6, max_len=200)

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    try:
        user_id = execute(
            "INSERT INTO users(email, password_hash) VALUES (?, ?)",
            (email, hashed),
        )
    except Exception as e:
        # Check for unique constraint violation (SQLite or Postgres)
        msg = str(e).lower()
        if "unique" in msg or "already exists" in msg:
            raise ApiError("conflict", "This email is already registered.", 409)
        raise

    token = create_access_token(identity=str(user_id))
    return jsonify({"token": token, "user": {"id": user_id, "email": email}}), 201


@bp.post("/login")
def login():
    data = require_json(request)
    email = as_str(data.get("email"), field="email", min_len=3, max_len=320)
    password = as_str(data.get("password"), field="password", min_len=1, max_len=200)

    row = query_one("SELECT id, email, password_hash FROM users WHERE email = ?", (email,))
    if not row:
        raise ApiError("unauthorized", "Invalid credentials.", 401)
    ok = bcrypt.checkpw(password.encode("utf-8"), str(row["password_hash"]).encode("utf-8"))
    if not ok:
        raise ApiError("unauthorized", "Invalid credentials.", 401)

    token = create_access_token(identity=str(row["id"]))
    return jsonify({"token": token, "user": {"id": int(row["id"]), "email": row["email"]}}), 200


@bp.get("/me")
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    row = query_one("SELECT id, email, active_goal_id, total_xp, level FROM users WHERE id = ?", (user_id,))
    if not row:
        raise ApiError("unauthorized", "User not found.", 401)
    return jsonify({"user": row})

