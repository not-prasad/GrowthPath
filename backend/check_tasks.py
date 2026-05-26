import sqlite3

conn = sqlite3.connect("growthpath.db")
conn.row_factory = sqlite3.Row
rows = conn.execute("SELECT id, title, details FROM daily_tasks ORDER BY id DESC LIMIT 10").fetchall()

for r in rows:
    title = r["title"][:100] if r["title"] else "NULL"
    details = str(r["details"])[:80] if r["details"] else "NULL"
    print(f"ID={r['id']} | title={title}")
    print(f"  details={details}")
    print()

conn.close()
