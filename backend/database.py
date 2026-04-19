import sqlite3
import os
import secrets
from config import Config

def get_db_connection():
    conn = sqlite3.connect(Config.DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    # Users table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            exp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Goals table
    c.execute('''
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            user_name TEXT,
            title TEXT,
            category TEXT,
            deadline INTEGER,
            commitment TEXT,
            difficulty TEXT,
            motivation TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')
    
    # Daily logs table
    c.execute('''
        CREATE TABLE IF NOT EXISTS daily_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_id INTEGER,
            user_id INTEGER,
            log_date DATE,
            task_done BOOLEAN,
            mood TEXT,
            focus_level INTEGER,
            notes TEXT,
            FOREIGN KEY(goal_id) REFERENCES goals(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')

    # Habit stacks table
    c.execute('''
        CREATE TABLE IF NOT EXISTS habit_stacks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            trigger_habit TEXT NOT NULL,
            new_habit TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')

    # Accountability circles table
    c.execute('''
        CREATE TABLE IF NOT EXISTS circles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            invite_code TEXT UNIQUE NOT NULL,
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(created_by) REFERENCES users(id)
        )
    ''')

    # Circle members table
    c.execute('''
        CREATE TABLE IF NOT EXISTS circle_members (
            circle_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(circle_id, user_id),
            FOREIGN KEY(circle_id) REFERENCES circles(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')
    
    # Goal Action Plan (Auto-generated Todos)
    c.execute('''
        CREATE TABLE IF NOT EXISTS goal_todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_id INTEGER NOT NULL,
            timeframe_label TEXT NOT NULL,
            task_description TEXT NOT NULL,
            is_completed BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized.")
