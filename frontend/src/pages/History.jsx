import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { FileText } from 'lucide-react';

const moodEmoji = (mood) => {
  if (mood?.includes('Happy')) return '😊';
  if (mood?.includes('Neutral')) return '😐';
  if (mood?.includes('Stressed')) return '😞';
  if (mood?.includes('Tired')) return '😴';
  return '—';
};

function History() {
  const [goal, setGoal] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
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

        setGoal(await goalRes.json());
        const logsRes = await fetch(`http://localhost:5000/api/logs/${goalId}`, { headers });
        setLogs(await logsRes.json());
      } catch (err) {
        console.error(err);
        // navigate('/setup');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token, navigate]);

  if (!goal || loading) return null;

  return (
    <DashboardLayout goal={goal}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Log History</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>A complete archive of your daily reflections and progress logs.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {logs.length === 0 ? (
          <div style={{ padding: '6rem 2rem', textAlign: 'center' }}>
            <div style={{ 
              width: '64px', height: '64px', background: 'var(--panel-border)', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 1.5rem', color: 'var(--text-muted)' 
            }}>
              <FileText size={32} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No entries found</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '300px', margin: '0 auto' }}>
              Consistency is key. Head back to the check-in page to record your first day!
            </p>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '1.5rem' }}
              onClick={() => navigate('/checkin')}
            >
              Log Today's Progress
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: '2rem' }}>Date</th>
                  <th>Status</th>
                  <th>Mood</th>
                  <th>Focus</th>
                  <th style={{ paddingRight: '2rem' }}>Observations</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ paddingLeft: '2rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                      {new Date(log.log_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      {log.task_done
                        ? <span className="badge badge-green">Completed</span>
                        : <span className="badge badge-amber">Missed</span>}
                    </td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      <span style={{ fontSize: '1.125rem', marginRight: '0.5rem' }}>{moodEmoji(log.mood)}</span>
                      {log.mood?.split(' ')[0]}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[1,2,3,4,5].map(n => (
                          <div key={n} style={{ 
                            width: '12px', height: '4px', borderRadius: '1px',
                            background: n <= log.focus_level ? 'var(--accent-primary)' : 'var(--panel-border)'
                          }} />
                        ))}
                      </div>
                    </td>
                    <td style={{ 
                      paddingRight: '2rem', color: 'var(--text-secondary)', fontSize: '0.8125rem', 
                      maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                    }}>
                      {log.notes || <span style={{ color: 'var(--text-muted)' }}>No notes provided.</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default History;
