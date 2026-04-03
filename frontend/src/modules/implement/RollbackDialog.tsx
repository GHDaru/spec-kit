import { useState } from 'react';
import {
  getDemoSession,
  getSession,
  addCheckpoint,
  type ExecutionSessionSchema,
  type CheckpointSchema,
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
} from './styles';

export function RollbackDialog() {
  const [projectId, setProjectId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [session, setSession] = useState<ExecutionSessionSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  // Add checkpoint form
  const [showAddForm, setShowAddForm] = useState(false);
  const [cpLabel, setCpLabel] = useState('');
  const [cpStoryId, setCpStoryId] = useState('');
  const [cpNotes, setCpNotes] = useState('');
  const [cpLoading, setCpLoading] = useState(false);

  // Rollback selection
  const [selectedCp, setSelectedCp] = useState<CheckpointSchema | null>(null);
  const [showRollbackModal, setShowRollbackModal] = useState(false);

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

  async function handleAddCheckpoint() {
    if (!session || !cpLabel.trim()) return;
    setCpLoading(true);
    try {
      const cp = await addCheckpoint(session.project_id, session.session_id, {
        label: cpLabel.trim(),
        created_at: new Date().toISOString(),
        story_id: cpStoryId.trim() || null,
        notes: cpNotes.trim(),
      });
      setSession({ ...session, checkpoints: [...session.checkpoints, cp] });
      setCpLabel('');
      setCpStoryId('');
      setCpNotes('');
      setShowAddForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Add checkpoint failed');
    } finally {
      setCpLoading(false);
    }
  }

  function openRollback(cp: CheckpointSchema) {
    setSelectedCp(cp);
    setShowRollbackModal(true);
  }

  function handleRollbackConfirm() {
    // In a real system this would call a rollback API; here we just close the modal.
    alert(`Rollback to checkpoint "${selectedCp?.label}" initiated (demo).`);
    setShowRollbackModal(false);
    setSelectedCp(null);
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Rollback Dialog — Checkpoints</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        View named checkpoints in an execution session and select a safe rollback
        point when tasks fail.
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

      {isDemo && <div style={demoBannerStyle}>⚠ Demo mode — sample checkpoint data.</div>}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {session && (
        <div>
          <div
            style={{
              ...cardStyle,
              background: '#f0fdfa',
              border: '1px solid #99f6e4',
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
              {session.checkpoints.length} checkpoint{session.checkpoints.length !== 1 ? 's' : ''}
            </span>
            {!isDemo && (
              <button style={btnSmallStyle} onClick={() => setShowAddForm((v) => !v)}>
                + Add Checkpoint
              </button>
            )}
          </div>

          {/* Add checkpoint form */}
          {showAddForm && (
            <div style={{ ...cardStyle, background: '#f0fdfa', border: '1px solid #99f6e4', marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Label *</label>
                  <input style={inputStyle} value={cpLabel} onChange={(e) => setCpLabel(e.target.value)} placeholder="US-1 complete" />
                </div>
                <div>
                  <label style={labelStyle}>Story ID (optional)</label>
                  <input style={inputStyle} value={cpStoryId} onChange={(e) => setCpStoryId(e.target.value)} placeholder="US-1" />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={cpNotes}
                  onChange={(e) => setCpNotes(e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
                  placeholder="What was completed at this checkpoint?"
                />
              </div>
              <button style={btnStyle} onClick={handleAddCheckpoint} disabled={cpLoading || !cpLabel.trim()}>
                {cpLoading ? 'Saving…' : 'Save Checkpoint'}
              </button>
            </div>
          )}

          {/* Checkpoint list (newest first) */}
          {session.checkpoints.length === 0 && (
            <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No checkpoints recorded yet.</p>
          )}

          {[...session.checkpoints].reverse().map((cp, idx) => (
            <div
              key={cp.checkpoint_id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 14px',
                background: '#fff',
                border: '1px solid #d1fae5',
                borderLeft: '4px solid #059669',
                borderRadius: 6,
                marginBottom: 8,
              }}
            >
              {/* Index from end */}
              <span
                style={{
                  width: 24,
                  height: 24,
                  minWidth: 24,
                  borderRadius: '50%',
                  background: '#059669',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  marginTop: 2,
                }}
              >
                {session.checkpoints.length - idx}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>
                  🚩 {cp.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {cp.created_at.replace('T', ' ').slice(0, 16)}
                  {cp.story_id && (
                    <code style={{ marginLeft: 8, fontSize: '0.72rem', color: '#059669' }}>
                      {cp.story_id}
                    </code>
                  )}
                </div>
                {cp.notes && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#374151' }}>
                    {cp.notes}
                  </p>
                )}
              </div>

              <button style={btnSmallStyle} onClick={() => openRollback(cp)}>
                🔄 Rollback here
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Rollback confirmation modal */}
      {showRollbackModal && selectedCp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 28,
              maxWidth: 480,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 8px', color: '#dc2626' }}>⚠ Confirm Rollback</h3>
            <p style={{ color: '#374151', fontSize: '0.9rem', margin: '0 0 16px' }}>
              You are about to roll back to checkpoint:
            </p>
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: 6,
                padding: '10px 14px',
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 700 }}>🚩 {selectedCp.label}</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 4 }}>
                {selectedCp.created_at.replace('T', ' ').slice(0, 16)}
                {selectedCp.story_id && <span style={{ marginLeft: 8 }}>{selectedCp.story_id}</span>}
              </div>
              {selectedCp.notes && (
                <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#374151' }}>
                  {selectedCp.notes}
                </p>
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: '#dc2626', margin: '0 0 20px' }}>
              All task results after this checkpoint will be reverted. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                style={btnSecondaryStyle}
                onClick={() => { setShowRollbackModal(false); setSelectedCp(null); }}
              >
                Cancel
              </button>
              <button
                style={{ ...btnStyle, background: '#dc2626' }}
                onClick={handleRollbackConfirm}
              >
                Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
