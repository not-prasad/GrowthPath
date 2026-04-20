import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, ArrowRight, Zap, BarChart2, FlaskConical } from 'lucide-react';
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

  const MetricCard = ({ label, value, sub }) => (
    <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '1rem 0.875rem', border: '1px solid var(--panel-border)' }}>
      <p style={{ fontSize: '0.575rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.375rem' }}>{label}</p>
      <p style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{sub}</p>}
    </div>
  );

  return (
    <DashboardLayout goal={goal}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.25rem' }}>Performance Lab</p>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Active experiment: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{goal.title}</span>
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/log')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.125rem', fontSize: '0.8125rem' }}>
          <Zap size={14} fill="currentColor" /> Run Daily Log
        </button>
      </div>

      {/* Primary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', gap: '1.25rem' }}>

        {/* ── LEFT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* 1. Performance Overview */}
          <div className="card" style={{ padding: '1.375rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.125rem' }}>
              <h3 style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Performance Overview</h3>
              <span style={{ fontSize: '0.7rem', color: trendColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <TrendIcon size={13} /> {trends?.trend || 'stable'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.625rem' }}>
              <MetricCard label="Days" value={`${days.length || 0}`} sub="loaded" />
              <MetricCard label="Latest" value={days?.[0] ? Math.round(days[0].performance_score || 0) : 0} sub="/100" />
              <MetricCard label="Focus" value={days?.[0] ? (days[0].focus_level || 0) : 0} sub="/5" />
              <MetricCard label="Trend" value={trends?.trend || 'stable'} sub="7d" />
            </div>
          </div>

          {/* 2. 7-Day Performance Trend */}
          <div className="card" style={{ padding: '1.375rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Performance Trend — Last 7 Days</h3>
              <BarChart2 size={13} color="var(--text-muted)" />
            </div>
            {trends?.data && trends.data.length > 0 ? (
              <div>
                <Sparkline data={trends.data} />
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${trends.data.length}, 1fr)`, gap: '0.25rem', marginTop: '0.625rem' }}>
                  {trends.data.map((d, i) => (
                    <div key={`trend-${d.log_date}-${i}`} style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(d.performance_score || 0)}</p>
                      <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '1px' }}>{new Date(d.log_date).toLocaleDateString('en', { weekday: 'short' })}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No trend data yet. Submit your first Daily Log to start tracking.</p>
            )}
          </div>

          {/* 3. Protocol Tasks */}
          <div className="card" style={{ padding: '1.375rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Today’s Protocol</h3>
              <button className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '0.275rem 0.6rem' }} onClick={() => navigate('/log')}>Edit / Log</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              Add tasks for today in “Run Daily Log”, then submit the daily summary to compute your score.
            </p>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* 4. AI Performance Insights */}
          <div className="card" style={{ padding: '1.375rem' }}>
            <h3 style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.125rem' }}>AI Performance Insights</h3>
            {insightsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[90, 70, 80].map((w, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--panel-border)', marginTop: '6px', flexShrink: 0 }} />
                    <div style={{ height: '13px', background: 'var(--input-bg)', borderRadius: '4px', width: `${w}%`, animation: 'fadeIn 0.5s' }} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {insights.length > 0 ? insights.map((ins, i) => (
                  <div key={`insight-${i}`} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-primary)', marginTop: '7px', flexShrink: 0 }} />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{ins.title}:</span> {ins.body}
                    </p>
                  </div>
                )) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>Submit performance logs to generate analyst observations.</p>
                )}
              </div>
            )}
          </div>

          {/* 5. Consistency Heatmap */}
          <Heatmap logs={(days || []).map(d => ({
            log_date: d.date,
            task_done: (d.performance_score || 0) >= 70,
            focus_level: d.focus_level,
            mood: null,
            notes: d.notes,
          }))} />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
