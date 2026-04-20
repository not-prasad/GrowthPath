from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class DailyTask:
    id: int
    user_id: int
    goal_id: int
    log_id: int
    log_date: str
    task_type: str
    title: str
    details: Optional[str]
    is_completed: bool
    completed_at: Optional[str]

    @staticmethod
    def from_row(row: Dict[str, Any]) -> "DailyTask":
        return DailyTask(
            id=int(row["id"]),
            user_id=int(row["user_id"]),
            goal_id=int(row["goal_id"]),
            log_id=int(row["log_id"]),
            log_date=str(row["log_date"]),
            task_type=str(row["task_type"]),
            title=str(row["title"]),
            details=row.get("details"),
            is_completed=bool(row.get("is_completed", 0)),
            completed_at=row.get("completed_at"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "goal_id": self.goal_id,
            "log_id": self.log_id,
            "log_date": self.log_date,
            "task_type": self.task_type,
            "title": self.title,
            "details": self.details,
            "is_completed": self.is_completed,
            "completed_at": self.completed_at,
        }

