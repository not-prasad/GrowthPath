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
      title: 'Smart Goal Planning',
      desc: 'Set your main goal, choose how long it will take, and pick a difficulty. The AI creates a clear roadmap with daily steps for you.',
    },
    {
      icon: <BarChart2 size={22} color="var(--accent-primary)" />,
      title: 'Daily Score Tracking',
      desc: 'Your daily logs are turned into a performance score from 0–100, helping you see exactly how well you did each day.',
    },
    {
      icon: <Activity size={22} color="var(--accent-primary)" />,
      title: 'Progress Insights',
      desc: 'Track your energy, focus, and habits over time. Our AI finds trends and gives you advice to help you improve.',
    },
  ];

  return (
    <div className="fade-in" style={{ background: 'var(--bg-color)', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      {/* PREMIUM BACKGROUND BLOBS */}
      <div className="blob-container">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* Nav */}
      <nav style={{
        padding: '1.25rem 2.5rem', borderBottom: '1px solid var(--panel-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, background: 'rgba(255, 255, 255, 0.7)', zIndex: 100,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--accent-primary)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)' }}>
            <Target size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>GrowthPath</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/login')} className="btn btn-outline" style={{ border: 'none', fontSize: '0.875rem' }}>Log in</button>
          <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: '10rem 2rem 8rem', textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
          padding: '0.35rem 1rem', borderRadius: '999px',
          color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '2.5rem',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)'
        }}>
          <Zap size={13} fill="var(--accent-primary)" /> Personal Progress System
        </div>

        <h1 style={{
          fontSize: '5.5rem', fontWeight: 900, color: 'var(--text-primary)',
          letterSpacing: '-0.05em', lineHeight: 1.0, marginBottom: '2rem'
        }}>
          Your Personal <br />
          <span className="text-gradient">Performance Lab.</span>
        </h1>

        <p style={{
          color: 'var(--text-secondary)', fontSize: '1.25rem',
          lineHeight: 1.7, maxWidth: '600px', margin: '0 auto 3.5rem',
          fontWeight: 400
        }}>
          A simple, data-driven way to improve your habits.
          Log your daily work, track your progress, and get helpful AI advice.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/register')} style={{ padding: '1rem 3rem', fontSize: '1.125rem' }}>
            Start Now <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/login')} style={{ padding: '1rem 3rem', fontSize: '1.125rem', background: 'white' }}>
            Sign In
          </button>
        </div>
      </div>

      {/* Trust Bar */}
      <div style={{
        padding: '2.5rem 2rem', display: 'flex', justifyContent: 'center',
        borderBlock: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.4)',
        backdropFilter: 'blur(8px)'
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Designed for consistent self-improvement
        </p>
      </div>

      {/* Features */}
      <div style={{ padding: '8rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'center', marginBottom: '1rem' }}>Core Features</p>
        <h2 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-primary)', textAlign: 'center', letterSpacing: '-0.04em', marginBottom: '5rem' }}>How it works</h2>

        <div className="grid-3-cols" style={{ gap: '2.5rem' }}>
          {features.map((f, i) => (
            <div key={i} className="card glass-card" style={{ padding: '2.5rem', border: '1px solid var(--panel-border)' }}>
              <div style={{
                width: '48px', height: '48px', background: 'var(--accent-subtle)',
                borderRadius: '12px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', marginBottom: '1.5rem',
                color: 'var(--accent-primary)',
                boxShadow: '0 4px 10px rgba(99, 102, 241, 0.15)'
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Footer */}
      <div style={{ padding: '8rem 2rem', textAlign: 'center', borderTop: '1px solid var(--panel-border)', background: 'linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.03) 100%)' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.5rem' }}>Ready to improve?</p>
        <h2 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em', marginBottom: '1.5rem' }}>
          Start your first goal today.
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: '500px', margin: '0 auto 3rem', lineHeight: 1.7 }}>
          Clear tracking. AI advice. <br />
          No distractions. Just results.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/register')} style={{ padding: '1rem 4rem', fontSize: '1.125rem' }}>
          Create Profile <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
        </button>
      </div>
    </div>
  );
}

export default Landing;
