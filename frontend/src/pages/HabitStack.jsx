import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, Plus, Trash2, ArrowRight, ChevronRight, Sparkles, 
  Zap, Link, Activity, Trash
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

function HabitStack() {
  const [goal, setGoal] = useState(null);
  const [habits, setHabits] = useState([]);
  const [trigger, setTrigger] = useState('');
  const [newHabit, setNewHabit] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const headers = { ...authHeaders(token), 'Content-Type': 'application/json' };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const h = authHeaders(token);
        
        // 1. Resolve Goal if missing or invalid
        let goalId = localStorage.getItem('growthpath_goal_id');
        
        const goalsRes = await fetch(`${API_BASE}/goals`, { headers: h });
        if (goalsRes.status === 401) { logout(); navigate('/login'); return; }
        
        const goalsPayload = await safeJson(goalsRes);
        const goals = goalsPayload?.goals || [];
        const active = goalsPayload?.active_goal_id;

        // Self-Healing: Resolve goal from server if local is missing/invalid
        let currentGoal = goals.find(g => String(g.id) === String(goalId));
        if (!currentGoal) {
            currentGoal = goals.find(g => String(g.id) === String(active)) || goals[0];
            if (currentGoal) {
                localStorage.setItem('growthpath_goal_id', String(currentGoal.id));
                goalId = String(currentGoal.id);
            }
        }

        if (!currentGoal) {
          navigate('/setup');
          return;
        }
        setGoal(currentGoal);

        // 2. Fetch Habits for this goal
        const habitsRes = await fetch(`${API_BASE}/habits`, { headers: h });
        if (habitsRes.ok) {
          const habitsData = await safeJson(habitsRes);
          setHabits(habitsData || []);
        }
      } catch (err) {
        console.error("HabitStack Load Error:", err);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, navigate, logout]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!trigger.trim() || !newHabit.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/habits`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ trigger_habit: trigger, new_habit: newHabit }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setHabits(prev => [data, ...prev]);
      setTrigger('');
      setNewHabit('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_BASE}/habits/${id}`, { method: 'DELETE', headers });
      setHabits(prev => prev.filter(h => h.id !== id));
    } catch {
      setError('Could not delete.');
    }
  };

  if (loading) return (
    <DashboardLayout goal={goal} overlayClass="bg-history">
      <div className="premium-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Sparkles className="spin" size={40} color="var(--accent-primary)" />
        <p className="premium-muted">Loading your habits...</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout goal={goal} overlayClass="bg-history">
      <div className="premium-page">
        <header className="premium-header">
          <p className="premium-kicker">Habit Building</p>
          <h1 className="premium-title">Habit Stacks</h1>
          <p className="premium-subtitle">Connect new habits to your existing routine to make them stick.</p>
        </header>

        <section className="premium-section" style={{
          background: 'var(--header-gradient)',
          borderRadius: '24px', padding: '2rem 2.5rem',
          marginBottom: '2rem', color: '#fff',
          display: 'flex', alignItems: 'center', gap: '1.5rem',
          boxShadow: '0 8px 32px rgba(79, 70, 229, 0.3)',
          border: 'none'
        }}>
          <div style={{ 
            width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', 
            borderRadius: '16px', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', backdropFilter: 'blur(10px)'
          }}>
            <Layers size={28} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.25rem', color: '#fff' }}>
              The Stacking Formula
            </h3>
            <p style={{ fontSize: '0.9rem', opacity: 0.9, color: '#fff', lineHeight: 1.5 }}>
              "After I <strong>[Starting Habit]</strong>, I will <strong>[New Habit]</strong>."
              <br/><span style={{ fontSize: '0.75rem', opacity: 0.7 }}>— James Clear, Atomic Habits</span>
            </p>
          </div>
        </section>

        <div className="premium-grid-two" style={{ gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 1.2fr)' }}>
          <section className="premium-section" style={{ padding: '2rem' }}>
            <h3 className="premium-mini-title"><Plus size={18} className="text-secondary" /> New Habit Pair</h3>
            <form onSubmit={handleAdd} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>After I...</label>
                <input
                  id="trigger-habit"
                  className="form-control"
                  placeholder="e.g., Pour my morning coffee"
                  value={trigger}
                  onChange={e => setTrigger(e.target.value)}
                  style={{ marginTop: '0.5rem', background: 'var(--bg-color)' }}
                />
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '1.5rem 0', gap: '1rem', color: 'var(--accent-primary)'
              }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
                <Zap size={20} className="text-secondary" />
                <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>I will...</label>
                <input
                  id="new-habit"
                  className="form-control"
                  placeholder="e.g., Write down my daily goals"
                  value={newHabit}
                  onChange={e => setNewHabit(e.target.value)}
                  style={{ marginTop: '0.5rem', background: 'var(--bg-color)' }}
                />
              </div>

              {error && (
                <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: '1rem 0', fontWeight: 600 }}>{error}</p>
              )}

              <button
                id="add-habit-stack"
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ width: '100%', marginTop: '1rem', padding: '0.875rem' }}
              >
                {saving ? 'Saving...' : <><Link size={18} /> Add Habit Stack</>}
              </button>
            </form>
          </section>

          <section className="premium-section" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="premium-mini-title"><Activity size={18} className="text-secondary" /> Active Stacks</h3>
              <span className="badge badge-purple">
                {habits.length} HABITS
              </span>
            </div>

            {habits.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '4rem 2rem',
                color: 'var(--text-muted)', borderRadius: '20px',
                border: '2px dashed var(--panel-border)', background: 'var(--bg-color)'
              }}>
                <Layers size={40} style={{ opacity: 0.15, marginBottom: '1rem' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No habit stacks yet.</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {habits.map((h, idx) => (
                <div
                  key={h.id}
                  className="premium-card-hover"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    padding: '1.25rem',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '16px'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>When I...</p>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.trigger_habit}
                    </p>
                  </div>

                  <ChevronRight size={20} className="text-secondary" style={{ flexShrink: 0, opacity: 0.5 }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Then I will...</p>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.new_habit}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(h.id)}
                    className="btn-danger"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', padding: '0.5rem',
                      borderRadius: '8px', flexShrink: 0, transition: 'all 0.2s'
                    }}
                    title="Delete Stack"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default HabitStack;
