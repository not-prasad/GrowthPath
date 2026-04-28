import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, Zap, Calendar, Target,
  Activity, Flame, Brain, Sparkles, ArrowRight, CheckCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

function WeeklyReview() {
  const [goal, setGoal] = useState(null);
  const [days, setDays] = useState([]);
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = authHeaders(token);
        const goalsRes = await fetch(`${API_BASE}/goals`, { headers });
        if (goalsRes.status === 401) { logout(); navigate('/login'); return; }
        const goalsPayload = await safeJson(goalsRes);
        const goals = goalsPayload?.goals || [];
        const active = goalsPayload?.active_goal_id;
        const stored = localStorage.getItem('growthpath_goal_id');
        const selected = goals.find(g => String(g.id) === String(stored))
          || goals.find(g => String(g.id) === String(active))
          || goals[0] || null;
        if (!selected) { navigate('/setup'); return; }
        setGoal(selected);

        // Fetch last 7 days
        const to = new Date().toISOString().slice(0, 10);
        const from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
        const [logsRes, insightRes] = await Promise.all([
          fetch(`${API_BASE}/logs?goal_id=${selected.id}&from=${from}&to=${to}&limit=7`, { headers }),
          fetch(`${API_BASE}/ai/insights?goal_id=${selected.id}`, { headers }),
        ]);

        if (logsRes.ok) setDays((await safeJson(logsRes))?.days || []);
        if (insightRes.ok) setInsight((await safeJson(insightRes))?.insights?.[0] || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, navigate, logout]);

  const stats = useMemo(() => {
    if (!days.length) return null;
    const scores = days.map(d => d.performance_score || 0);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const totalXp = days.reduce((a, d) => a + (d.xp_gained || 0), 0);
    const avgFocus = (days.reduce((a, d) => a + (d.focus_level || 0), 0) / days.length).toFixed(1);
    
    // Find best day name
    let bestScore = -1;
    let bestDayStr = 'N/A';
    days.forEach(d => {
      const s = d.performance_score || 0;
      if (s > bestScore) {
        bestScore = s;
        bestDayStr = new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' });
      }
    });

    const daysLogged = days.length;
    const daysHit = days.filter(d => (d.performance_score || 0) >= 70).length;
    return { avg, totalXp, avgFocus, best: bestDayStr, daysLogged, daysHit };
  }, [days]);

  const chartData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const log = days.find(l => l.date?.startsWith(dateStr));
      return {
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        score: log ? Math.round(log.performance_score || 0) : 0,
        logged: !!log,
      };
    });
  }, [days]);

  const trend = stats
    ? stats.avg >= 70 ? 'up' : stats.avg >= 45 ? 'stable' : 'down'
    : null;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#34d399' : trend === 'down' ? '#f87171' : '#8878b0';

  if (loading) return (
    <DashboardLayout goal={goal} overlayClass="bg-weekly">
      <div className="premium-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Sparkles style={{ animation: 'spin 1.4s linear infinite' }} size={36} color="var(--accent-primary)" />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '1rem' }}>Compiling weekly signals…</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout goal={goal} overlayClass="bg-weekly">
      <div className="premium-page">

        {/* Header */}
        <header className="premium-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="premium-kicker">Weekly Progress</p>
            <h1 className="premium-title">Weekly Review</h1>
            <p className="premium-subtitle">
              {new Date(Date.now() - 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/log')} style={{ gap: '0.5rem' }}>
            <Zap size={16} /> Log Today
          </button>
        </header>

        {/* Stat Grid */}
        {stats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Days Logged', value: `${stats.daysLogged}/7`, icon: <Calendar size={18} />, color: '#6d3ef7' },
              { label: 'Avg Score', value: stats.avg, icon: <Activity size={18} />, color: '#0ea5e9' },
              { label: 'Goals Hit', value: `${stats.daysHit} days`, icon: <CheckCircle size={18} />, color: '#10b981' },
              { label: 'Best Day', value: stats.best, icon: <Target size={18} />, color: '#f59e0b' },
              { label: 'Avg Focus', value: `${stats.avgFocus}/5`, icon: <Brain size={18} />, color: '#a855f7' },
              { label: 'XP Earned', value: `+${stats.totalXp}`, icon: <Flame size={18} />, color: '#ef4444' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} style={{
                background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
                borderRadius: '16px', padding: '1.25rem',
                borderTop: `3px solid ${color}`,
                boxShadow: 'var(--card-shadow)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color }}>
                  {icon}
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{label}</p>
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="premium-section" style={{ textAlign: 'center', padding: '3rem' }}>
            <Calendar size={40} style={{ opacity: 0.15, marginBottom: '1rem' }} />
            <p className="premium-muted">No data logged this week yet. Start your first log to see your review.</p>
            <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/log')}>
              Run Daily Log <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Bar Chart */}
        {days.length > 0 && (
          <div className="premium-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="premium-section-title" style={{ margin: 0 }}>
                <Activity size={20} className="text-secondary" /> Daily Scores
              </h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', background: `${trendColor}15`, border: `1px solid ${trendColor}30`, borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, color: trendColor }}>
                <TrendIcon size={13} /> {trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}
              </div>
            </div>
            <div style={{ height: 200, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--panel-border)" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '10px', fontSize: '0.75rem' }}
                    formatter={v => [v > 0 ? `${v} pts` : 'Not logged', 'Score']}
                  />
                  <Bar dataKey="score" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* AI Insight */}
        {insight && (
          <div style={{
            background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
            borderLeft: '3px solid var(--accent-primary)',
            borderRadius: '16px', padding: '1.5rem',
            boxShadow: 'var(--card-shadow)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Sparkles size={16} color="var(--accent-primary)" />
              <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-primary)' }}>
                AI Weekly Insight — {insight.title}
              </p>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{insight.body}</p>
          </div>
        )}

        {/* Next Week CTA */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0e0921 0%, #180f3a 50%, #0b1022 100%)',
          borderRadius: '20px', padding: '1.75rem 2rem',
          boxShadow: '0 8px 32px rgba(109,62,247,0.2)',
        }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Next Steps</p>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff' }}>Keep the momentum going →</h3>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>Review your full performance history and patterns in Analysis.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/analysis')} style={{ whiteSpace: 'nowrap' }}>
            Open Analysis <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </DashboardLayout>
  );
}

export default WeeklyReview;
