import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, apiErrorMessage, authHeaders, safeJson } from '../api/base';

function Setup() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    deadline: '',
    commitment: '',
    difficulty: 'Medium',
    motivation: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const setSelection = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        title: formData.title,
        deadline_days: Number(formData.deadline || 30),
        commitment: formData.commitment,
        difficulty: formData.difficulty,
        motivation: formData.motivation,
        set_active: true,
      };
      const response = await fetch(`${API_BASE}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(payload),
      });
      
      const data = await safeJson(response);
      
      if (response.status === 401) { logout(); navigate('/login'); return; }

      if (response.ok) {
        const goalId = data?.goal?.id;
        if (goalId) localStorage.setItem('growthpath_goal_id', String(goalId));
        navigate('/dashboard');
      } else {
        alert(apiErrorMessage(data, 'Failed to create goal.'));
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
      alert('Error connecting to backend.');
    } finally {
      setLoading(false);
    }
  };

  const difficulties = ['Easy', 'Medium', 'Hard'];

  return (
    <div className="premium-page fade-in" style={{ minHeight: '100vh', padding: 0 }}>
      {/* Background Blobs */}
      <div className="blob-container">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 1.5fr', minHeight: '100vh' }}>
        {/* Left Panel: Context */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          backdropFilter: 'blur(40px)', 
          borderRight: '1px solid var(--panel-border)',
          padding: '4rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ maxWidth: '440px' }}>
            <div style={{ 
              width: '64px', height: '64px', background: 'var(--header-gradient)', borderRadius: '20px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2.5rem',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)'
            }}>
              <Target size={32} color="#fff" />
            </div>
            <h1 className="premium-title" style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>
              Initialize <br />New Protocol.
            </h1>
            <p className="premium-subtitle" style={{ fontSize: '1.1rem', marginBottom: '3rem' }}>
              Define your objective, calibrate your timeline, and let the AI architect your daily execution roadmap.
            </p>
            
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <p className="premium-kicker" style={{ fontSize: '0.7rem' }}>System Intelligence</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Your execution protocol will be dynamically adjusted based on the difficulty and commitment variables you provide.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel: Form */}
        <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: '540px' }}>
            <p className="premium-kicker">Configuration</p>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '2.5rem' }}>Define Experiment Parameters</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="form-group">
                <label>Primary Objective</label>
                <input 
                  type="text" 
                  name="title" 
                  className="form-control" 
                  placeholder="e.g. Master React Advanced Patterns"
                  value={formData.title}
                  onChange={handleChange}
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label>Timeline (Days)</label>
                  <input 
                    type="number" 
                    name="deadline" 
                    className="form-control" 
                    min="1"
                    placeholder="30"
                    value={formData.deadline}
                    onChange={handleChange}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Difficulty Matrix</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {difficulties.map(diff => (
                      <button 
                        key={diff} 
                        type="button"
                        className={`btn ${formData.difficulty === diff ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setSelection('difficulty', diff)}
                        style={{ padding: '0.625rem 0', fontSize: '0.75rem', justifyContent: 'center' }}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Daily Allocation</label>
                <input 
                  type="text" 
                  name="commitment" 
                  className="form-control" 
                  placeholder="e.g. 2 hours of deep focus"
                  value={formData.commitment}
                  onChange={handleChange}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Strategic Context <span style={{ fontWeight: 400, opacity: 0.5 }}>(optional)</span></label>
                <textarea 
                  name="motivation" 
                  className="form-control" 
                  placeholder="Provide context for the AI planner..."
                  value={formData.motivation}
                  onChange={handleChange}
                  style={{ minHeight: '100px' }}
                ></textarea>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '1rem', justifyContent: 'center' }}>
                {loading ? 'Generating roadmap...' : 'Initialize Protocol'} <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Setup;
