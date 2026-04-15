import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

function Checkin() {
  const [goal, setGoal] = useState(null);
  const [mood, setMood] = useState('Happy 😊');
  const [focusLevel, setFocusLevel] = useState(3);
  const [taskDone, setTaskDone] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const goalId = localStorage.getItem('growthpath_goal_id');
    if (!goalId) {
      navigate('/setup');
      return;
    }
    const fetchGoal = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/goals/${goalId}`);
        if (!res.ok) throw new Error('Not found');
        setGoal(await res.json());
      } catch {
        navigate('/setup');
      }
    };
    fetchGoal();
  }, [navigate]);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    const goalId = localStorage.getItem('growthpath_goal_id');
    try {
      const response = await fetch('http://localhost:5000/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: goalId,
          task_done: taskDone,
          mood,
          focus_level: focusLevel,
          notes,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTaskDone(false);
        setNotes('');
        setMood('Happy 😊');
        setFocusLevel(3);
        setTimeout(() => setSubmitted(false), 3000);
      } else {
        alert('Failed to submit check-in.');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      alert('Error connecting to server.');
    }
  };

  if (!goal) return null;

  return (
    <DashboardLayout goal={goal}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Daily Check-in</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Log today's progress for: <span style={{ color: '#a78bfa' }}>{goal.title}</span></p>
      </div>

      {submitted && (
        <div style={{
          background: 'rgba(124, 58, 237, 0.15)',
          border: '1px solid rgba(124, 58, 237, 0.4)',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#a78bfa',
          fontWeight: 500,
        }}>
          <CheckCircle size={20} /> Check-in submitted successfully! Keep up the great work 🎉
        </div>
      )}

      <div className="card" style={{ alignItems: 'flex-start', padding: '2.5rem', maxWidth: '700px' }}>
        <form onSubmit={handleCheckIn} style={{ width: '100%' }}>

          {/* Task Done */}
          <div className="form-group">
            <label>Did you complete your daily commitment?</label>
            <div
              onClick={() => setTaskDone(!taskDone)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginTop: '0.75rem',
                padding: '1rem 1.5rem',
                borderRadius: '12px',
                cursor: 'pointer',
                background: taskDone ? 'rgba(124, 58, 237, 0.15)' : 'rgba(0,0,0,0.3)',
                border: taskDone ? '1px solid rgba(124, 58, 237, 0.5)' : '1px solid var(--panel-border)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: '6px',
                background: taskDone ? 'var(--accent-purple)' : 'transparent',
                border: taskDone ? '2px solid var(--accent-purple)' : '2px solid var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.2s'
              }}>
                {taskDone && <CheckCircle size={14} color="#fff" />}
              </div>
              <span style={{ color: taskDone ? '#a78bfa' : 'var(--text-primary)', fontWeight: 500 }}>
                {taskDone ? '✅ Task completed!' : 'Click to mark as done'}
              </span>
            </div>
          </div>

          {/* Mood */}
          <div className="form-group">
            <label>How are you feeling today?</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {['Happy 😊', 'Neutral 😐', 'Stressed 😞'].map(m => (
                <div
                  key={m}
                  onClick={() => setMood(m)}
                  style={{
                    padding: '0.875rem 1.5rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: mood === m ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255,255,255,0.04)',
                    border: mood === m ? '1px solid rgba(124, 58, 237, 0.6)' : '1px solid var(--panel-border)',
                    color: mood === m ? '#a78bfa' : 'var(--text-primary)',
                    fontWeight: mood === m ? 600 : 400,
                    transition: 'all 0.2s',
                    fontSize: '1rem',
                  }}
                >
                  {m}
                </div>
              ))}
            </div>
          </div>

          {/* Focus Slider */}
          <div className="form-group">
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Focus Level</span>
              <span style={{ color: '#a78bfa', fontWeight: 700 }}>{focusLevel} / 5</span>
            </label>
            <input
              type="range"
              min="1" max="5"
              value={focusLevel}
              onChange={(e) => setFocusLevel(Number(e.target.value))}
              style={{ width: '100%', marginTop: '0.75rem', accentColor: 'var(--accent-purple)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              <span>Distracted</span>
              <span>Laser Focused</span>
            </div>
            <div className="focus-dots" style={{ justifyContent: 'center', marginTop: '1rem' }}>
              {[1,2,3,4,5].map(n => (
                <div key={n} className={`focus-dot ${n <= focusLevel ? 'filled' : ''}`} style={{ width: '18px', height: '18px' }} />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label>Notes <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              className="form-control"
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any reflections, wins, or blockers for today?"
            ></textarea>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            Submit Check-in ✨
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default Checkin;
