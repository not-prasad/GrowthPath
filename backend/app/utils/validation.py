from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Optional, Tuple

from flask import Request

from .errors import ApiError


def require_json(request: Request) -> Dict[str, Any]:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("bad_request", "Expected JSON object body.", 400)
    return data


def as_str(x: Any, *, field: str, min_len: int = 0, max_len: int = 5000, default: Optional[str] = None) -> str:
    if x is None:
        if default is not None:
            return default
        raise ApiError("bad_request", f"Missing field '{field}'.", 400)
    if not isinstance(x, str):
        raise ApiError("bad_request", f"Field '{field}' must be a string.", 400)
    s = x.strip()
    if len(s) < min_len:
        raise ApiError("bad_request", f"Field '{field}' is too short.", 400)
    if len(s) > max_len:
        raise ApiError("bad_request", f"Field '{field}' is too long.", 400)
    return s


def as_int(x: Any, *, field: str, min_val: Optional[int] = None, max_val: Optional[int] = None, default: Optional[int] = None) -> int:
    if x is None:
        if default is not None:
            return default
        raise ApiError("bad_request", f"Missing field '{field}'.", 400)
    try:
        v = int(x)
    except Exception:
        raise ApiError("bad_request", f"Field '{field}' must be an integer.", 400)
    if min_val is not None and v < min_val:
        raise ApiError("bad_request", f"Field '{field}' must be >= {min_val}.", 400)
    if max_val is not None and v > max_val:
        raise ApiError("bad_request", f"Field '{field}' must be <= {max_val}.", 400)
    return v


def as_bool(x: Any, *, field: str, default: Optional[bool] = None) -> bool:
    if x is None:
        if default is not None:
            return default
        raise ApiError("bad_request", f"Missing field '{field}'.", 400)
    if isinstance(x, bool):
        return x
    if isinstance(x, (int, float)) and x in (0, 1):
        return bool(x)
    if isinstance(x, str):
        v = x.strip().lower()
        if v in ("true", "1", "yes", "y"):
            return True
        if v in ("false", "0", "no", "n"):
            return False
    raise ApiError("bad_request", f"Field '{field}' must be boolean.", 400)


def as_date_yyyy_mm_dd(x: Any, *, field: str, default: Optional[str] = None) -> str:
    if x is None:
        if default is not None:
            return default
        raise ApiError("bad_request", f"Missing field '{field}'.", 400)
    if not isinstance(x, str):
        raise ApiError("bad_request", f"Field '{field}' must be a date string (YYYY-MM-DD).", 400)
    s = x.strip()
    try:
        datetime.strptime(s, "%Y-%m-%d")
    except Exception:
        raise ApiError("bad_request", f"Field '{field}' must be in YYYY-MM-DD format.", 400)
    return s


def as_enum(x: Any, *, field: str, allowed: Tuple[str, ...], default: Optional[str] = None) -> str:
    if x is None:
        if default is not None:
            return default
        raise ApiError("bad_request", f"Missing field '{field}'.", 400)
    if not isinstance(x, str):
        raise ApiError("bad_request", f"Field '{field}' must be a string.", 400)
    v = x.strip()
    if v not in allowed:
        raise ApiError("bad_request", f"Field '{field}' must be one of {list(allowed)}.", 400)
    return v

