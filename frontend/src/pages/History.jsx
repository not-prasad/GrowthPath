import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { FileText, CheckCircle2, Circle } from 'lucide-react';
import { API_BASE, authHeaders, safeJson } from '../api/base';

const moodEmoji = (mood) => {
  if (mood?.includes('Happy')) return '😊';
  if (mood?.includes('Neutral')) return '😐';
  if (mood?.includes('Stressed')) return '😞';
  if (mood?.includes('Tired')) return '😴';
  return '—';
};

const getPerformanceColor = (score) => {
  if (score >= 90) return 'var(--success)';
  if (score >= 70) return 'var(--accent-primary)';
  if (score >= 50) return 'var(--warning)';
  return 'var(--text-muted)';
};

function History() {
  const [goal, setGoal] = useState(null);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const headers = authHeaders(token);
        const goalsRes = await fetch(`${API_BASE}/goals`, { headers });
        if (goalsRes.status === 401) { logout(); navigate('/login'); return; }
        const goalsPayload = await safeJson(goalsRes);
        const goals = goalsPayload?.goals || [];
        const active = goalsPayload?.active_goal_id;
        const storedGoalId = localStorage.getItem('growthpath_goal_id');
        const selected = goals.find(g => String(g.id) === String(storedGoalId)) || goals.find(g => String(g.id) === String(active)) || goals[0] || null;
        if (!selected) { navigate('/setup'); return; }
        localStorage.setItem('growthpath_goal_id', String(selected.id));
        setGoal(selected);

        const daysRes = await fetch(`${API_BASE}/logs?goal_id=${selected.id}&limit=365`, { headers });
        const payload = await safeJson(daysRes);
        setDays(payload?.days || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token, navigate, logout]);

  if (!goal || loading) return null;

  return (
    <DashboardLayout goal={goal} overlayClass="bg-history">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Past Logs</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>A full record of your daily progress and notes.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {days.length === 0 ? (
          <div style={{ padding: '6rem 2rem', textAlign: 'center' }}>
            <div style={{ 
              width: '64px', height: '64px', background: 'var(--panel-border)', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 1.5rem', color: 'var(--text-muted)' 
            }}>
              <FileText size={32} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No logs yet</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '300px', margin: '0 auto' }}>
              Start tracking your goals today to see your progress history here!
            </p>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '1.5rem' }}
              onClick={() => navigate('/log')}
            >
              Log Today's Progress
            </button>
          </div>
        ) : (
          <div style={{ padding: '1.25rem 1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {days.map(day => (
                <div key={day.date} style={{ background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p style={{ marginTop: '0.35rem', fontSize: '0.875rem', fontWeight: 800, color: getPerformanceColor(day.performance_score || 0) }}>
                        Daily Score: {Math.round(day.performance_score || 0)} / 100
                      </p>
                      <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Energy Level: {day.energy_state || 'Stable'} · Focus: {day.focus_level || 0}/5 · Challenges: {day.friction_count || 0}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tasks</p>
                      <p style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-primary)' }}>{day.tasks?.length || 0}</p>
                    </div>
                  </div>

                  {day.tasks?.length > 0 && (
                    <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {day.tasks.map(t => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          {t.is_completed ? <CheckCircle2 size={16} color="var(--success)" /> : <Circle size={16} color="var(--text-muted)" />}
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t.title}
                            </p>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              {t.task_type}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(day.notes || day.hurdles) && (
                    <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--panel-border)' }}>
                      {day.notes && <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{day.notes}"</p>}
                      {day.hurdles && <p style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 800, marginTop: '0.35rem' }}>🛑 {day.hurdles}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default History;
