import { useState } from 'react';
import {
  listSessions,
  getDemoSession,
  deleteSession,
  type ExecutionSessionSchema,
  type SessionListResponse,
  SESSION_STATUS_COLOR,
  SESSION_STATUS_ICON,
  TASK_STATUS_ICON,
} from '../../api/implement';
import {
  btnStyle,
  btnSecondaryStyle,
  btnDangerStyle,
  cardStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  STATUS_BG,
  STATUS_BORDER,
} from './styles';

export function ExecutionConsole() {
  const [projectId, setProjectId] = useState('');
  const [sessionList, setSessionList] = useState<SessionListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const data = await listSessions(projectId.trim());
      setSessionList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    const demo = getDemoSession();
    setSessionList({ project_id: demo.project_id, sessions: [demo] });
    setIsDemo(true);
    setError(null);
  }

  async function handleDelete(session: ExecutionSessionSchema) {
    if (!confirm(`Delete session ${session.session_id.slice(0, 8)}…?`)) return;
    try {
      await deleteSession(session.project_id, session.session_id);
      if (sessionList) {
        setSessionList({
          ...sessionList,
          sessions: sessionList.sessions.filter((s) => s.session_id !== session.session_id),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Execution Console</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Browse and manage AI-driven implementation sessions for a project.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Project ID (e.g. my-project)"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={handleLoad} disabled={loading || !projectId.trim()} style={btnStyle}>
          {loading ? 'Loading…' : 'Load'}
        </button>
        <button onClick={handleLoadDemo} style={btnSecondaryStyle}>
          Load Demo
        </button>
      </div>

      {isDemo && (
        <div style={demoBannerStyle}>
          ⚠ Demo mode — showing sample session data. Backend not yet connected.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {sessionList && (
        <div>
          <div
            style={{
              background: '#f0fdfa',
              border: '1px solid #99f6e4',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
            }}
          >
            <h3 style={{ margin: '0 0 4px' }}>Project: {sessionList.project_id}</h3>
            <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
              {sessionList.sessions.length} session{sessionList.sessions.length !== 1 ? 's' : ''}
            </div>
          </div>

          {sessionList.sessions.length === 0 && (
            <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No sessions found.</p>
          )}

          {sessionList.sessions.map((session) => {
            const isOpen = expanded === session.session_id;
            const color = SESSION_STATUS_COLOR[session.status];
            return (
              <div
                key={session.session_id}
                style={{
                  ...cardStyle,
                  background: STATUS_BG[session.status],
                  borderColor: STATUS_BORDER[session.status],
                  borderLeft: `4px solid ${color}`,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : session.session_id)}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#6b7280' }}>
                    {session.session_id.slice(0, 8)}…
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      background: color + '22',
                      color,
                      border: `1px solid ${color}44`,
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontWeight: 600,
                    }}
                  >
                    {SESSION_STATUS_ICON[session.status]} {session.status}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    🤖 {session.agent}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#9ca3af' }}>
                    {session.task_results.length} tasks · {session.checkpoints.length} checkpoints
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#0f766e' }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {session.notes && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#374151' }}>
                    {session.notes}
                  </p>
                )}

                {isOpen && (
                  <div style={{ marginTop: 12 }}>
                    {/* Task Results mini-list */}
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Task Results
                    </div>
                    {session.task_results.map((r) => (
                      <div
                        key={r.result_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '4px 8px',
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: 4,
                          marginBottom: 4,
                          fontSize: '0.82rem',
                        }}
                      >
                        <span>{TASK_STATUS_ICON[r.status]}</span>
                        <span style={{ flex: 1 }}>{r.task_title}</span>
                        <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                          {r.task_id}
                        </span>
                      </div>
                    ))}

                    {/* Actions */}
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      {!isDemo && (
                        <button
                          style={btnDangerStyle}
                          onClick={() => handleDelete(session)}
                        >
                          🗑 Delete Session
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
