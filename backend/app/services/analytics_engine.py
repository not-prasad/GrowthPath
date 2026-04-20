from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


def _parse_date(d: str) -> Optional[datetime]:
    try:
        return datetime.strptime(d, "%Y-%m-%d")
    except Exception:
        return None


def compute_trends(log_rows: List[Dict[str, Any]], *, days: int = 7) -> Dict[str, Any]:
    """
    Input: list of daily_logs rows (dict-like) containing log_date + performance_score.
    Output: chart-ready series in chronological order.
    """
    series = []
    for r in log_rows:
        d = str(r.get("log_date", ""))
        dt = _parse_date(d)
        if not dt:
            continue
        series.append({
            "log_date": d,
            "performance_score": float(r.get("performance_score", 0) or 0),
            "focus_level": float(r.get("focus_level", 0) or 0),
            "energy_state": r.get("energy_state"),
        })

    # Keep most recent N days
    series.sort(key=lambda x: x["log_date"], reverse=True)
    series = series[: max(int(days or 7), 1)]
    series.sort(key=lambda x: x["log_date"])

    scores = [x["performance_score"] for x in series if x["performance_score"] is not None]
    trend = "stable"
    if len(scores) >= 2:
        delta = scores[-1] - scores[0]
        trend = "up" if delta > 5 else ("down" if delta < -5 else "stable")

    return {"days": len(series), "trend": trend, "data": series}

