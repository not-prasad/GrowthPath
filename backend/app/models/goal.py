from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class Goal:
    id: int
    user_id: int
    title: str
    category: Optional[str]
    deadline_days: int
    commitment: Optional[str]
    difficulty: Optional[str]
    motivation: Optional[str]
    status: str

    @staticmethod
    def from_row(row: Dict[str, Any]) -> "Goal":
        return Goal(
            id=int(row["id"]),
            user_id=int(row["user_id"]),
            title=str(row["title"]),
            category=row.get("category"),
            deadline_days=int(row.get("deadline_days", 30) or 30),
            commitment=row.get("commitment"),
            difficulty=row.get("difficulty"),
            motivation=row.get("motivation"),
            status=str(row.get("status", "active") or "active"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "category": self.category,
            "deadline_days": self.deadline_days,
            "commitment": self.commitment,
            "difficulty": self.difficulty,
            "motivation": self.motivation,
            "status": self.status,
        }

