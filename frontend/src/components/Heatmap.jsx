import React, { useMemo, useState } from 'react';
import { Calendar, ChevronRight, ChevronLeft, Info, Activity, Smile, Target, Notebook } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function Heatmap({ logs }) {
  const [selectedDay, setSelectedDay] = useState(null);

  const monthsData = useMemo(() => {
    const today = new Date();
    // Generate data for current month and previous 2 months
    const monthBlocks = [];
    
    for (let i = 2; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      
      const firstDayOfMonth = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const days = [];
      // Padding for the start of the month
      for (let p = 0; p < firstDayOfMonth; p++) {
        days.push(null);
      }
      
      // Actual days
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const logEntry = logs?.find(l => l.log_date.startsWith(dateStr));
        
        days.push({
          day,
          date: dateStr,
          done: logEntry?.task_done,
          focus: logEntry?.focus_level,
          mood: logEntry?.mood,
          notes: logEntry?.notes
        });
      }
      
      monthBlocks.push({
        name: MONTH_NAMES[month],
        year,
        days
      });
    }
    
    return monthBlocks;
  }, [logs]);

  const getColor = (entry) => {
    if (!entry || !entry.done) return 'var(--panel-border)';
    if (entry.focus === 5) return 'var(--accent-primary)'; 
    if (entry.focus >= 3) return 'rgba(168, 85, 247, 0.6)'; 
    return 'rgba(168, 85, 247, 0.3)'; 
  };

  const handleDayClick = (entry) => {
    if (entry && entry.date) {
      setSelectedDay(entry);
    }
  };

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} color="var(--accent-primary)" /> Consistency Intelligence
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Track your monthly trajectory and focus patterns.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
        {monthsData.map((month, mIdx) => (
          <div key={mIdx} style={{ animation: `fadeIn 0.5s ease-out ${mIdx * 0.1}s both` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
               <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>{month.name} <span style={{ opacity: 0.5, fontWeight: 400 }}>{month.year}</span></h4>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {WEEK_DAYS.map(wd => (
                <div key={wd} style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'center', marginBottom: '4px' }}>{wd}</div>
              ))}
              {month.days.map((day, dIdx) => (
                <div 
                  key={dIdx}
                  onClick={() => handleDayClick(day)}
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: '4px',
                    background: day ? getColor(day) : 'transparent',
                    border: (selectedDay?.date === day?.date && day) ? '2px solid var(--text-primary)' : '1px solid transparent',
                    cursor: day ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: day?.done ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => { if (day) e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.zIndex = '10' }}
                  onMouseLeave={(e) => { if (day) e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '1' }}
                >
                  {day?.day}
                  {day?.focus === 5 && (
                    <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '6px', height: '6px', background: '#fbbf24', borderRadius: '50%', border: '1px solid var(--bg-color)' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* INTELLIGENCE DRAWER */}
      <div style={{ 
        marginTop: '0.5rem', 
        background: 'var(--input-bg)', 
        borderRadius: '12px', 
        padding: selectedDay ? '1.25rem' : '1rem',
        border: '1px solid var(--panel-border)',
        minHeight: '80px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        transition: 'all 0.3s ease'
      }}>
        {!selectedDay ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
            <Info size={20} />
            <p style={{ fontSize: '0.875rem' }}>Select a day on the calendar to reveal daily intelligence and focus metrics.</p>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>Daily Insight</p>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 800 }}>{new Date(selectedDay.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ padding: '0.4rem 0.8rem', background: selectedDay.done ? 'var(--success-subtle)' : 'var(--danger-subtle)', color: selectedDay.done ? 'var(--success)' : 'var(--danger)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {selectedDay.done ? 'Target Met' : 'Missed'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Activity size={16} color="var(--accent-primary)" />
                <div>
                  <p style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Focus</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 800 }}>{selectedDay.focus || 0}/5 Intensity</p>
                </div>
              </div>
              <div style={{ background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Smile size={16} color="#fbbf24" />
                <div>
                  <p style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Mood</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 800 }}>{selectedDay.mood || 'N/A'}</p>
                </div>
              </div>
              <div style={{ background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Target size={16} color="var(--success)" />
                <div>
                  <p style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Result</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 800 }}>{selectedDay.done ? 'Success' : 'No Log'}</p>
                </div>
              </div>
            </div>

            {selectedDay.notes && (
              <div style={{ background: 'var(--panel-bg)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Notebook size={12} /> Personal Notes
                </p>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  "{selectedDay.notes}"
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
         <span>Intensity Scale:</span>
         <div style={{ display: 'flex', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--panel-border)' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'rgba(168, 85, 247, 0.3)' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'rgba(168, 85, 247, 0.6)' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--accent-primary)' }} title="Focus 5 (Max)" />
         </div>
         <span style={{ marginLeft: '1rem', fontSize: '0.7rem', opacity: 0.7 }}>Tip: Click a day to view daily intelligence drawer.</span>
      </div>
    </div>
  );
}

