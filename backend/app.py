import os
import bcrypt
import secrets
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import pandas as pd
from datetime import datetime, timedelta, date
from database import init_db, get_db_connection
from groq import Groq
from config import Config

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = Config.JWT_SECRET_KEY
app.config['SECRET_KEY'] = Config.SECRET_KEY

app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)
CORS(app, resources={r"/api/*": {"origins": "*"}}) # Allow any origin for local dev to prevent CORS blocks
jwt = JWTManager(app)

init_db()

client = Groq(api_key=Config.GROQ_API_KEY)

# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (email, password_hash) VALUES (?, ?)', (email, hashed))
        conn.commit()
        user_id = cursor.lastrowid
        access_token = create_access_token(identity=str(user_id))
        return jsonify({'token': access_token, 'user': {'email': email}}), 201
    except Exception as e:
        print(f"Registration Error: {e}")
        return jsonify({'error': 'User already exists or database error'}), 400
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        access_token = create_access_token(identity=str(user['id']))
        return jsonify({'token': access_token, 'user': {'email': email}}), 200
    return jsonify({'error': 'Invalid credentials'}), 401

# ─────────────────────────────────────────────
# GOALS
# ─────────────────────────────────────────────

@app.route('/api/user/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    user = conn.execute('SELECT email, exp, level FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(dict(user))

@app.route('/api/user/exp-logs', methods=['GET'])
@jwt_required()
def get_user_exp_logs():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    
    try:
        # Get daily logs EXP
        logs = conn.execute(
            '''SELECT log_date, task_done, focus_level, goals.title as goal_title 
               FROM daily_logs 
               JOIN goals ON daily_logs.goal_id = goals.id 
               WHERE daily_logs.user_id = ? 
               ORDER BY log_date DESC LIMIT 50''',
            (user_id,)
        ).fetchall()
        
        # Get todo EXP
        todos = conn.execute(
            '''SELECT COALESCE(updated_at, created_at) as event_date, timeframe_label, task_description, goals.title as goal_title 
               FROM goal_todos 
               JOIN goals ON goal_todos.goal_id = goals.id 
               WHERE goals.user_id = ? AND is_completed = TRUE 
               ORDER BY event_date DESC LIMIT 50''',
            (user_id,)
        ).fetchall()
        
        conn.close()
        
        results = []
        for row in logs:
            gained = 0
            if row['task_done']: gained += 100
            
            # Null-safe focus level calculation
            fl = row['focus_level']
            if fl is not None:
                gained += (int(fl) * 20)
            
            if gained > 0:
                results.append({
                    'date': row['log_date'],
                    'goal': row['goal_title'],
                    'type': 'Daily Check-in',
                    'exp': gained
                })
                
        for row in todos:
            results.append({
                'date': row['event_date'],
                'goal': row['goal_title'],
                'type': f"Task: {row['task_description']}",
                'exp': 100
            })
                
        # Sort combined results by date, ensuring we handle mixed string/date types
        results.sort(key=lambda x: str(x['date']), reverse=True)
        return jsonify(results[:50])
    except Exception as e:
        print(f"Mastery Ledger Error: {e}")
        if 'conn' in locals(): conn.close()
        return jsonify([])

@app.route('/api/goals', methods=['POST'])
@jwt_required()
def create_goal():
    user_id = get_jwt_identity()
    data = request.json
    title = data.get('title', '')
    deadline = data.get('deadline', '30')
    commitment = data.get('commitment', '')
    difficulty = data.get('difficulty', '')
    motivation = data.get('motivation', '')
    
    prompt = (
        f"You are an AI planner. The user wants to: {title}. "
        f"Deadline: {deadline} days. Commitment: {commitment}. "
        f"Difficulty: {difficulty}. Motivation: {motivation}. "
        f"Out of the categories ['Health', 'Study', 'Skill', 'Habit', 'Custom'], select the best fit. "
        f"Then, based on the deadline, generate a sequential task checklist. "
        f"GENERATE AT LEAST 3 TASKS PER DAY (Morning, Mid-day, Evening milestones). "
        f"If deadline > 30 days, generate 3 tasks per week. "
        f"Return ONLY a JSON object structured exactly like this, no markdown formatting out of bounds: "
        f'{{"category": "string", "todos": [{{"timeframe": "string", "task": "string"}}]}}'
    )
    
    import json
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
        )
        raw = chat_completion.choices[0].message.content.strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        ai_data = json.loads(raw)
        category = ai_data.get('category', 'Custom')
        todos = ai_data.get('todos', [])
    except Exception as e:
        print("AI Plan Error:", repr(e))
        category = 'Custom'
        todos = [{"timeframe": "Day 1", "task": "Review and manually set up your daily steps."}]
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO goals (user_id, user_name, title, category, deadline, commitment, difficulty, motivation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        user_id, data.get('user_name', 'User'), title,
        category, deadline, commitment,
        difficulty, motivation
    ))
    goal_id = cursor.lastrowid
    
    for t in todos:
        cursor.execute('''
            INSERT INTO goal_todos (goal_id, timeframe_label, task_description) VALUES (?, ?, ?)
        ''', (goal_id, t.get('timeframe', 'Unknown'), t.get('task', 'Task')))
        
    conn.commit()
    conn.close()
    return jsonify({'goal_id': goal_id}), 201

@app.route('/api/goals', methods=['GET'])
@jwt_required()
def get_user_goals():
    user_id = get_jwt_identity()
    status = request.args.get('status') # optional filter: active, completed
    conn = get_db_connection()
    if status:
        goals = conn.execute('SELECT * FROM goals WHERE user_id = ? AND status = ? ORDER BY created_at DESC', (user_id, status)).fetchall()
    else:
        goals = conn.execute('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC', (user_id,)).fetchall()
    conn.close()
    return jsonify([dict(g) for g in goals])

@app.route('/api/goals/<int:goal_id>/status', methods=['PUT'])
@jwt_required()
def update_goal_status(goal_id):
    user_id = get_jwt_identity()
    data = request.json
    new_status = data.get('status')
    if new_status not in ['active', 'completed', 'archived']:
        return jsonify({'error': 'Invalid status'}), 400
    conn = get_db_connection()
    result = conn.execute('UPDATE goals SET status = ? WHERE id = ? AND user_id = ?', (new_status, goal_id, user_id))
    conn.commit()
    conn.close()
    if result.rowcount == 0:
        return jsonify({'error': 'Goal not found'}), 404
    return jsonify({'message': f'Goal status updated to {new_status}'})

@app.route('/api/goals/<int:goal_id>', methods=['DELETE'])
@jwt_required()
def delete_goal(goal_id):
    user_id = get_jwt_identity()
    conn = get_db_connection()
    # cascade delete should handle todos and logs if set up with foreign keys, 
    # but let's be explicit if needed. (Foreign keys are ON in database.py)
    result = conn.execute('DELETE FROM goals WHERE id = ? AND user_id = ?', (goal_id, user_id))
    conn.commit()
    conn.close()
    if result.rowcount == 0:
        return jsonify({'error': 'Goal not found'}), 404
    return jsonify({'message': 'Goal deleted'})

@app.route('/api/goals/<int:goal_id>', methods=['GET'])
@jwt_required()
def get_goal(goal_id):
    user_id = get_jwt_identity()
    conn = get_db_connection()
    goal = conn.execute('SELECT * FROM goals WHERE id = ? AND user_id = ?', (goal_id, user_id)).fetchone()
    conn.close()
    if goal is None:
        return jsonify({'error': 'Goal not found'}), 404
    return jsonify(dict(goal))

@app.route('/api/goals/<int:goal_id>/todos', methods=['GET'])
@jwt_required()
def get_goal_todos(goal_id):
    user_id = get_jwt_identity()
    conn = get_db_connection()
    todos = conn.execute('SELECT goal_todos.* FROM goal_todos JOIN goals ON goals.id = goal_todos.goal_id WHERE goal_id = ? AND goals.user_id = ? ORDER BY created_at ASC', (goal_id, user_id)).fetchall()
    conn.close()
    return jsonify([dict(t) for t in todos])

@app.route('/api/goals/<int:goal_id>/todos', methods=['POST'])
@jwt_required()
def add_goal_todo(goal_id):
    user_id = get_jwt_identity()
    data = request.json
    task = data.get('task', '').strip()
    timeframe = data.get('timeframe', 'Manual').strip()
    
    if not task:
        return jsonify({'error': 'Task description required'}), 400
        
    conn = get_db_connection()
    # verify ownership
    goal = conn.execute('SELECT id FROM goals WHERE id = ? AND user_id = ?', (goal_id, user_id)).fetchone()
    if not goal:
        conn.close()
        return jsonify({'error': 'Goal not found'}), 404
        
    cursor = conn.cursor()
    cursor.execute('INSERT INTO goal_todos (goal_id, timeframe_label, task_description) VALUES (?, ?, ?)', 
                  (goal_id, timeframe, task))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'task_description': task, 'timeframe_label': timeframe}), 201
@app.route('/api/todos/<int:todo_id>/toggle', methods=['PUT'])
@jwt_required()
def toggle_todo(todo_id):
    user_id = get_jwt_identity()
    data = request.json
    mood = data.get('mood', 'Neutral 😐')
    
    conn = get_db_connection()
    todo = conn.execute('''
        SELECT t.id, t.is_completed, t.goal_id FROM goal_todos t 
        JOIN goals g ON g.id = t.goal_id 
        WHERE t.id = ? AND g.user_id = ?
    ''', (todo_id, user_id)).fetchone()
    
    if not todo:
        conn.close()
        return jsonify({'error': 'Not found'}), 404
        
    new_status = not bool(todo['is_completed'])
    finish_time = datetime.now().isoformat() if new_status else None
    conn.execute('UPDATE goal_todos SET is_completed = ?, updated_at = ? WHERE id = ?', (new_status, finish_time, todo_id))
    
    exp_gained = 0
    if new_status:
        exp_gained = 100
        conn.execute('UPDATE users SET exp = exp + ? WHERE id = ?', (exp_gained, user_id))
        conn.execute('UPDATE users SET level = 1 + (exp / 1000) WHERE id = ?', (user_id,))
        
        # BRIDGE: Auto-generate log for the consistency map
        today = date.today().isoformat()
        existing_log = conn.execute(
            'SELECT id FROM daily_logs WHERE goal_id = ? AND log_date = ?', 
            (todo['goal_id'], today)
        ).fetchone()
        
        if not existing_log:
            conn.execute(
                'INSERT INTO daily_logs (goal_id, user_id, log_date, task_done, mood, focus_level) VALUES (?, ?, ?, ?, ?, ?)',
                (todo['goal_id'], user_id, today, True, mood, 3)
            )
        else:
            conn.execute(
                'UPDATE daily_logs SET task_done = ? WHERE id = ?',
                (True, existing_log['id'])
            )
            
    conn.commit()
    conn.close()
    return jsonify({'message': 'Toggled', 'is_completed': new_status, 'exp_gained': exp_gained})

# ─────────────────────────────────────────────
# LOGS
# ─────────────────────────────────────────────

@app.route('/api/logs', methods=['POST'])
@jwt_required()
def create_log():
    user_id = get_jwt_identity()
    data = request.json
    goal_id = data.get('goal_id')
    log_date = date.today().isoformat()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    # Security check: Does goal belong to user?
    goal = conn.execute('SELECT id FROM goals WHERE id = ? AND user_id = ?', (goal_id, user_id)).fetchone()
    if not goal:
        conn.close()
        return jsonify({'error': 'Unauthorized or goal not found'}), 403
        
    mood = data.get('mood')
    focus_level = data.get('focus_level')
    notes = data.get('notes', '')
    task_done = data.get('task_done', False)
    hurdles = data.get('hurdles', '')

    # Prevent duplicate log for same date - instead update it!
    existing = conn.execute('SELECT id FROM daily_logs WHERE goal_id = ? AND log_date = ?', (goal_id, log_date)).fetchone()
    if existing:
        cursor.execute('''
            UPDATE daily_logs SET task_done = ?, mood = ?, focus_level = ?, notes = ?, hurdles = ?
            WHERE id = ?
        ''', (task_done, mood, focus_level, notes, hurdles, existing['id']))
    else:
        cursor.execute('''
            INSERT INTO daily_logs (goal_id, user_id, log_date, task_done, mood, focus_level, notes, hurdles)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (goal_id, user_id, log_date, task_done, mood, focus_level, notes, hurdles))
          
    todo_id = data.get('todo_id')
    if todo_id and data.get('task_done'):
        cursor.execute('UPDATE goal_todos SET is_completed = TRUE WHERE id = ? AND goal_id = ?', (todo_id, goal_id))
        
    exp_gained = 0
    if data.get('task_done'):
        exp_gained += 100
    focus = data.get('focus_level')
    if focus:
        exp_gained += (int(focus) * 20)
        
    if exp_gained > 0:
        cursor.execute('UPDATE users SET exp = exp + ? WHERE id = ?', (exp_gained, user_id))
        cursor.execute('UPDATE users SET level = 1 + (exp / 1000) WHERE id = ?', (user_id,))
        
    conn.commit()
    conn.close()
    return jsonify({'message': 'Log created successfully', 'exp_gained': exp_gained}), 201

@app.route('/api/goals/<int:goal_id>/checkin-context', methods=['GET'])
@jwt_required()
def get_checkin_context(goal_id):
    user_id = get_jwt_identity()
    conn = get_db_connection()
    goal = conn.execute('SELECT title FROM goals WHERE id = ? AND user_id = ?', (goal_id, user_id)).fetchone()
    if not goal:
        conn.close()
        return jsonify({'error': 'Not found'}), 404

    todo = conn.execute('SELECT id, timeframe_label, task_description FROM goal_todos WHERE goal_id = ? AND is_completed = FALSE ORDER BY id ASC LIMIT 1', (goal_id,)).fetchone()
    habit = conn.execute('SELECT trigger_habit, new_habit FROM habit_stacks WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', (user_id,)).fetchone()

    streak_row = conn.execute('SELECT COUNT(*) as streak FROM daily_logs WHERE goal_id = ? AND task_done = TRUE', (goal_id,)).fetchone()
    streak = streak_row['streak'] if streak_row else 0
    conn.close()

    prompt_instruction = (
        f"You are a supportive AI coach. The user is checking in for their goal: '{goal['title']}'. "
        f"They have completed {streak} active days so far. "
        f"Generate a single, short, thought-provoking question (max 15 words) for them to reflect on today regarding this goal. "
        f"Return ONLY the question string, nothing else. No surrounding quotes."
    )
    
    ai_prompt = "Any wins or hurdles to note today?"
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt_instruction}],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
        )
        ai_prompt_raw = chat_completion.choices[0].message.content.strip().replace('"', '')
        if 5 < len(ai_prompt_raw) < 150:
            ai_prompt = ai_prompt_raw
    except Exception as e:
        print("AI Checkin Prompt Error:", repr(e))

    return jsonify({
        'todo': dict(todo) if todo else None,
        'habit': dict(habit) if habit else None,
        'ai_prompt': ai_prompt
    })

@app.route('/api/logs/<int:goal_id>', methods=['GET'])
@jwt_required()
def get_logs(goal_id):
    user_id = get_jwt_identity()
    conn = get_db_connection()
    logs = conn.execute(
        'SELECT * FROM daily_logs WHERE goal_id = ? AND user_id = ? ORDER BY log_date DESC',
        (goal_id, user_id)
    ).fetchall()
    conn.close()
    return jsonify([dict(row) for row in logs])

# ─────────────────────────────────────────────
# ANALYSIS
# ─────────────────────────────────────────────

@app.route('/api/streak/<int:goal_id>', methods=['GET'])
@jwt_required()
def get_streak(goal_id):
    user_id = get_jwt_identity()
    conn = get_db_connection()
    logs = conn.execute(
        'SELECT log_date, task_done FROM daily_logs WHERE goal_id = ? AND user_id = ? ORDER BY log_date DESC',
        (goal_id, user_id)
    ).fetchall()
    conn.close()
    if not logs:
        return jsonify({'streak': 0})
    df = pd.DataFrame([dict(row) for row in logs])
    df['task_done'] = df['task_done'].astype(bool)
    df['log_date'] = pd.to_datetime(df['log_date']).dt.date
    df = df.sort_values(by='log_date', ascending=False).drop_duplicates(subset=['log_date'], keep='first')
    today = datetime.now().date()
    if df.empty:
        return jsonify({'streak': 0})
    most_recent_date = df.iloc[0]['log_date']
    if (today - most_recent_date).days > 1:
        return jsonify({'streak': 0})
    streak = 0
    current_date_check = most_recent_date
    for _, row in df.iterrows():
        if row['log_date'] == current_date_check and row['task_done']:
            streak += 1
            current_date_check -= timedelta(days=1)
        elif row['log_date'] > current_date_check:
            continue
        else:
            break
    return jsonify({'streak': streak})

@app.route('/api/analysis/<int:goal_id>', methods=['GET'])
@jwt_required()
def get_analysis(goal_id):
    user_id = get_jwt_identity()
    conn = get_db_connection()
    logs = conn.execute('SELECT * FROM daily_logs WHERE goal_id = ? AND user_id = ?', (goal_id, user_id)).fetchall()
    conn.close()
    if not logs:
        return jsonify({'completion_rate': 0, 'average_focus': 0, 'best_mood_day': None, 'total_days_logged': 0})
    df = pd.DataFrame([dict(row) for row in logs])
    total_days_logged = len(df['log_date'].unique())
    df['task_done'] = df['task_done'].astype(bool)
    completion_rate = (df['task_done'].sum() / len(df)) * 100
    average_focus = df['focus_level'].mean()
    happy_days = df[df['mood'].str.contains('Happy', na=False) | (df['mood'] == 'Happy 😊')]
    if not happy_days.empty:
        best_mood_day = happy_days['log_date'].iloc[0].isoformat() if hasattr(happy_days['log_date'].iloc[0], 'isoformat') else str(happy_days['log_date'].iloc[0])
    else:
        best_mood_day = None
    return jsonify({
        'completion_rate': round(completion_rate, 2),
        'average_focus': round(average_focus, 2),
        'best_mood_day': best_mood_day,
        'total_days_logged': total_days_logged
    })

# ─────────────────────────────────────────────
# AI ENDPOINTS
# ─────────────────────────────────────────────

@app.route('/api/ai/plan', methods=['POST'])
@jwt_required()
def ai_plan():
    data = request.json
    prompt = (
        f"You are a professional growth coach. The user has set this goal: {data.get('goal_title', '')}, "
        f"category: {data.get('category', '')}, deadline: {data.get('deadline', '')} days, "
        f"daily commitment: {data.get('commitment', '')}, difficulty: {data.get('difficulty', '')}, "
        f"motivation: {data.get('motivation', '')}. "
        f"Break this into a realistic week-by-week plan. Give 3 daily habits, "
        f"1 motivational insight, and 1 warning about common mistakes. "
        f"Keep it concise, professional, and actionable."
    )
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        return jsonify({'plan': chat_completion.choices[0].message.content})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/nudge', methods=['POST'])
@jwt_required()
def ai_nudge():
    data = request.json
    prompt = (
        f"User is tracking goal: {data.get('goal_title', '')}. "
        f"Current streak: {data.get('streak', 0)} days. Today's mood: {data.get('mood', 'Neutral')}. "
        f"Completion rate: {data.get('completion_rate', 0)}%. "
        f"Give a short 2-3 sentence professional motivational nudge. "
        f"Be encouraging but focus on consistency."
    )
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        return jsonify({'nudge': chat_completion.choices[0].message.content})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/correlations', methods=['POST'])
@jwt_required()
def ai_correlations():
    """Deep correlation insights: AI analyzes mood/focus/completion patterns."""
    user_id = get_jwt_identity()
    data = request.json
    goal_id = data.get('goal_id')

    conn = get_db_connection()
    logs = conn.execute(
        'SELECT * FROM daily_logs WHERE goal_id = ? AND user_id = ?',
        (goal_id, user_id)
    ).fetchall()
    goal = conn.execute('SELECT title FROM goals WHERE id = ? AND user_id = ?', (goal_id, user_id)).fetchone()
    conn.close()

    if not logs or len(logs) < 3:
        return jsonify({'insights': [
            {
                'title': 'Not enough data yet',
                'body': 'Log at least 3 days to unlock AI correlation insights. Keep going!',
                'type': 'info'
            }
        ]})

    df = pd.DataFrame([dict(row) for row in logs])
    df['task_done'] = df['task_done'].astype(bool)
    df['log_date'] = pd.to_datetime(df['log_date'])
    df['weekday'] = df['log_date'].dt.day_name()

    # Build structured summary for AI
    total = len(df)
    completed = int(df['task_done'].sum())
    avg_focus = round(df['focus_level'].mean(), 2)

    mood_stats = {}
    for mood in df['mood'].dropna().unique():
        mood_df = df[df['mood'] == mood]
        mood_stats[mood] = {
            'count': len(mood_df),
            'completion_rate': round(mood_df['task_done'].mean() * 100, 1),
            'avg_focus': round(mood_df['focus_level'].mean(), 2)
        }

    weekday_stats = {}
    for day in df['weekday'].unique():
        day_df = df[df['weekday'] == day]
        weekday_stats[day] = {
            'count': len(day_df),
            'completion_rate': round(day_df['task_done'].mean() * 100, 1)
        }

    summary = (
        f"Goal: '{goal['title'] if goal else 'Unknown'}'. "
        f"Total logs: {total}. Completed: {completed} ({round(completed/total*100,1)}%). "
        f"Avg focus: {avg_focus}/5. "
        f"Mood vs performance: {mood_stats}. "
        f"Weekday patterns: {weekday_stats}."
    )

    prompt = (
        f"You are a data-driven growth coach analyzing a user's habit tracking data. "
        f"Here is their performance summary: {summary}. "
        f"Generate exactly 3 sharp, specific correlation insights in this JSON format: "
        f'[{{"title":"short insight title","body":"2-sentence explanation with specific numbers from the data","type":"positive|warning|info"}},'
        f'{{"title":"...","body":"...","type":"..."}},'
        f'{{"title":"...","body":"...","type":"..."}}]. '
        f"Return only valid JSON array, no markdown, no extra text."
    )

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        import json
        raw = chat_completion.choices[0].message.content.strip()
        # Strip markdown code blocks if present
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        insights = json.loads(raw)
        return jsonify({'insights': insights})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ─────────────────────────────────────────────
# HABIT STACKING
# ─────────────────────────────────────────────

@app.route('/api/habits', methods=['GET'])
@jwt_required()
def get_habits():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    habits = conn.execute(
        'SELECT * FROM habit_stacks WHERE user_id = ? ORDER BY created_at DESC',
        (user_id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(h) for h in habits])

@app.route('/api/habits', methods=['POST'])
@jwt_required()
def create_habit():
    user_id = get_jwt_identity()
    data = request.json
    trigger = data.get('trigger_habit', '').strip()
    new_habit = data.get('new_habit', '').strip()
    if not trigger or not new_habit:
        return jsonify({'error': 'Both trigger and new habit are required'}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO habit_stacks (user_id, trigger_habit, new_habit) VALUES (?, ?, ?)',
        (user_id, trigger, new_habit)
    )
    conn.commit()
    habit_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': habit_id, 'trigger_habit': trigger, 'new_habit': new_habit}), 201

@app.route('/api/habits/<int:habit_id>', methods=['DELETE'])
@jwt_required()
def delete_habit(habit_id):
    user_id = get_jwt_identity()
    conn = get_db_connection()
    result = conn.execute(
        'DELETE FROM habit_stacks WHERE id = ? AND user_id = ?',
        (habit_id, user_id)
    )
    conn.commit()
    conn.close()
    if result.rowcount == 0:
        return jsonify({'error': 'Not found or unauthorized'}), 404
    return jsonify({'message': 'Deleted'}), 200

# ─────────────────────────────────────────────
# AI NUDGE
# ─────────────────────────────────────────────

@app.route('/api/ai/nudge', methods=['POST'])
@jwt_required()
def get_ai_nudge():
    data = request.json
    streak = data.get('streak', 0)
    mood = data.get('mood', 'Neutral 😐')
    completion_rate = data.get('completion_rate', 0)
    goal_title = data.get('goal_title', '')

    prompt = (
        f"You are a performance coach for the goal: '{goal_title}'. "
        f"Current streak: {streak} days. Latest mood: {mood}. "
        f"Completion rate: {completion_rate}%. "
        f"Provide EXACTLY 3 short, punchy insights/bullet points based on this data. "
        f"Return ONLY a valid JSON array like this format, without markdown: "
        f'[{{"insight": "Observation text", "action": "Short Action Verb"}}]'
    )

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.6,
        )
        import json
        raw = chat_completion.choices[0].message.content.strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        insights = json.loads(raw)
        return jsonify(insights)
    except Exception as e:
        print("AI Nudge Error:", repr(e))
        return jsonify([
            {"insight": "Keep up the momentum to build consistency.", "action": "Log Today"},
            {"insight": "Review your action plan for the next steps.", "action": "View Roadmap"}
        ])

# ─────────────────────────────────────────────
# ACCOUNTABILITY CIRCLES
# ─────────────────────────────────────────────

def _compute_streak_for_user(user_id, conn):
    """Helper: compute streak across all goals for a given user."""
    logs = conn.execute(
        'SELECT log_date, task_done FROM daily_logs WHERE user_id = ? ORDER BY log_date DESC',
        (user_id,)
    ).fetchall()
    if not logs:
        return 0
    df = pd.DataFrame([dict(r) for r in logs])
    df['task_done'] = df['task_done'].astype(bool)
    df['log_date'] = pd.to_datetime(df['log_date']).dt.date
    df = df.sort_values('log_date', ascending=False).drop_duplicates(subset=['log_date'], keep='first')
    today = datetime.now().date()
    if df.empty or (today - df.iloc[0]['log_date']).days > 1:
        return 0
    streak = 0
    current = df.iloc[0]['log_date']
    for _, row in df.iterrows():
        if row['log_date'] == current and row['task_done']:
            streak += 1
            current -= timedelta(days=1)
        elif row['log_date'] > current:
            continue
        else:
            break
    return streak

@app.route('/api/circles', methods=['POST'])
@jwt_required()
def create_circle():
    user_id = get_jwt_identity()
    data = request.json
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Circle name is required'}), 400
    invite_code = secrets.token_urlsafe(4).upper()[:6]
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO circles (name, invite_code, created_by) VALUES (?, ?, ?)',
        (name, invite_code, user_id)
    )
    circle_id = cursor.lastrowid
    # Creator automatically joins
    cursor.execute(
        'INSERT OR IGNORE INTO circle_members (circle_id, user_id) VALUES (?, ?)',
        (circle_id, user_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'id': circle_id, 'name': name, 'invite_code': invite_code}), 201

@app.route('/api/circles/join', methods=['POST'])
@jwt_required()
def join_circle():
    user_id = get_jwt_identity()
    data = request.json
    invite_code = data.get('invite_code', '').strip().upper()
    conn = get_db_connection()
    circle = conn.execute('SELECT * FROM circles WHERE invite_code = ?', (invite_code,)).fetchone()
    if not circle:
        conn.close()
        return jsonify({'error': 'Invalid invite code'}), 404
    try:
        conn.execute(
            'INSERT INTO circle_members (circle_id, user_id) VALUES (?, ?)',
            (circle['id'], user_id)
        )
        conn.commit()
    except Exception:
        conn.close()
        return jsonify({'error': 'Already a member'}), 400
    conn.close()
    return jsonify({'message': f"Joined '{circle['name']}'", 'circle_name': circle['name']}), 200

@app.route('/api/circles', methods=['GET'])
@jwt_required()
def get_circles():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    member_rows = conn.execute(
        'SELECT circle_id FROM circle_members WHERE user_id = ?', (user_id,)
    ).fetchall()
    result = []
    for row in member_rows:
        circle_id = row['circle_id']
        circle = conn.execute('SELECT * FROM circles WHERE id = ?', (circle_id,)).fetchone()
        if not circle:
            continue
        members_rows = conn.execute(
            'SELECT cm.user_id, u.email FROM circle_members cm JOIN users u ON u.id = cm.user_id WHERE cm.circle_id = ?',
            (circle_id,)
        ).fetchall()
        members_data = []
        for m in members_rows:
            streak = _compute_streak_for_user(m['user_id'], conn)
            members_data.append({
                'user_id': m['user_id'],
                'email': m['email'],
                'streak': streak,
                'is_you': str(m['user_id']) == str(user_id)
            })
        result.append({
            'id': circle['id'],
            'name': circle['name'],
            'invite_code': circle['invite_code'],
            'created_by': circle['created_by'],
            'is_owner': str(circle['created_by']) == str(user_id),
            'members': members_data
        })
    conn.close()
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=Config.DEBUG, port=5000)
