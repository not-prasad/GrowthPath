import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target } from 'lucide-react';

function Setup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    category: 'Health',
    deadline: '',
    commitment: '',
    difficulty: 'Medium',
    motivation: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const setSelection = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:5000/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('growthpath_goal_id', data.goal_id);
        navigate('/dashboard');
      } else {
        console.error('Failed to create goal:', data);
        alert('Failed to generate plan. Make sure backend is running.');
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
      alert('Error connecting to backend.');
    }
  };

  const categories = [
    { id: 'Health', label: 'Health', icon: '💪' },
    { id: 'Study', label: 'Study', icon: '📚' },
    { id: 'Skill', label: 'Skill', icon: '🎯' },
    { id: 'Habit', label: 'Habit', icon: '🔁' },
    { id: 'Custom', label: 'Custom', icon: '✨' },
  ];

  const difficulties = ['Easy', 'Medium', 'Hard'];

  return (
    <>
      <div className="blob-bg">
        <div className="blob-1"></div>
        <div className="blob-2"></div>
      </div>
      <div className="setup-layout fade-in">
        
        <div className="setup-left">
          <Target size={64} color="var(--accent-purple)" style={{ marginBottom: '2rem' }} />
          <h1 className="title-huge text-gradient" style={{ fontSize: '4rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            Transform Idea To Action
          </h1>
          <p className="subtitle" style={{ textAlign: 'left', marginBottom: '2rem' }}>
            Define what you want to achieve, break it down, and build the environment you need to succeed.
          </p>
          <div className="styled-quote" style={{ maxWidth: '400px' }}>
            <p>"A goal without a timeline is just a dream."</p>
          </div>
        </div>

        <div className="setup-right">
          <h2 style={{ fontSize: '2rem', marginBottom: '2rem', width: '100%', maxWidth: '600px', textAlign: 'left' }}>Architect Your Next Goal</h2>
          
          <div className="form-container" style={{ margin: 0, backdropFilter: 'blur(20px)' }}>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">What's your goal?</label>
                <input 
                  type="text" 
                  id="title" 
                  name="title" 
                  className="form-control" 
                  placeholder="e.g. Meditate for 100 days"
                  value={formData.title}
                  onChange={handleChange}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <div className="category-selector">
                  {categories.map(cat => (
                    <div 
                      key={cat.id} 
                      className={`selectable-item ${formData.category === cat.id ? 'active' : ''}`}
                      onClick={() => setSelection('category', cat.id)}
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{cat.icon}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{cat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="deadline">Deadline (Days)</label>
                <input 
                  type="number" 
                  id="deadline" 
                  name="deadline" 
                  className="form-control" 
                  min="1"
                  placeholder="e.g. 30"
                  value={formData.deadline}
                  onChange={handleChange}
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="commitment">Daily Commitment</label>
                <input 
                  type="text" 
                  id="commitment" 
                  name="commitment" 
                  className="form-control" 
                  placeholder="e.g. 15 mins daily, Code 1 hour"
                  value={formData.commitment}
                  onChange={handleChange}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Difficulty</label>
                <div className="difficulty-selector">
                  {difficulties.map(diff => (
                    <div 
                      key={diff} 
                      className={`selectable-item ${formData.difficulty === diff ? 'active' : ''}`}
                      style={{ padding: '0.75rem', borderRadius: '99px' }}
                      onClick={() => setSelection('difficulty', diff)}
                    >
                      {diff}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="motivation">Motivation (Optional)</label>
                <textarea 
                  id="motivation" 
                  name="motivation" 
                  className="form-control" 
                  placeholder="Why is achieving this important to you?"
                  value={formData.motivation}
                  onChange={handleChange}
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', fontSize: '1.1rem', width: '100%' }}>
                Generate My Plan ✨
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default Setup;
