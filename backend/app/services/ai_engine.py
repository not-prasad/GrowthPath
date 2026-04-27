from __future__ import annotations

import json
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from backend.config import Config
from ..database import query_one, execute


def build_insights_prompt(*, goal_title: str, trends: Dict[str, Any], recent_days: List[Dict[str, Any]]) -> str:
    return (
        "You are a Personal Performance Lab analyst.\n"
        f"Goal: {goal_title}\n"
        f"Trend: {trends.get('trend','stable')}\n"
        f"Recent days: {recent_days}\n"
        "Return ONLY valid JSON: an array of 3 objects with {title, body, type}.\n"
        "type must be one of: positive, warning, info.\n"
        "Be analytical, concise, no motivational fluff.\n"
    )


def _fallback() -> List[Dict[str, Any]]:
    return [
        {"title": "Not enough signal yet", "body": "Log a few more days to unlock sharper correlations.", "type": "info"},
        {"title": "Keep inputs consistent", "body": "Use the same focus and friction scales daily to improve trend accuracy.", "type": "info"},
        {"title": "Review one variable", "body": "Pick one support variable to adjust for 3 days and observe score changes.", "type": "positive"},
    ]


def get_ai_insights(*, goal_title: str, trends: Dict[str, Any], recent_days: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    AI provider integration is intentionally isolated here.
    If no provider configured, returns safe deterministic fallback.
    """
    provider = (getattr(Config, "AI_PROVIDER", None) or "none").lower()
    prompt = build_insights_prompt(goal_title=goal_title, trends=trends, recent_days=recent_days)

    if provider == "none":
        return _fallback()

    # Provider stubs (implement later without touching routes/analytics).
    # The contract: return list[dict] with title/body/type.
    try:
        raise RuntimeError("AI provider not implemented")
    except Exception:
        return _fallback()


def _context_hash(context: Dict[str, Any]) -> str:
    payload = json.dumps(context, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _cache_get(cache_key: str, user_id: int, goal_id: int, context_hash: str) -> Optional[Dict[str, Any]]:
    row = query_one(
        """
        SELECT payload
        FROM ai_cache
        WHERE cache_key=? AND user_id=? AND goal_id=? AND context_hash=? AND expires_at > datetime('now')
        """,
        (cache_key, user_id, goal_id, context_hash),
    )
    if not row:
        return None
    try:
        return json.loads(row["payload"])
    except Exception:
        return None


def _cache_set(cache_key: str, user_id: int, goal_id: int, context_hash: str, payload: Dict[str, Any], ttl_minutes: int = 60) -> None:
    expires_at = (datetime.utcnow() + timedelta(minutes=max(ttl_minutes, 1))).strftime("%Y-%m-%d %H:%M:%S")
    execute(
        """
        INSERT INTO ai_cache(cache_key, user_id, goal_id, context_hash, payload, expires_at)
        VALUES (?,?,?,?,?,?)
        ON CONFLICT(cache_key) DO UPDATE SET
            user_id=excluded.user_id,
            goal_id=excluded.goal_id,
            context_hash=excluded.context_hash,
            payload=excluded.payload,
            expires_at=excluded.expires_at,
            created_at=datetime('now')
        """,
        (cache_key, user_id, goal_id, context_hash, json.dumps(payload), expires_at),
    )


def _deterministic_daily_brief(context: Dict[str, Any]) -> str:
    line_interp = str(context.get("line_interpretation", "Your trend is stable."))
    cat_interp = str(context.get("category_interpretation", "Task completion is balanced."))
    return f"{line_interp} {cat_interp}"


def _deterministic_root_cause(context: Dict[str, Any]) -> str:
    line_stats = context.get("line_stats", {}) or {}
    focus_corr = float((context.get("focus_scatter_stats", {}) or {}).get("correlation", 0) or 0)
    friction_corr = float((context.get("friction_scatter_stats", {}) or {}).get("correlation", 0) or 0)
    delta = float(line_stats.get("delta", 0) or 0)

    if delta < -1:
        if friction_corr <= -0.5:
            return "Recent dip appears linked to rising friction. Reduce blockers first before increasing workload."
        if focus_corr >= 0.3:
            return "Recent dip appears linked to lower focus consistency. Protect focused time for your primary task."
        return "Recent dip is visible, but no single strong driver stands out. Keep tasks simpler for a few days and reassess."
    return "No major dip detected recently. Keep your current routine and monitor consistency."


def _deterministic_weekly_retro(context: Dict[str, Any]) -> str:
    weekday_stats = context.get("weekday_stats", {}) or {}
    best = weekday_stats.get("best_weekday")
    worst = weekday_stats.get("worst_weekday")
    if best and worst:
        return f"You were strongest on {best} and weaker on {worst}. Replicate your {best} routine earlier in the week."
    return "Not enough weekly data yet. Continue logging daily to unlock a stronger weekly review."


def _build_ai_brief_prompt(context: Dict[str, Any]) -> str:
    return (
        "You are a performance analyst. Keep responses practical and concise.\n"
        "Use only this precomputed analytics summary:\n"
        f"{json.dumps(context, ensure_ascii=False)}\n"
        "Return valid JSON ONLY:\n"
        '{'
        '"daily_analyst_brief":"1-2 sentence plain summary",'
        '"root_cause_dip_detection":"1-2 sentence root cause suggestion",'
        '"weekly_retro":"1-2 sentence weekly review"'
        "}"
    )


def _call_groq(prompt: str) -> Optional[Dict[str, Any]]:
    api_key = getattr(Config, "GROQ_API_KEY", None)
    if not api_key:
        return None
    try:
        from groq import Groq  # local import to keep startup resilient

        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = (resp.choices[0].message.content or "").strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            return None
        return {
            "daily_analyst_brief": str(parsed.get("daily_analyst_brief", "")).strip(),
            "root_cause_dip_detection": str(parsed.get("root_cause_dip_detection", "")).strip(),
            "weekly_retro": str(parsed.get("weekly_retro", "")).strip(),
        }
    except Exception:
        return None


def get_ai_brief(*, user_id: int, goal_id: int, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Suggestion-only AI brief pipeline.
    - Input must be precomputed analytics (no raw DB mutation logic here).
    - All outputs are cached.
    """
    h = _context_hash(context)
    cache_key = f"brief:{user_id}:{goal_id}"
    cached = _cache_get(cache_key, user_id, goal_id, h)
    if cached:
        cached["meta"] = {**(cached.get("meta") or {}), "cached": True}
        return cached

    # Deterministic baseline always available.
    deterministic = {
        "daily_analyst_brief": _deterministic_daily_brief(context),
        "root_cause_dip_detection": _deterministic_root_cause(context),
        "weekly_retro": _deterministic_weekly_retro(context),
    }

    # Optional AI refinement from Groq, suggestion-only.
    ai_payload = _call_groq(_build_ai_brief_prompt(context))
    result = ai_payload if ai_payload else deterministic
    if ai_payload:
        # Fill any missing fields with deterministic fallbacks.
        for k, v in deterministic.items():
            if not result.get(k):
                result[k] = v

    payload = {
        "daily_analyst_brief": result["daily_analyst_brief"],
        "root_cause_dip_detection": result["root_cause_dip_detection"],
        "weekly_retro": result["weekly_retro"],
        "meta": {
            "cached": False,
            "provider": "groq" if ai_payload else "deterministic",
            "suggestion_only": True,
        },
    }
    _cache_set(cache_key, user_id, goal_id, h, payload, ttl_minutes=60)
    return payload

