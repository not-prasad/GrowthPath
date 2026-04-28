import os
import sqlite3
import random
import hashlib
import math
from datetime import datetime, timedelta

# Find database relative to script: backend/scripts/../../backend/growthpath.db
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'growthpath.db')
TARGET_EMAIL = 'benchmark_v2@growthpath.lab'

def _dedupe_key(task_type: str, title: str) -> str:
    s = f"{task_type.strip().lower()}|{title.strip().lower()}"
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:24]

def run_simulation():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # 1. Get the specific user
    user = c.execute("SELECT id FROM users WHERE email=?", (TARGET_EMAIL,)).fetchone()
    if not user:
        print(f"Error: User {TARGET_EMAIL} not found.")
        return
    u_id = user['id']

    # 2. Create a Benchmark Goal for THIS user
    c.execute("DELETE FROM goals WHERE user_id=?", (u_id,))
    c.execute("""
        INSERT INTO goals (user_id, title, category, deadline_days, difficulty, status)
        VALUES (?, 'Cognitive Performance Optimization', 'Mastery', 120, 'Hard', 'Active')
    """, (u_id,))
    g_id = c.lastrowid
    c.execute("UPDATE users SET active_goal_id=? WHERE id=?", (g_id, u_id))

    # 3. Inject 30 Days
    start_date = datetime.now() - timedelta(days=30)
    total_xp = 0

    for i in range(31):
        log_date = (start_date + timedelta(days=i)).strftime('%Y-%m-%d')
        
        # Behavior pattern logic
        if i < 10: # Week 1: Elite Performance
            focus = random.uniform(4.5, 5.0)
            friction = random.randint(0, 1)
            p_done, s_done, o_done = 1, 1, 1
        elif 10 <= i < 20: # Week 2: Burnout Dip
            focus = random.uniform(1.0, 2.2)
            friction = random.randint(4, 9)
            p_done, s_done, o_done = 0, 0, 0
        else: # Week 3-4: Recovery Cycle
            focus = random.uniform(3.8, 4.6)
            friction = random.randint(1, 2)
            p_done, s_done, o_done = 1, 1, 0

        # Calculate XP
        day_xp = 0
        if p_done: day_xp += 250
        if s_done: day_xp += 35
        if o_done: day_xp += 60
        total_xp += day_xp

        # Score calculation for visualization
        score = (focus/5.0 * 50) + (p_done * 30) + (s_done * 10) + (o_done * 10) - (friction * 2)
        score = max(0, min(100, score))

        # Insert Log
        c.execute("""
            INSERT INTO daily_logs (user_id, goal_id, log_date, focus_level, friction_count, energy_state, performance_score, xp_gained)
            VALUES (?, ?, ?, ?, ?, 'Stable', ?, ?)
        """, (u_id, g_id, log_date, focus, friction, score, day_xp))
        l_id = c.lastrowid
        
        # Insert Tasks
        tasks = [
            ('Core System Design', 'primary', p_done),
            ('Daily Calibration', 'support', s_done),
            ('AI Model Tuning', 'optimize', o_done)
        ]
        for t_title, t_type, t_done in tasks:
            key = _dedupe_key(t_type, t_title)
            c.execute("""
                INSERT INTO daily_tasks (user_id, goal_id, log_id, log_date, title, task_type, is_completed, dedupe_key)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (u_id, g_id, l_id, log_date, t_title, t_type, t_done, key))

    # 4. Final User Sync (Quadratic Leveling)
    new_level = int(math.sqrt(total_xp / 100)) + 1
    c.execute("UPDATE users SET total_xp=?, level=? WHERE id=?", (total_xp, new_level, u_id))

    conn.commit()
    conn.close()
    print(f"Benchmark V2 Complete: {TARGET_EMAIL} is now Level {new_level} with 30 days of data.")

if __name__ == "__main__":
    run_simulation()
