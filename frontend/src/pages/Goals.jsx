import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, CheckCircle, Clock, Trash2, Plus, ArrowRight, Settings, Star } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();
  const activeGoalId = localStorage.getItem('growthpath_goal_id');

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/goals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { logout(); navigate('/login'); return; }
      const data = await res.json();
      setGoals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [token]);

  const switchGoal = (id) => {
    localStorage.setItem('growthpath_goal_id', id);
    navigate('/dashboard');
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`http://localhost:5000/api/goals/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchGoals();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteGoal = async (id) => {
    if (!window.confirm('Are you sure? This will delete all logs and tasks for this goal.')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/goals/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (activeGoalId === id.toString()) {
          // If we deleted the active goal, try to find another one
          const remaining = goals.filter(g => g.id !== id);
          if (remaining.length > 0) {
            localStorage.setItem('growthpath_goal_id', remaining[0].id);
          } else {
            localStorage.removeItem('growthpath_goal_id');
          }
        }
        fetchGoals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <DashboardLayout goal={goals.find(g => g.id.toString() === activeGoalId)}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Goal Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Manage your active journey and archive your achievements.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/setup')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> New Goal
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {/* ACTIVE GOALS */}
        <section>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={14} /> Active Path ({activeGoals.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {activeGoals.map(goal => (
              <div 
                key={goal.id} 
                className="card" 
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem',
                  border: goal.id.toString() === activeGoalId ? '1px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                  boxShadow: goal.id.toString() === activeGoalId ? '0 0 15px var(--accent-subtle)' : 'none'
                }}
              >
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ 
                    width: '40px', height: '40px', background: 'var(--accent-subtle)', 
                    color: 'var(--accent-primary)', borderRadius: '10px', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center' 
                  }}>
                    <Target size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{goal.title}</h3>
                      {goal.id.toString() === activeGoalId && (
                        <span style={{ fontSize: '0.625rem', padding: '2px 6px', background: 'var(--accent-primary)', color: '#fff', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>Active</span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{goal.category} • {goal.deadline} days • {goal.commitment}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {goal.id.toString() !== activeGoalId && (
                    <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => switchGoal(goal.id)}>Switch</button>
                  )}
                  <button className="btn btn-outline" style={{ fontSize: '0.75rem', color: 'var(--success)' }} onClick={() => updateStatus(goal.id, 'completed')}>Complete</button>
                  <button className="btn btn-outline" style={{ color: 'var(--danger)', padding: '0.5rem' }} onClick={() => deleteGoal(goal.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {activeGoals.length === 0 && !loading && (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active goals. Time to start a new adventure!
              </div>
            )}
          </div>
        </section>

        {/* COMPLETED GOALS */}
        {completedGoals.length > 0 && (
          <section>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--success)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Star size={14} /> Wall of Achievements ({completedGoals.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              {completedGoals.map(goal => (
                <div key={goal.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', opacity: 0.8 }}>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ 
                      width: '40px', height: '40px', background: 'var(--success-subtle)', 
                      color: 'var(--success)', borderRadius: '10px', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{goal.title}</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Completed on {new Date(goal.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => updateStatus(goal.id, 'active')}>Re-activate</button>
                    <button className="btn btn-outline" style={{ color: 'var(--danger)', padding: '0.5rem' }} onClick={() => deleteGoal(goal.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Goals;
