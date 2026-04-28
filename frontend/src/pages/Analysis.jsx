import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, Legend, Cell, PieChart, Pie,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, Target, Flame, 
  Brain, Activity, Sparkles, Zap, Info, ChevronRight,
  Filter, Calendar, Download, RefreshCw
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

function Analysis() {
  const [goal, setGoal] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [brief, setBrief] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const h = authHeaders(token);
        const stored = localStorage.getItem('growthpath_goal_id');

        // 1. Resolve Goal First
        const goalsRes = await fetch(`${API_BASE}/goals`, { headers: h });
        if (goalsRes.status === 401) { logout(); navigate('/login'); return; }
        
        const goalsPayload = await safeJson(goalsRes);
        const goals = goalsPayload?.goals || [];
        const active = goalsPayload?.active_goal_id;

        // Smart Sync logic
        let currentGoal = goals.find(g => String(g.id) === String(stored));
        if (!currentGoal) {
            currentGoal = goals.find(g => String(g.id) === String(active)) || goals[0];
            if (currentGoal) {
                localStorage.setItem('growthpath_goal_id', String(currentGoal.id));
            }
        }

        if (!currentGoal) { navigate('/setup'); return; }
        setGoal(currentGoal);

        const goalId = currentGoal.id;
        
        // 2. Perform Bulk Analysis Fetch (High Performance)
        const [summaryRes, briefRes, logsRes] = await Promise.all([
          fetch(`${API_BASE}/analytics/summary?goal_id=${goalId}`, { headers: h }),
          fetch(`${API_BASE}/ai/brief?goal_id=${goalId}`, { headers: h }),
          fetch(`${API_BASE}/logs?goal_id=${goalId}&limit=90`, { headers: h })
        ]);

        if (summaryRes.ok) setAnalysis(await safeJson(summaryRes));
        if (briefRes.ok) setBrief(await safeJson(briefRes));
        if (logsRes.ok) {
          const lData = await safeJson(logsRes);
          setLogs(lData?.days || []);
        }

      } catch (err) {
        console.error("Analysis Load Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [token, navigate, logout]);

  // UI rendering remains the same...
  if (loading) return (
    <DashboardLayout goal={goal} overlayClass="bg-analysis">
      <div className="premium-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <RefreshCw className="spin" size={40} color="var(--accent-primary)" />
        <p className="premium-muted">Synthesizing benchmark data...</p>
      </div>
    </DashboardLayout>
  );

  const stats = analysis || {};
  const historyData = [...(stats.history || [])].reverse();
  const frictionData = stats.friction_map || [];
  
  return (
    <DashboardLayout goal={goal} overlayClass="bg-analysis">
      <div className="premium-page fade-in">
        <header className="premium-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="premium-kicker">Performance Lab</p>
            <h1 className="premium-title">Visual Intelligence</h1>
            <p className="premium-subtitle">Advanced analytics and behavioral pattern mapping.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Download size={16} /> Export JSON
            </button>
          </div>
        </header>

        {/* Top Insights Brief */}
        {brief && (
          <section className="premium-section" style={{ 
            background: 'var(--header-gradient)', border: 'none', 
            borderRadius: '24px', padding: '2rem', color: '#fff',
            marginBottom: '2rem', boxShadow: '0 10px 30px rgba(99, 102, 241, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Sparkles size={20} />
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.05em', color: '#fff' }}>SYSTEM ANALYST BRIEF</h3>
            </div>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.6, opacity: 0.95, fontWeight: 450, color: '#fff' }}>{brief.brief}</p>
          </section>
        )}

        <div className="premium-grid-two">
          {/* Main Score History Chart */}
          <section className="premium-section">
            <h3 className="premium-mini-title">Score History</h3>
            <div style={{ height: 300, marginTop: '1.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--panel-border)" />
                  <XAxis dataKey="date" tick={{fill: 'var(--text-muted)', fontSize: 10}} tickFormatter={v => v.slice(8)} />
                  <YAxis domain={[0, 100]} tick={{fill: 'var(--text-muted)', fontSize: 10}} />
                  <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="score" stroke="var(--accent-primary)" strokeWidth={3} fill="url(#scoreColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Friction vs Score Correlation */}
          <section className="premium-section">
            <h3 className="premium-mini-title">Friction vs Focus Correlation</h3>
            <div style={{ height: 300, marginTop: '1.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
                  <XAxis type="number" dataKey="friction" name="Friction" unit="pts" tick={{fill: 'var(--text-muted)'}} label={{ value: 'Friction Count', position: 'bottom', fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis type="number" dataKey="score" name="Performance" unit="%" tick={{fill: 'var(--text-muted)'}} label={{ value: 'Score %', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10 }} />
                  <ZAxis type="number" dataKey="focus" range={[50, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px' }} />
                  <Scatter name="Days" data={frictionData} fill="var(--secondary)" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Bottom Consistency Ledger */}
        <section className="premium-section" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="premium-mini-title">Consistency Ledger</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
               <div className="badge badge-purple">90 DAY ARCHIVE</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
             {logs.slice(0, 12).map((log, i) => (
               <div key={i} className="glass-card" style={{ padding: '1rem', borderLeft: `3px solid ${log.performance_score >= 80 ? 'var(--success)' : log.performance_score >= 50 ? 'var(--secondary)' : 'var(--danger)'}` }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{log.date}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.5rem' }}>
                     <span style={{ fontWeight: 900, fontSize: '1.2rem' }}>{Math.round(log.performance_score)}%</span>
                     <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{log.focus_level} FOC</span>
                  </div>
               </div>
             ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default Analysis;
