import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from '../components/DashboardLayout';

function Analysis() {
  const [goal, setGoal] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const goalId = localStorage.getItem('growthpath_goal_id');
    if (!goalId) { navigate('/setup'); return; }

    const fetchAll = async () => {
      try {
        const [goalRes, analysisRes, logsRes] = await Promise.all([
          fetch(`http://localhost:5000/api/goals/${goalId}`),
          fetch(`http://localhost:5000/api/analysis/${goalId}`),
          fetch(`http://localhost:5000/api/logs/${goalId}`),
        ]);
        setGoal(await goalRes.json());
        setAnalysis(await analysisRes.json());
        const logsData = await logsRes.json();
        setLogs([...logsData].reverse()); // chronological
      } catch (err) {
        console.error(err);
        navigate('/setup');
      }
    };
    fetchAll();
  }, [navigate]);

  if (!goal || !analysis) return null;

  const completionRate = analysis.completion_rate || 0;
  const avgFocus = analysis.average_focus || 0;
  const totalDays = analysis.total_days_logged || 0;

  // Mood counts
  const moodCounts = { Happy: 0, Neutral: 0, Stressed: 0 };
  logs.forEach(log => {
    if (log.mood?.includes('Happy')) moodCounts.Happy++;
    else if (log.mood?.includes('Neutral')) moodCounts.Neutral++;
    else if (log.mood?.includes('Stressed')) moodCounts.Stressed++;
  });

  // Chart data
  const chartData = logs.map(log => ({
    date: log.log_date,
    focus: log.focus_level,
  }));

  // Ring parameters
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <DashboardLayout goal={goal}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Analysis</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Deep insights into your progress and habits.</p>
      </div>

      {/* Top Row */}
      <div className="grid-3-cols" style={{ marginBottom: '2rem' }}>

        {/* Completion Ring */}
        <div className="card" style={{ alignItems: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completion Rate</p>
          <div className="progress-ring-wrap" style={{ width: 160, height: 160 }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
              <circle
                cx="80" cy="80" r={radius}
                fill="none"
                stroke="#7c3aed"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 80 80)"
                style={{ filter: 'drop-shadow(0 0 8px #7c3aed)', transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div className="progress-ring-label">
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a78bfa' }}>{completionRate}%</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>complete</div>
            </div>
          </div>
        </div>

        {/* Focus Avg */}
        <div className="card" style={{ alignItems: 'flex-start', padding: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Focus</p>
          <h2 style={{ fontSize: '3rem', fontWeight: 800, color: '#a78bfa', lineHeight: 1 }}>{avgFocus.toFixed(1)}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>out of 5</p>
          <div className="focus-dots">
            {[1,2,3,4,5].map(n => (
              <div key={n} className={`focus-dot ${n <= Math.round(avgFocus) ? 'filled' : ''}`} style={{ width: '18px', height: '18px' }} />
            ))}
          </div>
        </div>

        {/* Total Days */}
        <div className="card" style={{ alignItems: 'flex-start', padding: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days Logged</p>
          <h2 style={{ fontSize: '3rem', fontWeight: 800, color: '#a78bfa', lineHeight: 1 }}>{totalDays}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>check-ins recorded</p>
        </div>
      </div>

      {/* Mood Breakdown */}
      <div className="card" style={{ alignItems: 'flex-start', padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontWeight: 600, fontSize: '1.1rem' }}>Mood Breakdown</h3>
        <div className="grid-3-cols" style={{ marginBottom: 0, width: '100%' }}>
          {[
            { label: 'Happy 😊', count: moodCounts.Happy, color: '#a78bfa' },
            { label: 'Neutral 😐', count: moodCounts.Neutral, color: '#94a3b8' },
            { label: 'Stressed 😞', count: moodCounts.Stressed, color: '#ef4444' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--panel-border)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{label}</p>
              <p style={{ fontSize: '2.5rem', fontWeight: 800, color }}>{count}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>days</p>
            </div>
          ))}
        </div>
      </div>

      {/* Focus Line Chart */}
      <div className="card" style={{ alignItems: 'flex-start', padding: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontWeight: 600, fontSize: '1.1rem' }}>Focus Over Time</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v?.slice(5)} // show MM-DD
              />
              <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '8px', color: '#f1f5f9' }}
                labelStyle={{ color: '#a78bfa', fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="focus"
                stroke="#7c3aed"
                strokeWidth={2.5}
                dot={{ fill: '#7c3aed', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#a78bfa' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">
            <p style={{ fontSize: '1.1rem' }}>No data yet.</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Submit your first check-in to see focus trends here.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Analysis;
