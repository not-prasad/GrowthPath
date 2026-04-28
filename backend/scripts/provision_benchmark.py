import sqlite3
import bcrypt

DB_PATH = 'd:/GrowthPath/backend/growthpath.db'
EMAIL = 'benchmark@growthpath.lab'
PASSWORD = 'growth123'

def provision():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # 1. Create Hashed Password
    hashed = bcrypt.hashpw(PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # 2. Upsert User (Using correct column name: password_hash)
    c.execute("DELETE FROM users WHERE email=?", (EMAIL,))
    c.execute("INSERT INTO users (email, password_hash, total_xp, level) VALUES (?, ?, ?, ?)", 
              (EMAIL, hashed, 8085, 9))
    u_id = c.lastrowid
    
    # 3. Link all data to this user
    c.execute("UPDATE daily_logs SET user_id=?", (u_id,))
    c.execute("UPDATE daily_tasks SET user_id=?", (u_id,))
    c.execute("UPDATE goals SET user_id=?", (u_id,))
    
    # 4. Set Active Goal
    goal = c.execute("SELECT id FROM goals LIMIT 1").fetchone()
    if goal:
        c.execute("UPDATE users SET active_goal_id=? WHERE id=?", (goal[0], u_id))
    
    conn.commit()
    conn.close()
    print(f"Benchmark User Provisioned Successfully: {EMAIL}")

if __name__ == "__main__":
    provision()
