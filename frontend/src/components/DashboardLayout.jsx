import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckCircle, BarChart2, History, Target,
  Sparkles, LogOut, User, Brain, Layers, Sun, Moon,
  Settings, Plus, Star, CalendarDays
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

function DashboardLayout({ children, goal, overlayClass }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', label: 'Overview',        icon: <LayoutDashboard size={17} /> },
    { to: '/tasks',     label: 'Daily Tasks',     icon: <Target size={17} /> },
    { to: '/log',       label: 'Daily Log',       icon: <CheckCircle size={17} /> },
    { to: '/weekly',    label: 'Weekly Review',   icon: <CalendarDays size={17} /> },
    { to: '/analysis',  label: 'Analysis',        icon: <BarChart2 size={17} /> },
    { to: '/history',   label: 'History',         icon: <History size={17} /> },
    { to: '/mastery',   label: 'Achievements',    icon: <Star size={17} /> },
    { to: '/insights',  label: 'AI Advice',       icon: <Brain size={17} /> },
    { to: '/goals',     label: 'Manage Goals',    icon: <Settings size={17} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-layout fade-in">
      {/* MODULE BACKGROUND OVERLAY */}
      {overlayClass && <div className={`module-bg-overlay ${overlayClass}`} />}

      {/* PREMIUM BACKGROUND BLOBS */}
      <div className="blob-container">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* SIDEBAR */}
      <div className="sidebar">
        {/* Brand + Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 0.25rem' }}>
          <h2 style={{
            fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center',
            gap: '0.625rem', color: '#ffffff', letterSpacing: '-0.04em'
          }}>
            <div style={{
              width: '32px', height: '32px', background: 'var(--accent-primary)', borderRadius: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)'
            }}>
              <Target size={18} color="#fff" strokeWidth={2.5} />
            </div>
            GrowthPath
          </h2>
          <button
            id="theme-toggle"
            className="theme-toggle"
            onClick={toggleTheme}
            style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        {/* Global Level Profile */}
        {user && (
          <div style={{ marginBottom: '2.5rem', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>Your Level</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-primary)', fontVariantNumeric: 'tabular-nums' }}>{user.level}</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ 
                width: `${Math.min(100, Math.round(((user.total_xp || 0) % 1000) / 10))}%`, height: '100%', 
                background: 'var(--accent-primary)', borderRadius: '999px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 10px rgba(99, 102, 241, 0.8)'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.625rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Level Progress</span>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {(user.total_xp || 0) % 1000} / 1000
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
          <p style={{
            fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: '0.75rem', paddingLeft: '1rem'
          }}>
            Main Menu
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
            marginTop: 'auto', padding: '1.25rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.02) 100%)',
            borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{
                fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em'
              }}>
                Active Goal
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Plus size={14} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }} onClick={() => navigate('/setup')} />
              </div>
            </div>
            <p style={{
              fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem',
              fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {goal.title}
            </p>
            <div className="badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent-primary)', fontSize: '0.65rem', padding: '0.15rem 0.6rem', borderRadius: '6px' }}>
              {goal.category}
            </div>
          </div>
        )}

        {/* User / Logout */}
        <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem', marginBottom: '1rem' }}>
            <div style={{
              width: '36px', height: '36px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)',
              flexShrink: 0, border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <User size={18} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email?.split('@')[0]}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                GrowthPath Member
              </p>
            </div>
          </div>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="sidebar-nav-link"
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <LogOut size={18} /> Logout Session
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
