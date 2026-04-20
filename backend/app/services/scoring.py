from __future__ import annotations

from dataclasses import dataclass


def _clamp(x: float, lo: float, hi: float) -> float:
    return lo if x < lo else (hi if x > hi else x)


@dataclass(frozen=True)
class ScoreInputs:
    primary_done: bool
    support_done: int
    support_total: int
    optimize_done: bool
    focus_level: float  # expected 0..5
    friction_count: int


def compute_performance_score(inp: ScoreInputs) -> float:
    """
    Forgiving baseline scoring: 40..100.
    Deterministic, no DB access, rounded to 2 decimals.
    """
    # Normalize inputs
    support_total = max(int(inp.support_total or 0), 0)
    support_done = max(min(int(inp.support_done or 0), support_total), 0)
    focus = _clamp(float(inp.focus_level if inp.focus_level is not None else 3.0), 0.0, 5.0)
    friction = max(int(inp.friction_count or 0), 0)

    # Weighted components (0..1 each)
    primary_score = 1.0 if bool(inp.primary_done) else 0.5  # forgiving baseline
    support_score = (support_done / support_total) if support_total > 0 else 0.8  # forgiving if no support tasks exist
    optimize_score = 1.0 if bool(inp.optimize_done) else 0.8
    focus_score = focus / 5.0

    weighted = (
        primary_score * 0.50 +
        support_score * 0.25 +
        optimize_score * 0.15 +
        focus_score * 0.10
    )

    base = (weighted * 60.0) + 40.0  # 40..100

    # Friction modifier: bounded penalty
    penalty = min(friction, 5) * 1.5  # max -7.5
    final_score = _clamp(base - penalty, 40.0, 100.0)

    return round(final_score, 2)


def compute_xp(score: float, primary_done: bool) -> int:
    """
    Optional XP mapping. Deterministic integer.
    """
    s = _clamp(float(score or 0.0), 0.0, 100.0)
    if primary_done:
        return int(50 + (s / 100.0) * 50)  # 50..100
    if s >= 50:
        return int((s / 100.0) * 40)       # 20..40 at 50..100
    if s > 0:
        return 10
    return 0


def compute_level(total_xp: int) -> int:
    """
    Stable integer level system: 1 + floor(total_xp / 1000).
    """
    xp = max(int(total_xp or 0), 0)
    return 1 + (xp // 1000)

