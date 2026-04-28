import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, Circle, Sparkles, 
  Trash2, Plus, Target, Flame, Activity
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

export default function DailyTasks() {
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState('primary');
  const [addingTask, setAddingTask] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);

  const { token, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const fetchTasks = async (goalId) => {
    try {
      const headers = authHeaders(token);
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API_BASE}/logs?goal_id=${goalId}&from=${today}&to=${today}&limit=1`, { headers });
      const payload = await safeJson(res);
      const day = payload?.days?.[0];
      setTasks(day?.tasks || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const headers = authHeaders(token);
        const goalsRes = await fetch(`${API_BASE}/goals`, { headers });
        if (goalsRes.status === 401) { logout(); navigate('/login'); return; }
        const goalsPayload = await safeJson(goalsRes);
        const goals = goalsPayload?.goals || [];
        const active = goalsPayload?.active_goal_id;
        const stored = localStorage.getItem('growthpath_goal_id');
        const selected = goals.find(g => String(g.id) === String(stored)) || goals.find(g => String(g.id) === String(active)) || goals[0] || null;
        
        if (!selected) { navigate('/setup'); return; }
        setGoal(selected);
        fetchTasks(selected.id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [token, navigate, logout]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !goal) return;
    setAddingTask(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API_BASE}/tasks/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({
          goal_id: goal.id,
          log_date: today,
          task_type: newTaskType,
          title: newTaskTitle.trim(),
        }),
      });
      if (res.ok) {
        setNewTaskTitle('');
        fetchTasks(goal.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingTask(false);
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}/toggle`, {
        method: 'PUT',
        headers: authHeaders(token),
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data.total_xp !== undefined) {
          updateUser({ total_xp: data.total_xp, level: data.level });
        }
        fetchTasks(goal.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data.total_xp !== undefined) {
          updateUser({ total_xp: data.total_xp, level: data.level });
        }
        fetchTasks(goal.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateAiTasks = async () => {
    setGeneratingTasks(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API_BASE}/tasks/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ goal_id: goal.id, log_date: today }),
      });
      if (res.ok) {
        fetchTasks(goal.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingTasks(false);
    }
  };

  if (loading) return null;

  const completedCount = tasks.filter(t => t.is_completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <DashboardLayout goal={goal} overlayClass="bg-dailylog">
      <div className="premium-page fade-in">
        
        <div className="premium-header" style={{ marginBottom: '2.5rem' }}>
          <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8125rem', marginBottom: '1.5rem', padding: 0 }}>
            <ArrowLeft size={14} /> Back to Overview
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="premium-kicker">Today's Focus List</p>
              <h1 className="premium-title">Your Protocol</h1>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.25rem' }}>
                <Flame size={20} color="var(--accent-primary)" /> {progress}%
              </div>
              <p className="premium-muted" style={{ fontSize: '0.75rem' }}>Daily Target Progress</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
          
          {/* Main Task List */}
          <section className="premium-section">
            <div style={{ marginBottom: '1.5rem' }}>
              <button 
                className="btn btn-outline" 
                onClick={handleGenerateAiTasks} 
                disabled={generatingTasks}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(99, 102, 241, 0.03)' }}
              >
                <Sparkles size={16} color="var(--accent-primary)" />
                {generatingTasks ? 'Generating Optimization Plan...' : 'Generate AI Daily Protocol'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tasks.length > 0 ? (
                tasks.map(task => (
                  <div key={task.id} style={{ 
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                    background: task.is_completed ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-color)', 
                    borderRadius: '12px', border: `1px solid ${task.is_completed ? 'rgba(16, 185, 129, 0.2)' : 'var(--panel-border)'}`,
                    transition: 'all 0.2s'
                  }}>
                    <div 
                      onClick={() => handleToggleTask(task.id)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {task.is_completed 
                        ? <CheckCircle2 size={22} color="var(--success)" />
                        : <Circle size={22} color="var(--text-muted)" />
                      }
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        fontSize: '0.9375rem', fontWeight: 700, 
                        color: task.is_completed ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: task.is_completed ? 'line-through' : 'none',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {task.title}
                      </p>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {task.task_type}
                      </span>
                    </div>

                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.4)', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'rgb(239, 68, 68)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.4)'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--panel-border)', borderRadius: '16px' }}>
                  <Target size={40} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.3 }} />
                  <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Your list is empty.</p>
                  <p className="premium-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Add a custom task or use AI to generate a plan.</p>
                </div>
              )}
            </div>
          </section>

          {/* Add Task Sidebar */}
          <aside>
            <div className="glass-card" style={{ padding: '1.5rem', position: 'sticky', top: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="var(--accent-primary)" /> Add Custom Task
              </h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Task Title</label>
                <input 
                  className="form-control"
                  placeholder="What needs to be done?"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Category</label>
                <select 
                  className="form-control"
                  value={newTaskType}
                  onChange={e => setNewTaskType(e.target.value)}
                >
                  <option value="primary">Primary Goal</option>
                  <option value="support">Supporting Habit</option>
                  <option value="optimize">Daily Optimization</option>
                  <option value="custom">Custom Task</option>
                </select>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={handleAddTask}
                disabled={addingTask || !newTaskTitle.trim()}
              >
                {addingTask ? 'Saving...' : 'Add to Protocol'}
              </button>

              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <Activity size={18} color="var(--accent-primary)" />
                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Daily Synergy</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tasks help calibrate your XP.</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </DashboardLayout>
  );
}
