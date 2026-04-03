import { useState } from 'react';
import {
  getDemoSession,
  getSession,
  type ExecutionSessionSchema,
  TASK_STATUS_COLOR,
  TASK_STATUS_ICON,
} from '../../api/implement';
import {
  btnStyle,
  btnSecondaryStyle,
  cardStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  TASK_STATUS_BG,
} from './styles';

export function ParallelExecutionLanes() {
  const [projectId, setProjectId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [session, setSession] = useState<ExecutionSessionSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  async function handleLoad() {
    if (!projectId.trim() || !sessionId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const data = await getSession(projectId.trim(), sessionId.trim());
      setSession(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    setSession(getDemoSession());
    setIsDemo(true);
    setError(null);
  }

  function progressPercent(session: ExecutionSessionSchema): number {
    const total = session.task_results.length;
    if (total === 0) return 0;
    const done = session.task_results.filter(
      (r) => r.status === 'success' || r.status === 'skipped'
    ).length;
    return Math.round((done / total) * 100);
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Parallel Execution Lanes</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Multi-lane view showing each task's independent progress and log tail — ideal
        for visualizing concurrently running tasks.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          placeholder="Project ID"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <input
          type="text"
          placeholder="Session ID"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={handleLoad} disabled={loading || !projectId.trim() || !sessionId.trim()} style={btnStyle}>
          {loading ? 'Loading…' : 'Load'}
        </button>
        <button onClick={handleLoadDemo} style={btnSecondaryStyle}>
          Load Demo
        </button>
      </div>

      {isDemo && <div style={demoBannerStyle}>⚠ Demo mode — sample session data.</div>}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {session && (
        <div>
          {/* Overall progress bar */}
          <div style={{ ...cardStyle, background: '#f0fdfa', border: '1px solid #99f6e4', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.88rem', fontWeight: 600 }}>
              <span>🤖 {session.agent} — {session.session_id.slice(0, 8)}…</span>
              <span style={{ color: '#0f766e' }}>{progressPercent(session)}% complete</span>
            </div>
            <div style={{ background: '#d1fae5', borderRadius: 99, height: 10, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPercent(session)}%`,
                  height: '100%',
                  background: '#059669',
                  borderRadius: 99,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#6b7280' }}>
              {session.task_results.filter((r) => r.status === 'success').length} succeeded ·{' '}
              {session.task_results.filter((r) => r.status === 'running').length} running ·{' '}
              {session.task_results.filter((r) => r.status === 'failure').length} failed ·{' '}
              {session.task_results.filter((r) => r.status === 'pending').length} pending
            </div>
          </div>

          {/* Lanes grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}
          >
            {session.task_results.map((result, idx) => {
              const color = TASK_STATUS_COLOR[result.status];
              const percent =
                result.status === 'success' || result.status === 'skipped'
                  ? 100
                  : result.status === 'running'
                  ? 60
                  : result.status === 'failure'
                  ? 100
                  : 0;

              return (
                <div
                  key={result.result_id}
                  style={{
                    background: TASK_STATUS_BG[result.status],
                    border: `1px solid ${color}33`,
                    borderTop: `3px solid ${color}`,
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  {/* Lane header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        minWidth: 20,
                        borderRadius: '50%',
                        background: color,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', flex: 1, lineHeight: 1.3 }}>
                      {result.task_title}
                    </span>
                    <span style={{ fontSize: '1rem' }}>{TASK_STATUS_ICON[result.status]}</span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ background: '#e5e7eb', borderRadius: 99, height: 6, marginBottom: 8, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${percent}%`,
                        height: '100%',
                        background: color,
                        borderRadius: 99,
                      }}
                    />
                  </div>

                  {/* Log tail */}
                  <pre
                    style={{
                      margin: 0,
                      padding: '6px 8px',
                      background: '#111827',
                      color: result.status === 'failure' ? '#fca5a5' : '#d1fae5',
                      borderRadius: 4,
                      fontSize: '0.65rem',
                      overflow: 'hidden',
                      maxHeight: 64,
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.5,
                    }}
                  >
                    {result.output
                      ? result.output.slice(-200)
                      : result.error_message
                      ? `ERROR: ${result.error_message}`
                      : result.status === 'pending'
                      ? '⏳ Waiting to start…'
                      : '▶ Running…'}
                  </pre>

                  {/* Timing */}
                  <div style={{ marginTop: 6, fontSize: '0.68rem', color: '#9ca3af' }}>
                    {result.completed_at
                      ? `Done ${result.completed_at.replace('T', ' ').slice(0, 16)}`
                      : result.started_at
                      ? `Started ${result.started_at.replace('T', ' ').slice(0, 16)}`
                      : 'Not started'}
                  </div>
                </div>
              );
            })}
          </div>

          {session.task_results.length === 0 && (
            <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No task results yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
