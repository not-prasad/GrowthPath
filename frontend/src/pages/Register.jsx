import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, apiErrorMessage, safeJson } from '../api/base';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await safeJson(response);

      if (response.ok) {
        login(data.user, data.token);
        navigate('/setup');
      } else {
        setError(apiErrorMessage(data, 'Registration failed'));
      }
    } catch (err) {
      console.error('Registration fetch error:', err);
      setError('Failed to connect to server. Check if backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background Blobs */}
      <div className="blob-container">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '3rem 2.5rem', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            width: '60px', height: '60px', background: 'var(--header-gradient)', borderRadius: '18px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)'
          }}>
            <Target size={32} color="#fff" />
          </div>
          <h1 className="premium-title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Initialize Account</h1>
          <p className="premium-subtitle">Begin your transformation protocol.</p>
        </div>

        {error && (
          <div className="fade-in" style={{ 
            padding: '1rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', 
            borderRadius: '12px', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1.5rem',
            fontWeight: 600, textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="operator@growthpath.ai"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
          >
            {loading ? 'Initializing...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already registered? {' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 700, textDecoration: 'none' }}>Login Session</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
