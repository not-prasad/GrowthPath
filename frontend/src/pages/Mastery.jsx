import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, TrendingUp, Award, Zap, History, CheckCircle, 
  Sparkles, Medal, Shield, Gauge, Activity, Target
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders, safeJson } from '../api/base';

const TIERS = [
  { level: 1,  title: 'Baseline',           color: '#94a3b8', gradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)' },
  { level: 2,  title: 'Consistent',          color: '#38bdf8', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)' },
  { level: 3,  title: 'Calibrated',          color: '#34d399', gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' },
  { level: 4,  title: 'High-Output',         color: '#a855f7', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)' },
  { level: 5,  title: 'Peak Operator',       color: '#f59e0b', gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' },
  { level: 6,  title: 'Elite Performer',     color: '#ef4444', gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' },
  { level: 10, title: 'Master Analyst',      color: '#fbbf24', gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
];

const getPerformanceColor = (score) => {
  if (score >= 90) return 'var(--success)';
  if (score >= 70) return 'var(--accent-primary)';
  if (score >= 50) return 'var(--warning)';
  return 'var(--text-muted)';
};

function Mastery() {
  const [profile, setProfile] = useState(null);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState(null);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = authHeaders(token);
        const [meRes, goalsRes] = await Promise.all([
          fetch(`${API_BASE}/me`, { headers }),
          fetch(`${API_BASE}/goals`, { headers }),
        ]);
        
        if (meRes.status === 401) { logout(); navigate('/login'); return; }
        const me = await safeJson(meRes);
        setProfile(me?.user || null);

        const goalsPayload = await safeJson(goalsRes);
        const goals = goalsPayload?.goals || [];
        const active = goalsPayload?.active_goal_id;
        const stored = localStorage.getItem('growthpath_goal_id');
        const selected = goals.find(g => String(g.id) === String(stored)) || goals.find(g => String(g.id) === String(active)) || goals[0] || null;
        
        if (selected) {
          setGoal(selected);
          localStorage.setItem('growthpath_goal_id', String(selected.id));
          const daysRes = await fetch(`${API_BASE}/logs?goal_id=${selected.id}&limit=15`, { headers });
          const payload = await safeJson(daysRes);
          setDays(payload?.days || []);
        }
      } catch (err) {
        console.error("Mastery Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, navigate, logout]);

  if (loading) return (
    <DashboardLayout goal={goal}>
      <div className="premium-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Sparkles className="spin" size={40} color="var(--accent-primary)" />
        <p className="premium-muted">Calculating ranking telemetry...</p>
      </div>
    </DashboardLayout>
  );

  if (!profile) return (
    <DashboardLayout goal={goal}>
      <div className="premium-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Shield size={40} color="var(--danger)" />
        <p className="premium-muted">Failed to synchronize profile. Please re-authenticate.</p>
        <button className="btn btn-outline" style={{ marginTop: '1rem' }} onClick={() => navigate('/login')}>Return to Login</button>
      </div>
    </DashboardLayout>
  );

  const getTier = (lvl) => {
    let current = TIERS[0];
    for (let t of TIERS) {
      if (lvl >= t.level) current = t;
    }
    return current;
  };

  const currentTier = getTier(profile.level);
  const nextTiers = TIERS.filter(t => t.level > profile.level).slice(0, 3);
  const currentExp = (profile.total_xp || 0) % 1000;
  const progressPercent = (currentExp / 1000) * 100;

  return (
    <DashboardLayout goal={goal}>
      <div className="premium-page">
        <header className="premium-header">
          <p className="premium-kicker">Ranking System</p>
          <h1 className="premium-title">Performance Hierarchy</h1>
          <p className="premium-subtitle">Your rank is determined by cumulative consistency and high-output cycles across all active experiments.</p>
        </header>

        <div className="premium-grid-two" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.7fr)' }}>
          {/* HERO RANK CARD */}
          <section className="premium-section" style={{ 
            position: 'relative', 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            padding: '3rem 2rem'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '-20%', 
              right: '-10%', 
              width: '300px', 
              height: '300px', 
              background: currentTier.color, 
              filter: 'blur(80px)', 
              opacity: 0.15,
              borderRadius: '50%',
              zIndex: 0
            }}></div>

            <div style={{ 
              width: '140px', 
              height: '140px', 
              borderRadius: '50%', 
              background: 'var(--panel-bg)', 
              border: `4px solid ${currentTier.color}`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: '1.5rem', 
              position: 'relative', 
              boxShadow: `0 0 40px ${currentTier.color}30`,
              zIndex: 1
            }}>
              <Medal size={60} color={currentTier.color} />
              <div style={{ 
                position: 'absolute', 
                bottom: '-12px', 
                background: currentTier.gradient, 
                color: '#fff', 
                padding: '0.35rem 1rem', 
                borderRadius: '14px', 
                fontSize: '0.9rem', 
                fontWeight: 800, 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                LEVEL {profile.level}
              </div>
            </div>

            <h2 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 900, 
              marginBottom: '0.25rem', 
              color: 'var(--text-primary)',
              letterSpacing: '-0.04em',
              zIndex: 1
            }}>
              {currentTier.title}
            </h2>
            <p className="premium-muted" style={{ fontWeight: 700, marginBottom: '2rem', zIndex: 1, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Total Accumulation: {profile.total_xp?.toLocaleString() || 0} XP
            </p>

            <div style={{ width: '100%', maxWidth: '340px', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <span>Current Progress</span>
                <span>{currentExp} / 1000 XP</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'var(--bg-color)', borderRadius: '999px', overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
                <div style={{ 
                  width: `${progressPercent}%`, 
                  height: '100%', 
                  background: currentTier.gradient, 
                  borderRadius: '999px',
                  boxShadow: `0 0 10px ${currentTier.color}40`,
                  transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
                }} />
              </div>
              <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 600 }}>
                {1000 - currentExp} XP remaining for <strong>Level {profile.level + 1}</strong>
              </p>
            </div>
          </section>

          {/* NEXT MILESTONES */}
          <section className="premium-section">
            <h3 className="premium-mini-title"><TrendingUp size={18} className="text-secondary" /> Roadmap</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', marginTop: '1.5rem' }}>
              <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '24px', width: '2px', background: 'var(--panel-border)', borderStyle: 'dashed' }}></div>
              
              <div style={{ position: 'relative', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-subtle)', border: '2px solid var(--accent-primary)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  <CheckCircle size={16} />
                </div>
                <div>
                  <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Current</p>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{currentTier.title}</p>
                </div>
              </div>

              {nextTiers.map((tier, idx) => (
                <div key={idx} style={{ position: 'relative', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-color)', border: `2px solid ${tier.color}`, color: tier.color, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    <Shield size={16} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unlock Lvl {tier.level}</p>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{tier.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RECENT PERFORMANCE FEED */}
        <section className="premium-section">
          <h3 className="premium-mini-title"><Activity size={18} className="text-secondary" /> Recent Signal Quality</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
            {days.length === 0 ? (
              <p className="premium-empty" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No telemetry data detected for the active experiment.</p>
            ) : (
              days.map((day) => (
                <div key={day.date} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justify-content: 'space-between', 
                  padding: '1.25rem', 
                  background: 'var(--bg-color)', 
                  borderRadius: '16px', 
                  border: '1px solid var(--panel-border)',
                  transition: 'transform 0.2s ease'
                }} className="premium-card-hover">
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      <span className="badge badge-purple" style={{ fontSize: '0.6rem', padding: '1px 8px' }}>
                        {day.tasks?.length || 0} SECTORS
                      </span>
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 900, 
                    color: getPerformanceColor(day.performance_score || 0), 
                    background: 'var(--panel-bg)', 
                    padding: '0.5rem 0.875rem', 
                    borderRadius: '12px', 
                    border: '1px solid var(--panel-border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {Math.round(day.performance_score || 0)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default Mastery;
