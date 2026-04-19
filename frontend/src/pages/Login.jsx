import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user, data.token);
        navigate('/dashboard');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center" style={{ background: '#f8fafc', color: '#1e293b' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            width: '48px', height: '48px', background: '#4f46e5', borderRadius: '12px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            <Target size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>Welcome back</h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Login to continue your growth journey</p>
        </div>

        {error && (
          <div style={{ 
            padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fee2e2', 
            borderRadius: '8px', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '1.5rem' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ color: '#475569', fontSize: '0.875rem', fontWeight: 600 }}>Email address</label>
            <input
              type="email"
              className="form-control"
              style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#1e293b', marginTop: '0.5rem' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ color: '#475569', fontSize: '0.875rem', fontWeight: 600 }}>Password</label>
            <input
              type="password"
              className="form-control"
              style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#1e293b', marginTop: '0.5rem' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ 
              background: '#4f46e5', border: 'none', borderRadius: '8px', fontWeight: 600, 
              padding: '0.75rem', width: '100%', marginTop: '0.5rem', boxShadow: 'none'
            }}
          >
            {loading ? 'Logging in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
          Don't have an account? {' '}
          <Link to="/register" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
