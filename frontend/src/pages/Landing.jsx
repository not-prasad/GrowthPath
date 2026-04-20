import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, BarChart2, FlaskConical, Zap, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Landing() {
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    if (token) navigate('/dashboard');
  }, [token, navigate]);

  const features = [
    {
      icon: <FlaskConical size={22} color="var(--accent-primary)" />,
      title: 'Structured Experiment Design',
      desc: 'Define a measurable objective, set a duration, and calibrate a difficulty variable. The AI generates a structured execution roadmap with daily milestones.',
    },
    {
      icon: <BarChart2 size={22} color="var(--accent-primary)" />,
      title: 'Performance Scoring Engine',
      desc: 'Every Daily Log is processed through a scoring model: completion weight, focus normalization, and friction penalty — producing a 0–100 performance score.',
    },
    {
      icon: <Activity size={22} color="var(--accent-primary)" />,
      title: 'Behavioral Analytics',
      desc: 'Track energy states, focus levels, and friction variables over time. The AI analyst surface trends, deviations, and actionable observations based on your data.',
    },
  ];

  return (
    <div className="fade-in" style={{ background: 'var(--bg-color)', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{
        padding: '1.25rem 2.5rem', borderBottom: '1px solid var(--panel-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, background: 'var(--bg-color)', zIndex: 100,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: '30px', height: '30px', background: 'var(--accent-primary)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={18} color="#fff" />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Perf. Lab</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/login')} className="btn btn-outline" style={{ border: 'none', fontSize: '0.875rem', padding: '0.5rem 1rem' }}>Log in</button>
          <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1.125rem' }}>Get Access</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: '9rem 2rem 7rem', textAlign: 'center', maxWidth: '860px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
          padding: '0.3rem 0.875rem', borderRadius: '999px',
          color: 'var(--accent-primary)', fontSize: '0.7rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2.25rem'
        }}>
          <Zap size={12} /> Behavioral Analytics System
        </div>

        <h1 style={{
          fontSize: '4.25rem', fontWeight: 800, color: 'var(--text-primary)',
          letterSpacing: '-0.045em', lineHeight: 1.05, marginBottom: '1.75rem'
        }}>
          Your Personal <span className="text-gradient">Performance Lab.</span>
        </h1>

        <p style={{
          color: 'var(--text-secondary)', fontSize: '1.125rem',
          lineHeight: 1.7, maxWidth: '560px', margin: '0 auto 3rem',
        }}>
          A structured, data-driven system for behavioral self-optimization.
          Log performance variables, track trends, and receive AI-generated analytical observations.
        </p>

        <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/register')} style={{ padding: '0.875rem 2.25rem', fontSize: '1rem' }}>
            Initialize Lab <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/login')} style={{ padding: '0.875rem 2.25rem', fontSize: '1rem' }}>
            Sign In
          </button>
        </div>
      </div>

      {/* Trust Bar */}
      <div style={{
        padding: '2rem 2rem', display: 'flex', justifyContent: 'center',
        borderBlock: '1px solid var(--panel-border)', background: 'var(--panel-bg)'
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Built for professionals who optimize performance through data
        </p>
      </div>

      {/* Features */}
      <div style={{ padding: '7rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'center', marginBottom: '0.75rem' }}>System Capabilities</p>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center', letterSpacing: '-0.03em', marginBottom: '4rem' }}>What the lab tracks</h2>

        <div className="grid-3-cols" style={{ gap: '2rem' }}>
          {features.map((f, i) => (
            <div key={i} className="card" style={{ padding: '2rem' }}>
              <div style={{
                width: '40px', height: '40px', background: 'var(--accent-subtle)',
                borderRadius: '10px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', marginBottom: '1.25rem'
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.625rem', letterSpacing: '-0.01em' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Footer */}
      <div style={{ padding: '6rem 2rem', textAlign: 'center', borderTop: '1px solid var(--panel-border)' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '1rem' }}>Ready to start?</p>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
          Initialize your first experiment.
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '420px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
          Free to use. No subscriptions. Structured performance tracking, not gamified habits.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/register')} style={{ padding: '0.875rem 2.5rem', fontSize: '1rem' }}>
          Create Account <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
        </button>
      </div>
    </div>
  );
}

export default Landing;
