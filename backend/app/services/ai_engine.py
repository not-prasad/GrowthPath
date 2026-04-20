from __future__ import annotations

import json
from typing import Any, Dict, List

from backend.config import Config


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

