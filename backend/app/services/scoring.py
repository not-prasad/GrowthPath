import math
from dataclasses import dataclass


def _clamp(x: float, lo: float, hi: float) -> float:
    return lo if x < lo else (hi if x > hi else x)


@dataclass(frozen=True)
class ScoreInputs:
    primary_done: bool
    support_done: int
    support_total: int
    optimize_done: int
    optimize_total: int
    focus_level: float  # expected 0..5
    friction_count: int


def compute_performance_score(inp: ScoreInputs) -> float:
    """
    Balanced performance scoring: 0..100.
    Deterministic, no DB access, rounded to 2 decimals.
    """
    # Normalize inputs
    support_total = max(int(inp.support_total or 0), 0)
    support_done = max(min(int(inp.support_done or 0), support_total), 0)
    optimize_total = max(int(inp.optimize_total or 0), 0)
    optimize_done = max(min(int(inp.optimize_done or 0), optimize_total), 0)
    
    focus = _clamp(float(inp.focus_level if inp.focus_level is not None else 3.0), 0.0, 5.0)
    friction = max(int(inp.friction_count or 0), 0)

    # Weighted components (0..1 each)
    # Primary is now CRITICAL. If not done, score is capped.
    primary_score = 1.0 if bool(inp.primary_done) else 0.2 
    
    support_score = (support_done / support_total) if support_total > 0 else 1.0
    optimize_score = (optimize_done / optimize_total) if optimize_total > 0 else 1.0
    focus_score = focus / 5.0

    weighted = (
        primary_score * 0.55 +
        support_score * 0.20 +
        optimize_score * 0.15 +
        focus_score * 0.10
    )

    # Base score 0..100
    base = weighted * 100.0

    # Friction modifier: non-linear penalty
    # 1-2 frictions is normal, 3+ is a significant drag.
    penalty = 0
    if friction > 0:
        penalty = min(friction * 3, 15) # Max -15 for high friction
        
    final_score = _clamp(base - penalty, 0.0, 100.0)

    return round(final_score, 2)


def compute_xp(primary_done: bool, support_done: int, optimize_done: int) -> int:
    """
    Balanced XP reward system.
    Primary tasks are now the most valuable.
    """
    xp = 0
    if primary_done:
        xp += 250 # Reward deep work heavily
    xp += (int(support_done or 0) * 35) # Support tasks are secondary
    xp += (int(optimize_done or 0) * 60) # Optimization/Growth is rewarded
    return xp


def compute_level(total_xp: int) -> int:
    """
    Quadratic Leveling System: Level = floor(sqrt(XP / 100)) + 1
    This ensures that early levels are fast, but high levels require 
    significant consistent effort.
    Example: 
    - Lvl 2: 100 XP
    - Lvl 5: 1600 XP
    - Lvl 10: 8100 XP
    - Lvl 50: 240,100 XP
    """
    xp = max(int(total_xp or 0), 0)
    if xp == 0:
        return 1
    return int(math.sqrt(xp / 100)) + 1
