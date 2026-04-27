import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckCircle, BarChart2, History, Target,
  Sparkles, LogOut, User, Brain, Layers, Sun, Moon,
  Settings, Plus, Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

function DashboardLayout({ children, goal }) {
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/me`, { headers: authHeaders(token) });
        if (res.ok) {
          const data = await safeJson(res);
          setProfile(data?.user || null);
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (token) fetchProfile();
  }, [token]);

  const navItems = [
    { to: '/dashboard', label: 'Overview',        icon: <LayoutDashboard size={17} /> },
    { to: '/log',       label: 'Run Daily Log',   icon: <CheckCircle size={17} /> },
    { to: '/analysis',  label: 'Analysis',        icon: <BarChart2 size={17} /> },
    { to: '/history',   label: 'History',         icon: <History size={17} /> },
    { to: '/mastery',   label: 'Performance',     icon: <Star size={17} /> },
    { to: '/insights',  label: 'Lab Insights',    icon: <Brain size={17} /> },
    { to: '/goals',     label: 'Manage Goals',    icon: <Settings size={17} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-layout fade-in">
      {/* SIDEBAR */}
      <div className="sidebar">
        {/* Brand + Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 0.25rem' }}>
          <h2 style={{
            fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center',
            gap: '0.5rem', color: '#ffffff', letterSpacing: '-0.02em'
          }}>
            <div style={{
              width: '28px', height: '28px', background: 'var(--accent-primary)', borderRadius: '7px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Target size={17} color="#fff" />
            </div>
            GrowthPath
          </h2>
          <button
            id="theme-toggle"
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        {/* Global Level Profile */}
        {profile && (
          <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sidebar-text)', letterSpacing: '0.08em' }}>XP Progress</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', fontVariantNumeric: 'tabular-nums' }}>Lvl {profile.level}</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${(((profile.total_xp || 0) % 1000) / 10)}%`, height: '100%', background: 'var(--accent-primary)', 
                borderRadius: '999px', transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ fontSize: '0.625rem', color: 'var(--sidebar-text)', textAlign: 'right', marginTop: '0.4rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {(profile.total_xp || 0) % 1000} / 1000 XP
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flexGrow: 1 }}>
          <p style={{
            fontSize: '0.625rem', fontWeight: 700, color: 'var(--sidebar-text)', textTransform: 'uppercase',
            letterSpacing: '0.07em', marginBottom: '0.375rem', paddingLeft: '0.75rem'
          }}>
            Navigation
          </p>
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}
            >
              {icon} {label}
            </NavLink>
          ))}
        </div>

        {/* Active Goal Widget */}
        {goal && (
          <div style={{
            marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.04)',
            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.125rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
              <p style={{
                fontSize: '0.6rem', color: 'var(--sidebar-text)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.07em'
              }}>
                Active Goal
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Plus size={12} className="sidebar-icon-btn" onClick={() => navigate('/setup')} style={{ cursor: 'pointer', color: 'var(--sidebar-text)' }} />
                <Settings size={12} className="sidebar-icon-btn" onClick={() => navigate('/goals')} style={{ cursor: 'pointer', color: 'var(--sidebar-text)' }} />
              </div>
            </div>
            <p style={{
              fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '0.625rem',
              fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {goal.title}
            </p>
            <span className="badge badge-purple">{goal.category}</span>
          </div>
        )}

        {/* User / Logout */}
        <div style={{ paddingTop: '1.125rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0 0.25rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '30px', height: '30px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sidebar-text)',
              flexShrink: 0
            }}>
              <User size={14} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email?.split('@')[0]}
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--sidebar-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="sidebar-nav-link"
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <LogOut size={17} /> Logout
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}

export default DashboardLayout;
