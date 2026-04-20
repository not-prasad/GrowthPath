import os
import sys

# Ensure workspace root is importable so `import backend...` works.
WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, WORKSPACE_ROOT)

from backend.app.database import apply_migrations, init_db  # noqa: E402
import sqlite3  # noqa: E402


def main():
    init_db()
    try:
        apply_migrations()
    except sqlite3.OperationalError as e:
        msg = str(e)
        raise SystemExit(
            "Migration failed due to an existing incompatible schema.\n"
            f"SQLite error: {msg}\n\n"
            "Fix: run v2 on a fresh DB file.\n"
            "PowerShell example:\n"
            "  $env:DB_FILE='D:\\GrowthPath\\backend\\growthpath_v2.db'\n"
            "  python migrations\\migrate.py\n"
        )
    print("Migrations applied.")


if __name__ == "__main__":
    main()

