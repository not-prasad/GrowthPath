import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, safeJson } from '../api/base';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        login(data.user, data.token);
        navigate('/dashboard');
      } else {
        setError(data?.error?.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError('Connection failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="theme-bg-layer" />
      <div className="module-bg-overlay bg-login" />
      <div className="blob-container">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
      </div>
      
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '48px', height: '48px', background: 'var(--accent-primary)',
            borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)'
          }}>
            <Target size={24} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 className="premium-title" style={{ fontSize: '2rem' }}>Welcome Back</h1>
          <p className="premium-subtitle">Continue your performance journey.</p>
        </div>

        <div className="glass-card" style={{ padding: '2.5rem' }}>
          {error && (
            <div style={{
              background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
              borderRadius: '12px', padding: '1rem', color: 'var(--danger)',
              fontSize: '0.875rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem'
            }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', height: '3.25rem' }}
              disabled={loading}
            >
              {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Sign In to Dashboard'}
            </button>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--panel-border)', paddingTop: '1.5rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              New to GrowthPath?{' '}
              <button
                onClick={() => navigate('/register')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer' }}
              >
                Create an Account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
