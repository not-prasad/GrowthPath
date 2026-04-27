import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, ScatterChart, Scatter,
} from 'recharts';
import { ChevronDown, ChevronRight } from 'lucide-react';
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

  return (
    <DashboardLayout goal={goal}>
      <div className="premium-page">
        <div className="premium-header">
          <div>
            <p className="premium-kicker">Pattern Review</p>
            <h1 className="premium-title">What patterns should I know?</h1>
            <p className="premium-subtitle">
              {line?.interpretation || 'Log more days to unlock this insight.'}
            </p>
          </div>
        </div>

        <section className="premium-section">
          <div className="premium-metric-row">
            <div className="premium-metric">
              <p className="premium-metric-label">Average score</p>
              <p className="premium-metric-value">{averageScore}</p>
            </div>
            <div className="premium-metric">
              <p className="premium-metric-label">Trend direction</p>
              <p className="premium-metric-value">{trendDirection}</p>
            </div>
            <div className="premium-metric">
              <p className="premium-metric-label">Days logged</p>
              <p className="premium-metric-value">{days.length}</p>
            </div>
          </div>
        </section>

        <section className="premium-section">
          <h2 className="premium-section-title">Performance trend</h2>
          {line?.data?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={line.data.data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="var(--panel-border)" />
                <XAxis dataKey="x" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v?.slice(5)} />
                <YAxis domain={[40, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--panel-border)', fontSize: '0.75rem' }} />
                <Line type="monotone" dataKey="y" stroke="var(--accent-primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="premium-empty">Log more days to unlock this insight.</p>
          )}
          <p className="premium-muted" style={{ marginTop: '0.875rem' }}>{line?.interpretation || 'Log more days to unlock this insight.'}</p>
        </section>

        <section className="premium-section">
          <h2 className="premium-section-title">Task completion breakdown</h2>
          {categoryBar?.data?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryBar.data.data}>
                <CartesianGrid vertical={false} stroke="var(--panel-border)" />
                <XAxis dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 8, fontSize: '0.75rem' }} />
                <Legend />
                <Bar dataKey="completed" fill="var(--success)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="total" fill="var(--panel-border)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="premium-empty">Log more days to unlock this insight.</p>
          )}
          <p className="premium-muted" style={{ marginTop: '0.875rem' }}>{categoryBar?.interpretation || 'Log more days to unlock this insight.'}</p>
        </section>

        <section className="premium-section">
          <button className="premium-accordion-trigger" onClick={() => setAdvancedOpen((s) => !s)}>
            <span>{advancedOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />} Advanced analysis</span>
            <span className="premium-muted">{advancedMode ? 'Advanced mode on' : 'Advanced mode off'}</span>
          </button>
          {advancedOpen && (
            <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
              <label style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={advancedMode} onChange={(e) => setAdvancedMode(e.target.checked)} />
                Advanced Mode (show raw stats)
              </label>

              <div className="premium-grid-two">
                <div>
                  <h3 className="premium-mini-title">Weekday pattern</h3>
                  {weekday?.data?.data?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={weekday.data.data}>
                        <CartesianGrid vertical={false} stroke="var(--panel-border)" />
                        <XAxis dataKey="weekday" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 8, fontSize: '0.75rem' }} />
                        <Bar dataKey="avg_score" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="premium-empty">Log more days to unlock this insight.</p>}
                  <p className="premium-muted">{weekday?.interpretation || 'Log more days to unlock this insight.'}</p>
                </div>

                <div>
                  <h3 className="premium-mini-title">Score consistency</h3>
                  <p className="premium-muted">{boxplot?.interpretation || 'Log more days to unlock this insight.'}</p>
                  {advancedMode && boxplot?.data && (
                    <pre className="premium-pre">{JSON.stringify(boxplot?.stats || boxplot?.data || {}, null, 2)}</pre>
                  )}
                </div>
              </div>

              <div className="premium-grid-two">
                <div>
                  <h3 className="premium-mini-title">Focus vs score</h3>
                  {scatterFocus?.data?.data?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <ScatterChart>
                        <CartesianGrid stroke="var(--panel-border)" />
                        <XAxis dataKey="x" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 5]} />
                        <YAxis dataKey="y" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} domain={[40, 100]} />
                        <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 8, fontSize: '0.75rem' }} />
                        <Scatter data={scatterFocus.data.data} fill="var(--accent-primary)" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : <p className="premium-empty">Log more days to unlock this insight.</p>}
                  <p className="premium-muted">{scatterFocus?.interpretation || 'Log more days to unlock this insight.'}</p>
                  {advancedMode && <pre className="premium-pre">{JSON.stringify(scatterFocus?.stats || {}, null, 2)}</pre>}
                </div>

                <div>
                  <h3 className="premium-mini-title">Friction vs score</h3>
                  {scatterFriction?.data?.data?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <ScatterChart>
                        <CartesianGrid stroke="var(--panel-border)" />
                        <XAxis dataKey="x" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis dataKey="y" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} domain={[40, 100]} />
                        <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 8, fontSize: '0.75rem' }} />
                        <Scatter data={scatterFriction.data.data} fill="var(--warning)" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : <p className="premium-empty">Log more days to unlock this insight.</p>}
                  <p className="premium-muted">{scatterFriction?.interpretation || 'Log more days to unlock this insight.'}</p>
                  {advancedMode && <pre className="premium-pre">{JSON.stringify(scatterFriction?.stats || {}, null, 2)}</pre>}
                </div>
              </div>

              {advancedMode && (
                <div className="premium-grid-two">
                  <pre className="premium-pre">{JSON.stringify(line?.stats || {}, null, 2)}</pre>
                  <pre className="premium-pre">{JSON.stringify(categoryBar?.stats || {}, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="premium-section">
          <h2 className="premium-section-title">AI Analyst Brief</h2>
          {brief ? (
            <div className="premium-insight-list">
              <p className="premium-insight-item"><span>Daily:</span> {brief.daily_analyst_brief}</p>
              <p className="premium-insight-item"><span>Root Cause:</span> {brief.root_cause_dip_detection}</p>
              <p className="premium-insight-item"><span>Weekly:</span> {brief.weekly_retro}</p>
            </div>
          ) : (
            <p className="premium-empty">Log more days to unlock this insight.</p>
          )}
        </section>

        <section className="premium-section">
          <h2 className="premium-section-title">Current month calendar</h2>
          <div style={{ maxWidth: 520 }}>
            <Heatmap logs={heatmapLogs} />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default Analysis;
