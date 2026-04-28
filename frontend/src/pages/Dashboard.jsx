import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, Minus, ArrowRight, Zap, 
  Target, FlaskConical, Calendar, Brain, Activity, Sparkles,
  Flame, Clock, CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

function Dashboard() {
  const [goal, setGoal] = useState(null);
  const [trends, setTrends] = useState(null);
  const [days, setDays] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);

  const { token, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  // Stable data fetch to prevent loops
  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = authHeaders(token);
        let goalId = localStorage.getItem('growthpath_goal_id');
        
        // 1. Fetch Goals & Profile Sync (Parallel)
        const [goalsRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/goals`, { headers }),
          fetch(`${API_BASE}/auth/me`, { headers })
        ]);

        if (goalsRes.status === 401) { logout(); navigate('/login'); return; }
        
        // Sync User Profile (Level/XP) on load
        if (profileRes.ok) {
          const uData = await safeJson(profileRes);
          if (uData?.user) {
            // Only update if data is actually different to avoid render loops
            updateUser(uData.user);
          }
        }

        const goalsPayload = await safeJson(goalsRes);
        const goals = goalsPayload?.goals || [];
        const active = goalsPayload?.active_goal_id;

        // Smart Sync: Verify if stored ID is valid, otherwise pick a new one
        let currentGoal = goals.find(g => String(g.id) === String(goalId));
        if (!currentGoal) {
            currentGoal = goals.find(g => String(g.id) === String(active)) || goals[0];
            if (currentGoal) {
                goalId = String(currentGoal.id);
                localStorage.setItem('growthpath_goal_id', goalId);
            }
        }

        if (!currentGoal) {
          setLoading(false);
          navigate('/setup');
          return;
        }
        setGoal(currentGoal);

        // 2. Fetch Dashboard Core Data (Fast stuff)
        const [trendsRes, logsRes] = await Promise.all([
          fetch(`${API_BASE}/performance/trends?goal_id=${currentGoal.id}&days=7`, { headers }),
          fetch(`${API_BASE}/logs?goal_id=${currentGoal.id}&limit=60`, { headers }),
        ]);

        if (trendsRes.ok) { const t = await safeJson(trendsRes); setTrends(t?.trends || null); }
        if (logsRes.ok) { const l = await safeJson(logsRes); setDays(l?.days || []); }
        
        setLoading(false); // Show the UI as soon as we have core stats

        // 3. Fetch Heavy AI Insights (Delayed background load)
        setInsightsLoading(true);
        try {
          const insightsRes = await fetch(`${API_BASE}/ai/insights?goal_id=${currentGoal.id}`, { headers });
          if (insightsRes.ok) {
            const ins = await safeJson(insightsRes);
            setInsights(ins?.insights || []);
          } else { setInsights([]); }
        } catch (e) {
          console.warn("AI Insights failed to load", e);
        } finally {
          setInsightsLoading(false);
        }

      } catch (err) {
        console.error('Dashboard load error:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate, logout, updateUser]);
  
  const handleToggleTask = async (taskId) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}/toggle`, {
        method: 'PUT',
        headers: authHeaders(token)
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data.total_xp !== undefined) {
          updateUser({ total_xp: data.total_xp, level: data.level });
        }
        // Force a partial refresh of the day's data
        const logsRes = await fetch(`${API_BASE}/logs?goal_id=${goal.id}&limit=60`, { headers: authHeaders(token) });
        if (logsRes.ok) {
          const l = await safeJson(logsRes);
          setDays(l?.days || []);
        }
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const trendChartData = useMemo(() => [...(trends?.data || [])].reverse(), [trends]);

  const streak = useMemo(() => {
    if (!days || days.length === 0) return 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    let count = 0;
    let cursor = new Date(todayStr);
    const dateSet = new Set(days.map(d => d.date?.slice(0, 10)));
    while (dateSet.has(cursor.toISOString().slice(0, 10))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [days]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayData = days.find(d => d.date?.startsWith(todayStr));
  const loggedToday = !!todayData;
  const todayTasks = todayData?.tasks || [];
  const uncompletedTasks = todayTasks.filter(t => !t.is_completed);
  const dashboardTasks = uncompletedTasks.slice(0, 3);

  if (loading) return (
    <DashboardLayout goal={goal}>
      <div className="premium-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Sparkles style={{ animation: 'spin 1.4s linear infinite' }} size={36} color="var(--accent-primary)" />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>Syncing Intelligence…</p>
        </div>
      </div>
    </DashboardLayout>
  );

  const TrendIcon = trends?.trend === 'up' ? TrendingUp : trends?.trend === 'down' ? TrendingDown : Minus;
  const weekAvg = trendChartData.length > 0
    ? Math.round(trendChartData.reduce((s, d) => s + (d.performance_score || 0), 0) / trendChartData.length)
    : null;
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const statPills = [
    { label: 'Days Logged', value: days.length, unit: 'sessions', icon: <Flame size={18} />, color: 'var(--accent-primary)' },
    { label: 'Focus Level', value: (days?.[0]?.focus_level || 0).toFixed(1), unit: '/ 5.0', icon: <Brain size={18} />, color: '#0ea5e9' },
    { label: '7-Day Avg', value: weekAvg ?? '—', unit: 'pts', icon: <Activity size={18} />, color: '#10b981' },
    { label: 'Current Streak', value: streak, unit: streak === 1 ? 'day' : 'days', icon: <Zap size={18} />, color: '#f59e0b' },
  ];

  return (
    <DashboardLayout goal={goal} overlayClass="bg-dashboard">
      <div className="premium-page fade-in">
        {!loggedToday && (
          <div className="glass-card" style={{ 
            padding: '1.25rem 2rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            border: '1px solid var(--accent-border)', marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '44px', height: '44px', background: 'var(--accent-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                <Clock size={22} />
              </div>
              <div>
                <p style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>Daily log needed</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Please log your progress for today to keep your streak alive.</p>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/log')}>Log Today's Progress</button>
          </div>
        )}

        <div className="premium-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
          <div>
            <div className="premium-kicker">Performance Lab</div>
            <h1 className="premium-title" style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>{goal?.title}</h1>
            <p className="premium-subtitle" style={{ marginTop: '0.4rem', fontWeight: 500, opacity: 0.7 }}>{todayLabel}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-purple" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', borderRadius: '10px' }}>{goal?.category}</span>
          </div>
        </div>

        <div className="premium-metric-row" style={{ marginBottom: '2rem' }}>
          {statPills.map((pill, idx) => (
            <div key={idx} className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ 
                  width: '40px', height: '40px', background: 'rgba(99, 102, 241, 0.05)', 
                  borderRadius: '12px', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', color: pill.color, border: `1px solid ${pill.color}22`
                }}>
                  {pill.icon}
                </div>
                <TrendIcon size={16} color={pill.color} />
              </div>
              <div>
                <p className="premium-mini-title" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{pill.label}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{pill.value}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>{pill.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="premium-section" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--accent-subtle)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={20} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 className="premium-section-title" style={{ fontSize: '1.125rem' }}>AI Insights</h2>
              <p className="premium-muted">Helpful insights from your recent progress.</p>
            </div>
            {insightsLoading && <span className="premium-muted" style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.75rem' }}>Analyzing data...</span>}
          </div>
          {insightsLoading ? (
            <div className="premium-grid-two">
              {[1,2].map(i => <div key={i} className="insight-skeleton" style={{ height: '90px', borderRadius: '16px' }} />)}
            </div>
          ) : insights.length > 0 ? (
            <div className="premium-grid-two">
              {insights.slice(0, 2).map((ins, i) => (
                <div key={`insight-${i}`} className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
                  <p className="premium-kicker" style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>{ins.title}</p>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 450 }}>{ins.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="premium-muted" style={{ textAlign: 'center', padding: '2rem 0' }}>Establish a 3-day baseline to unlock deep insights.</p>
          )}
        </div>

        <div className="premium-grid-two" style={{ alignItems: 'start' }}>
          <div className="premium-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', background: 'var(--accent-subtle)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Target size={20} color="var(--accent-primary)" />
                </div>
                <div>
                  <h2 className="premium-section-title" style={{ fontSize: '1.125rem' }}>Top Objectives</h2>
                  <p className="premium-muted">Your active focus tasks.</p>
                </div>
              </div>
              <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px' }} onClick={() => navigate('/tasks')}>View All</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {dashboardTasks.length > 0 ? (
                dashboardTasks.map(task => (
                  <div key={task.id} 
                    onClick={() => handleToggleTask(task.id)}
                    className="premium-card-hover"
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                      background: task.is_completed ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-color)', 
                      borderRadius: '12px', border: '1px solid var(--panel-border)',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ 
                      width: '20px', height: '20px', borderRadius: '6px', 
                      border: `2px solid ${task.is_completed ? 'var(--success)' : 'var(--panel-border)'}`,
                      background: task.is_completed ? 'var(--success)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                    }}>
                      {task.is_completed && <CheckCircle2 size={14} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        fontSize: '0.9rem', fontWeight: 600, 
                        color: task.is_completed ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: task.is_completed ? 'line-through' : 'none'
                      }}>
                        {task.title}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--panel-border)', borderRadius: '16px' }}>
                  <CheckCircle2 size={32} color="var(--success)" style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p className="premium-muted">Queue cleared for today.</p>
                </div>
              )}
            </div>
          </div>

          <div className="premium-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '40px', height: '40px', background: 'var(--accent-subtle)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={20} color="var(--accent-primary)" />
              </div>
              <h2 className="premium-section-title" style={{ fontSize: '1.125rem' }}>Score Curve</h2>
            </div>
            <div style={{ height: 220, minWidth: 0 }}>
              {trendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--panel-border)" />
                    <XAxis dataKey="log_date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(8)} />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="performance_score" stroke="var(--accent-primary)" strokeWidth={3} fill="url(#scoreGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  No data to plot...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
