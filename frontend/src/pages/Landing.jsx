import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, CalendarDays, BrainCircuit, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Landing() {
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  return (
    <div className="fade-in" style={{ background: 'var(--bg-color)' }}>
      {/* Navigation Bar */}
      <nav style={{ 
        padding: '1.5rem 2rem', borderBottom: '1px solid var(--panel-border)', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ 
            width: '32px', height: '32px', background: 'var(--accent-primary)', borderRadius: '8px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Target size={20} color="#fff" />
          </div>
          <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>GrowthPath</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate('/login')} className="btn btn-outline" style={{ border: 'none' }}>Login</button>
          <button onClick={() => navigate('/register')} className="btn btn-primary">Get Started</button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-section" style={{ padding: '8rem 2rem 6rem', minHeight: 'auto' }}>
        <div style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem', 
          background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', padding: '0.35rem 0.75rem', 
          borderRadius: '999px', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700, 
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2rem'
        }}>
          <Zap size={14} /> Refined personal growth tracking
        </div>
        <h1 style={{ 
          fontSize: '4.5rem', fontWeight: 800, color: 'var(--text-primary)', 
          letterSpacing: '-0.04em', lineHeight: 1.05, textAlign: 'center', maxWidth: '900px'
        }}>
          Engineered for your <span className="text-gradient">consistent progress.</span>
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', fontSize: '1.25rem', marginTop: '1.5rem', 
          textAlign: 'center', maxWidth: '600px', lineHeight: 1.6
        }}>
          A clean, professional tool to architect your goals, track daily habits, and visualize your evolution through AI-powered analysis.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
          <button className="btn btn-primary" onClick={() => navigate('/register')} style={{ padding: '1rem 2.5rem', fontSize: '1.125rem' }}>
            Start Journey Now <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/login')} style={{ padding: '1rem 2.5rem', fontSize: '1.125rem' }}>
            View Demo Dashboard
          </button>
        </div>
      </div>

      {/* Social Proof / Trust Bar */}
      <div style={{ 
        padding: '3rem 2rem', display: 'flex', justifyContent: 'center', 
        alignItems: 'center', background: 'var(--bg-color)', borderBlock: '1px solid var(--panel-border)' 
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Built for professionals who value growth
        </p>
      </div>

      {/* Features Grid */}
      <div style={{ padding: '8rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="grid-3-cols" style={{ gap: '2.5rem' }}>
          <div>
            <div style={{ 
              width: '42px', height: '42px', background: 'var(--accent-subtle)', borderRadius: '12px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem'
            }}>
              <Target size={24} color="var(--accent-primary)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Strategic Setup</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
              Define goals with precision. Categorize your health, study, and skills with clear deadlines and commitment targets.
            </p>
          </div>
          <div>
            <div style={{ 
              width: '42px', height: '42px', background: 'var(--accent-subtle)', borderRadius: '12px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem'
            }}>
              <CalendarDays size={24} color="var(--accent-primary)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Daily Consistency</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
              Track daily logs, mood, and focus levels. Build momentum using our streak mechanics designed for long-term consistency.
            </p>
          </div>
          <div>
            <div style={{ 
              width: '42px', height: '42px', background: 'var(--accent-subtle)', borderRadius: '12px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem'
            }}>
              <Zap size={24} color="var(--accent-primary)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>AI Guidance</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
              Leverage personalized AI plans and nudges to stay motivated. Data-driven insights to help you understand your patterns.
            </p>
          </div>
        </div>
      </div>

      {/* Footer-like CTA */}
      <div style={{ padding: '6rem 2rem', background: '#0f172n', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Ready to start your growth journey?</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', marginBottom: '2.5rem', maxWidth: '500px', margin: '1.5rem auto' }}>
          Join others who are architecting their future with precision and data.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/register')} style={{ padding: '1rem 3rem' }}>
          Create Free Account
        </button>
      </div>
    </div>
  );
}

export default Landing;
