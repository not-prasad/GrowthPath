import sqlite3
from config import Config

def migrate():
    print(f"Connecting to {Config.DB_FILE}...")
    conn = sqlite3.connect(Config.DB_FILE)
    c = conn.cursor()

    # 1. Create users table (if not exists)
    print("Creating users table...")
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. Check and add user_id to goals
    print("Migrating 'goals' table...")
    c.execute("PRAGMA table_info(goals)")
    columns = [col[1] for col in c.fetchall()]
    if 'user_id' not in columns:
        print("Adding 'user_id' column to 'goals'...")
        # SQLite limitations: we add it as nullable first
        c.execute("ALTER TABLE goals ADD COLUMN user_id INTEGER REFERENCES users(id)")
    else:
        print("'user_id' already exists in 'goals'.")

    # 3. Check and add user_id to daily_logs
    print("Migrating 'daily_logs' table...")
    c.execute("PRAGMA table_info(daily_logs)")
    columns = [col[1] for col in c.fetchall()]
    if 'user_id' not in columns:
        print("Adding 'user_id' column to 'daily_logs'...")
        c.execute("ALTER TABLE daily_logs ADD COLUMN user_id INTEGER REFERENCES users(id)")
    else:
        print("'user_id' already exists in 'daily_logs'.")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == '__main__':
    migrate()
