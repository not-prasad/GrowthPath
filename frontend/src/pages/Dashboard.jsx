import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, Minus, ArrowRight, Zap, 
  FlaskConical, Calendar, LayoutDashboard, Brain, Activity, Sparkles 
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

  const TrendIcon = trends?.trend === 'up' ? TrendingUp : trends?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = trends?.trend === 'up' ? 'var(--success)' : trends?.trend === 'down' ? 'var(--danger)' : 'var(--text-muted)';
  const latestScore = days?.[0] ? Math.round(days[0].performance_score || 0) : null;
  const latestFocus = days?.[0] ? Number(days[0].focus_level || 0).toFixed(1) : null;
  
  const summarySentence = latestScore == null
    ? 'Start your performance baseline by logging today\'s data.'
    : latestScore >= 80
      ? 'Peak state detected. Your current rhythm is highly efficient.'
      : latestScore >= 65
        ? 'Steady performance. Minor adjustments could lead to peak output.'
        : 'Below baseline detected. Focus on friction reduction today.';

  const trendChartData = [...(trends?.data || [])].reverse();

  return (
    <DashboardLayout goal={goal}>
      <div className="premium-page">
        <header className="premium-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="premium-kicker">Performance Overview</p>
            <h1 className="premium-title">Dashboard</h1>
            <p className="premium-subtitle">{summarySentence}</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/log')}>
            <Zap size={16} /> Run Daily Log
          </button>
        </header>

        <div className="premium-grid-two" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)' }}>
          <section className="premium-section" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p className="premium-kicker">Latest Performance</p>
            <div className="premium-score-row" style={{ marginTop: '0.5rem' }}>
              <span className="premium-score-value">{latestScore ?? '—'}</span>
              <span className="premium-score-unit">/100</span>
              <div 
                className="premium-trend" 
                style={{ 
                  background: 'var(--bg-color)', 
                  padding: '0.5rem 0.75rem', 
                  borderRadius: '12px',
                  border: '1px solid var(--panel-border)',
                  color: trendColor,
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}
              >
                <TrendIcon size={16} /> {trends?.trend?.toUpperCase() || 'STABLE'}
              </div>
            </div>
            <p className="premium-muted" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={14} /> Tracking: <strong>{goal.title}</strong>
            </p>
          </section>

          <section className="premium-section">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="premium-metric">
                <p className="premium-metric-label">Execution Velocity</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <p className="premium-metric-value">{days.length}</p>
                   <span className="premium-muted" style={{ fontSize: '0.75rem' }}>Days</span>
                </div>
              </div>
              <div className="premium-metric">
                <p className="premium-metric-label">Cognitive Focus</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <p className="premium-metric-value">{latestFocus ?? '—'}</p>
                   <span className="premium-muted" style={{ fontSize: '0.75rem' }}>/ 5.0</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="premium-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="premium-section-title"><Activity size={20} className="text-secondary" /> Volume Trend (7D)</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
               <span className="badge badge-purple">High Frequency</span>
            </div>
          </div>
          {trendChartData.length > 0 ? (
            <div style={{ height: 180, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--panel-border)" />
                  <XAxis 
                    dataKey="log_date" 
                    tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en', { weekday: 'short' })}
                  />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    contentStyle={{ background: 'var(--panel-bg)', borderRadius: '12px', border: '1px solid var(--panel-border)', fontSize: '0.75rem' }}
                  />
                  <Area type="monotone" dataKey="performance_score" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="premium-empty" style={{ textAlign: 'center', padding: '2rem 0' }}>Log more days to initialize telemetry.</p>
          )}
        </section>

        <section className="premium-section">
          <h2 className="premium-section-title"><Sparkles size={20} className="text-secondary" /> Cognitive Briefing</h2>
          {insightsLoading ? (
            <p className="premium-empty">Decoding signals…</p>
          ) : insights.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {insights.slice(0, 3).map((ins, i) => (
                <div key={`insight-${i}`} style={{ padding: '1.25rem', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--panel-border)', borderLeft: '4px solid var(--accent-primary)' }}>
                   <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{ins.title}</p>
                   <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{ins.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="premium-empty">The AI is waiting for more behavioral density.</p>
          )}
        </section>

        <section className="premium-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="premium-section-title"><Calendar size={20} className="text-secondary" /> Habit Density</h2>
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => navigate('/history')}>View History</button>
          </div>
          <div style={{ padding: '1.5rem', background: 'var(--bg-color)', borderRadius: '20px', border: '1px solid var(--panel-border)', maxWidth: 'fit-content' }}>
            <Heatmap logs={heatmapLogs} />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
