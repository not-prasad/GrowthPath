import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckCircle, BarChart2, History, Target, Sparkles } from 'lucide-react';

function DashboardLayout({ children, goal }) {
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/checkin',   label: 'Check-in',  icon: <CheckCircle size={20} /> },
    { to: '/analysis',  label: 'Analysis',  icon: <BarChart2 size={20} /> },
    { to: '/history',   label: 'History',   icon: <History size={20} /> },
    { to: '/ai-plan',   label: 'AI Plan',   icon: <Sparkles size={20} /> },
  ];

  return (
    <>
      <div className="blob-bg">
        <div className="blob-1"></div>
        <div className="blob-2"></div>
      </div>
      <div className="dashboard-layout fade-in">
        {/* SIDEBAR */}
        <div className="sidebar">
          <div style={{ marginBottom: '3rem' }}>
            <h2 className="text-gradient" style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={26} /> GrowthPath
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexGrow: 1 }}>
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

          {goal && (
            <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--panel-border)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Goal</p>
              <p style={{ fontWeight: 600, color: '#fff', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.95rem' }}>{goal.title}</p>
              <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>{goal.category}</span>
            </div>
          )}

          <button
            onClick={() => {
              localStorage.removeItem('growthpath_goal_id');
              navigate('/setup');
            }}
            className="btn btn-outline"
            style={{ marginTop: '1.5rem', width: '100%', padding: '0.6rem', fontSize: '0.875rem', borderRadius: '8px' }}
          >
            Reset Goal
          </button>
        </div>

        {/* MAIN CONTENT */}
        <div className="main-content">
          {children}
        </div>
      </div>
    </>
  );
}

export default DashboardLayout;
