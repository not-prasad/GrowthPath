from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class User:
    id: int
    email: str
    active_goal_id: Optional[int]
    total_xp: int
    level: int

    @staticmethod
    def from_row(row: Dict[str, Any]) -> "User":
        return User(
            id=int(row["id"]),
            email=str(row["email"]),
            active_goal_id=int(row["active_goal_id"]) if row.get("active_goal_id") is not None else None,
            total_xp=int(row.get("total_xp", 0) or 0),
            level=int(row.get("level", 1) or 1),
        )

    def to_public_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "email": self.email,
            "active_goal_id": self.active_goal_id,
            "total_xp": self.total_xp,
            "level": self.level,
        }

