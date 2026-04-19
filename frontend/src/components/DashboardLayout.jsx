import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckCircle, BarChart2, History, Target,
  Sparkles, LogOut, User, Brain, Layers, Sun, Moon,
  Settings, Plus, Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function DashboardLayout({ children, goal }) {
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setProfile(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    if (token) fetchProfile();
  }, [token]);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard',  icon: <LayoutDashboard size={17} /> },
    { to: '/mastery',   label: 'Mastery',    icon: <Star size={17} /> },
    { to: '/checkin',   label: 'Check-in',   icon: <CheckCircle size={17} /> },
    { to: '/analysis',  label: 'Analysis',   icon: <BarChart2 size={17} /> },
    { to: '/history',   label: 'History',    icon: <History size={17} /> },
    { to: '/ai-plan',   label: 'AI Plan',    icon: <Sparkles size={17} /> },
    { to: '/insights',  label: 'Insights',   icon: <Brain size={17} /> },
    { to: '/habits',    label: 'Habit Stack',icon: <Layers size={17} /> },
    { to: '/goals',     label: 'Manage Goals',icon: <Settings size={17} /> },
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
            gap: '0.5rem', color: 'var(--text-primary)', letterSpacing: '-0.02em'
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
          <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'var(--panel-bg)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Mastery</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--accent-primary)' }}>Lvl {profile.level}</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--input-bg)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${((profile.exp % 1000) / 10)}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), #a855f7)', 
                borderRadius: '999px', transition: 'width 0.5s ease' 
              }} />
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0.4rem', fontWeight: 600 }}>
              {profile.exp % 1000} / 1000 XP
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flexGrow: 1 }}>
          <p style={{
            fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
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
            marginTop: 'auto', padding: '1.125rem', background: 'var(--bg-color)',
            borderRadius: '12px', border: '1px solid var(--panel-border)', marginBottom: '1.125rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
              <p style={{
                fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.07em'
              }}>
                Active Goal
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Plus size={12} className="sidebar-icon-btn" onClick={() => navigate('/setup')} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
                <Settings size={12} className="sidebar-icon-btn" onClick={() => navigate('/goals')} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
              </div>
            </div>
            <p style={{
              fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.625rem',
              fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {goal.title}
            </p>
            <span className="badge badge-purple">{goal.category}</span>
          </div>
        )}

        {/* User / Logout */}
        <div style={{ paddingTop: '1.125rem', borderTop: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0 0.25rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '30px', height: '30px', background: 'var(--accent-subtle)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)',
              flexShrink: 0
            }}>
              <User size={14} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email?.split('@')[0]}
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
