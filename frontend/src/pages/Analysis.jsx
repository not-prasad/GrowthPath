import React, { useEffect, useMemo, useState } from 'react' ;
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { Activity, BarChart2, CalendarDays, Dot, SlidersHorizontal } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState({
    line: false,
    category: false,
    weekday: false,
    boxplot: false,
    focus: false,
    friction: false,
  });
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
        const [
          daysRes,
          lineRes,
          boxRes,
          catRes,
          wdRes,
          sfRes,
          sfiRes,
        ] = await Promise.all([
          fetch(`${API_BASE}/logs?goal_id=${goalId}&limit=365`, { headers }),
          fetch(`${API_BASE}/analytics/line?goal_id=${goalId}`, { headers }),
          fetch(`${API_BASE}/analytics/boxplot?goal_id=${goalId}`, { headers }),
          fetch(`${API_BASE}/analytics/category-completion?goal_id=${goalId}`, { headers }),
          fetch(`${API_BASE}/analytics/weekday?goal_id=${goalId}`, { headers }),
          fetch(`${API_BASE}/analytics/scatter/focus?goal_id=${goalId}`, { headers }),
          fetch(`${API_BASE}/analytics/scatter/friction?goal_id=${goalId}`, { headers }),
        ]);

        const daysPayload = await safeJson(daysRes);
        setDays(daysPayload?.days || []);

        setLine((await safeJson(lineRes))?.line || null);
        setBoxplot((await safeJson(boxRes))?.boxplot || null);
        setCategoryBar((await safeJson(catRes))?.bar || null);
        setWeekday((await safeJson(wdRes))?.weekday || null);
        setScatterFocus((await safeJson(sfRes))?.scatter || null);
        setScatterFriction((await safeJson(sfiRes))?.scatter || null);
      } catch (err) {
        console.error(err);
        // navigate('/setup');
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

  const toggleAdvanced = (key) => {
    setShowAdvanced(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <DashboardLayout goal={goal}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Analysis</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Visualization-ready analytics powered by v2 endpoints.</p>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <Heatmap logs={heatmapLogs} />
      </div>

      <div className="grid-3-cols" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            <CalendarDays size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Days Loaded
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)' }}>{days.length}</p>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            <SlidersHorizontal size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Boxplot Median
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)' }}>{boxplot?.median ?? '—'}</p>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            <BarChart2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Outliers
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)' }}>{boxplot?.outliers?.length ?? '—'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Line: Performance over time</h3>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => toggleAdvanced('line')}>
              {showAdvanced.line ? 'Hide Advanced Statistics' : 'Show Advanced Statistics'}
            </button>
          </div>
          {line?.data?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={line.data.data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="var(--panel-border)" />
                <XAxis
                  dataKey="x"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v?.slice(5)} // MM-DD
                />
                <YAxis 
                  domain={[40, 100]}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip
                  contentStyle={{ 
                    background: 'var(--panel-bg)', 
                    borderRadius: '8px', 
                    border: '1px solid var(--panel-border)',
                    fontSize: '0.75rem' 
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke="var(--accent-primary)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--accent-primary)', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: 'var(--accent-primary)', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              No data available yet.
            </div>
          )}
          <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {line?.interpretation || '—'}
          </p>
          {showAdvanced.line && (
            <pre style={{ marginTop: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: 10, padding: '0.75rem', fontSize: '0.75rem', overflowX: 'auto' }}>
              {JSON.stringify(line?.stats || {}, null, 2)}
            </pre>
          )}
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Bar: Completion by category</h3>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => toggleAdvanced('category')}>
              {showAdvanced.category ? 'Hide Advanced Statistics' : 'Show Advanced Statistics'}
            </button>
          </div>
          {categoryBar?.data?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
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
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No tasks available yet.
            </div>
          )}
          <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {categoryBar?.interpretation || '—'}
          </p>
          {showAdvanced.category && (
            <pre style={{ marginTop: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: 10, padding: '0.75rem', fontSize: '0.75rem', overflowX: 'auto' }}>
              {JSON.stringify(categoryBar?.stats || {}, null, 2)}
            </pre>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Weekday analysis</h3>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => toggleAdvanced('weekday')}>
              {showAdvanced.weekday ? 'Hide Advanced Statistics' : 'Show Advanced Statistics'}
            </button>
          </div>
          {weekday?.data?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weekday.data.data}>
                <CartesianGrid vertical={false} stroke="var(--panel-border)" />
                <XAxis dataKey="weekday" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 8, fontSize: '0.75rem' }} />
                <Bar dataKey="avg_score" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No weekday data yet.
            </div>
          )}
          <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {weekday?.interpretation || '—'}
          </p>
          {showAdvanced.weekday && (
            <pre style={{ marginTop: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: 10, padding: '0.75rem', fontSize: '0.75rem', overflowX: 'auto' }}>
              {JSON.stringify(weekday?.stats || {}, null, 2)}
            </pre>
          )}
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Score consistency</h3>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => toggleAdvanced('boxplot')}>
              {showAdvanced.boxplot ? 'Hide Advanced Statistics' : 'Show Advanced Statistics'}
            </button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {boxplot?.interpretation || '—'}
          </p>
          {showAdvanced.boxplot && boxplot?.data ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {[
                { k: 'min', v: boxplot.data.min },
                { k: 'q1', v: boxplot.data.q1 },
                { k: 'median', v: boxplot.data.median },
                { k: 'q3', v: boxplot.data.q3 },
                { k: 'max', v: boxplot.data.max },
                { k: 'iqr', v: boxplot.data.iqr },
              ].map(x => (
                <div key={x.k} style={{ background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: 10, padding: '0.75rem' }}>
                  <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{x.k}</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{x.v}</p>
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                Outliers: {boxplot.data.outliers?.length ? boxplot.data.outliers.join(', ') : 'None'}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>{loading ? 'Loading…' : 'No distribution data yet.'}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Scatter: Focus vs Score</h3>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => toggleAdvanced('focus')}>
              {showAdvanced.focus ? 'Hide Advanced Statistics' : 'Show Advanced Statistics'}
            </button>
          </div>
          {scatterFocus?.data?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart>
                <CartesianGrid stroke="var(--panel-border)" />
                <XAxis dataKey="x" name="focus" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 5]} />
                <YAxis dataKey="y" name="score" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} domain={[40, 100]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 8, fontSize: '0.75rem' }} />
                <Scatter data={scatterFocus.data.data} fill="var(--accent-primary)" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No points yet.</div>
          )}
          <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {scatterFocus?.interpretation || '—'}
          </p>
          {showAdvanced.focus && (
            <pre style={{ marginTop: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: 10, padding: '0.75rem', fontSize: '0.75rem', overflowX: 'auto' }}>
              {JSON.stringify(scatterFocus?.stats || {}, null, 2)}
            </pre>
          )}
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Scatter: Friction vs Score</h3>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => toggleAdvanced('friction')}>
              {showAdvanced.friction ? 'Hide Advanced Statistics' : 'Show Advanced Statistics'}
            </button>
          </div>
          {scatterFriction?.data?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart>
                <CartesianGrid stroke="var(--panel-border)" />
                <XAxis dataKey="x" name="friction" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="y" name="score" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} domain={[40, 100]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 8, fontSize: '0.75rem' }} />
                <Scatter data={scatterFriction.data.data} fill="var(--warning)" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No points yet.</div>
          )}
          <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {scatterFriction?.interpretation || '—'}
          </p>
          {showAdvanced.friction && (
            <pre style={{ marginTop: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: 10, padding: '0.75rem', fontSize: '0.75rem', overflowX: 'auto' }}>
              {JSON.stringify(scatterFriction?.stats || {}, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Analysis;
