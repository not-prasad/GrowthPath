import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Check, 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight, 
  Activity, 
  Zap, 
  Plus, 
  Lock,
  Clock,
  Target,
  BarChart2,
  MoreVertical
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const CATEGORY_STYLES = {
  primary: {
    color: 'var(--accent-primary)',
    bg: 'rgba(99, 102, 241, 0.1)',
    label: 'Primary Objective',
    icon: <Target size={14} />,
    weight: '50%'
  },
  support: {
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.1)',
    label: 'Support Variable',
    icon: <Activity size={14} />,
    weight: '25%'
  },
  optimize: {
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.1)',
    label: 'Optimization Task',
    icon: <Zap size={14} />,
    weight: '15%'
  }
};

function AIPlan() {
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // v2 backend does not implement roadmap/todos endpoints.
  }, [token, navigate, logout]);

  return (
    <DashboardLayout goal={null}>
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>AI Roadmap</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          In v2, tasks are modeled as `daily_tasks` per date. The legacy roadmap/todos endpoints are intentionally not available.
        </p>
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Use <strong>Run Daily Log</strong> to add tasks for today via <code>POST /api/tasks/custom</code>, then submit the daily summary via <code>POST /api/logs</code>.
          </p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/log')}>
            Go to Daily Log
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AIPlan;
