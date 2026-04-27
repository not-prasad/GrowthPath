import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, Minus, ArrowRight, Zap, 
  Target, FlaskConical, Calendar, Brain, Activity, Sparkles,
  Flame, Clock
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import DashboardLayout from '../components/DashboardLayout';
import Heatmap from '../components/Heatmap';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

// ── colour palette for stat pills ─────────────────────────────
const PILL_COLORS = [
  { bg: 'linear-gradient(135deg, #6d3ef7 0%, #9b6dff 100%)', fg: '#fff', shadow: '0 8px 24px rgba(109,62,247,0.35)' },
  { bg: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)', fg: '#fff', shadow: '0 8px 24px rgba(14,165,233,0.3)' },
  { bg: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', fg: '#fff', shadow: '0 8px 24px rgba(16,185,129,0.3)' },
];

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

        if (trendsRes.ok) { const t = await safeJson(trendsRes); setTrends(t?.trends || null); }
        if (logsRes.ok) { const l = await safeJson(logsRes); setDays(l?.days || []); }

        setInsightsLoading(true);
        if (insightsRes.ok) {
          const ins = await safeJson(insightsRes);
          setInsights(ins?.insights || []);
        } else { setInsights([]); }
        setInsightsLoading(false);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally { setLoading(false); }
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

  if (loading) return (
    <DashboardLayout goal={goal}>
      <div className="premium-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Sparkles style={{ animation: 'spin 1.4s linear infinite' }} size={36} color="var(--accent-primary)" />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>Loading intelligence…</p>
        </div>
      </div>
    </DashboardLayout>
  );

  if (!goal) return (
    <DashboardLayout goal={null}>
      <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <FlaskConical size={40} color="var(--accent-primary)" style={{ marginBottom: '1.5rem' }} />
        <h1 className="premium-title">No active experiment</h1>
        <p className="premium-subtitle" style={{ margin: '0.5rem auto 2rem' }}>Define a goal to start your performance pipeline.</p>
        <button className="btn btn-primary" onClick={() => navigate('/setup')}>Initialize Goal <ArrowRight size={16} /></button>
      </div>
    </DashboardLayout>
  );

  // ── Derived values ─────────────────────────────────────────────
  const TrendIcon = trends?.trend === 'up' ? TrendingUp : trends?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = trends?.trend === 'up' ? '#34d399' : trends?.trend === 'down' ? '#f87171' : '#8878b0';
  const latestScore = days?.[0] ? Math.round(days[0].performance_score || 0) : null;
  const latestFocus = days?.[0] ? Number(days[0].focus_level || 0).toFixed(1) : null;
  const trendChartData = [...(trends?.data || [])].reverse();
  const weekAvg = trendChartData.length > 0
    ? Math.round(trendChartData.reduce((s, d) => s + (d.performance_score || 0), 0) / trendChartData.length)
    : null;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const scoreLabel = latestScore == null ? 'Log today to establish your baseline.'
    : latestScore >= 80 ? 'Peak state detected. Exceptional execution.'
    : latestScore >= 65 ? 'Solid trajectory. One more push.'
    : 'Below baseline. Reduce friction today.';

  const statPills = [
    { label: 'Days Logged', value: days.length, unit: 'sessions', icon: <Flame size={18} /> },
    { label: 'Cognitive Focus', value: latestFocus ?? '—', unit: '/ 5.0', icon: <Brain size={18} /> },
    { label: '7-Day Avg', value: weekAvg ?? '—', unit: 'pts', icon: <Activity size={18} /> },
  ];

  return (
    <DashboardLayout goal={goal}>
      <div className="premium-page">

        {/* ── Topbar ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.2rem' }}>
              {today}
            </p>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              Performance Overview
            </h1>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/log')} style={{ gap: '0.5rem', padding: '0.65rem 1.25rem' }}>
            <Zap size={16} /> Run Daily Log
          </button>
        </div>

        {/* ── Hero Row ─────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'stretch' }}>

          {/* Big dark score card — spans 2 columns */}
          <div style={{
            gridColumn: 'span 2',
            borderRadius: '20px',
            background: 'linear-gradient(145deg, #0e0921 0%, #180f3a 50%, #0b1022 100%)',
            padding: '2rem',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '200px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {/* Glow orb */}
            <div style={{
              position: 'absolute', top: '-40px', right: '-40px',
              width: '200px', height: '200px',
              background: 'radial-gradient(circle, rgba(109,62,247,0.4) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            {/* Second orb */}
            <div style={{
              position: 'absolute', bottom: '-30px', left: '30%',
              width: '150px', height: '150px',
              background: 'radial-gradient(circle, rgba(14,165,233,0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
                Latest Score
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 'clamp(3.5rem, 6vw, 5rem)',
                  fontWeight: 800,
                  lineHeight: 1,
                  color: '#ffffff',
                  letterSpacing: '-0.04em',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {latestScore ?? '—'}
                </span>
                <span style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>/100</span>
                <div style={{
                  marginLeft: 'auto',
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  background: `${trendColor}18`,
                  border: `1px solid ${trendColor}40`,
                  borderRadius: '8px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem', fontWeight: 800,
                  color: trendColor,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  <TrendIcon size={13} /> {trends?.trend || 'STABLE'}
                </div>
              </div>
            </div>

            <div style={{ position: 'relative', zIndex: 1, paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Tracking</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</p>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', textAlign: 'right', maxWidth: '160px', lineHeight: 1.4 }}>{scoreLabel}</p>
            </div>
          </div>

          {/* 3 colored stat pills */}
          {statPills.map(({ label, value, unit, icon }, i) => (
            <div key={label} style={{
              borderRadius: '20px',
              background: PILL_COLORS[i].bg,
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: PILL_COLORS[i].shadow,
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '-30px', right: '-30px',
                width: '120px', height: '120px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '50%',
              }} />
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                {icon}
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                  <span style={{ fontFamily: "'Sora', sans-serif", fontSize: '2.25rem', fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── AI Briefing ──────────────────────────────────────── */}
        <div style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          borderRadius: '20px',
          padding: '1.75rem',
          boxShadow: 'var(--card-shadow)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '32px', height: '32px', background: 'var(--accent-subtle)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={16} color="var(--accent-primary)" />
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>AI Briefing</h2>
            {insightsLoading && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Decoding signals…</span>}
          </div>
          {insightsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
              {[1,2,3].map(i => <div key={i} style={{ height: '72px', background: 'var(--panel-border)', borderRadius: '12px', opacity: 0.5 }} />)}
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
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>Log more days to unlock AI insights.</p>
          )}
        </div>

        {/* ── Bottom Row: Chart + Heatmap ───────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 0.6fr)', gap: '1rem', alignItems: 'start' }}>

          {/* Trend chart */}
          <div style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: '20px',
            padding: '1.75rem',
            boxShadow: 'var(--card-shadow)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', background: 'var(--accent-subtle)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={16} color="var(--accent-primary)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>Volume Trend</h2>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Performance score over 7 days</p>
                </div>
              </div>
              {weekAvg != null && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.1rem' }}>Week avg</p>
                  <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1 }}>{weekAvg}</p>
                </div>
              )}
            </div>
            {trendChartData.length > 0 ? (
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6d3ef7" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6d3ef7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--panel-border)" />
                    <XAxis dataKey="log_date" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} tickFormatter={v => new Date(v).toLocaleDateString('en', { weekday: 'short' })} />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '10px', fontSize: '0.75rem', boxShadow: 'var(--card-shadow)' }} formatter={v => [`${v}`, 'Score']} />
                    <Area type="monotone" dataKey="performance_score" stroke="#6d3ef7" strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ fill: '#6d3ef7', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#6d3ef7' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '3.5rem 0' }}>Log more days to see your trend.</p>
            )}
          </div>

          {/* Heatmap */}
          <div style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: '20px',
            padding: '1.75rem',
            boxShadow: 'var(--card-shadow)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', background: '#ede8ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={16} color="#6d3ef7" />
                </div>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Habit Density</h2>
              </div>
              <button className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '0.3rem 0.7rem', borderRadius: '8px' }} onClick={() => navigate('/history')}>
                History
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <Heatmap logs={heatmapLogs} />
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
