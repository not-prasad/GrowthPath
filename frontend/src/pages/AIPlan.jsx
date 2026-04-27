import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

function AIPlan() {
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // v2 backend does not implement roadmap/todos endpoints.
  }, [token, navigate]);

  return (
    <DashboardLayout goal={null}>
      <div className="premium-page">
        <div className="premium-header">
          <div>
            <p className="premium-kicker">Roadmap</p>
            <h1 className="premium-title">What should I focus on next?</h1>
            <p className="premium-subtitle">
              Your next action is to capture today clearly, then iterate tomorrow based on the result.
            </p>
          </div>
        </div>
        <section className="premium-section">
          <p className="premium-muted" style={{ lineHeight: 1.7 }}>
            In v2, roadmap execution is represented by `daily_tasks` and daily summary logs.
            Plan, track completion, and submit outcomes through the Daily Log flow.
          </p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/log')}>
            Open Daily Log
          </button>
        </section>
        <section className="premium-section">
          <h2 className="premium-section-title">Recommended sequence</h2>
          <div className="premium-insight-list">
            <p className="premium-insight-item"><span>1.</span> Add 2-4 focused tasks for today.</p>
            <p className="premium-insight-item"><span>2.</span> Mark each task done or pending honestly.</p>
            <p className="premium-insight-item"><span>3.</span> Submit your log and review score + brief in Analysis.</p>
          </div>
          {loading && <p className="premium-muted">Loading…</p>}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default AIPlan;
