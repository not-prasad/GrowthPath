import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, Check, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

function AIPlan() {
  const [goal, setGoal] = useState(null);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const goalId_raw = localStorage.getItem('growthpath_goal_id');
    if (!goalId_raw) { navigate('/setup'); return; }
    let goalId = goalId_raw;

    const fetchData = async () => {
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
        
        const todosRes = await fetch(`http://localhost:5000/api/goals/${goalId}/todos`, { headers });
        if (!todosRes.ok) throw new Error('Failed to load tasks');
        
        const todosData = await todosRes.json();
        setTodos(todosData);
        
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to generate plan.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate]);

  const toggleTodo = async (todoId) => {
    // Optimistic update
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, is_completed: !t.is_completed } : t));
    
    try {
      await fetch(`http://localhost:5000/api/todos/${todoId}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
      // Revert on error
      setTodos(prev => prev.map(t => t.id === todoId ? { ...t, is_completed: !t.is_completed } : t));
      alert('Failed to update task');
    }
  };

  if (!goal) return null;

  const completedCount = todos.filter(t => t.is_completed).length;
  const progress = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

  return (
    <DashboardLayout goal={goal}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>AI Action Plan</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            A tailored day-by-day checklist designed for <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{goal.title}</span>.
          </p>
        </div>
        
        {todos.length > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {progress}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Completion
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
          <div style={{ 
            width: '48px', height: '48px', border: '3px solid var(--panel-border)', borderTopColor: 'var(--accent-primary)', 
            borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' 
          }}></div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Loading your roadmap</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '300px', margin: '0 auto' }}>
            Pulling your auto-generated checklist based on the deadline context.
          </p>
        </div>
      ) : error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '2rem', display: 'flex', gap: '1rem' }}>
          <AlertTriangle color="#ef4444" size={24} />
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>Generation Error</h3>
            <p style={{ fontSize: '0.875rem', color: '#b91c1c' }}>{error}</p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '2rem', maxWidth: '800px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--panel-border)', marginBottom: '1.5rem' }}>
            <BookOpen size={20} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Generated Tasks ({todos.length})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {todos.map(todo => (
              <div 
                key={todo.id}
                onClick={() => toggleTodo(todo.id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem',
                  background: todo.is_completed ? 'var(--accent-subtle)' : 'var(--input-bg)',
                  border: todo.is_completed ? '1px solid var(--accent-border)' : '1px solid var(--panel-border)',
                  borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s ease',
                  opacity: todo.is_completed ? 0.7 : 1
                }}
              >
                <div style={{
                  width: '24px', height: '24px', borderRadius: '6px', marginTop: '2px',
                  background: todo.is_completed ? 'var(--accent-primary)' : 'transparent',
                  border: todo.is_completed ? '2px solid var(--accent-primary)' : '2px solid var(--panel-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  transition: 'background 0.2s'
                }}>
                  {todo.is_completed && <Check size={14} color="#fff" strokeWidth={3} />}
                </div>
                
                <div>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: todo.is_completed ? 'var(--accent-primary)' : 'var(--text-muted)', marginBottom: '0.25rem'
                  }}>
                    {todo.timeframe_label}
                  </div>
                  <div style={{
                    fontSize: '0.9375rem', color: todo.is_completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                    textDecoration: todo.is_completed ? 'line-through' : 'none', lineHeight: 1.5
                  }}>
                    {todo.task_description}
                  </div>
                </div>
              </div>
            ))}
            
            {todos.length === 0 && (
               <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                 No tasks found for this goal.
               </div>
            )}
          </div>

          <div style={{ 
            marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--panel-border)', 
            display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' 
          }}>
            <Sparkles size={14} /> Driven by AI Auto-Categorization & Planning
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}

export default AIPlan;
