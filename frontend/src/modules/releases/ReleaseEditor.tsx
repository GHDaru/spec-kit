import { useState } from 'react';
import {
  getDemoReleaseLog,
  getReleaseLog,
  addChangeEntry,
  updateReleaseStatus,
  type ReleaseLogResponse,
  type ReleaseSchema,
  type ChangeType,
  type ReleaseStatus,
  CHANGE_TYPE_ORDER,
  STATUS_COLOR,
  STATUS_ICON,
} from '../../api/releases';
import {
  btnStyle,
  btnSecondaryStyle,
  btnSmallStyle,
  cardStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  labelStyle,
  CHANGE_TYPE_COLOR,
} from './styles';

const CHANGE_TYPES: ChangeType[] = ['feat', 'fix', 'docs', 'refactor', 'test', 'chore', 'breaking'];
const STATUS_OPTIONS: ReleaseStatus[] = ['draft', 'published', 'yanked'];

export function ReleaseEditor() {
  const [projectId, setProjectId] = useState('');
  const [log, setLog] = useState<ReleaseLogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  // Add change form state
  const [changeType, setChangeType] = useState<ChangeType>('feat');
  const [changeDesc, setChangeDesc] = useState('');
  const [changeTaskId, setChangeTaskId] = useState('');
  const [changeStoryId, setChangeStoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const data = await getReleaseLog(projectId.trim());
      setLog(data);
      setSelectedVersion(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    setLog(getDemoReleaseLog());
    setIsDemo(true);
    setError(null);
    setSelectedVersion(null);
  }

  async function handleAddChange() {
    if (!projectId.trim() || !selectedVersion || !changeDesc.trim() || isDemo) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const entry = await addChangeEntry(projectId.trim(), selectedVersion, {
        change_type: changeType,
        description: changeDesc.trim(),
        task_id: changeTaskId.trim() || null,
        story_id: changeStoryId.trim() || null,
      });
      // Update local state
      setLog((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          releases: prev.releases.map((r) =>
            r.version === selectedVersion
              ? { ...r, changes: [...r.changes, entry] }
              : r
          ),
        };
      });
      setChangeDesc('');
      setChangeTaskId('');
      setChangeStoryId('');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(version: string, newStatus: ReleaseStatus) {
    if (!projectId.trim() || isDemo) return;
    try {
      const updated = await updateReleaseStatus(projectId.trim(), version, newStatus);
      setLog((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          releases: prev.releases.map((r) =>
            r.version === version ? updated : r
          ),
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  const selectedRelease: ReleaseSchema | undefined =
    log?.releases.find((r) => r.version === selectedVersion);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Release Editor</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Add changelog entries and update release status.
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
          ⚠ Demo mode — edits are disabled. Load a real project to make changes.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {log && (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
          {/* Release list */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Select Release</div>
            {log.releases.map((r) => (
              <div
                key={r.version}
                onClick={() => setSelectedVersion(r.version)}
                style={{
                  padding: '8px 12px',
                  marginBottom: 6,
                  borderRadius: 6,
                  cursor: 'pointer',
                  border: `1px solid ${selectedVersion === r.version ? STATUS_COLOR[r.status] : '#e5e7eb'}`,
                  background: selectedVersion === r.version ? STATUS_COLOR[r.status] + '11' : '#f9fafb',
                }}
              >
                <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {r.version}
                </div>
                <div style={{ fontSize: '0.72rem', color: STATUS_COLOR[r.status], marginTop: 2 }}>
                  {STATUS_ICON[r.status]} {r.status}
                </div>
              </div>
            ))}
          </div>

          {/* Editor panel */}
          <div>
            {selectedRelease ? (
              <>
                {/* Release header */}
                <div style={{ ...cardStyle, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontFamily: 'monospace' }}>{selectedRelease.version}</h3>
                    {selectedRelease.title && (
                      <span style={{ color: '#6b7280' }}>{selectedRelease.title}</span>
                    )}
                  </div>
                  {/* Status selector */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ ...labelStyle, margin: 0, marginRight: 4, alignSelf: 'center' }}>
                      Status:
                    </span>
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        disabled={isDemo}
                        onClick={() => handleStatusChange(selectedRelease.version, s)}
                        style={{
                          padding: '4px 12px',
                          border: `1px solid ${STATUS_COLOR[s]}`,
                          background:
                            selectedRelease.status === s
                              ? STATUS_COLOR[s]
                              : 'transparent',
                          color: selectedRelease.status === s ? '#fff' : STATUS_COLOR[s],
                          borderRadius: 4,
                          cursor: isDemo ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                        }}
                      >
                        {STATUS_ICON[s]} {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Existing changes */}
                <div style={{ ...cardStyle, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 8 }}>
                    Changes ({selectedRelease.changes.length})
                  </div>
                  {selectedRelease.changes.length === 0 ? (
                    <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No changes yet.</div>
                  ) : (
                    CHANGE_TYPE_ORDER.map((ct) => {
                      const entries = selectedRelease.changes.filter((c) => c.change_type === ct);
                      if (entries.length === 0) return null;
                      return (
                        <div key={ct} style={{ marginBottom: 8 }}>
                          <div
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: CHANGE_TYPE_COLOR[ct],
                              marginBottom: 3,
                            }}
                          >
                            {ct.toUpperCase()}
                          </div>
                          {entries.map((e) => (
                            <div
                              key={e.change_id}
                              style={{
                                fontSize: '0.83rem',
                                padding: '3px 0',
                                borderBottom: '1px solid #f3f4f6',
                              }}
                            >
                              • {e.description}
                            </div>
                          ))}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add change form */}
                {!isDemo && (
                  <div style={cardStyle}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 12 }}>
                      Add Change Entry
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <select
                        value={changeType}
                        onChange={(e) => setChangeType(e.target.value as ChangeType)}
                        style={{ ...inputStyle, flex: '0 0 auto', width: 120 }}
                      >
                        {CHANGE_TYPES.map((ct) => (
                          <option key={ct} value={ct}>
                            {ct}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Description"
                        value={changeDesc}
                        onChange={(e) => setChangeDesc(e.target.value)}
                        style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <input
                        type="text"
                        placeholder="Task ID (optional)"
                        value={changeTaskId}
                        onChange={(e) => setChangeTaskId(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <input
                        type="text"
                        placeholder="Story ID (optional)"
                        value={changeStoryId}
                        onChange={(e) => setChangeStoryId(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                    {submitError && <div style={{ ...errorStyle, marginBottom: 8 }}>⚠ {submitError}</div>}
                    <button
                      onClick={handleAddChange}
                      disabled={submitting || !changeDesc.trim()}
                      style={btnSmallStyle}
                    >
                      {submitting ? 'Adding…' : '+ Add Change'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '0.9rem', paddingTop: 8 }}>
                Select a release from the list to edit it.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
