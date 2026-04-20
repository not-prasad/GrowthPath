from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

from flask import Flask, jsonify


@dataclass
class ApiError(Exception):
    code: str
    message: str
    status: int = 400
    details: Optional[Dict[str, Any]] = None


def error_response(code: str, message: str, status: int, details: Optional[Dict[str, Any]] = None):
    payload = {"error": {"code": code, "message": message}}
    if details:
        payload["error"]["details"] = details
    return jsonify(payload), status


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ApiError)
    def _handle_api_error(err: ApiError):
        return error_response(err.code, err.message, err.status, err.details)

    @app.errorhandler(sqlite3.IntegrityError)
    def _handle_integrity(err: sqlite3.IntegrityError):
        msg = str(err)
        # Map common unique constraint violations to 409.
        if "UNIQUE constraint failed" in msg:
            return error_response("conflict", "Resource already exists.", 409, {"db": msg})
        return error_response("bad_request", "Database constraint error.", 400, {"db": msg})

    @app.errorhandler(404)
    def _handle_404(_):
        return error_response("not_found", "Route not found.", 404)

    @app.errorhandler(Exception)
    def _handle_unexpected(err: Exception):
        # Never crash. Never leak secrets.
        return error_response("internal", "Internal Server Error", 500)

