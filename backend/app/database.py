import os
import sqlite3
from contextlib import contextmanager
from typing import Any, Dict, Iterable, List, Optional, Tuple

from backend.config import Config


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(getattr(Config, "DB_FILE", "growthpath_v2.db"))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    return conn


@contextmanager
def get_conn() -> Iterable[sqlite3.Connection]:
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    db_path = os.path.abspath(getattr(Config, "DB_FILE", "growthpath_v2.db"))
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    # Connection will create file if missing.
    with get_conn():
        pass


def query_one(sql: str, params: Tuple[Any, ...] = ()) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(sql, params).fetchone()
        return dict(row) if row else None


def query_all(sql: str, params: Tuple[Any, ...] = ()) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]


def execute(sql: str, params: Tuple[Any, ...] = ()) -> int:
    with get_conn() as conn:
        cur = conn.execute(sql, params)
        return int(cur.lastrowid or 0)


def exec_many(sql: str, seq_of_params: List[Tuple[Any, ...]]) -> None:
    with get_conn() as conn:
        conn.executemany(sql, seq_of_params)


def _ensure_schema_migrations_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """
    )


def apply_migrations() -> None:
    # Prefer explicit env, otherwise use backend/migrations.
    migrations_dir = os.getenv("MIGRATIONS_DIR") or os.path.join(os.path.dirname(os.path.dirname(__file__)), "migrations")
    if not os.path.isdir(migrations_dir):
        return

    files = sorted([f for f in os.listdir(migrations_dir) if f.endswith(".sql")])
    if not files:
        return

    with get_conn() as conn:
        _ensure_schema_migrations_table(conn)
        applied = {r["version"] for r in conn.execute("SELECT version FROM schema_migrations").fetchall()}

        for filename in files:
            version = filename.split("_", 1)[0]
            if version in applied:
                continue
            path = os.path.join(migrations_dir, filename)
            with open(path, "r", encoding="utf-8") as f:
                sql = f.read()
            conn.executescript(sql)
            conn.execute("INSERT INTO schema_migrations(version) VALUES (?)", (version,))

