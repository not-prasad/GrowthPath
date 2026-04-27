import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, Minus, ArrowRight, Zap, 
  Target, FlaskConical, Calendar, Brain, Activity, Sparkles 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import DashboardLayout from '../components/DashboardLayout';
import Heatmap from '../components/Heatmap';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

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
          setInsights(ins?.insights || []);
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

  const heatmapLogs = useMemo(() => (
    (days || []).map(d => ({
      log_date: d.date,
      task_done: (d.performance_score || 0) >= 70,
      focus_level: d.focus_level,
      mood: null,
      notes: d.notes,
    }))
  ), [days]);

  if (loading) {
    return (
      <DashboardLayout goal={goal}>
        <div className="premium-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Sparkles className="spin" size={40} color="var(--accent-primary)" />
          <p className="premium-muted">Initializing dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!goal && !loading) {
    return (
      <DashboardLayout goal={null}>
        <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <FlaskConical size={40} color="var(--accent-primary)" style={{ marginBottom: '1.5rem' }} />
          <h1 className="premium-title">No active experiment</h1>
          <p className="premium-subtitle" style={{ margin: '0 auto 2rem' }}>
            Define a goal to initialize your performance data pipeline.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/setup')}>
            Initialize Goal <ArrowRight size={16} />
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // ── Derived state ──────────────────────────────────────────────
  const TrendIcon = trends?.trend === 'up' ? TrendingUp : trends?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = trends?.trend === 'up' ? '#10b981' : trends?.trend === 'down' ? '#ef4444' : '#a89ec0';
  const latestScore = days?.[0] ? Math.round(days[0].performance_score || 0) : null;
  const latestFocus = days?.[0] ? Number(days[0].focus_level || 0).toFixed(1) : null;
  const trendChartData = [...(trends?.data || [])].reverse();

  const weekAvg = trendChartData.length > 0
    ? Math.round(trendChartData.reduce((s, d) => s + (d.performance_score || 0), 0) / trendChartData.length)
    : null;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const scoreLabel = latestScore == null
    ? 'No data yet — log today to start.'
    : latestScore >= 80 ? 'Peak state. Keep the rhythm.'
    : latestScore >= 65 ? 'Steady. One push could unlock peak.'
    : 'Below baseline. Reduce friction today.';

  // ── Render ─────────────────────────────────────────────────────
  return (
    <DashboardLayout goal={goal}>
      <div className="premium-page">

        {/* ── Top bar ── */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="premium-kicker">{today}</p>
            <h1 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2rem)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '0.2rem' }}>
              Performance Overview
            </h1>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/log')} style={{ marginTop: '0.25rem' }}>
            <Zap size={16} /> Run Daily Log
          </button>
        </header>

        {/* ── Hero row: score card + 3 stat pills ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '1rem' }}>

          {/* Big dark score card */}
          <div className="card card-hero" style={{ padding: '2rem 2.5rem', borderRadius: '20px', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <p className="stat-label">Latest Score</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span className="stat-number">{latestScore ?? '—'}</span>
                <span style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>/100</span>
                <div style={{
                  marginLeft: 'auto',
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: trendColor,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  <TrendIcon size={14} /> {trends?.trend || 'STABLE'}
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Tracking
              </p>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                {goal.title}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>{scoreLabel}</p>
            </div>
          </div>

          {/* 3 stat pills stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Days Logged', value: days.length, unit: 'sessions', icon: <Calendar size={16} /> },
              { label: 'Cognitive Focus', value: latestFocus ?? '—', unit: '/ 5.0', icon: <Brain size={16} /> },
              { label: '7-Day Average', value: weekAvg ?? '—', unit: 'pts', icon: <Activity size={16} /> },
            ].map(({ label, value, unit, icon }) => (
              <div key={label} className="card" style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: '14px',
                padding: '0.875rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flex: 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI Briefing — promoted above chart ── */}
        <section className="premium-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <Sparkles size={18} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>AI Briefing</h2>
            {insightsLoading && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Decoding…</span>}
          </div>
          {insightsLoading ? (
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ flex: 1, height: '80px', background: 'var(--panel-border)', borderRadius: '12px', opacity: 0.4 }} />
              ))}
            </div>
          ) : insights.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.875rem' }}>
              {insights.slice(0, 3).map((ins, i) => (
                <div key={`insight-${i}`} style={{
                  padding: '1.125rem 1.25rem',
                  background: 'var(--bg-color)',
                  borderRadius: '14px',
                  border: '1px solid var(--panel-border)',
                  borderLeft: '3px solid var(--accent-primary)',
                }}>
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{ins.title}</p>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{ins.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="premium-empty">Log more days to unlock AI insights.</p>
          )}
        </section>

        {/* ── Bottom row: trend chart + heatmap ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.7fr)', gap: '1rem', alignItems: 'start' }}>

          {/* Trend chart */}
          <section className="premium-section" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Activity size={18} color="var(--accent-primary)" />
                <h2 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Volume Trend</h2>
              </div>
              <span style={{
                fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em',
                background: 'var(--accent-subtle)', color: 'var(--accent-primary)',
                padding: '0.25rem 0.7rem', borderRadius: '999px', textTransform: 'uppercase',
                border: '1px solid var(--accent-border)'
              }}>7 Days</span>
            </div>
            {trendChartData.length > 0 ? (
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--panel-border)" />
                    <XAxis
                      dataKey="log_date"
                      tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => new Date(v).toLocaleDateString('en', { weekday: 'short' })}
                    />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--panel-border)',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        boxShadow: 'var(--card-shadow)'
                      }}
                      formatter={v => [`${v}`, 'Score']}
                    />
                    <Area
                      type="monotone"
                      dataKey="performance_score"
                      stroke="var(--accent-primary)"
                      strokeWidth={2.5}
                      fill="url(#scoreGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="premium-empty" style={{ textAlign: 'center', padding: '3rem 0' }}>Log more days to see your trend.</p>
            )}
          </section>

          {/* Heatmap */}
          <section className="premium-section" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Calendar size={18} color="var(--accent-primary)" />
                <h2 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Habit Density</h2>
              </div>
              <button
                className="btn btn-outline"
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.65rem', borderRadius: '8px' }}
                onClick={() => navigate('/history')}
              >
                History
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <Heatmap logs={heatmapLogs} />
            </div>
          </section>
        </div>

      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
