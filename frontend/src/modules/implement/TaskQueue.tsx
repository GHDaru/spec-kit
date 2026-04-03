import { useState } from 'react';
import {
  getDemoSession,
  getSession,
  addTaskResult,
  updateTaskResult,
  type ExecutionSessionSchema,
  type TaskResultSchema,
  TASK_STATUS_COLOR,
  TASK_STATUS_ICON,
} from '../../api/implement';
import {
  btnStyle,
  btnSecondaryStyle,
  btnSmallStyle,
  cardStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  labelStyle,
  TASK_STATUS_BG,
} from './styles';

export function TaskQueue() {
  const [projectId, setProjectId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [session, setSession] = useState<ExecutionSessionSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  // New result form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskId, setNewTaskId] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newStatus, setNewStatus] = useState('pending');
  const [addLoading, setAddLoading] = useState(false);

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

  async function handleAddResult() {
    if (!session || !newTaskId.trim() || !newTaskTitle.trim()) return;
    setAddLoading(true);
    try {
      const result = await addTaskResult(session.project_id, session.session_id, {
        task_id: newTaskId.trim(),
        task_title: newTaskTitle.trim(),
        status: newStatus as TaskResultSchema['status'],
        started_at: new Date().toISOString(),
        output: '',
        error_message: null,
        completed_at: null,
      });
      setSession({ ...session, task_results: [...session.task_results, result] });
      setNewTaskId('');
      setNewTaskTitle('');
      setNewStatus('pending');
      setShowAddForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Add failed');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleMarkSuccess(result: TaskResultSchema) {
    if (!session) return;
    try {
      const updated = await updateTaskResult(
        session.project_id,
        session.session_id,
        result.result_id,
        { status: 'success', completed_at: new Date().toISOString() }
      );
      setSession({
        ...session,
        task_results: session.task_results.map((r) =>
          r.result_id === result.result_id ? updated : r
        ),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Task Queue</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Ordered list of tasks with live execution status for an implementation session.
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

      {isDemo && <div style={demoBannerStyle}>⚠ Demo mode — sample task queue.</div>}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {session && (
        <div>
          {/* Session header */}
          <div
            style={{
              background: '#f0fdfa',
              border: '1px solid #99f6e4',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontWeight: 700, color: '#0f766e' }}>🤖 {session.agent}</span>
            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
              {session.session_id.slice(0, 8)}…
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#374151' }}>
              {session.task_results.length} task{session.task_results.length !== 1 ? 's' : ''}
            </span>
            {!isDemo && (
              <button style={btnSmallStyle} onClick={() => setShowAddForm((v) => !v)}>
                + Add Task Result
              </button>
            )}
          </div>

          {/* Add form */}
          {showAddForm && (
            <div style={{ ...cardStyle, background: '#f0fdfa', border: '1px solid #99f6e4', marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8, alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>Task ID</label>
                  <input style={inputStyle} value={newTaskId} onChange={(e) => setNewTaskId(e.target.value)} placeholder="task-001" />
                </div>
                <div>
                  <label style={labelStyle}>Task Title</label>
                  <input style={inputStyle} value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Implement feature X" />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    style={{ ...inputStyle, flex: 'none' }}
                  >
                    {['pending', 'running', 'success', 'failure', 'skipped'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <button style={btnStyle} onClick={handleAddResult} disabled={addLoading}>
                  {addLoading ? '…' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {/* Task list */}
          {session.task_results.length === 0 && (
            <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No task results yet.</p>
          )}
          {session.task_results.map((result, idx) => {
            const color = TASK_STATUS_COLOR[result.status];
            return (
              <div
                key={result.result_id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '10px 14px',
                  background: TASK_STATUS_BG[result.status],
                  border: `1px solid ${color}33`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 6,
                  marginBottom: 6,
                }}
              >
                {/* Position */}
                <span
                  style={{
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    borderRadius: '50%',
                    background: color,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  {idx + 1}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>
                    {result.task_title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    ID: <code>{result.task_id}</code>
                    {result.started_at && (
                      <span style={{ marginLeft: 8 }}>Started: {result.started_at.replace('T', ' ').slice(0, 16)}</span>
                    )}
                    {result.completed_at && (
                      <span style={{ marginLeft: 8 }}>Done: {result.completed_at.replace('T', ' ').slice(0, 16)}</span>
                    )}
                  </div>
                  {result.output && (
                    <pre
                      style={{
                        margin: '6px 0 0',
                        padding: '6px 10px',
                        background: '#111827',
                        color: '#d1fae5',
                        borderRadius: 4,
                        fontSize: '0.72rem',
                        overflow: 'auto',
                        maxHeight: 80,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {result.output}
                    </pre>
                  )}
                  {result.error_message && (
                    <div style={{ marginTop: 4, fontSize: '0.78rem', color: '#dc2626' }}>
                      ⚠ {result.error_message}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      background: color + '22',
                      color,
                      border: `1px solid ${color}44`,
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {TASK_STATUS_ICON[result.status]} {result.status}
                  </span>
                  {!isDemo && result.status === 'running' && (
                    <button style={btnSmallStyle} onClick={() => handleMarkSuccess(result)}>
                      Mark ✅
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
