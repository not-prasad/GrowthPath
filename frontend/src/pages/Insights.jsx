import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, TrendingUp, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const TYPE_CONFIG = {
  positive: {
    icon: <TrendingUp size={18} />,
    color: '#10b981',
    border: '#10b981',
    bg: 'rgba(16,185,129,0.07)',
    label: 'Positive Pattern',
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    color: '#f59e0b',
    border: '#f59e0b',
    bg: 'rgba(245,158,11,0.07)',
    label: 'Watch Out',
  },
  info: {
    icon: <Info size={18} />,
    color: 'var(--accent-primary)',
    border: 'var(--accent-primary)',
    bg: 'var(--accent-subtle)',
    label: 'Insight',
  },
};

function InsightCard({ title, body, type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid var(--panel-border)`,
      borderLeft: `4px solid ${cfg.border}`,
      borderRadius: '14px',
      padding: '1.5rem',
      transition: 'transform 0.2s ease, border-color 0.2s',
      animation: 'fadeIn 0.5s ease-out forwards',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
        <div style={{ color: cfg.color }}>{cfg.icon}</div>
        <span style={{
          fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.07em', color: cfg.color
        }}>
          {cfg.label}
        </span>
      </div>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
        {body}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
      borderLeft: '4px solid var(--panel-border)', borderRadius: '14px', padding: '1.5rem'
    }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <div className="insight-skeleton" style={{ width: '18px', height: '18px', borderRadius: '4px' }} />
        <div className="insight-skeleton" style={{ width: '80px', height: '12px' }} />
      </div>
      <div className="insight-skeleton" style={{ width: '70%', height: '16px', marginBottom: '0.75rem' }} />
      <div className="insight-skeleton" style={{ width: '100%', height: '12px', marginBottom: '0.5rem' }} />
      <div className="insight-skeleton" style={{ width: '85%', height: '12px' }} />
    </div>
  );
}

function Insights() {
  const [goal, setGoal] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const fetchInsights = async (goalId) => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const res = await fetch('http://localhost:5000/api/ai/correlations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ goal_id: goalId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInsights(data.insights || []);
    } catch (err) {
      setError('Could not load insights. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const goalId_raw = localStorage.getItem('growthpath_goal_id');
    if (!goalId_raw) { navigate('/setup'); return; }
    let goalId = goalId_raw;

    const init = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        let goalRes = await fetch(`http://localhost:5000/api/goals/${goalId}`, { headers });

        if (goalRes.status === 401) { logout(); navigate('/login'); return; }

        if (!goalRes.ok) {
          const listRes = await fetch('http://localhost:5000/api/goals', { headers });
          const userGoals = await listRes.json();
          if (userGoals.length > 0) {
            goalId = userGoals[0].id;
            localStorage.setItem('growthpath_goal_id', goalId);
            goalRes = await fetch(`http://localhost:5000/api/goals/${goalId}`, { headers });
          } else {
            navigate('/setup');
            return;
          }
        }
        setGoal(await goalRes.json());
        await fetchInsights(goalId);
      } catch {
        navigate('/setup');
      }
    };
    init();
  }, [token, navigate]);

  return (
    <DashboardLayout goal={goal}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              Deep Insights
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              AI-powered correlation analysis of your mood, focus, and consistency.
            </p>
          </div>
          {!loading && goal && (
            <button
              className="btn btn-outline"
              onClick={() => fetchInsights(localStorage.getItem('growthpath_goal_id'))}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--accent-primary) 0%, #7c3aed 100%)',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          width: '52px', height: '52px', background: 'rgba(255,255,255,0.15)',
          borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          <Brain size={28} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem', color: '#fff' }}>
            Pattern Intelligence
          </h2>
          <p style={{ fontSize: '0.875rem', opacity: 0.85, color: '#fff', maxWidth: '520px' }}>
            Groq AI analyzes {goal?.title ? `your "${goal.title}" tracking data` : 'your tracking data'} to surface
            hidden correlations between your mood, focus levels, and task completion.
          </p>
        </div>
        <div style={{
          position: 'absolute', right: '-30px', top: '-30px',
          width: '160px', height: '160px', background: 'rgba(255,255,255,0.04)',
          borderRadius: '50%'
        }} />
      </div>

      {/* Insights Grid */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px', padding: '1.25rem', color: 'var(--danger)',
          fontSize: '0.875rem', marginBottom: '1.5rem'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          insights.map((insight, i) => (
            <InsightCard
              key={i}
              title={insight.title}
              body={insight.body}
              type={insight.type}
            />
          ))
        )}
      </div>

      {!loading && insights.length === 0 && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <Brain size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>No insights available. Log more days to unlock AI analysis.</p>
        </div>
      )}
    </DashboardLayout>
  );
}

export default Insights;
