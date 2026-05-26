import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, CheckCircle, Clock, Plus, Star, ArrowRight, Activity, 
  Sparkles, ShieldCheck, Trophy, ChevronRight
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const activeGoalId = localStorage.getItem('growthpath_goal_id');

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/goals`, { headers: authHeaders(token) });
      if (res.status === 401) { logout(); navigate('/login'); return; }
      const data = await safeJson(res);
      setGoals(data?.goals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [token]);

  const switchGoal = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/goals/active`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token)
        },
        body: JSON.stringify({ goal_id: id })
      });
      if (res.ok) {
        localStorage.setItem('growthpath_goal_id', String(id));
        navigate('/dashboard');
      } else {
        const data = await safeJson(res);
        alert(data?.error?.message || 'Failed to switch goal.');
      }
    } catch (err) {
      console.error("Goal switch error:", err);
      alert('Error connecting to backend.');
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  if (loading) return (
    <DashboardLayout goal={goals.find(g => g.id.toString() === activeGoalId)} overlayClass="bg-goals">
      <div className="premium-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Sparkles className="spin" size={40} color="var(--accent-primary)" />
        <p className="premium-muted">Loading your goals...</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout goal={goals.find(g => g.id.toString() === activeGoalId)} overlayClass="bg-goals">
      <div className="premium-page">
        <header className="premium-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="premium-kicker">Goal Management</p>
            <h1 className="premium-title">Manage Goals</h1>
            <p className="premium-subtitle">Switch between your active goals or start a new one.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/setup')}>
            <Plus size={18} /> New Goal
          </button>
        </header>

        <section className="premium-section">
          <h2 className="premium-section-title">
            <Activity size={20} className="text-secondary" /> Active Goals ({activeGoals.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '1.5rem' }}>
            {activeGoals.map(goal => {
              const isActive = goal.id.toString() === activeGoalId;
              return (
                <div 
                  key={goal.id} 
                  className={`premium-card-hover ${isActive ? 'active-goal-card' : ''}`}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '1.5rem',
                    background: isActive ? 'var(--glass-bg)' : 'var(--bg-color)',
                    border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                    borderRadius: '20px',
                    boxShadow: isActive ? '0 8px 32px rgba(99, 102, 241, 0.2)' : 'none',
                    backdropFilter: isActive ? 'blur(12px)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ 
                      width: '48px', height: '48px', 
                      background: isActive ? 'var(--header-gradient)' : 'var(--accent-subtle)', 
                      color: isActive ? '#fff' : 'var(--accent-primary)', 
                      borderRadius: '14px', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center',
                      boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                    }}>
                      <Target size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{goal.title}</h3>
                        {isActive && (
                          <span className="badge badge-purple" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>Tracking Now</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <ShieldCheck size={14} className="text-secondary" /> {goal.category}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} className="text-secondary" /> {goal.deadline} Days
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Sparkles size={14} className="text-secondary" /> {goal.commitment}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {!isActive ? (
                      <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={() => switchGoal(goal.id)}>
                        Activate <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={() => navigate('/dashboard')}>
                         View Dashboard <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {activeGoals.length === 0 && !loading && (
              <p className="premium-empty" style={{ textAlign: 'center', padding: '3rem' }}>No active goals found. Create a new one to get started!</p>
            )}
          </div>
        </section>

        {completedGoals.length > 0 && (
          <section className="premium-section">
            <h2 className="premium-section-title">
              <Trophy size={20} className="text-secondary" /> Completed Goals ({completedGoals.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
              {completedGoals.map(goal => (
                <div 
                  key={goal.id} 
                  className="premium-card-hover" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    padding: '1.5rem', 
                    background: 'var(--bg-color)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '20px',
                    opacity: 0.9
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ 
                      width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.1)', 
                      color: '#10b981', borderRadius: '10px', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{goal.title}</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Goal Completed</p>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.1rem' }}>Started</p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(goal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <button className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => switchGoal(goal.id)}>View History</button>
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
