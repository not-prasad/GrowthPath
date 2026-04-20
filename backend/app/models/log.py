from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class DailyLog:
    id: int
    user_id: int
    goal_id: int
    log_date: str  # YYYY-MM-DD
    focus_level: float
    energy_state: str
    friction_count: int
    performance_score: float
    xp_gained: int
    mood: Optional[str]
    notes: Optional[str]
    hurdles: Optional[str]

    @staticmethod
    def from_row(row: Dict[str, Any]) -> "DailyLog":
        return DailyLog(
            id=int(row["id"]),
            user_id=int(row["user_id"]),
            goal_id=int(row["goal_id"]),
            log_date=str(row["log_date"]),
            focus_level=float(row.get("focus_level", 3.0) or 3.0),
            energy_state=str(row.get("energy_state", "Stable") or "Stable"),
            friction_count=int(row.get("friction_count", 0) or 0),
            performance_score=float(row.get("performance_score", 40.0) or 40.0),
            xp_gained=int(row.get("xp_gained", 0) or 0),
            mood=row.get("mood"),
            notes=row.get("notes"),
            hurdles=row.get("hurdles"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "goal_id": self.goal_id,
            "log_date": self.log_date,
            "focus_level": self.focus_level,
            "energy_state": self.energy_state,
            "friction_count": self.friction_count,
            "performance_score": self.performance_score,
            "xp_gained": self.xp_gained,
            "mood": self.mood,
            "notes": self.notes,
            "hurdles": self.hurdles,
        }

