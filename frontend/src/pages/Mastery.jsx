import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, TrendingUp, Award, Zap, History, CheckCircle } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const TIERS = [
  { level: 1, title: 'Novice Dreamer', color: '#94a3b8' },
  { level: 2, title: 'Apprentice', color: '#38bdf8' },
  { level: 3, title: 'Growth Builder', color: '#34d399' },
  { level: 4, title: 'Architect', color: '#a855f7' },
  { level: 5, title: 'Consistency Master', color: '#f59e0b' },
  { level: 6, title: 'Unstoppable Force', color: '#ef4444' },
  { level: 10, title: 'Legend', color: '#fbbf24' }
];

function Mastery() {
  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [profRes, logsRes] = await Promise.all([
          fetch('http://localhost:5000/api/user/profile', { headers }),
          fetch('http://localhost:5000/api/user/exp-logs', { headers })
        ]);
        
        if (profRes.status === 401) { logout(); navigate('/login'); return; }

        const profData = await profRes.json();
        const logsData = await logsRes.json();
        
        setProfile(profData);
        setLogs(logsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, navigate, logout]);

  if (loading || !profile) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
       <div className="spinner"></div>
    </div>
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
  
  const currentExp = profile.exp % 1000;
  const progressPercent = (currentExp / 1000) * 100;

  return (
    <DashboardLayout goal={null}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Mastery</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Your global journey and experience points.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* HERO RANK BLOCK */}
        <div className="card fade-in" style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--panel-bg) 0%, rgba(168, 85, 247, 0.05) 100%)', border: `1px solid ${currentTier.color}40`, position: 'relative', overflow: 'hidden' }}>
           <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '300px', height: '300px', background: `${currentTier.color}15`, filter: 'blur(60px)', borderRadius: '50%' }}></div>
           
           <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-color)', border: `4px solid ${currentTier.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', position: 'relative', boxShadow: `0 0 30px ${currentTier.color}40` }}>
              <Star size={50} color={currentTier.color} fill={currentTier.color} />
              <div style={{ position: 'absolute', bottom: '-10px', background: currentTier.color, color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 800, border: '2px solid var(--panel-bg)' }}>
                LVL {profile.level}
              </div>
           </div>
           
           <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', background: `linear-gradient(90deg, var(--text-primary), ${currentTier.color})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
             {currentTier.title}
           </h2>
           <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 600, marginBottom: '2rem' }}>Total Experience: {profile.exp} EXP</p>

           <div style={{ width: '80%', maxWidth: '300px', textAlign: 'center' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>
               <span>{currentExp} XP</span>
               <span>1000 XP</span>
             </div>
             <div style={{ width: '100%', height: '8px', background: 'var(--input-bg)', borderRadius: '999px', overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
               <div style={{ width: `${progressPercent}%`, height: '100%', background: currentTier.color, borderRadius: '999px' }} />
             </div>
             <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
               {1000 - currentExp} EXP to next level
             </p>
           </div>
        </div>

        {/* TIMELINE PROGRESSION */}
        <div className="card fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
           <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <TrendingUp size={20} color="var(--accent-primary)" /> Unlockable Ranks
           </h3>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', flexGrow: 1 }}>
              <div style={{ position: 'absolute', left: '15px', top: '20px', bottom: '20px', width: '2px', background: 'var(--panel-border)', zIndex: 0 }}></div>
              
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', gap: '1rem', opacity: 0.5 }}>
                 <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: currentTier.color, border: '4px solid var(--panel-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <CheckCircle size={14} color="#fff" />
                 </div>
                 <div style={{ paddingTop: '5px' }}>
                   <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Rank</p>
                   <p style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.125rem' }}>Level {profile.level}: {currentTier.title}</p>
                 </div>
              </div>

              {nextTiers.map((tier, idx) => (
                <div key={idx} style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                   <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--input-bg)', border: `2px solid ${tier.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Award size={14} color={tier.color} />
                   </div>
                   <div style={{ paddingTop: '5px' }}>
                     <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Level {tier.level}</p>
                     <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{tier.title}</p>
                     <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{(tier.level - profile.level) * 1000 - currentExp} EXP away</p>
                   </div>
                </div>
              ))}
              
              {nextTiers.length === 0 && (
                 <div style={{ padding: '1rem', background: 'var(--success-subtle)', color: 'var(--success)', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, textAlign: 'center', marginTop: '1rem' }}>
                    You have unlocked all current ranks!
                 </div>
              )}
           </div>
        </div>

      </div>

      {/* EXPERIENCE LEDGER */}
      <div className="card fade-in" style={{ padding: '2rem' }}>
         <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           <History size={20} color="var(--text-muted)" /> EXP Ledger
         </h3>
         
         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {logs.length === 0 ? (
               <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>No recent experience gained.</p>
            ) : (
               logs.map((log, idx) => (
                   <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                     <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{log.goal}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span>{new Date(log.date).toLocaleDateString()}</span>
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{log.type}</span>
                        </div>
                     </div>
                     <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--success)', background: 'var(--success-subtle)', padding: '0.5rem 1rem', borderRadius: '999px' }}>
                        +{log.exp} XP
                     </div>
                  </div>
               ))
            )}
         </div>
      </div>
      
      {/* Required for the missing CheckCircle element rendering */}
      {/* We need to make sure CheckCircle is imported correctly from lucide-react */}
    </DashboardLayout>
  );
}

// Ensure you import CheckCircle alongside Star etc
// Update imports at the top
export default Mastery;
