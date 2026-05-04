PRAGMA foreign_keys = ON;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  active_goal_id    INTEGER,
  total_xp          INTEGER NOT NULL DEFAULT 0,
  level             INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  title         TEXT NOT NULL,
  category      TEXT,
  deadline_days INTEGER NOT NULL DEFAULT 30,
  commitment    TEXT,
  difficulty    TEXT,
  motivation    TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);

-- Daily logs: one per (user, goal, date)
CREATE TABLE IF NOT EXISTS daily_logs (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL,
  goal_id             INTEGER NOT NULL,
  log_date            TEXT NOT NULL, -- YYYY-MM-DD

  focus_level         REAL NOT NULL DEFAULT 3.0,
  energy_state        TEXT NOT NULL DEFAULT 'Stable', -- High|Stable|Low
  friction_count      INTEGER NOT NULL DEFAULT 0,

  performance_score   REAL NOT NULL DEFAULT 0.0,
  xp_gained           INTEGER NOT NULL DEFAULT 0,

  mood                TEXT,
  notes               TEXT,
  hurdles             TEXT,

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  UNIQUE(user_id, goal_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_logs_user_goal_date ON daily_logs(user_id, goal_id, log_date);

-- Daily tasks: planned protocol tasks for that date (AI + user-added)
CREATE TABLE IF NOT EXISTS daily_tasks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  goal_id         INTEGER NOT NULL,
  log_id          INTEGER NOT NULL,
  log_date        TEXT NOT NULL, -- denormalized for grouping/queries

  task_type       TEXT NOT NULL, -- primary|support|optimize|custom
  title           TEXT NOT NULL,
  details         TEXT,
  is_completed    INTEGER NOT NULL DEFAULT 0,
  completed_at    TEXT,

  dedupe_key      TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  FOREIGN KEY(log_id) REFERENCES daily_logs(id) ON DELETE CASCADE,
  UNIQUE(log_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_tasks_log_date ON daily_tasks(user_id, goal_id, log_date);
CREATE INDEX IF NOT EXISTS idx_tasks_log_type ON daily_tasks(log_id, task_type, is_completed);

-- Add circular reference (Postgres only)
-- POSTGRES_ONLY: ALTER TABLE users ADD CONSTRAINT fk_active_goal FOREIGN KEY(active_goal_id) REFERENCES goals(id) ON DELETE SET NULL;

