import sqlite3
import random
import hashlib
import math
from datetime import datetime, timedelta

DB_PATH = 'd:/GrowthPath/backend/growthpath.db'

def _dedupe_key(task_type: str, title: str) -> str:
    s = f"{task_type.strip().lower()}|{title.strip().lower()}"
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:24]

def run_simulation():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # 1. Get the first user
    user = c.execute("SELECT id FROM users LIMIT 1").fetchone()
    if not user:
        print("No user found. Register one first.")
        return
    u_id = user['id']

    # 2. Create a Benchmark Goal
    c.execute("DELETE FROM goals WHERE user_id=?", (u_id,))
    c.execute("""
        INSERT INTO goals (user_id, title, category, deadline_days, difficulty, status)
        VALUES (?, 'Mastering Cognitive Architecture', 'Growth', 90, 'Hard', 'Active')
    """, (u_id,))
    g_id = c.lastrowid
    c.execute("UPDATE users SET active_goal_id=? WHERE id=?", (g_id, u_id))

    print(f"Goal Created: ID {g_id} for User {u_id}")

    # 3. Inject 30 Days
    start_date = datetime.now() - timedelta(days=30)
    total_xp = 0

    for i in range(31):
        log_date = (start_date + timedelta(days=i)).strftime('%Y-%m-%d')
        
        # Behavior pattern logic
        if i < 10: # Week 1-2: High Performance
            focus = random.uniform(4.2, 5.0)
            friction = random.randint(0, 1)
            p_done, s_done, o_done = 1, 1, 1
        elif 10 <= i < 20: # Week 3: The "Dip" (Simulating burnout/distraction)
            focus = random.uniform(1.2, 2.5)
            friction = random.randint(3, 8)
            p_done, s_done, o_done = random.randint(0, 1), 0, 0
        else: # Week 4: Recovery
            focus = random.uniform(3.5, 4.5)
            friction = random.randint(1, 2)
            p_done, s_done, o_done = 1, 1, 0

        # Calculate XP (New rules: Prim=250, Supp=35, Opt=60)
        day_xp = 0
        if p_done: day_xp += 250
        if s_done: day_xp += 35
        if o_done: day_xp += 60
        total_xp += day_xp

        # 40..100 base score logic for simulation
        score = (focus/5.0 * 50) + (p_done * 30) + (s_done * 10) + (o_done * 10) - (friction * 2)
        score = max(0, min(100, score))

        # Insert Log
        c.execute("""
            INSERT INTO daily_logs (user_id, goal_id, log_date, focus_level, friction_count, energy_state, performance_score, xp_gained)
            VALUES (?, ?, ?, ?, ?, 'Stable', ?, ?)
        """, (u_id, g_id, log_date, focus, friction, score, day_xp))
        l_id = c.lastrowid
        
        # Insert Tasks with log_id and dedupe_key
        tasks = [
            ('Neural Mapping', 'primary', p_done),
            ('Refine Subsystems', 'support', s_done),
            ('Process Optimization', 'optimize', o_done)
        ]
        for t_title, t_type, t_done in tasks:
            key = _dedupe_key(t_type, t_title)
            c.execute("""
                INSERT INTO daily_tasks (user_id, goal_id, log_id, log_date, title, task_type, is_completed, dedupe_key)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (u_id, g_id, l_id, log_date, t_title, t_type, t_done, key))

    # 4. Final User Sync (Quadratic Leveling: sqrt(XP/100) + 1)
    new_level = int(math.sqrt(total_xp / 100)) + 1
    c.execute("UPDATE users SET total_xp=?, level=? WHERE id=?", (total_xp, new_level, u_id))

    conn.commit()
    conn.close()
    print(f"Simulation Complete: 30 days injected. Total XP: {total_xp}, Final Level: {new_level}")

if __name__ == "__main__":
    run_simulation()
