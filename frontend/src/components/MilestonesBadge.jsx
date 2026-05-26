import React from 'react';
import { Lock, Award, CheckCircle2, Flame } from 'lucide-react';

const MILESTONES = [
  {
    key: 'bronze',
    days: 30,
    label: 'Bronze Milestone',
    description: '30-Day Streak',
    color: '#cd7f32',
    gradient: 'linear-gradient(135deg, rgba(205, 127, 50, 0.12) 0%, rgba(205, 127, 50, 0.03) 100%)',
    border: 'rgba(205, 127, 50, 0.3)',
  },
  {
    key: 'silver',
    days: 60,
    label: 'Silver Milestone',
    description: '60-Day Streak',
    color: '#a1a1aa',
    gradient: 'linear-gradient(135deg, rgba(161, 161, 170, 0.12) 0%, rgba(161, 161, 170, 0.03) 100%)',
    border: 'rgba(161, 161, 170, 0.3)',
  },
  {
    key: 'gold',
    days: 100,
    label: 'Gold Milestone',
    description: '100-Day Streak',
    color: '#fbbf24',
    gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.03) 100%)',
    border: 'rgba(251, 191, 36, 0.35)',
  },
];

function MilestonesBadge({ streak = 0 }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem'
      }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Growth Milestones
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
            Proof of your consistency — earned, never given.
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)',
          background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)',
          padding: '0.3rem 0.85rem', borderRadius: '999px'
        }}>
          <Flame size={14} fill="var(--accent-primary)" />
          <span>{streak} Day Streak</span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem'
      }}>
        {MILESTONES.map((m) => {
          const earned = streak >= m.days;
          const daysToGo = m.days - streak;

          return (
            <div
              key={m.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.25rem',
                borderRadius: '16px',
                background: earned ? m.gradient : 'var(--bg-color)',
                border: earned ? `1px solid ${m.border}` : '1px solid var(--panel-border)',
                boxShadow: earned ? `0 4px 20px rgba(0,0,0,0.03)` : 'none',
                transition: 'all 0.25s ease',
                opacity: earned ? 1 : 0.75,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Badge Icon Container */}
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: earned ? 'var(--panel-bg)' : 'var(--panel-bg)',
                border: `1px solid ${earned ? m.color + '40' : 'var(--panel-border)'}`,
                color: earned ? m.color : 'var(--text-muted)',
                flexShrink: 0,
                boxShadow: earned ? `0 2px 8px ${m.color}20` : 'none'
              }}>
                {earned ? <Award size={22} color={m.color} fill={m.color + '20'} /> : <Lock size={18} />}
              </div>

              {/* Detail Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  color: earned ? 'var(--text-primary)' : 'var(--text-secondary)',
                  marginBottom: '0.15rem'
                }}>
                  {m.label}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: earned ? 'var(--text-secondary)' : 'var(--text-muted)',
                  fontWeight: 500
                }}>
                  {earned ? m.description : `${daysToGo} days to go`}
                </div>
              </div>

              {/* Status Indicator */}
              <div style={{ flexShrink: 0 }}>
                {earned ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: 'var(--success)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'rgba(16, 185, 129, 0.08)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px'
                  }}>
                    <CheckCircle2 size={12} />
                    <span>Unlocked</span>
                  </div>
                ) : (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'var(--panel-bg)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--panel-border)'
                  }}>
                    {m.days}d Lock
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MilestonesBadge;
