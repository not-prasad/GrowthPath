import math
from dataclasses import dataclass


def _clamp(x: float, lo: float, hi: float) -> float:
    return lo if x < lo else (hi if x > hi else x)


@dataclass(frozen=True)
class ScoreInputs:
    primary_done: int
    primary_total: int
    support_done: int
    support_total: int
    optimize_done: int
    optimize_total: int
    custom_done: int
    custom_total: int
    focus_level: float  # expected 0..5
    friction_count: int


def compute_performance_score(inp: ScoreInputs) -> float:
    """
    Balanced performance scoring: 0..100.
    Deterministic, no DB access, rounded to 2 decimals.
    """
    # Normalize inputs
    primary_total = max(int(inp.primary_total or 0), 0)
    primary_done = max(min(int(inp.primary_done or 0), primary_total), 0)
    support_total = max(int(inp.support_total or 0), 0)
    support_done = max(min(int(inp.support_done or 0), support_total), 0)
    optimize_total = max(int(inp.optimize_total or 0), 0)
    optimize_done = max(min(int(inp.optimize_done or 0), optimize_total), 0)
    custom_total = max(int(inp.custom_total or 0), 0)
    custom_done = max(min(int(inp.custom_done or 0), custom_total), 0)
    
    focus = _clamp(float(inp.focus_level if inp.focus_level is not None else 3.0), 0.0, 5.0)
    friction = max(int(inp.friction_count or 0), 0)

    # Weighted components (0..1 each)
    # Primary is CRITICAL. Score is now proportional.
    primary_score = (primary_done / primary_total) if primary_total > 0 else 0.0 
    
    support_score = (support_done / support_total) if support_total > 0 else 0.0
    optimize_score = (optimize_done / optimize_total) if optimize_total > 0 else 0.0
    custom_score = (custom_done / custom_total) if custom_total > 0 else 0.0
    focus_score = focus / 5.0

    # Dynamic Weights: Only weight components that actually have tasks.
    # We always weight Primary (0.50), Focus (0.10). 
    # The remaining 0.40 is split between Support, Optimize, and Custom IF they exist.
    
    total_dynamic_weight = 0.40
    components_to_weight = []
    if support_total > 0: components_to_weight.append('support')
    if optimize_total > 0: components_to_weight.append('optimize')
    if custom_total > 0: components_to_weight.append('custom')
    
    # Calculate weights based on existence
    if not components_to_weight:
        # All extra weight goes to Primary if no sub-tasks exist
        w_primary = 0.50 + total_dynamic_weight
        w_support = 0
        w_optimize = 0
        w_custom = 0
    else:
        # Split the 0.40 among available components
        share = total_dynamic_weight / len(components_to_weight)
        w_primary = 0.50    
        w_support = share if 'support' in components_to_weight else 0
        w_optimize = share if 'optimize' in components_to_weight else 0
        w_custom = share if 'custom' in components_to_weight else 0

    weighted = (
        primary_score * w_primary +
        support_score * w_support +
        optimize_score * w_optimize +
        custom_score * w_custom +
        focus_score * 0.10
    )

    # Base score 0..100
    base = weighted * 100.0

    # Edge Case: If no tasks exist at all, the score is 0 (No participation trophies)
    if primary_total == 0 and support_total == 0 and optimize_total == 0 and custom_total == 0:
        base = 0.0

    # Friction modifier: non-linear penalty
    # 1-2 frictions is normal, 3+ is a significant drag.
    penalty = 0
    if friction > 0:
        penalty = min(friction * 3, 15) # Max -15 for high friction
        
    final_score = _clamp(base - penalty, 0.0, 100.0)

    return round(final_score, 2)


def compute_xp(primary_done: int, primary_total: int, support_done: int, optimize_done: int, custom_done: int = 0) -> int:
    """
    Simplified XP reward system: 100 XP per task completed.
    """
    total_done = primary_done + support_done + optimize_done + custom_done
    return int(total_done * 100)


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
