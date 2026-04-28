import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Zap, X, TrendingUp, TrendingDown, Minus, CheckCircle, Circle, Sparkles } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

const ENERGY_OPTIONS = [
  { id: 'High',   label: 'High',   desc: 'Feeling great and productive' },
  { id: 'Stable', label: 'Stable', desc: 'A normal, steady day' },
  { id: 'Low',    label: 'Low',    desc: 'Feeling a bit tired or slow' },
];

const OBJECTIVE_OPTIONS = [
  { id: 'Completed', label: 'Completed', icon: '✅', color: 'var(--success)' },
  { id: 'Partial',   label: 'Partial',   icon: '⚡', color: 'var(--warning)' },
  { id: 'Missed',    label: 'Missed',    icon: '❌', color: 'var(--danger)' },
];

const FRICTION_OPTIONS = [
  'Time Constraint',
  'Low Sleep',
  'Stress',
  'Distraction',
  'None',
];

const FOCUS_LABELS = ['Minimal', 'Low', 'Moderate', 'High', 'Peak'];

export default function PerformanceInput() {
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState('custom');
  const [addingTask, setAddingTask] = useState(false);

  const [energyState, setEnergyState] = useState('Stable');
  const [frictionVars, setFrictionVars] = useState([]);
  const [focusLevel, setFocusLevel] = useState(3);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // submission output
  const { token, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const headers = authHeaders(token);

        const goalsRes = await fetch(`${API_BASE}/goals`, { headers });
        if (goalsRes.status === 401) { logout(); navigate('/login'); return; }
        const goalsPayload = await safeJson(goalsRes);
        const goals = goalsPayload?.goals || [];
        const active = goalsPayload?.active_goal_id;
        const stored = localStorage.getItem('growthpath_goal_id');
        const selected = goals.find(g => String(g.id) === String(stored)) || goals.find(g => String(g.id) === String(active)) || goals[0] || null;
        if (!selected) { navigate('/setup'); return; }
        localStorage.setItem('growthpath_goal_id', String(selected.id));
        setGoal(selected);

        const today = new Date().toISOString().slice(0, 10);
        const daysRes = await fetch(`${API_BASE}/logs?goal_id=${selected.id}&from=${today}&to=${today}&limit=1`, { headers });
        const payload = await safeJson(daysRes);
        const day = payload?.days?.[0];
        setTodayTasks(day?.tasks || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [token, navigate, logout]);

  const toggleFriction = (f) => {
    if (f === 'None') { setFrictionVars(['None']); return; }
    setFrictionVars(prev => {
      const without = prev.filter(x => x !== 'None');
      return without.includes(f) ? without.filter(x => x !== f) : [...without, f];
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const goalId = localStorage.getItem('growthpath_goal_id');
      const friction_count = frictionVars.includes('None') ? 0 : frictionVars.length;
      const res = await fetch(`${API_BASE}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({
          goal_id: goalId,
          energy_state: energyState,
          friction_count,
          focus_level: focusLevel,
          notes,
        }),
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data.total_xp !== undefined) {
          updateUser({ total_xp: data.total_xp, level: data.level });
        }
        setResult(data);
        // Refresh today tasks to reflect any completion changes (if user edited them elsewhere)
        const today = new Date().toISOString().slice(0, 10);
        const daysRes = await fetch(`${API_BASE}/logs?goal_id=${goalId}&from=${today}&to=${today}&limit=1`, { headers: authHeaders(token) });
        const payload = await safeJson(daysRes);
        const day = payload?.days?.[0];
        setTodayTasks(day?.tasks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const [generatingTasks, setGeneratingTasks] = useState(false);

  const generateAiTasks = async () => {
    if (!goal) return;
    setGeneratingTasks(true);
    try {
      const goalId = localStorage.getItem('growthpath_goal_id');
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API_BASE}/tasks/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ goal_id: goalId, log_date: today }),
      });
      if (res.ok) {
        const data = await safeJson(res);
        setTodayTasks(data.tasks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingTasks(false);
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim() || !goal) return;
    setAddingTask(true);
    try {
      const goalId = localStorage.getItem('growthpath_goal_id');
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API_BASE}/tasks/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({
          goal_id: goalId,
          log_date: today,
          task_type: newTaskType,
          title: newTaskTitle.trim(),
          is_completed: false,
        }),
      });
      if (res.ok) {
        setNewTaskTitle('');
        const todayRes = await fetch(`${API_BASE}/logs?goal_id=${goalId}&from=${today}&to=${today}&limit=1`, { headers: authHeaders(token) });
        const payload = await safeJson(todayRes);
        const day = payload?.days?.[0];
        setTodayTasks(day?.tasks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingTask(false);
    }
  };

  const toggleTask = async (taskId) => {
    if (!taskId) return;
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}/toggle`, {
        method: 'PUT',
        headers: authHeaders(token),
      });
        const data = await safeJson(res);
        if (data.total_xp !== undefined) {
          updateUser({ total_xp: data.total_xp, level: data.level });
        }
        
        const goalId = localStorage.getItem('growthpath_goal_id');
        const today = new Date().toISOString().slice(0, 10);
        const todayRes = await fetch(`${API_BASE}/logs?goal_id=${goalId}&from=${today}&to=${today}&limit=1`, { headers: authHeaders(token) });
        const payload = await safeJson(todayRes);
        const day = payload?.days?.[0];
        setTodayTasks(day?.tasks || []);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
      <div className="spinner" />
    </div>
  );

  const section = { marginBottom: '2.5rem' };
  const label = { fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.875rem', display: 'block' };
  const row = { display: 'flex', gap: '0.625rem', flexWrap: 'wrap' };

  const chip = (active, color) => ({
    padding: '0.5rem 1.125rem',
    borderRadius: '6px',
    border: `1px solid ${active ? (color || 'var(--accent-primary)') : 'var(--panel-border)'}`,
    background: active ? (color ? `${color}18` : 'var(--accent-subtle)') : 'var(--panel-bg)',
    color: active ? (color || 'var(--accent-primary)') : 'var(--text-secondary)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  });

  // — OUTPUT SUMMARY SCREEN —
  if (result) {
    const score = result?.log?.performance_score ?? 0;
    const trend = score >= 70 ? 'Improving' : score >= 40 ? 'Stable' : 'Declining';
    const trendColor = score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--danger)';
    const TrendIcon = score >= 70 ? TrendingUp : score >= 40 ? Minus : TrendingDown;

    return (
      <DashboardLayout goal={goal} overlayClass="bg-dailylog">
        <div className="premium-page fade-in">
          <section className="premium-section">
            <p className="premium-kicker">Daily Summary — {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>

            {/* Score */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--panel-border)' }}>
              <span style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{score}</span>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>/100</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)' }}>Your Daily Score</span>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: 'XP Earned', value: `+${result?.log?.xp_gained || 0}`, color: 'var(--accent-primary)' },
                { label: 'Progress Trend', value: trend, color: trendColor },
                { label: 'Energy Level', value: result?.log?.energy_state || 'Stable', color: 'var(--text-primary)' },
              ].map(m => (
                <div key={m.label} style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--panel-border)' }}>
                  <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>{m.label}</p>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>

            <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Return to Overview
            </button>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout goal={goal} overlayClass="bg-dailylog">
      <div className="premium-page fade-in">

        {/* Header */}
        <div className="premium-header" style={{ marginBottom: '2rem' }}>
          <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8125rem', marginBottom: '1.5rem', padding: 0 }}>
            <ArrowLeft size={14} /> Overview
          </button>
          <p className="premium-kicker">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="premium-title">How was your day?</h1>
          <p className="premium-subtitle">
            Track your tasks, focus, obstacles, and notes in one simple log.
          </p>
        </div>

        <section className="premium-section">

          {/* Tasks for today */}
          <div style={section}>
            <span style={label}>Today’s Tasks</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <select value={newTaskType} onChange={e => setNewTaskType(e.target.value)} className="form-control" style={{ width: '160px' }}>
                <option value="primary">primary</option>
                <option value="support">support</option>
                <option value="optimize">optimize</option>
                <option value="custom">custom</option>
              </select>
              <input
                className="form-control"
                placeholder="Add a task (e.g., Run 20 minutes)"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                style={{ flex: 1, minWidth: '220px' }}
                onKeyDown={e => (e.key === 'Enter' ? addTask() : null)}
              />
              <button className="btn btn-primary" onClick={addTask} disabled={addingTask || !newTaskTitle.trim()}>
                {addingTask ? 'Adding...' : 'Add Task'}
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
               <button 
                className="btn btn-outline" 
                onClick={generateAiTasks} 
                disabled={generatingTasks}
                style={{ width: '100%', fontSize: '0.75rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.2)' }}
               >
                 <Sparkles size={14} color="var(--accent-primary)" />
                 {generatingTasks ? 'Planning...' : 'Generate AI Tasks for Today'}
               </button>
            </div>

            {todayTasks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No tasks added for today yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {todayTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleTask(t.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem 0.875rem',
                      background: t.is_completed ? 'rgba(16,185,129,0.06)' : 'var(--bg-color)',
                      border: `1px solid ${t.is_completed ? 'rgba(16,185,129,0.3)' : 'var(--panel-border)'}`,
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      width: '100%',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      {t.is_completed
                        ? <CheckCircle size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
                        : <Circle size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      }
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontSize: '0.8125rem', fontWeight: 700,
                          color: t.is_completed ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: t.is_completed ? 'line-through' : 'none',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>{t.title}</p>
                        <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.task_type}</p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                      padding: '0.2rem 0.6rem', borderRadius: '6px',
                      background: t.is_completed ? 'var(--success-subtle)' : 'var(--panel-bg)',
                      color: t.is_completed ? 'var(--success)' : 'var(--text-muted)',
                      border: `1px solid ${t.is_completed ? 'rgba(16,185,129,0.2)' : 'var(--panel-border)'}`,
                    }}>
                      {t.is_completed ? 'Done' : 'Pending'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Variable 1: Energy State */}
          <div style={section}>
            <span style={label}>Your Energy Level</span>
            <div style={row}>
              {ENERGY_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setEnergyState(opt.id)} style={chip(energyState === opt.id)}>
                  {opt.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {ENERGY_OPTIONS.find(o => o.id === energyState)?.desc}
            </p>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--panel-border)', marginBottom: '2rem' }} />

          {/* Variable 3: Focus Level */}
          <div style={section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
              <span style={label}>Focus Level</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {focusLevel} — {FOCUS_LABELS[focusLevel - 1]}
              </span>
            </div>
            <input
              type="range" min="1" max="5" value={focusLevel}
              onChange={e => setFocusLevel(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)', height: '4px', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem' }}>
              {FOCUS_LABELS.map(l => (
                <span key={l} style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>{l}</span>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--panel-border)', marginBottom: '2rem' }} />

          {/* Variable 4: Friction Variables */}
          <div style={section}>
            <span style={label}>Challenges & Obstacles (select all that apply)</span>
            <div style={row}>
              {FRICTION_OPTIONS.map(f => (
                <button
                  key={f}
                  onClick={() => toggleFriction(f)}
                  style={chip(frictionVars.includes(f), f === 'None' ? 'var(--success)' : 'var(--danger)')}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--panel-border)', marginBottom: '2rem' }} />

          {/* Variable 5: Observational Notes */}
          <div style={{ marginBottom: '2rem' }}>
            <span style={label}>Additional Notes <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Write anything else you want to track or remember about today..."
              style={{
                width: '100%', background: 'var(--bg-color)', border: '1px solid var(--panel-border)',
                borderRadius: '8px', padding: '0.875rem 1rem', color: 'var(--text-primary)',
                fontFamily: 'inherit', fontSize: '0.875rem', minHeight: '100px', outline: 'none',
                resize: 'vertical', lineHeight: 1.6,
              }}
            />
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ width: '100%' }}>
            {submitting ? 'Saving...' : <><ArrowRight size={16} /> Save Daily Log</>}
          </button>
        </section>
      </div>
    </DashboardLayout>
  );
}
