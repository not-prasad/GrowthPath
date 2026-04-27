PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ai_cache (
  cache_key    TEXT PRIMARY KEY,
  user_id      INTEGER NOT NULL,
  goal_id      INTEGER NOT NULL,
  context_hash TEXT NOT NULL,
  payload      TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup
  ON ai_cache(user_id, goal_id, context_hash, expires_at);

