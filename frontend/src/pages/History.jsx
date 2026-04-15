import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';

const moodEmoji = (mood) => {
  if (mood?.includes('Happy')) return '😊';
  if (mood?.includes('Neutral')) return '😐';
  if (mood?.includes('Stressed')) return '😞';
  return '—';
};

function History() {
  const [goal, setGoal] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const goalId = localStorage.getItem('growthpath_goal_id');
    if (!goalId) { navigate('/setup'); return; }

    const fetchAll = async () => {
      try {
        const [goalRes, logsRes] = await Promise.all([
          fetch(`http://localhost:5000/api/goals/${goalId}`),
          fetch(`http://localhost:5000/api/logs/${goalId}`),
        ]);
        setGoal(await goalRes.json());
        setLogs(await logsRes.json());
      } catch (err) {
        console.error(err);
        navigate('/setup');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [navigate]);

  if (!goal || loading) return null;

  return (
    <DashboardLayout goal={goal}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>History</h1>
        <p style={{ color: 'var(--text-secondary)' }}>A full log of every check-in you've submitted.</p>
      </div>

      <div className="card" style={{ alignItems: 'flex-start', padding: '2rem' }}>
        {logs.length === 0 ? (
          <div className="empty-state" style={{ width: '100%', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No check-ins yet.</p>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Start your journey! Head to the Check-in page to log your first day.</p>
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Task Done</th>
                <th>Mood</th>
                <th>Focus</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'monospace', color: '#a78bfa' }}>{log.log_date}</td>
                  <td>
                    {log.task_done
                      ? <span style={{ color: '#4ade80', fontWeight: 600 }}>✅ Done</span>
                      : <span style={{ color: '#ef4444', fontWeight: 600 }}>❌ Missed</span>}
                  </td>
                  <td style={{ fontSize: '1.3rem' }}>
                    {moodEmoji(log.mood)}
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>
                      {log.mood?.split(' ')[0]}
                    </span>
                  </td>
                  <td>
                    <div className="focus-dots" style={{ flexWrap: 'nowrap' }}>
                      {[1,2,3,4,5].map(n => (
                        <div key={n} className={`focus-dot ${n <= log.focus_level ? 'filled' : ''}`} />
                      ))}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.notes || <span style={{ opacity: 0.4 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}

export default History;
