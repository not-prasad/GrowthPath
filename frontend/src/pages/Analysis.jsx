import React, { useEffect, useState } from 'react' ;
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { FileDown } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { generatePDF } from '../components/ExportPDF';
import Heatmap from '../components/Heatmap';

function Analysis() {
  const [goal, setGoal] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [logs, setLogs] = useState([]);
  const [streak, setStreak] = useState(0);
  const [exporting, setExporting] = useState(false);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const goalId_raw = localStorage.getItem('growthpath_goal_id');
    if (!goalId_raw) { navigate('/setup'); return; }
    let goalId = goalId_raw;

    const fetchAll = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        let goalRes = await fetch(`http://localhost:5000/api/goals/${goalId}`, { headers });
        
        if (goalRes.status === 401) { logout(); navigate('/login'); return; }

        if (!goalRes.ok) {
          const listRes = await fetch('http://localhost:5000/api/goals', { headers });
          const userGoals = await listRes.json();
          if (userGoals.length > 0) {
            goalId = userGoals[0].id;
            localStorage.setItem('growthpath_goal_id', goalId);
            goalRes = await fetch(`http://localhost:5000/api/goals/${goalId}`, { headers });
          } else {
            navigate('/setup');
            return;
          }
        }

        const [analysisRes, logsRes, streakRes] = await Promise.all([
          fetch(`http://localhost:5000/api/analysis/${goalId}`, { headers }),
          fetch(`http://localhost:5000/api/logs/${goalId}`, { headers }),
          fetch(`http://localhost:5000/api/streak/${goalId}`, { headers }),
        ]);
        
        setGoal(await goalRes.json());
        setAnalysis(await analysisRes.json());
        const streakData = await streakRes.json();
        setStreak(streakData.streak || 0);
        const logsData = await logsRes.json();
        setLogs([...logsData].reverse()); // chronological
      } catch (err) {
        console.error(err);
        // navigate('/setup');
      }
    };
    fetchAll();
  }, [token, navigate]);

  if (!goal || !analysis) return null;

  const completionRate = analysis.completion_rate || 0;
  const avgFocus = analysis.average_focus || 0;
  const totalDays = analysis.total_days_logged || 0;

  // Mood counts
  const moodCounts = { Happy: 0, Neutral: 0, Stressed: 0, Tired: 0 };
  logs.forEach(log => {
    if (log.mood?.includes('Happy')) moodCounts.Happy++;
    else if (log.mood?.includes('Neutral')) moodCounts.Neutral++;
    else if (log.mood?.includes('Stressed')) moodCounts.Stressed++;
    else if (log.mood?.includes('Tired')) moodCounts.Tired++;
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

  const handleExport = async () => {
    setExporting(true);
    try {
      generatePDF({ goal, logs, analysis, streak });
    } finally {
      setTimeout(() => setExporting(false), 1500);
    }
  };

  return (
    <DashboardLayout goal={goal}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Analysis</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Detailed insights into your consistency and performance.</p>
        </div>
        <button
          id="export-pdf-btn"
          className="btn btn-outline"
          onClick={handleExport}
          disabled={exporting}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
        >
          <FileDown size={15} />
          {exporting ? 'Generating…' : 'Download Report'}
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <Heatmap logs={logs} />
      </div>

      {/* High-Level Stats */}
      <div className="grid-3-cols" style={{ marginBottom: '1.5rem' }}>

        {/* Completion Ring */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>Completion Rate</p>
          <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="140" height="140" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
              <circle
                cx="80" cy="80" r={radius}
                fill="none"
                stroke="#4f46e5"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{completionRate}%</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>done</div>
            </div>
          </div>
        </div>

        {/* Focus Avg */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem' }}>
          <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Average Focus</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '3rem', fontWeight: 800, color: '#0f172a' }}>{avgFocus.toFixed(1)}</span>
            <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>/ 5</span>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {[1,2,3,4,5].map(n => (
              <div 
                key={n} 
                style={{ 
                  width: '20px', height: '8px', borderRadius: '2px',
                  background: n <= Math.round(avgFocus) ? '#4f46e5' : '#f1f5f9'
                }} 
              />
            ))}
          </div>
        </div>

        {/* Total Days */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem' }}>
          <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Days Logged</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '3rem', fontWeight: 800, color: '#0f172a' }}>{totalDays}</span>
            <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>entries</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem' }}>Since you started tracking</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Focus Chart */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Focus Intensity Trend</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v?.slice(5)} // MM-DD
                />
                <YAxis 
                  domain={[1, 5]} 
                  ticks={[1,2,3,4,5]} 
                  tick={{ fill: '#94a3b8', fontSize: 11 }} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip
                  contentStyle={{ 
                    background: '#fff', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    fontSize: '0.75rem' 
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="focus"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={{ fill: '#4f46e5', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              No data available yet.
            </div>
          )}
        </div>

        {/* Mood Breakdown */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Mood Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Happy', emoji: '😊', count: moodCounts.Happy, color: '#4f46e5' },
              { label: 'Neutral', emoji: '😐', count: moodCounts.Neutral, color: '#6366f1' },
              { label: 'Stressed', emoji: '😞', count: moodCounts.Stressed, color: '#94a3b8' },
              { label: 'Tired', emoji: '😴', count: moodCounts.Tired, color: '#cbd5e1' },
            ].map(({ label, emoji, count, color }) => {
              const percentage = totalDays > 0 ? (count / totalDays) * 100 : 0;
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.8125rem', fontWeight: 500 }}>
                    <span style={{ color: '#475569' }}>{emoji} {label}</span>
                    <span style={{ color: '#0f172a' }}>{count} days</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
                    <div style={{ 
                      width: `${percentage}%`, height: '100%', 
                      background: color, borderRadius: '3px', transition: 'width 0.5s ease' 
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Analysis;
