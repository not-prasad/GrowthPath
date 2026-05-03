import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, Legend, Cell, PieChart, Pie,
  ScatterChart, Scatter, ZAxis, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, Target, Flame, 
  Brain, Activity, Sparkles, Zap, Info, ChevronRight,
  Filter, Calendar, Download, RefreshCw
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Heatmap from '../components/Heatmap';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

// Simple Calendar Component
// Local ActivityCalendar deleted in favor of global Heatmap component

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

        const goalsRes = await fetch(`${API_BASE}/goals`, { headers: h });
        if (goalsRes.status === 401) { logout(); navigate('/login'); return; }
        
        const goalsPayload = await safeJson(goalsRes);
        const goals = goalsPayload?.goals || [];
        const active = goalsPayload?.active_goal_id;

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

  const handleExportPDF = async () => {
    if (!goal) return;
    try {
      const h = authHeaders(token);
      const res = await fetch(`${API_BASE}/analytics/export/pdf?goal_id=${goal.id}`, { headers: h });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GrowthPath_Report_${goal.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error("PDF Export failed:", err);
    }
  };

  if (loading) return (
    <DashboardLayout goal={goal}>
      <div className="premium-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <RefreshCw className="spin" size={40} color="var(--accent-primary)" />
        <p className="premium-muted">Synthesizing benchmark data...</p>
      </div>
    </DashboardLayout>
  );

  const stats = analysis?.summary || {};
  
  // Computations for Performance Summary
  const avgScore = logs.length ? Math.round(logs.reduce((acc, l) => acc + (l.performance_score || 0), 0) / logs.length) : 0;
  const trendDir = stats.line?.stats?.delta > 0 ? "Improving" : (stats.line?.stats?.delta < 0 ? "Declining" : "Stable");
  const briefText = typeof brief?.brief === 'string' ? brief.brief : brief?.brief?.daily_analyst_brief || "No brief available.";

  const historyData = [...(stats.line?.data?.data || [])];
  const categoryData = stats.category_completion?.data?.data || [];
  const weekdayData = stats.weekday?.data?.data || [];
  const focusData = stats.scatter_focus?.data?.data || [];

  const renderEmptyState = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
      Log more days to unlock this insight
    </div>
  );

  return (
    <DashboardLayout goal={goal}>
      <div className="premium-page fade-in">
        <header className="premium-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="premium-kicker">Performance Lab</p>
            <h1 className="premium-title">Analysis</h1>
            <p className="premium-subtitle">Advanced analytics and behavioral pattern mapping.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn btn-outline" 
              onClick={handleExportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={16} /> Export PDF Report
            </button>
          </div>
        </header>

        {/* Top: Performance Summary */}
        <section className="premium-section" style={{ padding: '1.5rem 2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Score (30d)</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{avgScore}%</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Trend</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{trendDir}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Days</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{logs.length}</p>
              </div>
            </div>
            {briefText && (
              <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  <Sparkles size={16} style={{ display: 'inline', marginRight: '8px', color: 'var(--accent-primary)' }}/>
                  {briefText}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Middle: Two Charts */}
        <div className="premium-grid-two">
          {/* Score History */}
          <section className="premium-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Score History</h3>
            <div style={{ flex: 1, minHeight: '250px' }}>
              {historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--panel-border)" />
                    <XAxis dataKey="x" tick={{fontSize: 10, fill: 'var(--text-muted)'}} tickFormatter={v => v.slice(5)} />
                    <YAxis domain={[0, 100]} tick={{fontSize: 10, fill: 'var(--text-muted)'}} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)' }} />
                    <Line type="monotone" dataKey="y" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 3, fill: 'var(--accent-primary)' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : renderEmptyState()}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
              {stats.line?.interpretation || "No interpretation available."}
            </p>
          </section>

          {/* Category Completion */}
          <section className="premium-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Category Completion</h3>
            <div style={{ flex: 1, minHeight: '250px' }}>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--panel-border)" />
                    <XAxis dataKey="category" tick={{fontSize: 10, fill: 'var(--text-muted)', textTransform: 'capitalize'}} />
                    <YAxis tick={{fontSize: 10, fill: 'var(--text-muted)'}} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)' }} />
                    <Bar dataKey="completed" fill="var(--success)" radius={[4, 4, 0, 0]} name="Completed" />
                    <Bar dataKey="total" fill="var(--panel-border)" radius={[4, 4, 0, 0]} name="Total" />
                  </BarChart>
                </ResponsiveContainer>
              ) : renderEmptyState()}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
              {stats.category_completion?.interpretation || "No interpretation available."}
            </p>
          </section>
        </div>

        {/* Below: Two Charts */}
        <div className="premium-grid-two">
          {/* Weekday Analysis */}
          <section className="premium-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Weekday Analysis</h3>
            <div style={{ flex: 1, minHeight: '250px' }}>
              {weekdayData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--panel-border)" />
                    <XAxis dataKey="weekday" tick={{fontSize: 10, fill: 'var(--text-muted)'}} />
                    <YAxis domain={[0, 100]} tick={{fontSize: 10, fill: 'var(--text-muted)'}} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)' }} />
                    <Bar dataKey="avg_score" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} name="Avg Score" />
                  </BarChart>
                </ResponsiveContainer>
              ) : renderEmptyState()}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
              {stats.weekday?.interpretation || "No interpretation available."}
            </p>
          </section>

          {/* Focus vs Score */}
          <section className="premium-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Focus vs Score</h3>
            <div style={{ flex: 1, minHeight: '250px' }}>
              {focusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
                    <XAxis type="number" dataKey="x" name="Focus" tick={{fontSize: 10, fill: 'var(--text-muted)'}} domain={[0, 5]} />
                    <YAxis type="number" dataKey="y" name="Score" domain={[0, 100]} tick={{fontSize: 10, fill: 'var(--text-muted)'}} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)' }} />
                    <Scatter data={focusData} fill="var(--accent-primary)" />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : renderEmptyState()}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
              {stats.scatter_focus?.interpretation || "No interpretation available."}
            </p>
          </section>
        </div>

        {/* Bottom: Activity Calendar */}
        <section className="premium-section">
          <Heatmap logs={logs} />
        </section>

        {/* Consistency Ledger Table */}
        <section className="premium-section">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem' }}>Consistency Ledger</h3>
          {logs.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem 0' }}>Date</th>
                    <th style={{ padding: '0.75rem 0' }}>Score</th>
                    <th style={{ padding: '0.75rem 0' }}>Focus</th>
                    <th style={{ padding: '0.75rem 0' }}>Tasks Done</th>
                  </tr>
                </thead>
                <tbody>
                  {[...logs].reverse().map((log, i) => {
                    const doneCount = (log.tasks || []).filter(t => t.is_completed).length;
                    const totalCount = (log.tasks || []).length;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                        <td style={{ padding: '0.75rem 0', fontWeight: 600 }}>{log.date}</td>
                        <td style={{ padding: '0.75rem 0', color: log.performance_score >= 80 ? 'var(--success)' : (log.performance_score >= 50 ? 'var(--accent-primary)' : 'var(--danger)'), fontWeight: 800 }}>
                          {Math.round(log.performance_score)}%
                        </td>
                        <td style={{ padding: '0.75rem 0' }}>{log.focus_level} / 5</td>
                        <td style={{ padding: '0.75rem 0' }}>{doneCount} / {totalCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : renderEmptyState()}
        </section>

      </div>
    </DashboardLayout>
  );
}

export default Analysis;
