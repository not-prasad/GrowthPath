import React from 'react';

const MILESTONES = [
  {
    key: 'bronze',
    days: 30,
    icon: '🥉',
    label: 'Consistent',
    description: '30-Day Streak',
  },
  {
    key: 'silver',
    days: 60,
    icon: '🥈',
    label: 'Dedicated',
    description: '60-Day Streak',
  },
  {
    key: 'gold',
    days: 100,
    icon: '🥇',
    label: 'Elite',
    description: '100-Day Streak',
  },
];

function MilestonesBadge({ streak = 0 }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.125rem' }}>
            Growth Milestones
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Proof of your consistency — earned, never given.
          </p>
        </div>
        <div style={{
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)',
          background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
          padding: '0.25rem 0.75rem', borderRadius: '999px'
        }}>
          🔥 {streak} day{streak !== 1 ? 's' : ''} current streak
        </div>
      </div>

      <div className="milestone-strip">
        {MILESTONES.map((m) => {
          const earned = streak >= m.days;
          return (
            <div
              key={m.key}
              className={`milestone-badge ${m.key} ${earned ? 'earned' : 'locked'}`}
              title={earned ? `${m.label} — Achieved!` : `${m.days - streak} more days to unlock`}
            >
              {earned && <div className="milestone-shimmer" />}

              <div className="milestone-icon">{earned ? m.icon : '🔒'}</div>

              <div>
                <div className="milestone-label">
                  {earned ? m.label : `${m.days} Days`}
                </div>
                <div className="milestone-days">
                  {earned ? m.description : `${m.days - streak} days to go`}
                </div>
              </div>

              {earned && (
                <div style={{
                  fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', opacity: 0.7,
                  color: m.key === 'bronze' ? '#f5a623' : m.key === 'silver' ? '#e0e0e0' : '#ffe066'
                }}>
                  ✓ Achieved
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MilestonesBadge;
