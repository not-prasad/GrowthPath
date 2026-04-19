import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Flame, CheckCircle, Target, ArrowRight, Activity, Zap, Star } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Heatmap from '../components/Heatmap';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const [goal, setGoal] = useState(null);
  const [streak, setStreak] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [logs, setLogs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [todos, setTodos] = useState([]);
  
  const [nudge, setNudge] = useState([]);
  const [nudgeLoading, setNudgeLoading] = useState(true);
  const [todosLoading, setTodosLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const storedGoalId = localStorage.getItem('growthpath_goal_id');

    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        
        let goalId = storedGoalId;
        if (!goalId) {
          const goalsRes = await fetch('http://localhost:5000/api/goals', { headers });
          const goals = await goalsRes.json();
          if (goals.length > 0) {
            goalId = goals[0].id;
            localStorage.setItem('growthpath_goal_id', goalId);
          } else {
            navigate('/setup');
            return;
          }
        }

        let goalRes = await fetch(`http://localhost:5000/api/goals/${goalId}`, { headers });
        if (goalRes.status === 401) { logout(); navigate('/login'); return; }

        if (!goalRes.ok) {
          const goalsRes = await fetch('http://localhost:5000/api/goals', { headers });
          const userGoals = await goalsRes.json();
          if (userGoals.length > 0) {
            goalId = userGoals[0].id;
            localStorage.setItem('growthpath_goal_id', goalId);
            goalRes = await fetch(`http://localhost:5000/api/goals/${goalId}`, { headers });
          } else {
            navigate('/setup');
            return;
          }
        }

        const [streakRes, analysisRes, logsRes, profileRes] = await Promise.all([
          fetch(`http://localhost:5000/api/streak/${goalId}`, { headers }),
          fetch(`http://localhost:5000/api/analysis/${goalId}`, { headers }),
          fetch(`http://localhost:5000/api/logs/${goalId}`, { headers }),
          fetch(`http://localhost:5000/api/user/profile`, { headers })
        ]);

        const goalData = await goalRes.json();
        const streakData = await streakRes.json();
        const analysisData = await analysisRes.json();
        const logsData = await logsRes.json();
        const profileData = await profileRes.json();

        setGoal(goalData);
        setStreak(streakData.streak || 0);
        setAnalysis(analysisData);
        setLogs(logsData);
        setProfile(profileData);

        setTodosLoading(true);
        const todosRes = await fetch(`http://localhost:5000/api/goals/${goalId}/todos`, { headers });
        const todosData = await todosRes.json();
        setTodos(todosData.filter(t => !t.is_completed).slice(0, 3));
        setTodosLoading(false);

        const lastMood = logsData.length > 0 ? logsData[0].mood : 'Neutral 😐';

        setNudgeLoading(true);
        const nudgeRes = await fetch('http://localhost:5000/api/ai/nudge', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            streak: streakData.streak || 0,
            mood: lastMood,
            completion_rate: analysisData.completion_rate || 0,
            goal_title: goalData.title,
          }),
        });
        const nudgeData = await nudgeRes.json();
        setNudge(Array.isArray(nudgeData) ? nudgeData : []);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setNudgeLoading(false);
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate]);

  const [showMoodPicker, setShowMoodPicker] = useState(null); // todoId
  const [showTaskAdd, setShowTaskAdd] = useState(false);
  const [newTask, setNewTask] = useState('');

  const toggleTodo = async (todoId, mood = 'Neutral 😐') => {
    // satisfying visual local completion
    setTodos(prev => prev.map(t => 
      t.id === todoId ? { ...t, is_completed: true } : t
    ));
    try {
      const res = await fetch(`http://localhost:5000/api/todos/${todoId}/toggle`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mood })
      });
      const data = await res.json();
      if (data.exp_gained) {
        setProfile(prev => ({
          ...prev, 
          exp: prev.exp + 100, 
          level: Math.floor((prev.exp + 100) / 1000) + 1
        }));
      }
      setShowMoodPicker(null);
      // Fetch fresh data after 1.5 seconds so user can see it cross off!
      setTimeout(async () => {
        const headers = { 'Authorization': `Bearer ${token}` };
        const todosRes = await fetch(`http://localhost:5000/api/goals/${goal.id}/todos`, { headers });
        const todosData = await todosRes.json();
        setTodos(todosData.filter(t => !t.is_completed).slice(0, 3));
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Failed to update task');
    }
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    try {
      const res = await fetch(`http://localhost:5000/api/goals/${goal.id}/todos`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task: newTask, timeframe: 'Manual' })
      });
      if (res.ok) {
        setNewTask('');
        setShowTaskAdd(false);
        const headers = { 'Authorization': `Bearer ${token}` };
        const todosRes = await fetch(`http://localhost:5000/api/goals/${goal.id}/todos`, { headers });
        const todosData = await todosRes.json();
        setTodos(todosData.filter(t => !t.is_completed).slice(0, 3));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!goal && !loading) {
    return (
      <DashboardLayout goal={null}>
        <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--accent-subtle)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
            <Target size={40} color="var(--accent-primary)" />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>No active goal found</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: '400px', lineHeight: 1.6, marginBottom: '2.5rem' }}>
            It looks like you haven't architected a growth plan yet. Let's define your next milestone together.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/setup')} style={{ padding: '1rem 2.5rem', fontSize: '1rem' }}>
            Create Your First Goal <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (!goal) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
       <div className="spinner"></div>
    </div>
  );

  // Calculate circular progress for the performance panel
  const completionRate = analysis?.completion_rate || 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <DashboardLayout goal={goal}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Welcome back. Here is your status for <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{goal.title}</span>.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/checkin')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}>
          <Zap size={16} fill="currentColor" /> Check-In Now
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* LEFT COLUMN: Performance & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Phase 1: Unified Performance Overview Panel */}
          <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(145deg, var(--panel-bg) 0%, var(--bg-color) 100%)', display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  <Flame size={12} color="#f97316" /> Current Streak
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{streak} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>days</span></div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  <Activity size={12} color="#10b981" /> Custom Goal
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{goal.deadline} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>days</span></div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  <Target size={12} color="var(--accent-primary)" /> Focus Avg
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{analysis?.average_focus || 0} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>/ 5</span></div>
              </div>
            </div>

            {/* Circular Progress Indicator */}
            <div style={{ position: 'relative', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="90" height="90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--panel-border)" strokeWidth="8" />
                <circle
                  cx="40" cy="40" r={radius} fill="none" stroke="var(--accent-primary)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{completionRate}%</span>
                <span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '2px' }}>Weekly</span>
              </div>
            </div>
          </div>

          {/* Phase 2: Dynamic Level Progress Timeline */}
          {profile && (
            <div className="card" style={{ padding: '1.5rem', background: 'var(--accent-subtle)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', background: 'var(--accent-primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <Star size={18} fill="currentColor" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Level {profile.level} Architect</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>Total Experience: {profile.exp} EXP</p>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                     {1000 - (profile.exp % 1000)} EXP to Level {profile.level + 1}
                  </div>
               </div>
               
               <div style={{ width: '100%', height: '8px', background: 'var(--input-bg)', borderRadius: '999px', overflow: 'hidden' }}>
                 <div style={{ 
                   width: `${((profile.exp % 1000) / 10)}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), #a855f7)', 
                   borderRadius: '999px', transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' 
                 }} />
               </div>
            </div>
          )}

          {/* Today's Action (AI RoadMap previews) */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} color="var(--success)" /> Today's Action Plan
              </h3>
              <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }} onClick={() => navigate('/ai-plan')}>
                Roadmap
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {todosLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading AI Plan...</div>
              ) : (
                <>
                  {todos.map((todo, idx) => (
                    <div 
                      key={todo.id} onClick={() => setShowMoodPicker(todo.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                        background: todo.is_completed ? 'var(--panel-bg)' : 'var(--input-bg)', 
                        border: '1px solid var(--panel-border)',
                        borderRadius: '10px', cursor: todo.is_completed ? 'default' : 'pointer', transition: 'all 0.15s ease',
                        animation: `fadeIn 0.3s ease-out ${idx * 0.1}s both`,
                        opacity: todo.is_completed ? 0.6 : 1,
                        position: 'relative'
                      }}
                    >
                      {/* MINI MOOD PICKER OVERLAY */}
                      {showMoodPicker === todo.id && !todo.is_completed && (
                        <div style={{ 
                          position: 'absolute', inset: 0, background: 'var(--panel-bg)', zIndex: 10, borderRadius: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 1rem',
                          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                        }}>
                          {['Happy 😊', 'Neutral 😐', 'Stressed 😞', 'Tired 😴'].map(m => (
                            <button 
                              key={m} onClick={(e) => { e.stopPropagation(); toggleTodo(todo.id, m); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', transition: 'transform 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              {m.split(' ')[1]}
                            </button>
                          ))}
                          <button onClick={(e) => { e.stopPropagation(); setShowMoodPicker(null); }} style={{ position: 'absolute', top: '4px', right: '4px', background: 'none', border: 'none', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Cancel</button>
                        </div>
                      )}

                      <div style={{ 
                        width: '18px', height: '18px', borderRadius: '4px', 
                        border: todo.is_completed ? 'none' : '2px solid var(--panel-border)',
                        background: todo.is_completed ? 'var(--success)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                         {todo.is_completed && <CheckCircle size={14} color="#fff" />}
                      </div>
                      <div style={{ flexGrow: 1, textDecoration: todo.is_completed ? 'line-through' : 'none' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>{todo.timeframe_label}</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{todo.task_description}</p>
                      </div>
                    </div>
                  ))}

                  {/* ADD TASK INPUT */}
                  {showTaskAdd ? (
                    <div style={{ display: 'flex', gap: '0.5rem', animation: 'fadeIn 0.3s' }}>
                      <input 
                        className="form-control" placeholder="What else to conquer today?" 
                        value={newTask} onChange={e => setNewTask(e.target.value)}
                        autoFocus onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                      />
                      <button className="btn btn-primary" onClick={handleAddTask}>Add</button>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-outline" 
                      onClick={() => setShowTaskAdd(true)}
                      style={{ fontSize: '0.75rem', borderStyle: 'dashed', opacity: 0.7 }}
                    >
                      + Add Custom Step
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Insights & Heatmap */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Phase 4: Action-Oriented AI Insights */}
          <div className="card" style={{ background: 'var(--panel-bg)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
             <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
                <Sparkles size={18} fill="currentColor" /> AI Strategic Insights
             </h3>
             
             {nudgeLoading ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 {[1, 2, 3].map(i => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', opacity: 0.5 }}>
                       <div style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', marginTop: '6px' }} />
                       <div style={{ background: 'var(--input-bg)', height: '1rem', width: i === 2 ? '80%' : '100%', borderRadius: '4px' }} />
                    </div>
                 ))}
               </div>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 {nudge.map((n, i) => (
                   <div key={i} style={{ padding: '0.875rem', background: 'var(--input-bg)', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)' }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '0.5rem', fontWeight: 500 }}>
                        {n.insight}
                      </p>
                      <button 
                        onClick={() => navigate(n.action.toLowerCase().includes('roadmap') ? '/ai-plan' : '/checkin')}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {n.action} <ArrowRight size={12} />
                      </button>
                   </div>
                 ))}
                 {nudge.length === 0 && (
                   <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No recent insights generated.</div>
                 )}
               </div>
             )}
          </div>
          
          {/* Phase 3: Mini Activity Heatmap */}
          <div style={{ marginTop: 'auto' }}>
            <Heatmap logs={logs} />
          </div>

        </div>
      </div>
      
      {/* Static Goal Details Bottom */}
      <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
         <div style={{ padding: '0.75rem 1rem', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
            <strong>Commitment:</strong> {goal.commitment}
         </div>
         <div style={{ padding: '0.75rem 1rem', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
            <strong>Category:</strong> {goal.category}
         </div>
      </div>

    </DashboardLayout>
  );
}

export default Dashboard;
