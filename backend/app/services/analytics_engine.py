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


def _sorted_scores(log_rows: List[Dict[str, Any]]) -> List[float]:
    scores: List[float] = []
    for r in log_rows:
        v = r.get("performance_score")
        if v is None:
            continue
        try:
            scores.append(float(v))
        except Exception:
            continue
    scores.sort()
    return scores


def _percentile(sorted_vals: List[float], p: float) -> float:
    """
    Deterministic percentile using linear interpolation (inclusive).
    p in [0,1].
    """
    if not sorted_vals:
        return 0.0
    if p <= 0:
        return float(sorted_vals[0])
    if p >= 1:
        return float(sorted_vals[-1])
    n = len(sorted_vals)
    idx = (n - 1) * p
    lo = int(idx)
    hi = min(lo + 1, n - 1)
    frac = idx - lo
    return float(sorted_vals[lo] * (1 - frac) + sorted_vals[hi] * frac)


def compute_line_chart(log_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Line chart: performance over time.
    Output: { data: [{x: 'YYYY-MM-DD', y: score}], n }
    """
    pts = []
    for r in log_rows:
        d = str(r.get("log_date", ""))
        if not _parse_date(d):
            continue
        try:
            y = float(r.get("performance_score", 0) or 0)
        except Exception:
            y = 0.0
        pts.append({"x": d, "y": round(y, 2)})
    pts.sort(key=lambda p: p["x"])
    return {"n": len(pts), "data": pts}


def compute_boxplot(log_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Boxplot: distribution of performance_score.
    Output includes quartiles + outliers for plotting.
    """
    scores = _sorted_scores(log_rows)
    if not scores:
        return {"n": 0, "min": 0, "q1": 0, "median": 0, "q3": 0, "max": 0, "iqr": 0, "outliers": []}

    q1 = _percentile(scores, 0.25)
    med = _percentile(scores, 0.50)
    q3 = _percentile(scores, 0.75)
    iqr = q3 - q1
    lo = q1 - 1.5 * iqr
    hi = q3 + 1.5 * iqr
    outliers = [round(s, 2) for s in scores if s < lo or s > hi]

    # Whiskers: min/max within fences
    in_fence = [s for s in scores if lo <= s <= hi]
    whisk_min = float(in_fence[0]) if in_fence else float(scores[0])
    whisk_max = float(in_fence[-1]) if in_fence else float(scores[-1])

    return {
        "n": len(scores),
        "min": round(whisk_min, 2),
        "q1": round(q1, 2),
        "median": round(med, 2),
        "q3": round(q3, 2),
        "max": round(whisk_max, 2),
        "iqr": round(iqr, 2),
        "outliers": outliers,
    }


def compute_scatter_focus_vs_score(log_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    pts = []
    for r in log_rows:
        d = str(r.get("log_date", ""))
        if not _parse_date(d):
            continue
        try:
            x = float(r.get("focus_level", 0) or 0)
            y = float(r.get("performance_score", 0) or 0)
        except Exception:
            continue
        pts.append({"x": round(x, 2), "y": round(y, 2), "date": d})
    return {"n": len(pts), "data": pts}


def compute_scatter_friction_vs_score(log_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    pts = []
    for r in log_rows:
        d = str(r.get("log_date", ""))
        if not _parse_date(d):
            continue
        try:
            x = float(r.get("friction_count", 0) or 0)
            y = float(r.get("performance_score", 0) or 0)
        except Exception:
            continue
        pts.append({"x": round(x, 2), "y": round(y, 2), "date": d})
    return {"n": len(pts), "data": pts}


def compute_weekday_analysis(log_rows: List[Dict[str, Any]], *, completion_threshold: float = 70.0) -> Dict[str, Any]:
    """
    Weekday analysis over logs in range.
    Completion is defined as performance_score >= completion_threshold.
    """
    buckets: Dict[str, Dict[str, Any]] = {}
    order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    for r in log_rows:
        d = str(r.get("log_date", ""))
        dt = _parse_date(d)
        if not dt:
            continue
        wd = dt.strftime("%a")  # Mon, Tue, ...
        if wd not in buckets:
            buckets[wd] = {"weekday": wd, "count": 0, "completed": 0, "sum_score": 0.0, "sum_focus": 0.0, "sum_friction": 0.0}
        b = buckets[wd]
        score = float(r.get("performance_score", 0) or 0)
        focus = float(r.get("focus_level", 0) or 0)
        friction = float(r.get("friction_count", 0) or 0)
        b["count"] += 1
        b["sum_score"] += score
        b["sum_focus"] += focus
        b["sum_friction"] += friction
        if score >= completion_threshold:
            b["completed"] += 1

    data = []
    for wd in order:
        b = buckets.get(wd, {"weekday": wd, "count": 0, "completed": 0, "sum_score": 0.0, "sum_focus": 0.0, "sum_friction": 0.0})
        count = int(b["count"])
        completed = int(b["completed"])
        data.append(
            {
                "weekday": wd,
                "count": count,
                "completed": completed,
                "completion_rate": round((completed / count) * 100, 2) if count else 0.0,
                "avg_score": round((b["sum_score"] / count), 2) if count else 0.0,
                "avg_focus": round((b["sum_focus"] / count), 2) if count else 0.0,
                "avg_friction": round((b["sum_friction"] / count), 2) if count else 0.0,
            }
        )

    return {"completion_threshold": completion_threshold, "data": data}


def compute_completion_by_category(task_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Bar chart: completion by task_type.
    Output: { data: [{category, total, completed, completion_rate}], n }
    """
    cats = ["primary", "support", "optimize", "custom"]
    totals = {c: {"category": c, "total": 0, "completed": 0} for c in cats}
    for r in task_rows:
        c = str(r.get("task_type", "custom") or "custom")
        if c not in totals:
            totals[c] = {"category": c, "total": 0, "completed": 0}
        totals[c]["total"] += 1
        if int(r.get("is_completed", 0) or 0) == 1:
            totals[c]["completed"] += 1

    data = []
    for c in cats:
        t = totals.get(c, {"category": c, "total": 0, "completed": 0})
        total = int(t["total"])
        completed = int(t["completed"])
        data.append(
            {
                "category": c,
                "total": total,
                "completed": completed,
                "completion_rate": round((completed / total) * 100, 2) if total else 0.0,
            }
        )
    return {"n": len(task_rows), "data": data}


def _mean(vals: List[float]) -> float:
    return (sum(vals) / len(vals)) if vals else 0.0


def _pearson_corr(xs: List[float], ys: List[float]) -> float:
    """
    Deterministic Pearson correlation. Returns 0.0 when undefined.
    """
    n = min(len(xs), len(ys))
    if n < 3:
        return 0.0
    x = xs[:n]
    y = ys[:n]
    mx = _mean(x)
    my = _mean(y)
    num = 0.0
    dx2 = 0.0
    dy2 = 0.0
    for i in range(n):
        dx = x[i] - mx
        dy = y[i] - my
        num += dx * dy
        dx2 += dx * dx
        dy2 += dy * dy
    den = (dx2 * dy2) ** 0.5
    if den == 0:
        return 0.0
    return num / den


def interpret_line(line: Dict[str, Any]) -> Dict[str, Any]:
    """
    Interpretation logic:
    - Compare last 7-day average vs previous 7-day average
    """
    pts = list(line.get("data") or [])
    ys = [float(p.get("y", 0) or 0) for p in pts]
    last7 = ys[-7:] if len(ys) >= 7 else ys
    prev7 = ys[-14:-7] if len(ys) >= 14 else []
    avg_last7 = round(_mean(last7), 2) if last7 else 0.0
    avg_prev7 = round(_mean(prev7), 2) if prev7 else 0.0
    delta = round(avg_last7 - avg_prev7, 2) if prev7 else 0.0

    if prev7:
        if avg_last7 > avg_prev7 + 1:
            interp = "Your performance is improving."
        elif avg_last7 < avg_prev7 - 1:
            interp = "Your performance is slightly declining."
        else:
            interp = "Your performance is stable."
    else:
        interp = "Log more days to see your trend."

    return {
        "data": line,
        "stats": {
            "avg_last_7_days": avg_last7,
            "avg_prev_7_days": avg_prev7,
            "delta": delta,
            "points": int(line.get("n", 0) or 0),
        },
        "interpretation": interp,
    }


def interpret_boxplot(box: Dict[str, Any]) -> Dict[str, Any]:
    iqr = float(box.get("iqr", 0) or 0)
    outliers = list(box.get("outliers") or [])

    # Deterministic thresholds on 40..100 scale
    if iqr <= 8:
        base = "Your performance is consistent."
    elif iqr >= 18:
        base = "Your performance fluctuates."
    else:
        base = "Your performance varies a bit."

    if len(outliers) > 0:
        interp = f"{base} Some days were unusually high or low."
    else:
        interp = base

    return {
        "data": box,
        "stats": box,
        "interpretation": interp,
    }


def interpret_scatter(scatter: Dict[str, Any], *, kind: str) -> Dict[str, Any]:
    pts = list(scatter.get("data") or [])
    xs = [float(p.get("x", 0) or 0) for p in pts]
    ys = [float(p.get("y", 0) or 0) for p in pts]
    corr = _pearson_corr(xs, ys)
    corr_r = round(corr, 2)

    if kind == "focus":
        if corr > 0.6:
            interp = "Higher focus strongly improves performance."
        elif corr >= 0.3:
            interp = "Focus moderately affects performance."
        else:
            interp = "Focus has weak impact on performance."
    else:  # friction
        if corr < -0.5:
            interp = "Higher friction significantly reduces performance."
        elif corr <= -0.2:
            interp = "Higher friction may reduce performance a bit."
        else:
            interp = "Friction has limited impact on performance."

    return {
        "data": scatter,
        "stats": {"correlation": corr_r, "points": int(scatter.get("n", 0) or 0)},
        "interpretation": interp,
    }


def interpret_weekday(weekday: Dict[str, Any]) -> Dict[str, Any]:
    data = list(weekday.get("data") or [])
    scored = [d for d in data if float(d.get("avg_score", 0) or 0) > 0 and int(d.get("count", 0) or 0) > 0]
    if not scored:
        return {
            "data": weekday,
            "stats": {"best_weekday": None, "worst_weekday": None},
            "interpretation": "Log more days to see weekday patterns.",
        }

    best = max(scored, key=lambda d: float(d.get("avg_score", 0) or 0))
    worst = min(scored, key=lambda d: float(d.get("avg_score", 0) or 0))
    interp = f"You perform best on {best['weekday']}. Your performance dips on {worst['weekday']}."
    return {
        "data": weekday,
        "stats": {"best_weekday": best["weekday"], "worst_weekday": worst["weekday"]},
        "interpretation": interp,
    }


def interpret_category_completion(bar: Dict[str, Any]) -> Dict[str, Any]:
    data = list(bar.get("data") or [])
    valid = [d for d in data if int(d.get("total", 0) or 0) > 0]
    if not valid:
        return {
            "data": bar,
            "stats": {"lowest_category": None},
            "interpretation": "Add tasks to see which areas you complete most.",
        }
    lowest = min(valid, key=lambda d: float(d.get("completion_rate", 0) or 0))
    cat = str(lowest.get("category", "tasks"))
    label = {
        "primary": "Primary tasks",
        "support": "Support tasks",
        "optimize": "Optimize tasks",
        "custom": "Custom tasks",
    }.get(cat, "Tasks")
    interp = f"{label} are your weakest area right now."
    return {
        "data": bar,
        "stats": {"lowest_category": cat, "lowest_completion_rate": float(lowest.get("completion_rate", 0) or 0)},
        "interpretation": interp,
    }

def compute_full_analysis(log_rows: List[Dict[str, Any]], task_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    High-performance one-pass computation for all analysis modules.
    Returns the complete structured payload for the frontend Analysis page.
    """
    line_raw = compute_line_chart(log_rows)
    boxplot_raw = compute_boxplot(log_rows)
    weekday_raw = compute_weekday_analysis(log_rows)
    scatter_focus_raw = compute_scatter_focus_vs_score(log_rows)
    scatter_friction_raw = compute_scatter_friction_vs_score(log_rows)
    category_completion_raw = compute_completion_by_category(task_rows)

    return {
        "line": interpret_line(line_raw),
        "boxplot": interpret_boxplot(boxplot_raw),
        "weekday": interpret_weekday(weekday_raw),
        "scatter_focus": interpret_scatter(scatter_focus_raw, kind="focus"),
        "scatter_friction": interpret_scatter(scatter_friction_raw, kind="friction"),
        "category_completion": interpret_category_completion(category_completion_raw),
    }
