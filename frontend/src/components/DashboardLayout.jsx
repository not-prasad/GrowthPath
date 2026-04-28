import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart3, 
  Target, 
  History, 
  BrainCircuit, 
  Lightbulb, 
  LogOut, 
  CheckCircle2, 
  Trophy,
  Calendar,
  Settings,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function DashboardLayout({ children, overlayClass = "" }) {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Daily Tasks', path: '/tasks', icon: CheckCircle2 },
    { name: 'Habit Stack', path: '/habits', icon: Calendar },
    { name: 'Performance AI', path: '/analysis', icon: BrainCircuit },
    { name: 'Insights', path: '/insights', icon: Lightbulb },
    { name: 'History', path: '/history', icon: History },
    { name: 'Goal Mastery', path: '/mastery', icon: Trophy },
    { name: 'Weekly Review', path: '/weekly', icon: BarChart3 },
    { name: 'Settings', path: '/goals', icon: Settings },
  ];

  return (
    <div className={`dashboard-layout fade-in ${mobileMenuOpen ? 'mobile-menu-active' : ''}`}>
      {/* LAYER -10: BASE THEME COLOR */}
      <div className="theme-bg-layer" />
      
      {/* MOBILE HEADER */}
      <div className="mobile-header">
        <button 
          className="hamburger" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ padding: '8px', background: 'var(--accent-subtle)', borderRadius: '8px', color: 'var(--accent-primary)', border: 'none' }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--header-gradient)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.1rem' }}>GrowthPath</span>
        </div>
      </div>

      {/* SIDEBAR */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div style={{ padding: '0 0.75rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--header-gradient)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)' }}>
              <Target size={22} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>GrowthPath</h1>
              <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--sidebar-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Performance Lab</p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <item.icon size={20} strokeWidth={location.pathname === item.path ? 2.5 : 2} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.9rem' }}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email?.split('@')[0]}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--sidebar-text)' }}>Standard Tier</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '10px', height: '40px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button 
              onClick={handleLogout}
              className="sidebar-nav-link"
              style={{ flex: 2, background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: 'none', cursor: 'pointer', justifyContent: 'center' }}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* LAYER -5: DYNAMIC MODULE BACKGROUND */}
      {overlayClass && <div className={`module-bg-overlay ${overlayClass}`} />}

      {/* LAYER -3: ATMOSPHERIC BLOBS */}
      <div className="blob-container">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;
