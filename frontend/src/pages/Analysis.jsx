import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, ScatterChart, Scatter, Area, AreaChart
} from 'recharts';
import { 
  ChevronDown, ChevronRight, TrendingUp, BarChart3, Activity, 
  Target, Calendar, Sparkles, AlertCircle, Info, Beaker
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import Heatmap from '../components/Heatmap';
import { API_BASE, authHeaders, safeJson } from '../api/base';

function Analysis() {
  const [goal, setGoal] = useState(null);
  const [days, setDays] = useState([]);
  const [line, setLine] = useState(null);
  const [boxplot, setBoxplot] = useState(null);
  const [categoryBar, setCategoryBar] = useState(null);
  const [weekday, setWeekday] = useState(null);
  const [scatterFocus, setScatterFocus] = useState(null);
  const [scatterFriction, setScatterFriction] = useState(null);
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
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

        const goalId = selected.id;
        const [daysRes, lineRes, boxRes, catRes, wdRes, sfRes, sfiRes, briefRes] = await Promise.all([
          fetch(`${API_BASE}/logs?goal_id=${goalId}&limit=365`, { headers }),
          fetch(`${API_BASE}/analytics/line?goal_id=${goalId}`, { headers }),
          fetch(`${API_BASE}/analytics/boxplot?goal_id=${goalId}`, { headers }),
          fetch(`${API_BASE}/analytics/category-completion?goal_id=${goalId}`, { headers }),
          fetch(`${API_BASE}/analytics/weekday?goal_id=${goalId}`, { headers }),
          fetch(`${API_BASE}/analytics/scatter/focus?goal_id=${goalId}`, { headers }),
          fetch(`${API_BASE}/analytics/scatter/friction?goal_id=${goalId}`, { headers }),
          fetch(`${API_BASE}/ai/brief?goal_id=${goalId}`, { headers }),
        ]);

        setDays((await safeJson(daysRes))?.days || []);
        setLine((await safeJson(lineRes))?.line || null);
        setBoxplot((await safeJson(boxRes))?.boxplot || null);
        setCategoryBar((await safeJson(catRes))?.bar || null);
        setWeekday((await safeJson(wdRes))?.weekday || null);
        setScatterFocus((await safeJson(sfRes))?.scatter || null);
        setScatterFriction((await safeJson(sfiRes))?.scatter || null);
        setBrief((await safeJson(briefRes))?.brief || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
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

  const averageScore = Number(line?.stats?.avg_last_7_days || 0).toFixed(1);
  const trendDirection = line?.stats?.delta > 1 ? 'Up' : line?.stats?.delta < -1 ? 'Down' : 'Stable';

  if (loading) {
    return (
      <DashboardLayout goal={goal}>
        <div className="premium-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Sparkles className="spin" size={40} color="var(--accent-primary)" />
          <p className="premium-muted">Synthesizing patterns...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout goal={goal}>
      <div className="premium-page">
        <header className="premium-header">
          <p className="premium-kicker">Deep Pattern Analytics</p>
          <h1 className="premium-title">What the data says.</h1>
          <p className="premium-subtitle">
            {line?.interpretation || 'Synthesizing your performance architecture based on recent entries.'}
          </p>
        </header>

        <section className="premium-section">
          <div className="premium-metric-row">
            <div className="premium-metric">
              <p className="premium-metric-label">Efficiency Index</p>
              <p className="premium-metric-value">{averageScore}</p>
            </div>
            <div className="premium-metric">
              <p className="premium-metric-label">Momentum</p>
              <p className="premium-metric-value" style={{ color: trendDirection === 'Up' ? 'var(--success)' : trendDirection === 'Down' ? 'var(--danger)' : 'var(--text-primary)' }}>
                {trendDirection}
              </p>
            </div>
            <div className="premium-metric">
              <p className="premium-metric-label">Data Points</p>
              <p className="premium-metric-value">{days.length}</p>
            </div>
          </div>
        </section>

        <section className="premium-section">
          <h2 className="premium-section-title"><TrendingUp size={20} className="text-secondary" /> Performance Architecture</h2>
          {line?.data?.data?.length > 0 ? (
            <div style={{ height: 320, width: '100%', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={line.data.data} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--panel-border)" />
                  <XAxis dataKey="x" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v?.slice(5)} dy={10} />
                  <YAxis domain={[40, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} dx={-5} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--panel-bg)', borderRadius: '12px', border: '1px solid var(--panel-border)', boxShadow: 'var(--card-shadow)', fontSize: '0.8rem' }}
                    itemStyle={{ color: 'var(--accent-primary)', fontWeight: 700 }}
                  />
                  <Area type="monotone" dataKey="y" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorY)" activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="premium-empty" style={{ textAlign: 'center', padding: '3rem 0' }}>
              <AlertCircle size={32} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>Log more days to unlock the trend engine.</p>
            </div>
          )}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
             <div style={{ padding: '0.5rem', background: 'var(--accent-subtle)', borderRadius: '8px', color: 'var(--accent-primary)' }}>
               <Sparkles size={16} />
             </div>
             <p className="premium-muted" style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>{line?.interpretation || 'Log more days to unlock this insight.'}</p>
          </div>
        </section>

        <div className="premium-grid-two">
          <section className="premium-section">
            <h2 className="premium-section-title"><BarChart3 size={20} className="text-secondary" /> Volume Completion</h2>
            {categoryBar?.data?.data?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryBar.data.data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--panel-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} dy={5} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'var(--accent-subtle)', opacity: 0.4}} contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 12, fontSize: '0.75rem' }} />
                  <Bar dataKey="completed" fill="var(--success)" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="total" fill="var(--panel-border)" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="premium-empty">Awaiting categorical data...</p>
            )}
            <p className="premium-muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>{categoryBar?.interpretation || 'Log more days to unlock this insight.'}</p>
          </section>

          <section className="premium-section">
             <h2 className="premium-section-title"><Sparkles size={20} className="text-secondary" /> AI Analyst Brief</h2>
             {brief ? (
               <div className="premium-insight-list">
                 <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                    <p className="premium-insight-item" style={{ fontSize: '0.85rem' }}><span>Analyst Verdict:</span> {brief.daily_analyst_brief}</p>
                 </div>
                 <div style={{ padding: '1rem', background: 'var(--accent-subtle)', borderRadius: '12px', border: '1px solid var(--accent-border)' }}>
                    <p className="premium-insight-item" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}><span>Root Cause:</span> {brief.root_cause_dip_detection}</p>
                 </div>
                 <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                    <p className="premium-insight-item" style={{ fontSize: '0.85rem' }}><span>The Macro view:</span> {brief.weekly_retro}</p>
                 </div>
               </div>
             ) : (
               <p className="premium-empty">AI analyst is still observing your flow.</p>
             )}
          </section>
        </div>

        <section className="premium-section" style={{ padding: 0, border: 'none', background: 'transparent', boxShadow: 'none' }}>
          <button className="premium-accordion-trigger" onClick={() => setAdvancedOpen((s) => !s)}>
            <span>{advancedOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />} Advanced Laboratory Analysis</span>
            <span className="premium-muted" style={{ fontWeight: 600 }}>{advancedMode ? 'Extended mode active' : 'View raw signals'}</span>
          </button>
          
          {advancedOpen && (
            <div className="fade-in" style={{ marginTop: '1.5rem', display: 'grid', gap: '2rem' }}>
              <div className="premium-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Activity size={18} color="var(--accent-primary)" />
                      <h2 className="premium-mini-title" style={{ margin: 0 }}>Scientific Baseline</h2>
                   </div>
                   <label style={{ display: 'inline-flex', gap: '0.6rem', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input type="checkbox" checked={advancedMode} onChange={(e) => setAdvancedMode(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} />
                    Show Raw telemetry
                  </label>
                </div>

                <div className="premium-grid-two" style={{ gap: '2rem' }}>
                  <div>
                    <h3 className="premium-mini-title"><Calendar size={16} /> Weekday distribution</h3>
                    {weekday?.data?.data?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={weekday.data.data}>
                          <CartesianGrid vertical={false} stroke="var(--panel-border)" strokeDasharray="3 3" />
                          <XAxis dataKey="weekday" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 8, fontSize: '0.75rem' }} />
                          <Bar dataKey="avg_score" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="premium-empty">No weekly patterns detected.</p>}
                  </div>

                  <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
                    <h3 className="premium-mini-title"><Target size={16} /> Signal Consistency</h3>
                    <p className="premium-muted" style={{ lineHeight: 1.6 }}>{boxplot?.interpretation || 'Collecting more data samples for high-confidence consistency check.'}</p>
                    {advancedMode && boxplot?.data && (
                      <pre className="premium-pre">{JSON.stringify(boxplot?.stats || boxplot?.data || {}, null, 2)}</pre>
                    )}
                  </div>
                </div>

                <div className="premium-grid-two" style={{ marginTop: '2rem', gap: '2rem' }}>
                  <div>
                    <h3 className="premium-mini-title"><Beaker size={16} /> Focus vs Output</h3>
                    {scatterFocus?.data?.data?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <ScatterChart margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
                          <XAxis dataKey="x" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 5]} />
                          <YAxis dataKey="y" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} domain={[40, 100]} />
                          <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 12, fontSize: '0.75rem' }} />
                          <Scatter data={scatterFocus.data.data} fill="var(--accent-primary)" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    ) : <p className="premium-empty">Focus correlation engine idle...</p>}
                    <p className="premium-muted" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>{scatterFocus?.interpretation || 'Log more days to unlock this insight.'}</p>
                    {advancedMode && <pre className="premium-pre">{JSON.stringify(scatterFocus?.stats || {}, null, 2)}</pre>}
                  </div>

                  <div>
                    <h3 className="premium-mini-title"><AlertCircle size={16} /> Friction Impact</h3>
                    {scatterFriction?.data?.data?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <ScatterChart margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
                          <XAxis dataKey="x" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis dataKey="y" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} domain={[40, 100]} />
                          <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 12, fontSize: '0.75rem' }} />
                          <Scatter data={scatterFriction.data.data} fill="var(--warning)" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    ) : <p className="premium-empty">Friction correlation engine idle...</p>}
                    <p className="premium-muted" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>{scatterFriction?.interpretation || 'Log more days to unlock this insight.'}</p>
                    {advancedMode && <pre className="premium-pre">{JSON.stringify(scatterFriction?.stats || {}, null, 2)}</pre>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="premium-section">
          <h2 className="premium-section-title"><Calendar size={20} className="text-secondary" /> Consistency Ledger</h2>
          <div style={{ 
            maxWidth: 580, 
            margin: '1rem 0', 
            padding: '1.5rem', 
            background: 'var(--bg-color)', 
            borderRadius: '16px', 
            border: '1px solid var(--panel-border)' 
          }}>
            <Heatmap logs={heatmapLogs} />
          </div>
          <p className="premium-muted" style={{ fontSize: '0.85rem' }}>Visualizing the last 30 days of behavioral density.</p>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default Analysis;
