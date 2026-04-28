import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, TrendingUp, AlertTriangle, Info, RefreshCw, Sparkles, Target } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

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

function InsightCard({ title, body, type, index }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const navigate = useNavigate();

  const handleAction = () => {
    if (type === 'warning') navigate('/history');
    else if (type === 'positive') navigate('/tasks');
    else navigate('/analysis');
  };

  return (
    <div style={{
      background: 'var(--panel-bg)',
      border: `1px solid var(--panel-border)`,
      borderLeft: `4px solid ${cfg.border}`,
      borderRadius: '16px',
      padding: '1.75rem',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      animation: `fadeIn 0.6s ease-out ${index * 0.15}s forwards`,
      opacity: 0,
      position: 'relative',
      overflow: 'hidden'
    }}
      className="premium-card-hover"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ color: cfg.color }}>{cfg.icon}</div>
          <span style={{
            fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: cfg.color
          }}>
            {cfg.label}
          </span>
        </div>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', background: 'var(--bg-color)', padding: '2px 8px', borderRadius: '6px' }}>
          {type === 'positive' ? 'CONFIDENCE: 92%' : 'CONFIDENCE: 88%'}
        </div>
      </div>

      <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        {body}
      </p>

      <button 
        onClick={handleAction}
        className="btn btn-outline" 
        style={{ 
          fontSize: '0.7rem', 
          padding: '0.5rem 1rem', 
          width: '100%', 
          justifyContent: 'center',
          borderColor: `${cfg.color}30`,
          color: cfg.color,
          background: `${cfg.color}05`
        }}
      >
        {type === 'warning' ? 'Review History' : type === 'positive' ? 'Optimize List' : 'Deep Analysis'}
      </button>
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
      const res = await fetch(`${API_BASE}/ai/insights?goal_id=${goalId}`, { headers: authHeaders(token) });
      if (res.status === 401) { logout(); navigate('/login'); return; }
      const data = await safeJson(res);
      setInsights(data?.insights || []);
    } catch (err) {
      setError('Could not load insights. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
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
        await fetchInsights(selected.id);
      } catch {
        navigate('/setup');
      }
    };
    init();
  }, [token, navigate, logout]);

  return (
    <DashboardLayout goal={goal} overlayClass="bg-insights">
      <div className="premium-page fade-in">
        <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p className="premium-kicker">Lab Analysis</p>
            <h1 className="premium-title">AI Advice</h1>
            <p className="premium-subtitle">
              Deep-learning patterns identified from your energy, focus, and task data.
            </p>
          </div>
          {!loading && goal && (
            <button
              className="btn btn-primary"
              onClick={() => fetchInsights(localStorage.getItem('growthpath_goal_id'))}
              style={{ gap: '0.5rem', borderRadius: '12px' }}
            >
              <RefreshCw size={14} /> Re-calibrate
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
          
          {/* Insights Main Feed */}
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
                  index={i}
                  title={insight.title}
                  body={insight.body}
                  type={insight.type}
                />
              ))
            )}

            {!loading && insights.length === 0 && !error && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--panel-border)', borderRadius: '20px' }}>
                <Brain size={48} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
                <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Insufficient Signals</p>
                <p className="premium-muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>The AI engine needs at least 3 logs to begin pattern recognition.</p>
              </div>
            )}
          </div>

          {/* AI Behavioral Summary Sidebar */}
          <aside className="premium-section" style={{ padding: '1.75rem', position: 'sticky', top: '2rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} color="var(--accent-primary)" /> Behavioral Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Primary Growth Driver</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', background: 'var(--success-subtle)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                    <Target size={18} />
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Focus Density</p>
                </div>
              </div>

              <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Main Friction Point</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', background: 'var(--danger-subtle)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                    <AlertTriangle size={18} />
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Energy Volatility</p>
                </div>
              </div>

              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  "Data suggests your performance is highly sensitive to morning focus levels. Protecting your first 2 hours of work is critical."
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Insights;
