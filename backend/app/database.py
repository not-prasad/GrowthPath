import os
import sqlite3
import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from typing import Any, Dict, Iterable, List, Optional, Tuple, Union

from backend.config import Config


def _get_db_url() -> Optional[str]:
    return getattr(Config, "DATABASE_URL", os.getenv("DATABASE_URL"))


def _is_postgres() -> bool:
    return bool(_get_db_url())


def _connect():
    db_url = _get_db_url()
    if db_url:
        # PostgreSQL
        conn = psycopg2.connect(db_url)
        return conn
    else:
        # SQLite
        db_file = getattr(Config, "DB_FILE", os.path.join(os.path.dirname(os.path.dirname(__file__)), "growthpath.db"))
        conn = sqlite3.connect(db_file)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        return conn


@contextmanager
def get_conn() -> Iterable[Union[sqlite3.Connection, Any]]:
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
    if not _is_postgres():
        db_path = os.path.abspath(getattr(Config, "DB_FILE", os.path.join(os.path.dirname(os.path.dirname(__file__)), "growthpath.db")))
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
    with get_conn():
        pass


def _prepare_sql(sql: str) -> str:
    if _is_postgres():
        return sql.replace("?", "%s")
    return sql


def query_one(sql: str, params: Tuple[Any, ...] = ()) -> Optional[Dict[str, Any]]:
    sql = _prepare_sql(sql)
    with get_conn() as conn:
        if _is_postgres():
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, params)
                row = cur.fetchone()
                return dict(row) if row else None
        else:
            row = conn.execute(sql, params).fetchone()
            return dict(row) if row else None


def query_all(sql: str, params: Tuple[Any, ...] = ()) -> List[Dict[str, Any]]:
    sql = _prepare_sql(sql)
    with get_conn() as conn:
        if _is_postgres():
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
                return [dict(r) for r in rows]
        else:
            rows = conn.execute(sql, params).fetchall()
            return [dict(r) for r in rows]


def execute(sql: str, params: Tuple[Any, ...] = ()) -> int:
    original_sql = sql
    sql = _prepare_sql(sql)
    with get_conn() as conn:
        if _is_postgres():
            # For Postgres, we need RETURNING id to get the last inserted ID
            # This assumes the table has an 'id' column.
            if "INSERT INTO" in sql.upper() and "RETURNING ID" not in sql.upper():
                sql = sql.rstrip().rstrip(";") + " RETURNING id"
            
            with conn.cursor() as cur:
                cur.execute(sql, params)
                if "RETURNING ID" in sql.upper():
                    row = cur.fetchone()
                    return int(row[0]) if row else 0
                return 0
        else:
            cur = conn.execute(sql, params)
            return int(cur.lastrowid or 0)


def exec_many(sql: str, seq_of_params: List[Tuple[Any, ...]]) -> None:
    sql = _prepare_sql(sql)
    with get_conn() as conn:
        if _is_postgres():
            with conn.cursor() as cur:
                cur.executemany(sql, seq_of_params)
        else:
            conn.executemany(sql, seq_of_params)


def _ensure_schema_migrations_table(conn) -> None:
    sql = """
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """
    if _is_postgres():
        with conn.cursor() as cur:
            cur.execute(sql)
    else:
        conn.execute(sql)


def apply_migrations() -> None:
    migrations_dir = os.getenv("MIGRATIONS_DIR") or os.path.join(os.path.dirname(os.path.dirname(__file__)), "migrations")
    if not os.path.isdir(migrations_dir):
        return

    files = sorted([f for f in os.listdir(migrations_dir) if f.endswith(".sql")])
    if not files:
        return

    with get_conn() as conn:
        _ensure_schema_migrations_table(conn)
        
        if _is_postgres():
            with conn.cursor() as cur:
                cur.execute("SELECT version FROM schema_migrations")
                applied = {r[0] for r in cur.fetchall()}
        else:
            applied = {r["version"] for r in conn.execute("SELECT version FROM schema_migrations").fetchall()}

        for filename in files:
            version = filename.split("_", 1)[0]
            if version in applied:
                continue
            path = os.path.join(migrations_dir, filename)
            with open(path, "r", encoding="utf-8") as f:
                sql = f.read()
            
            # Simple SQL execution for migrations
            if _is_postgres():
                with conn.cursor() as cur:
                    cur.execute(sql)
                    cur.execute("INSERT INTO schema_migrations(version) VALUES (%s)", (version,))
            else:
                conn.executescript(sql)
                conn.execute("INSERT INTO schema_migrations(version) VALUES (?)", (version,))
