import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, CalendarDays, BrainCircuit } from 'lucide-react';

function Landing() {
  const navigate = useNavigate();

  return (
    <>
      <div className="blob-bg">
        <div className="blob-1"></div>
        <div className="blob-2"></div>
      </div>
      <div className="hero-section fade-in">
        <h1 className="title-huge text-gradient">GrowthPath</h1>
        <p className="subtitle" style={{ fontSize: '1.5rem', marginTop: '1rem' }}>
          Track any goal. Build any habit. <br/>
          Your universal journey starts here.
        </p>

        <button className="btn btn-glowing" onClick={() => navigate('/setup')} style={{ padding: '1.25rem 3rem', fontSize: '1.2rem', marginTop: '1rem' }}>
          Start My Journey <ArrowRight size={24} />
        </button>
      </div>

      <div className="fade-in" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="feature-cards">
          <div className="card">
            <Target size={36} color="var(--accent-purple)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Set Any Goal</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', textAlign: 'center' }}>Gym, study, skill, or habit — we track it all in one unified place.</p>
          </div>
          <div className="card">
            <CalendarDays size={36} color="var(--accent-purple)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Track Daily</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', textAlign: 'center' }}>Build extreme consistency with our daily commitment tracking tools.</p>
          </div>
          <div className="card">
            <BrainCircuit size={36} color="var(--accent-purple)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>AI Insights</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', textAlign: 'center' }}>Get personalized tips and motivation from your smart goal companion.</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Landing;
