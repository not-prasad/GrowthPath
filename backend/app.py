import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from datetime import datetime, timedelta
from database import init_db, get_db_connection
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

app = Flask(__name__)
CORS(app)

# Initialize database on startup
init_db()

@app.route('/api/goals', methods=['POST'])
def create_goal():
    data = request.json
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO goals (user_name, title, category, deadline, commitment, difficulty, motivation)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('user_name', 'User'),
        data.get('title'),
        data.get('category'),
        data.get('deadline'),
        data.get('commitment'),
        data.get('difficulty'),
        data.get('motivation')
    ))
    goal_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'goal_id': goal_id}), 201

@app.route('/api/goals/<int:goal_id>', methods=['GET'])
def get_goal(goal_id):
    conn = get_db_connection()
    goal = conn.execute('SELECT * FROM goals WHERE id = ?', (goal_id,)).fetchone()
    conn.close()
    
    if goal is None:
        return jsonify({'error': 'Goal not found'}), 404
        
    return jsonify(dict(goal))

@app.route('/api/logs', methods=['POST'])
def create_log():
    data = request.json
    
    goal_id = data.get('goal_id')
    task_done = data.get('task_done', False)
    mood = data.get('mood')
    focus_level = data.get('focus_level')
    notes = data.get('notes', '')
    log_date = datetime.now().date().isoformat()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO daily_logs (goal_id, log_date, task_done, mood, focus_level, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (goal_id, log_date, task_done, mood, focus_level, notes))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Log created successfully'}), 201

@app.route('/api/logs/<int:goal_id>', methods=['GET'])
def get_logs(goal_id):
    conn = get_db_connection()
    logs = conn.execute('SELECT * FROM daily_logs WHERE goal_id = ? ORDER BY log_date DESC', (goal_id,)).fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in logs])

@app.route('/api/streak/<int:goal_id>', methods=['GET'])
def get_streak(goal_id):
    conn = get_db_connection()
    logs = conn.execute('SELECT log_date, task_done FROM daily_logs WHERE goal_id = ? ORDER BY log_date DESC', (goal_id,)).fetchall()
    conn.close()
    
    if not logs:
        return jsonify({'streak': 0})
        
    df = pd.DataFrame([dict(row) for row in logs])
    df['task_done'] = df['task_done'].astype(bool)
    df['log_date'] = pd.to_datetime(df['log_date']).dt.date
    df = df.sort_values(by='log_date', ascending=False)
    df = df.drop_duplicates(subset=['log_date'], keep='first')
    
    today = datetime.now().date()
    
    if df.empty:
        return jsonify({'streak': 0})
        
    most_recent_date = df.iloc[0]['log_date']
    if (today - most_recent_date).days > 1:
        return jsonify({'streak': 0})
        
    streak = 0
    current_date_check = most_recent_date
    for index, row in df.iterrows():
        if row['log_date'] == current_date_check and row['task_done']:
            streak += 1
            current_date_check -= timedelta(days=1)
        elif row['log_date'] > current_date_check:
            continue
        else:
            break
            
    return jsonify({'streak': streak})

@app.route('/api/analysis/<int:goal_id>', methods=['GET'])
def get_analysis(goal_id):
    conn = get_db_connection()
    logs = conn.execute('SELECT * FROM daily_logs WHERE goal_id = ?', (goal_id,)).fetchall()
    conn.close()
    
    if not logs:
        return jsonify({
            'completion_rate': 0,
            'average_focus': 0,
            'best_mood_day': None,
            'total_days_logged': 0
        })
        
    df = pd.DataFrame([dict(row) for row in logs])
    total_days_logged = len(df['log_date'].unique())
    df['task_done'] = df['task_done'].astype(bool)
    completion_rate = (df['task_done'].sum() / len(df)) * 100
    average_focus = df['focus_level'].mean()
    
    happy_days = df[df['mood'].str.contains('Happy', na=False) | (df['mood'] == 'Happy 😊')]
    if not happy_days.empty:
        best_mood_day = happy_days['log_date'].iloc[0]
    else:
        best_mood_day = None
        
    return jsonify({
        'completion_rate': round(completion_rate, 2),
        'average_focus': round(average_focus, 2),
        'best_mood_day': best_mood_day,
        'total_days_logged': total_days_logged
    })

@app.route('/api/ai/plan', methods=['POST'])
def ai_plan():
    data = request.json
    goal_title   = data.get('goal_title', '')
    category     = data.get('category', '')
    deadline     = data.get('deadline', '')
    commitment   = data.get('commitment', '')
    difficulty   = data.get('difficulty', '')
    motivation   = data.get('motivation', '')

    prompt = (
        f"You are a personal growth coach. The user has set this goal: {goal_title}, "
        f"category: {category}, deadline: {deadline} days, daily commitment: {commitment}, "
        f"difficulty: {difficulty}, motivation: {motivation}. "
        f"Break this into a realistic week-by-week plan. Give 3 daily habits, "
        f"1 motivational insight, and 1 warning about common mistakes. "
        f"Keep it concise and personal."
    )
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
        )
        return jsonify({'plan': chat_completion.choices[0].message.content})
    except Exception as e:
        err = str(e)
        return jsonify({'error': err}), 500


@app.route('/api/ai/nudge', methods=['POST'])
def ai_nudge():
    data = request.json
    streak          = data.get('streak', 0)
    mood            = data.get('mood', 'Neutral')
    completion_rate = data.get('completion_rate', 0)
    goal_title      = data.get('goal_title', '')

    prompt = (
        f"User is tracking goal: {goal_title}. "
        f"Current streak: {streak} days. Today's mood: {mood}. "
        f"Completion rate: {completion_rate}%. "
        f"Give a short 2-3 sentence motivational nudge personalized to this data. "
        f"Be encouraging but honest."
    )
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
        )
        return jsonify({'nudge': chat_completion.choices[0].message.content})
    except Exception as e:
        err = str(e)
        return jsonify({'error': err}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
