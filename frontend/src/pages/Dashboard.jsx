import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Flame, Calendar, CheckCircle, Focus } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

function Dashboard() {
  const [goal, setGoal] = useState(null);
  const [streak, setStreak] = useState(0);
  const [nudge, setNudge] = useState('');
  const [nudgeLoading, setNudgeLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const goalId = localStorage.getItem('growthpath_goal_id');
    if (!goalId) { navigate('/setup'); return; }

    const fetchData = async () => {
      try {
        const [goalRes, streakRes] = await Promise.all([
          fetch(`http://localhost:5000/api/goals/${goalId}`),
          fetch(`http://localhost:5000/api/streak/${goalId}`),
        ]);
        if (!goalRes.ok) throw new Error('Goal not found');
        const goalData = await goalRes.json();
        setGoal(goalData);

        const streakData = await streakRes.json();
        const currentStreak = streakData.streak || 0;
        setStreak(currentStreak);

        // Fetch analysis for completion rate
        const analysisRes = await fetch(`http://localhost:5000/api/analysis/${goalId}`);
        const analysisData = await analysisRes.json();
        const completionRate = analysisData.completion_rate || 0;

        // Fetch last log for mood
        const logsRes = await fetch(`http://localhost:5000/api/logs/${goalId}`);
        const logsData = await logsRes.json();
        const lastMood = logsData.length > 0 ? logsData[0].mood : 'Neutral';

        // Fetch AI nudge
        setNudgeLoading(true);
        const nudgeRes = await fetch('http://localhost:5000/api/ai/nudge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            streak: currentStreak,
            mood: lastMood,
            completion_rate: completionRate,
            goal_title: goalData.title,
          }),
        });
        const nudgeData = await nudgeRes.json();
        setNudge(nudgeData.nudge || '');
      } catch (error) {
        console.error('Failed to load data:', error);
        navigate('/setup');
      } finally {
        setNudgeLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (!goal) return null;

  return (
    <DashboardLayout goal={goal}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Track your progress and stay on top of your goal.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid-4-cols">
        <div className="card" style={{ alignItems: 'flex-start', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <Flame size={18} color="#fb923c" /> Current Streak
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 700 }}>{streak} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400 }}>days</span></h2>
        </div>

        <div className="card" style={{ alignItems: 'flex-start', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <Calendar size={18} color="#a78bfa" /> Days Target
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 700 }}>{goal.deadline} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400 }}>days</span></h2>
        </div>

        <div className="card" style={{ alignItems: 'flex-start', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <CheckCircle size={18} color="#a78bfa" /> Completion
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 700 }}>— <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400 }}>%</span></h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>See Analysis page</p>
        </div>

        <div className="card" style={{ alignItems: 'flex-start', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <Focus size={18} color="#a78bfa" /> Focus Avg
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 700 }}>— <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400 }}>/ 5</span></h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>See Analysis page</p>
        </div>
      </div>

      {/* Goal Details Card */}
      <div className="card" style={{ alignItems: 'flex-start', padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: 700 }}>{goal.title}</h2>
          <div className="badge badge-purple">{goal.difficulty} Mode</div>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          <span style={{ color: '#fff', fontWeight: 500 }}>Daily commitment:</span> {goal.commitment}
        </p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          <span style={{ color: '#fff', fontWeight: 500 }}>Category:</span> {goal.category}
        </p>
        {goal.motivation && (
          <div className="styled-quote" style={{ margin: 0, width: '100%' }}>
            <p>"{goal.motivation}"</p>
          </div>
        )}
      </div>

      {/* AI Nudge Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(109,40,217,0.06))',
        border: '1px solid rgba(124,58,237,0.35)',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 0 40px rgba(124,58,237,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* glow orb */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '160px', height: '160px',
          background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(124,58,237,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px rgba(124,58,237,0.4)',
          }}>
            <Sparkles size={20} color="#a78bfa" />
          </div>
          <div>
            <p style={{ fontWeight: 700, color: '#a78bfa', fontSize: '1rem' }}>AI Nudge</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Personalized by Gemini</p>
          </div>
        </div>

        {nudgeLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
            <div style={{
              width: '16px', height: '16px', borderRadius: '50%',
              border: '2px solid rgba(124,58,237,0.4)',
              borderTopColor: '#7c3aed',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span>Generating your nudge...</span>
          </div>
        ) : nudge ? (
          <p style={{ color: 'var(--text-primary)', lineHeight: 1.7, fontSize: '1.05rem' }}>{nudge}</p>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            ✨ AI nudge unavailable right now — your Gemini API daily quota may be exhausted. Head to 
            <a href="https://ai.google.dev" target="_blank" rel="noreferrer" style={{ color: '#a78bfa', marginLeft: '4px' }}>ai.google.dev</a> to check your usage.
          </p>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}

export default Dashboard;
