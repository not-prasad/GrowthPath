## Backend v2 (Flask + SQLite, blueprint architecture)

This is a clean rebuild located under `backend/app/` with a deterministic schema + service layers.
It does **not** modify or depend on the legacy `backend/app.py` code paths.

### Run

- **Migrate DB (v2 schema)**:

```bash
python backend/migrations/migrate.py
```

- **Start server**:

```bash
python backend/run.py
```

Environment (optional):
- `DB_FILE`: path to v2 sqlite file (default from existing `backend/config.py`)
- `MIGRATIONS_DIR`: defaults to `backend/migrations`
- `CORS_ORIGIN`: allowed origin(s) for `/api/*`

### Required endpoints (implemented)
- `POST /api/goals`
- `GET /api/goals`
- `POST /api/logs` (upserts daily summary, recalculates score from tasks)
- `GET /api/logs` (history grouped by date, includes tasks per day)
- `GET /api/performance/trends`
- `POST /api/tasks/custom` (add planned task for goal+date)
- `GET /api/ai/insights` (safe fallback if AI provider not configured)

### Data model
- `daily_logs`: exactly one row per `(user_id, goal_id, log_date)`
- `daily_tasks`: multiple rows per same `(user_id, goal_id, log_date)` tied to the day’s log

### Testing checklist
- Create user, login, create two goals; ensure `active_goal_id` logic is correct.
- Add tasks for today (`/api/tasks/custom`) and mark some completed.
- Post log summary for today (`/api/logs` POST) and verify `performance_score` deterministic.
- Fetch history (`/api/logs` GET) and confirm output is grouped by date with tasks list.
- Attempt duplicate log insert for same day and confirm it upserts safely (no crash).
- Attempt duplicate task insert (same type+title) and confirm 409 conflict.

