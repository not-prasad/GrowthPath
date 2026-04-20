"""
One-time migration script placeholder: legacy SQLite (v1) -> v2 schema.

Strategy (recommended):
- Read from the legacy DB file path (env: V1_DB_PATH).
- Write into v2 DB (env: DB_PATH).
- Migrate users, goals, daily_logs.
- For protocol tasks: transform legacy goal_todos into daily_tasks grouped by date
  ONLY if the legacy schema has a concrete date per task; otherwise map them to the next
  unlogged day or keep them as "custom" tasks for today.

This file intentionally contains no legacy-table coupling yet.
We implement after validating the exact v1 schema in your repo snapshot.
"""

import os
import sys

# Ensure workspace root is importable so `import backend...` works.
WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, WORKSPACE_ROOT)


def main():
    v1 = os.getenv("V1_DB_PATH")
    v2 = os.getenv("DB_PATH")
    if not v1 or not v2:
        raise SystemExit("Set V1_DB_PATH and DB_PATH before running.")
    raise SystemExit("Not implemented: run after confirming v1 schema mappings.")


if __name__ == "__main__":
    main()

