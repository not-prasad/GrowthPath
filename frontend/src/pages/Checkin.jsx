import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Send, Sparkles, Feather, Book, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MOODS = ['Happy 😊', 'Neutral 😐', 'Stressed 😞', 'Tired 😴'];
const HURDLES = [
  { id: 'Busy', label: 'Overwhelmed' },
  { id: 'Tired', label: 'Low Energy' },
  { id: 'Distracted', label: 'Distracted' },
  { id: 'Mental', label: 'Mental Block' }
];

const playSound = (url) => {
  const audio = new Audio(url);
  audio.volume = 0.15;
  audio.play().catch(() => {});
};

function Checkin() {
  const [goal, setGoal] = useState(null);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [mood, setMood] = useState('Neutral 😐');
  const [taskDone, setTaskDone] = useState(false);
  const [selectedHurdles, setSelectedHurdles] = useState([]);
  const [notes, setNotes] = useState('');
  const [focusLevel, setFocusLevel] = useState(3);
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const goalId = localStorage.getItem('growthpath_goal_id');
    if (!goalId) { navigate('/setup'); return; }

    const fetchAll = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const [goalRes, ctxRes] = await Promise.all([
          fetch(`http://localhost:5000/api/goals/${goalId}`, { headers }),
          fetch(`http://localhost:5000/api/goals/${goalId}/checkin-context`, { headers })
        ]);
        if (goalRes.status === 401) { logout(); navigate('/login'); return; }
        if (goalRes.ok) setGoal(await goalRes.json());
        if (ctxRes.ok) setContext(await ctxRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token, navigate, logout]);

  const handleFinish = async () => {
    setSubmitting(true);
    playSound('https://www.soundjay.com/misc/sounds/paper-flick-1.mp3');
    const goalId = localStorage.getItem('growthpath_goal_id');
    try {
      const energyMap = { 'Happy 😊': 'High', 'Neutral 😐': 'Stable', 'Stressed 😞': 'Low', 'Tired 😴': 'Low' };
      const response = await fetch('http://localhost:5000/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          goal_id: goalId,
          todo_id: context?.todo?.id, 
          objective_status: taskDone ? 'Completed' : 'Missed',
          energy_state: energyMap[mood] || 'Stable',
          focus_level: focusLevel,
          notes: notes,
          friction_vars: selectedHurdles
        }),
      });
      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="journal-container"><div className="spinner"></div></div>;

  return (
    <div className="journal-container">
      <div className="journal-page fade-in">
        <button 
          onClick={() => navigate('/dashboard')}
          style={{ position: 'absolute', top: '2rem', left: '2rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
        >
          <ArrowLeft size={16} /> Close Journal
        </button>

        <div className="journal-ink">
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '1rem' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <h1>The Architect's Journal</h1>
          
          <div className="journal-entry-line">
            <p>Today, I am feeling <span style={{ fontWeight: 700 }}>{mood.split(' ')[0]}</span>.</p>
            <div style={{ marginTop: '0.75rem' }}>
              {MOODS.map(m => (
                <button 
                  key={m} onClick={() => { setMood(m); playSound('https://www.soundjay.com/buttons/sounds/button-16.mp3'); }}
                  className={`journal-chip ${mood === m ? 'active' : ''}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="journal-entry-line" style={{ animationDelay: '0.2s' }}>
            <p>Regarding the objective: <span style={{ fontWeight: 700, fontStyle: 'italic' }}>"{context?.todo?.task_description || goal?.title}"</span>...</p>
            <div style={{ marginTop: '0.75rem' }}>
              <button 
                onClick={() => setTaskDone(true)}
                className={`journal-chip ${taskDone ? 'active' : ''}`}
                style={{ borderColor: taskDone ? '#10b981' : '#dcd7c9', color: taskDone ? '#fff' : '#2c3e50', background: taskDone ? '#10b981' : 'transparent' }}
              >
                Objective Conquered
              </button>
              <button 
                onClick={() => setTaskDone(false)}
                className={`journal-chip ${!taskDone ? 'active' : ''}`}
                style={{ borderColor: !taskDone ? '#ef4444' : '#dcd7c9', color: !taskDone ? '#fff' : '#2c3e50', background: !taskDone ? '#ef4444' : 'transparent' }}
              >
                Hurdles Encountered
              </button>
            </div>
          </div>

          <div className="journal-entry-line" style={{ animationDelay: '0.3s' }}>
            <p>Rate your <span style={{ fontWeight: 700 }}>Focus Intensity</span> during this attempt:</p>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  onClick={() => { setFocusLevel(level); playSound('https://www.soundjay.com/buttons/sounds/button-16.mp3'); }}
                  style={{
                    width: '40px', height: '10px', borderRadius: '2px', border: 'none', cursor: 'pointer',
                    background: focusLevel >= level ? 'var(--accent-primary)' : '#e2e8f0',
                    transition: 'all 0.2s', opacity: focusLevel >= level ? 1 : 0.5
                  }}
                  title={`Level ${level}`}
                />
              ))}
              <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {focusLevel}/5
              </span>
            </div>
          </div>

          {!taskDone && (
            <div className="journal-entry-line" style={{ animationDelay: '0.4s' }}>
              <p>The resistance was primarily due to:</p>
              <div style={{ marginTop: '0.75rem' }}>
                {HURDLES.map(h => (
                  <button 
                    key={h.id} onClick={() => {
                        setSelectedHurdles(prev => prev.includes(h.id) ? prev.filter(x => x !== h.id) : [...prev, h.id]);
                        playSound('https://www.soundjay.com/buttons/sounds/button-16.mp3');
                    }}
                    className={`journal-chip ${selectedHurdles.includes(h.id) ? 'active' : ''}`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="journal-entry-line" style={{ border: 'none', animationDelay: '0.6s' }}>
            <p style={{ marginBottom: '1rem' }}>{context?.ai_prompt || "Any final reflections on today's path?"}</p>
            <textarea 
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Start writing..."
              style={{ 
                width: '100%', background: 'transparent', border: 'none', borderLeft: '2px solid #e8e4d9', 
                padding: '1rem', fontStyle: 'italic', fontSize: '1.1rem', color: '#34495e',
                fontFamily: 'inherit', minHeight: '150px', outline: 'none'
              }}
            />
          </div>

          <div style={{ marginTop: '3rem', paddingBottom: '6rem', textAlign: 'center' }}>
            {submitted ? (
              <div style={{ color: '#10b981', animation: 'fadeIn 0.5s', padding: '2rem' }}>
                <CheckCircle size={48} style={{ marginBottom: '1rem' }} />
                <p style={{ fontWeight: 800, fontSize: '1.25rem' }}>Entry Sealed.</p>
                <p style={{ color: 'var(--text-secondary)' }}>Until tomorrow, Architect.</p>
              </div>
            ) : (
              <button 
                id="seal-entry-btn"
                disabled={submitting} onClick={handleFinish}
                style={{ 
                  background: 'var(--text-primary)', color: 'var(--bg-color)', border: 'none', padding: '1.125rem 4rem', 
                  borderRadius: '12px', fontSize: '1.125rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                  display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                }}
              >
                {submitting ? 'Archiving...' : <><Feather size={20} /> Seal Entry</>}
              </button>
            )}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '2rem', left: 0, right: 0, textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Architect's Personal Log — GrowthPath OS
        </div>
      </div>
    </div>
  );
}

export default Checkin;

