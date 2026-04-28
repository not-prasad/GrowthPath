import sqlite3
def check_db(path):
    print(f"Checking {path}")
    try:
        conn = sqlite3.connect(path)
        c = conn.cursor()
        tables = c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        print("Tables:", [t[0] for t in tables])
        for table in [t[0] for t in tables]:
            count = c.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"  {table}: {count} rows")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

check_db('backend/growthpath.db')
check_db('growthpath.db')
check_db('backend/growthpath_v2.db')
