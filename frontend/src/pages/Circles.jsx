import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Copy, Check, Flame, LogIn } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { API_BASE, authHeaders } from '../api/base';

function MemberCard({ member }) {
  const initial = member.email ? member.email[0].toUpperCase() : '?';
  return (
    <div className="member-card">
      <div className="member-avatar">{initial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {member.email.split('@')[0]}
          {member.is_you && (
            <span style={{
              marginLeft: '0.5rem', fontSize: '0.65rem', background: 'var(--accent-subtle)',
              color: 'var(--accent-primary)', padding: '0.1rem 0.4rem', borderRadius: '3px',
              fontWeight: 700, verticalAlign: 'middle'
            }}>
              You
            </span>
          )}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {member.email}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
        <Flame size={14} color="#f97316" />
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {member.streak}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>days</span>
      </div>
    </div>
  );
}

function CopyInviteCode({ code }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="invite-code-box">{code}</div>
      <button
        onClick={handleCopy}
        className="btn btn-outline"
        style={{ marginTop: '0.75rem', width: '100%', gap: '0.5rem' }}
      >
        {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Code</>}
      </button>
    </div>
  );
}

function Circles() {
  const [goal, setGoal] = useState(null);
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [circleName, setCircleName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchCircles = async () => {
    try {
      const res = await fetch(`${API_BASE}/circles`, { headers: authHeaders(token) });
      if (res.status === 401) { logout(); navigate('/login'); return; }
      if (res.ok) setCircles(await res.json());
    } catch (err) {
      console.warn('Circles fetch error:', err);
    }
  };

  useEffect(() => {
    const goalId = localStorage.getItem('growthpath_goal_id');
    if (!goalId) { navigate('/setup'); return; }
    const init = async () => {
      setLoading(true);
      try {
        const headers = authHeaders(token);
        // GET /api/goals/:id doesn't exist — fetch list and find by stored ID
        const goalsRes = await fetch(`${API_BASE}/goals`, { headers });
        if (goalsRes.status === 401) { logout(); navigate('/login'); return; }
        if (goalsRes.ok) {
          const payload = await goalsRes.json();
          const goals = payload?.goals || [];
          const found = goals.find(g => String(g.id) === String(goalId)) || goals[0] || null;
          if (found) setGoal(found);
        }
        await fetchCircles();
      } catch (err) {
        console.error('Circles init error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!circleName.trim()) return;
    setCreating(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/circles`, {
        method: 'POST', headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: circleName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setCircleName('');
      setSuccess(`Circle "${data.name}" created! Share code: ${data.invite_code}`);
      await fetchCircles();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/circles/join`, {
        method: 'POST', headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: joinCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setJoinCode('');
      setSuccess(data.message || 'Joined circle!');
      await fetchCircles();
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const tabStyle = (tab) => ({
    flex: 1, padding: '0.625rem', border: 'none', cursor: 'pointer',
    borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600,
    transition: 'all 0.15s ease',
    background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
    color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
  });

  return (
    <DashboardLayout goal={goal}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Accountability Circles
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Private, invite-only groups to track streaks together — no rankings, just support.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem' }}>
        {/* Left Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            {/* Tabs */}
            <div style={{
              display: 'flex', gap: '4px', background: 'var(--bg-color)',
              padding: '4px', borderRadius: '8px', marginBottom: '1.5rem',
              border: '1px solid var(--panel-border)'
            }}>
              <button style={tabStyle('create')} onClick={() => setActiveTab('create')}>
                <Plus size={13} style={{ display: 'inline', marginRight: '4px' }} />Create
              </button>
              <button style={tabStyle('join')} onClick={() => setActiveTab('join')}>
                <LogIn size={13} style={{ display: 'inline', marginRight: '4px' }} />Join
              </button>
            </div>

            {error && (
              <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.07)', borderRadius: '8px' }}>
                {error}
              </p>
            )}
            {success && (
              <p style={{ color: 'var(--success)', fontSize: '0.8125rem', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(16,185,129,0.07)', borderRadius: '8px' }}>
                {success}
              </p>
            )}

            {activeTab === 'create' ? (
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label>Circle Name</label>
                  <input
                    id="circle-name"
                    className="form-control"
                    placeholder="e.g. The Focus Gang"
                    value={circleName}
                    onChange={e => setCircleName(e.target.value)}
                  />
                </div>
                <button
                  id="create-circle-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                  style={{ width: '100%' }}
                >
                  {creating ? 'Creating…' : <><Plus size={14} /> Create Circle</>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin}>
                <div className="form-group">
                  <label>Invite Code</label>
                  <input
                    id="circle-invite-code"
                    className="form-control"
                    placeholder="Enter 6-char code"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}
                  />
                </div>
                <button
                  id="join-circle-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={joining}
                  style={{ width: '100%' }}
                >
                  {joining ? 'Joining…' : <><LogIn size={14} /> Join Circle</>}
                </button>
              </form>
            )}
          </div>

          {/* Info box */}
          <div style={{
            padding: '1.125rem 1.25rem', borderRadius: '12px',
            background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)'
          }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '0.4rem' }}>
              🔒 Privacy First
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Only streak counts are shared — no notes, mood data, or goal details are visible to other members.
            </p>
          </div>
        </div>

        {/* Right: Circles List */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading circles…</div>
          ) : circles.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.3 }} />
              <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>No circles yet</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Create one or join a friend's circle using an invite code.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {circles.map((circle, idx) => (
                <div
                  key={circle.id}
                  className="card"
                  style={{ padding: '2rem', animation: `fadeIn 0.3s ease-out ${idx * 0.08}s both` }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {circle.name}
                        </h3>
                        {circle.is_owner && (
                          <span className="badge badge-purple">Owner</span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {circle.members.length} member{circle.members.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <CopyInviteCode code={circle.invite_code} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {circle.members
                      .sort((a, b) => b.streak - a.streak)
                      .map(m => <MemberCard key={m.user_id} member={m} />)
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Circles;
