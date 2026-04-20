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
    <div className="setup-layout fade-in">
      
      <div className="setup-left">
        <div style={{ maxWidth: '440px' }}>
          <div style={{ 
            width: '48px', height: '48px', background: 'var(--accent-primary)', borderRadius: '12px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem'
          }}>
            <Target size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '1.25rem' }}>
            Initialize <br />New Experiment.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2.5rem' }}>
            Define the target variable, set a measurable timeline,
            and generate a structured execution roadmap.
          </p>
          
          <div style={{ 
            padding: '1.25rem 1.5rem', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '10px', 
            boxShadow: 'var(--card-shadow)'
          }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>System Note</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              The AI roadmap will generate 3 structured milestones per day
              calibrated to your commitment and difficulty inputs.
            </p>
          </div>
        </div>
      </div>

      <div className="setup-right">
        <div style={{ width: '100%', maxWidth: '580px' }}>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>Performance Lab</p>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2rem', letterSpacing: '-0.02em' }}>Define Experiment Parameters</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Objective</label>
              <input 
                type="text" 
                name="title" 
                className="form-control" 
                placeholder="e.g. Build a daily meditation habit for 60 days"
                value={formData.title}
                onChange={handleChange}
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Duration (Days)</label>
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
                <label>Difficulty Variable</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {difficulties.map(diff => (
                    <div 
                      key={diff} 
                      className={`selectable-item ${formData.difficulty === diff ? 'active' : ''}`}
                      onClick={() => setSelection('difficulty', diff)}
                      style={{ padding: '0.625rem 0' }}
                    >
                      {diff}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Daily Time Commitment</label>
              <input 
                type="text" 
                name="commitment" 
                className="form-control" 
                placeholder="e.g. 30 mins, 1 hour of focused work"
                value={formData.commitment}
                onChange={handleChange}
                required 
              />
            </div>

            <div className="form-group">
              <label>Baseline Context <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem' }}>(optional)</span></label>
              <textarea 
                name="motivation" 
                className="form-control" 
                placeholder="Why this objective? Any relevant context for the AI roadmap..."
                value={formData.motivation}
                onChange={handleChange}
                style={{ minHeight: '80px' }}
              ></textarea>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.875rem' }}>
              {loading ? 'Generating Roadmap...' : 'Initialize Experiment'} <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Setup;
