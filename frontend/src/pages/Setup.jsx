import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
      const response = await fetch('http://localhost:5000/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (response.status === 401) { logout(); navigate('/login'); return; }

      if (response.ok) {
        localStorage.setItem('growthpath_goal_id', data.goal_id);
        navigate('/dashboard');
      } else {
        alert(data.error || 'Failed to create goal.');
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
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: '1.5rem' }}>
            Transform Idea <br/> To Action.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
            Define what you want to achieve, break it down, and build the environment you need to succeed.
          </p>
          
          <div style={{ 
            padding: '1.5rem', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px', 
            boxShadow: 'var(--card-shadow)', fontStyle: 'italic', color: 'var(--text-secondary)' 
          }}>
            "A goal without a timeline is just a dream."
          </div>
        </div>
      </div>

      <div className="setup-right">
        <div style={{ width: '100%', maxWidth: '580px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2rem' }}>Architect Your Next Goal</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>What's your goal?</label>
              <input 
                type="text" 
                name="title" 
                className="form-control" 
                placeholder="e.g. Meditate for 100 days"
                value={formData.title}
                onChange={handleChange}
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Deadline (Days)</label>
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
                <label>Difficulty</label>
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
              <label>Daily Commitment</label>
              <input 
                type="text" 
                name="commitment" 
                className="form-control" 
                placeholder="e.g. 15 mins daily, Code 1 hour"
                value={formData.commitment}
                onChange={handleChange}
                required 
              />
            </div>

            <div className="form-group">
              <label>Motivation (Optional)</label>
              <textarea 
                name="motivation" 
                className="form-control" 
                placeholder="Why is achieving this important to you?"
                value={formData.motivation}
                onChange={handleChange}
                style={{ minHeight: '80px' }}
              ></textarea>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.875rem' }}>
              {loading ? 'Architecting AI Plan...' : 'Generate My Plan'} <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Setup;
