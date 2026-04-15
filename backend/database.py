import sqlite3
import os

DB_FILE = 'growthpath.db'

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_name TEXT,
            title TEXT,
            category TEXT,
            deadline INTEGER,
            commitment TEXT,
            difficulty TEXT,
            motivation TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS daily_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_id INTEGER,
            log_date DATE,
            task_done BOOLEAN,
            mood TEXT,
            focus_level INTEGER,
            notes TEXT,
            FOREIGN KEY(goal_id) REFERENCES goals(id)
        )
    ''')
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized.")
