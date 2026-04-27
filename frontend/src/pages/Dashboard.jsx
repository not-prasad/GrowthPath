import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, ArrowRight, Zap, FlaskConical } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Heatmap from '../components/Heatmap';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

function Sparkline({ data }) {
  if (!data || data.length === 0) return null;
  const scores = data.map(d => d.performance_score || 0);
  const max = Math.max(...scores, 1);
  const w = 200, h = 44, pad = 4;
  const pts = scores.map((s, i) => {
    const x = pad + (i / Math.max(scores.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((s / max) * (h - pad * 2));
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {scores.map((s, i) => {
        const x = pad + (i / Math.max(scores.length - 1, 1)) * (w - pad * 2);
        const y = h - pad - ((s / max) * (h - pad * 2));
        return <circle key={i} cx={x} cy={y} r="2.5" fill="var(--accent-primary)" />;
      })}
    </svg>
  );
}

function Dashboard() {
  const [goal, setGoal] = useState(null);
  const [trends, setTrends] = useState(null);
  const [days, setDays] = useState([]);
  const [insights, setInsights] = useState([]);

  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);

  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const storedGoalId = localStorage.getItem('growthpath_goal_id');

    const fetchData = async () => {
      try {
        const headers = authHeaders(token);

        let goalId = storedGoalId;
        if (!goalId) {
          const goalsRes = await fetch(`${API_BASE}/goals`, { headers });
          const goalsPayload = await safeJson(goalsRes);
          const goals = goalsPayload?.goals || [];
          const active = goalsPayload?.active_goal_id;
          if (active) {
            goalId = String(active);
            localStorage.setItem('growthpath_goal_id', goalId);
          } else if (goals.length > 0) {
            goalId = String(goals[0].id);
            localStorage.setItem('growthpath_goal_id', goalId);
          } else { navigate('/setup'); return; }
        }

        const goalsRes = await fetch(`${API_BASE}/goals`, { headers });
        if (goalsRes.status === 401) { logout(); navigate('/login'); return; }
        const goalsPayload = await safeJson(goalsRes);
        const goals = goalsPayload?.goals || [];
        const goalData = goals.find(g => String(g.id) === String(goalId)) || goals[0] || null;
        if (!goalData) { navigate('/setup'); return; }
        setGoal(goalData);

        const [trendsRes, logsRes, insightsRes] = await Promise.all([
          fetch(`${API_BASE}/performance/trends?goal_id=${goalData.id}&days=7`, { headers }),
          fetch(`${API_BASE}/logs?goal_id=${goalData.id}&limit=60`, { headers }),
          fetch(`${API_BASE}/ai/insights?goal_id=${goalData.id}`, { headers }),
        ]);

        if (trendsRes.ok) {
          const t = await safeJson(trendsRes);
          setTrends(t?.trends || null);
        }

        if (logsRes.ok) {
          const l = await safeJson(logsRes);
          setDays(l?.days || []);
        }

        setInsightsLoading(true);
        if (insightsRes.ok) {
          const ins = await safeJson(insightsRes);
          const list = ins?.insights || [];
          setInsights(list);
        } else {
          setInsights([]);
        }
        setInsightsLoading(false);

      } catch (error) {
        console.error('Dashboard load error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate, logout]);

  if (!goal && !loading) {
    return (
      <DashboardLayout goal={null}>
        <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <FlaskConical size={40} color="var(--accent-primary)" style={{ marginBottom: '1.5rem' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>No active experiment</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '360px', marginBottom: '2rem', lineHeight: 1.6 }}>
            Define a goal to initialize your performance data pipeline.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/setup')}>
            Initialize Goal <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (!goal) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
      <div className="spinner" />
    </div>
  );

  const TrendIcon = trends?.trend === 'up' ? TrendingUp : trends?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = trends?.trend === 'up' ? 'var(--success)' : trends?.trend === 'down' ? 'var(--danger)' : 'var(--text-muted)';
  const latestScore = days?.[0] ? Math.round(days[0].performance_score || 0) : null;
  const latestFocus = days?.[0] ? Number(days[0].focus_level || 0).toFixed(1) : null;
  const summarySentence = latestScore == null
    ? 'Log today to start your performance baseline.'
    : latestScore >= 80
      ? 'You are performing strongly today. Keep the same rhythm.'
      : latestScore >= 65
        ? 'You are steady today. One focused push can improve your score.'
        : 'Today looks below baseline. Keep goals smaller and reduce friction.';

  return (
    <DashboardLayout goal={goal}>
      <div className="premium-page">
        <div className="premium-header">
          <div>
            <p className="premium-kicker">Daily View</p>
            <h1 className="premium-title">How am I doing today?</h1>
            <p className="premium-subtitle">{summarySentence}</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/log')} style={{ alignSelf: 'flex-start' }}>
            <Zap size={14} fill="currentColor" /> Run Daily Log
          </button>
        </div>

        <section className="premium-section">
          <div className="premium-hero-score">
            <p className="premium-kicker">Latest Performance</p>
            <div className="premium-score-row">
              <span className="premium-score-value">{latestScore ?? '—'}</span>
              <span className="premium-score-unit">/100</span>
              <span className="premium-trend" style={{ color: trendColor }}>
                <TrendIcon size={14} /> {trends?.trend || 'stable'} trend
              </span>
            </div>
            <p className="premium-muted">Goal: <strong>{goal.title}</strong></p>
          </div>
        </section>

        <section className="premium-section">
          <div className="premium-metric-row">
            <div className="premium-metric">
              <p className="premium-metric-label">Days logged</p>
              <p className="premium-metric-value">{days.length}</p>
            </div>
            <div className="premium-metric">
              <p className="premium-metric-label">Latest focus</p>
              <p className="premium-metric-value">{latestFocus ?? '—'}</p>
            </div>
            <div className="premium-metric">
              <p className="premium-metric-label">7-day trend</p>
              <p className="premium-metric-value" style={{ color: trendColor }}>{trends?.trend || 'stable'}</p>
            </div>
          </div>
        </section>

        <section className="premium-section">
          <h2 className="premium-section-title">Performance trend</h2>
          {trends?.data && trends.data.length > 0 ? (
            <div style={{ paddingTop: '0.5rem' }}>
              <Sparkline data={trends.data} />
              <div className="premium-trend-labels">
                {trends.data.map((d, i) => (
                  <div key={`trend-${d.log_date}-${i}`} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round(d.performance_score || 0)}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(d.log_date).toLocaleDateString('en', { weekday: 'short' })}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="premium-empty">Log more days to unlock this insight.</p>
          )}
        </section>

        <section className="premium-section">
          <h2 className="premium-section-title">AI Brief</h2>
          {insightsLoading ? (
            <p className="premium-empty">Preparing your brief…</p>
          ) : insights.length > 0 ? (
            <div className="premium-insight-list">
              {insights.slice(0, 3).map((ins, i) => (
                <p key={`insight-${i}`} className="premium-insight-item">
                  <span>{ins.title}:</span> {ins.body}
                </p>
              ))}
            </div>
          ) : (
            <p className="premium-empty">Log more days to unlock this insight.</p>
          )}
        </section>

        <section className="premium-section">
          <h2 className="premium-section-title">Consistency Calendar</h2>
          <Heatmap logs={(days || []).map(d => ({
            log_date: d.date,
            task_done: (d.performance_score || 0) >= 70,
            focus_level: d.focus_level,
            mood: null,
            notes: d.notes,
          }))} />
        </section>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
