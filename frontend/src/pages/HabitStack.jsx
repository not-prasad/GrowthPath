import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Trash2, ArrowRight, ChevronRight } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

function HabitStack() {
  const [goal, setGoal] = useState(null);
  const [habits, setHabits] = useState([]);
  const [trigger, setTrigger] = useState('');
  const [newHabit, setNewHabit] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    const goalId = localStorage.getItem('growthpath_goal_id');
    if (!goalId) { navigate('/setup'); return; }
    const init = async () => {
      setLoading(true);
      try {
        const [goalRes, habitsRes] = await Promise.all([
          fetch(`http://localhost:5000/api/goals/${goalId}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:5000/api/habits', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (goalRes.status === 401 || habitsRes.status === 401) { logout(); navigate('/login'); return; }
        if (goalRes.ok) setGoal(await goalRes.json());
        if (habitsRes.ok) setHabits(await habitsRes.json());
      } catch {
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!trigger.trim() || !newHabit.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/habits', {
        method: 'POST',
        headers,
        body: JSON.stringify({ trigger_habit: trigger, new_habit: newHabit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
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
      await fetch(`http://localhost:5000/api/habits/${id}`, { method: 'DELETE', headers });
      setHabits(prev => prev.filter(h => h.id !== id));
    } catch {
      setError('Could not delete.');
    }
  };

  return (
    <DashboardLayout goal={goal}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Habit Stacking
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Link a new habit to an existing one. Build powerful routines effortlessly.
        </p>
      </div>

      {/* Formula Explainer */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        borderRadius: '16px', padding: '1.75rem 2rem',
        marginBottom: '2rem', color: '#fff',
        display: 'flex', alignItems: 'center', gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <Layers size={22} style={{ flexShrink: 0 }} />
        <div>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem', color: '#fff' }}>
            The Habit Stack Formula
          </p>
          <p style={{ fontSize: '0.8125rem', opacity: 0.85, color: '#fff' }}>
            "After I <strong>[Current Habit]</strong>, I will <strong>[New Habit]</strong>."
            — Anchor new behaviors to things you already do.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '2rem' }}>
        {/* Add Form */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            Create a Stack
          </h3>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>After I…</label>
              <input
                id="trigger-habit"
                className="form-control"
                placeholder="e.g. Brush my teeth"
                value={trigger}
                onChange={e => setTrigger(e.target.value)}
              />
            </div>

            {/* Visual connector */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 0 1.25rem', gap: '0.5rem', color: 'var(--accent-primary)'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
              <ArrowRight size={20} strokeWidth={2.5} />
              <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
            </div>

            <div className="form-group">
              <label>I will…</label>
              <input
                id="new-habit"
                className="form-control"
                placeholder="e.g. Meditate for 5 mins"
                value={newHabit}
                onChange={e => setNewHabit(e.target.value)}
              />
            </div>

            {error && (
              <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', marginBottom: '1rem' }}>{error}</p>
            )}

            <button
              id="add-habit-stack"
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ width: '100%' }}
            >
              {saving ? 'Saving…' : <><Plus size={16} /> Add Stack</>}
            </button>
          </form>
        </div>

        {/* Habit Stack List */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Your Stacks
            </h3>
            <span style={{
              fontSize: '0.75rem', color: 'var(--text-secondary)',
              background: 'var(--bg-color)', border: '1px solid var(--panel-border)',
              padding: '0.2rem 0.625rem', borderRadius: '999px'
            }}>
              {habits.length} stack{habits.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading…
            </div>
          )}

          {!loading && habits.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '2.5rem 1rem',
              color: 'var(--text-muted)', borderRadius: '10px',
              border: '1px dashed var(--panel-border)'
            }}>
              <Layers size={32} style={{ opacity: 0.25, marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.875rem' }}>No stacks yet. Create your first one!</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {habits.map((h, idx) => (
              <div
                key={h.id}
                className="habit-stack-card"
                style={{ animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both` }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '0.8125rem', color: 'var(--text-secondary)',
                    fontWeight: 500, marginBottom: '0.25rem'
                  }}>
                    After I…
                  </p>
                  <p style={{
                    fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {h.trigger_habit}
                  </p>
                </div>

                <ChevronRight size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '0.8125rem', color: 'var(--accent-primary)',
                    fontWeight: 500, marginBottom: '0.25rem'
                  }}>
                    I will…
                  </p>
                  <p style={{
                    fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {h.new_habit}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(h.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: '0.375rem',
                    borderRadius: '6px', flexShrink: 0, transition: 'color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default HabitStack;
