import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

function AIPlan() {
  const [goal, setGoal] = useState(null);
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const goalId = localStorage.getItem('growthpath_goal_id');
    if (!goalId) { navigate('/setup'); return; }

    const fetchData = async () => {
      try {
        const goalRes = await fetch(`http://localhost:5000/api/goals/${goalId}`);
        if (!goalRes.ok) throw new Error('Goal not found');
        const goalData = await goalRes.json();
        setGoal(goalData);

        const planRes = await fetch('http://localhost:5000/api/ai/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal_title: goalData.title,
            category: goalData.category,
            deadline: goalData.deadline,
            commitment: goalData.commitment,
            difficulty: goalData.difficulty,
            motivation: goalData.motivation,
          }),
        });

        const planData = await planRes.json();
        if (planData.error) throw new Error(planData.error);
        setPlan(planData.plan || '');
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to generate plan.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Format the AI response: convert markdown-like **bold** and bullet points
  const formatPlan = (text) => {
    return text
      .split('\n')
      .filter(line => line.trim() !== '')
      .map((line, i) => {
        // Section header (e.g. ## Week 1)
        if (line.startsWith('##')) {
          return (
            <h3 key={i} style={{ color: '#a78bfa', fontWeight: 700, fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
              {line.replace(/^#+\s*/, '')}
            </h3>
          );
        }
        if (line.startsWith('#')) {
          return (
            <h2 key={i} style={{ color: '#c4b5fd', fontWeight: 800, fontSize: '1.3rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
              {line.replace(/^#+\s*/, '')}
            </h2>
          );
        }
        // Bullet point
        if (line.startsWith('*') || line.startsWith('-') || line.startsWith('•')) {
          const content = line.replace(/^[\*\-•]\s*/, '');
          return (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>
              <span style={{ color: '#7c3aed', marginTop: '2px', flexShrink: 0 }}>▸</span>
              <span style={{ color: 'var(--text-primary)', lineHeight: 1.65, dangerouslySetInnerHTML: undefined }}>
                {formatInline(content)}
              </span>
            </div>
          );
        }
        // Regular paragraph
        return (
          <p key={i} style={{ color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: '0.4rem' }}>
            {formatInline(line)}
          </p>
        );
      });
  };

  // Bold (**text**) inline formatting
  const formatInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#f1f5f9', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  if (!goal) return null;

  return (
    <DashboardLayout goal={goal}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: 'rgba(124,58,237,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(124,58,237,0.3)',
          }}>
            <Sparkles size={22} color="#a78bfa" />
          </div>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 700, lineHeight: 1 }}>AI Plan</h1>
            <p style={{ color: '#a78bfa', fontSize: '0.85rem', marginTop: '0.2rem' }}>Powered by Google Gemini</p>
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>Your personalized week-by-week roadmap for: <span style={{ color: '#a78bfa', fontWeight: 500 }}>{goal.title}</span></p>
      </div>

      {loading ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(109,40,217,0.05))',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: '20px',
          padding: '4rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            border: '3px solid rgba(124,58,237,0.2)',
            borderTopColor: '#7c3aed',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1.5rem',
          }} />
          <p style={{ color: '#a78bfa', fontWeight: 600, fontSize: '1.2rem', marginBottom: '0.5rem' }}>
            GrowthPath AI is building your plan...
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>This takes a few seconds. Gemini is personalizing it just for you.</p>
        </div>
      ) : error ? (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '16px',
          padding: '2rem',
          color: '#fca5a5',
        }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>⚠️ Failed to generate plan</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>{error}</p>
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(160deg, rgba(124,58,237,0.07) 0%, rgba(10,8,20,0) 60%)',
          border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: '20px',
          padding: '2.5rem',
          boxShadow: '0 0 60px rgba(124,58,237,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative glow */}
          <div style={{
            position: 'absolute', top: '-60px', right: '-60px',
            width: '200px', height: '200px',
            background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--panel-border)' }}>
            <BookOpen size={18} color="#a78bfa" />
            <span style={{ color: '#a78bfa', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Personalized Growth Plan</span>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            {formatPlan(plan)}
          </div>

          <div style={{
            marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--panel-border)',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: 'var(--text-secondary)', fontSize: '0.8rem',
          }}>
            <Sparkles size={14} color="var(--text-secondary)" />
            Generated by Google Gemini · Results are personalized and may vary
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}

export default AIPlan;
