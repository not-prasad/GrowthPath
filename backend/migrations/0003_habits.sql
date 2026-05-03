-- Habit Stacks Table
CREATE TABLE IF NOT EXISTS habit_stacks (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL,
  goal_id           INTEGER NOT NULL,
  trigger_habit     TEXT NOT NULL,
  new_habit         TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_habits_user_goal ON habit_stacks(user_id, goal_id);
