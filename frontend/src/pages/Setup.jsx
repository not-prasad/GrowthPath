import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ArrowRight, Sparkles, Compass } from 'lucide-react';
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
    <div className="page-center">
      <div className="theme-bg-layer" />
      <div className="module-bg-overlay bg-setup" />
      
      <div className="blob-container">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="auth-card" style={{ maxWidth: '800px' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            width: '64px', height: '64px', background: 'var(--header-gradient)',
            borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)'
          }}>
            <Compass size={32} color="#fff" strokeWidth={2} />
          </div>
          <h1 className="premium-title">Initialize Protocol</h1>
          <p className="premium-subtitle" style={{ margin: '0.5rem auto 0' }}>Define your objective and calibrate the AI architect.</p>
        </div>

        <div className="glass-card" style={{ padding: '3.5rem' }}>
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

            <div className="premium-grid-two">
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
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
              <label>Strategic Context <span style={{ fontWeight: 400, opacity: 0.4 }}>(optional)</span></label>
              <textarea 
                name="motivation" 
                className="form-control" 
                placeholder="Provide context for the AI planner..."
                value={formData.motivation}
                onChange={handleChange}
                style={{ minHeight: '120px', resize: 'vertical' }}
              ></textarea>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                type="submit" 
                disabled={loading} 
                className="btn btn-primary" 
                style={{ flex: 1, height: '3.5rem', justifyContent: 'center', fontSize: '1rem' }}
              >
                {loading ? <Sparkles className="spinner" size={20} /> : 'Initialize Protocol'} 
                {!loading && <ArrowRight size={20} />}
              </button>
            </div>
          </form>
        </div>

        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Target size={14} /> AI architect will generate tasks based on these parameters.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Setup;
