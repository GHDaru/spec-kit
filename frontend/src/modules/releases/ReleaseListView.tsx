import { useState } from 'react';
import {
  getReleaseLog,
  getDemoReleaseLog,
  type ReleaseLogResponse,
  type ReleaseSchema,
  STATUS_COLOR,
  STATUS_ICON,
  CHANGE_TYPE_LABEL,
  CHANGE_TYPE_ORDER,
} from '../../api/releases';
import {
  btnStyle,
  btnSecondaryStyle,
  cardStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  labelStyle,
  STATUS_BG,
  STATUS_BORDER,
  CHANGE_TYPE_COLOR,
  CHANGE_TYPE_BG,
} from './styles';

export function ReleaseListView() {
  const [projectId, setProjectId] = useState('');
  const [log, setLog] = useState<ReleaseLogResponse | null>(null);
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
      const data = await getReleaseLog(projectId.trim());
      setLog(data);
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
  }

  function toggleExpand(version: string) {
    setExpanded((prev) => (prev === version ? null : version));
  }

  function changeCountByType(release: ReleaseSchema) {
    const counts: Record<string, number> = {};
    for (const c of release.changes) {
      counts[c.change_type] = (counts[c.change_type] ?? 0) + 1;
    }
    return counts;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Browse Release Log</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        View all versioned releases and their changelog entries for a project.
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
          ⚠ Demo mode — showing sample release log. Backend not yet connected.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {log && (
        <div>
          {/* Header */}
          <div
            style={{
              background: '#f5f3ff',
              border: '1px solid #c4b5fd',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
            }}
          >
            <h3 style={{ margin: '0 0 4px' }}>{log.project_name}</h3>
            <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
              {log.releases.length} release{log.releases.length !== 1 ? 's' : ''}
            </div>
            {log.notes && (
              <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#374151' }}>
                {log.notes}
              </p>
            )}
          </div>

          {/* Release cards */}
          {log.releases.map((release) => {
            const counts = changeCountByType(release);
            const isOpen = expanded === release.version;
            return (
              <div
                key={release.version}
                style={{
                  ...cardStyle,
                  borderLeft: `4px solid ${STATUS_COLOR[release.status]}`,
                  background: STATUS_BG[release.status],
                  border: `1px solid ${STATUS_BORDER[release.status]}`,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                  onClick={() => toggleExpand(release.version)}
                >
                  <span style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'monospace' }}>
                    {release.version}
                  </span>
                  {release.title && (
                    <span style={{ color: '#374151', fontSize: '0.9rem' }}>{release.title}</span>
                  )}
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '0.75rem',
                      background: STATUS_COLOR[release.status] + '22',
                      color: STATUS_COLOR[release.status],
                      border: `1px solid ${STATUS_COLOR[release.status]}44`,
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontWeight: 600,
                    }}
                  >
                    {STATUS_ICON[release.status]} {release.status}
                  </span>
                  {release.date && (
                    <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{release.date}</span>
                  )}
                  <span style={{ fontSize: '0.85rem', color: '#7c3aed' }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {/* Change type badges */}
                <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                  {CHANGE_TYPE_ORDER.filter((ct) => counts[ct] > 0).map((ct) => (
                    <span
                      key={ct}
                      style={{
                        fontSize: '0.68rem',
                        background: CHANGE_TYPE_BG[ct],
                        color: CHANGE_TYPE_COLOR[ct],
                        border: `1px solid ${CHANGE_TYPE_COLOR[ct]}44`,
                        borderRadius: 3,
                        padding: '1px 6px',
                        fontWeight: 600,
                      }}
                    >
                      {CHANGE_TYPE_LABEL[ct].split(' ').slice(-1)[0]} ×{counts[ct]}
                    </span>
                  ))}
                  {release.changes.length === 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>No changes recorded</span>
                  )}
                </div>

                {/* Expanded change list */}
                {isOpen && (
                  <div style={{ marginTop: 12 }}>
                    {release.notes && (
                      <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#374151' }}>
                        {release.notes}
                      </p>
                    )}
                    {CHANGE_TYPE_ORDER.map((ct) => {
                      const entries = release.changes.filter((c) => c.change_type === ct);
                      if (entries.length === 0) return null;
                      return (
                        <div key={ct} style={{ marginBottom: 8 }}>
                          <div
                            style={{
                              ...labelStyle,
                              color: CHANGE_TYPE_COLOR[ct],
                              marginBottom: 4,
                            }}
                          >
                            {CHANGE_TYPE_LABEL[ct]}
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {entries.map((e) => (
                              <li key={e.change_id} style={{ fontSize: '0.85rem', marginBottom: 2 }}>
                                {e.description}
                                {e.story_id && (
                                  <code style={{ marginLeft: 6, fontSize: '0.72rem', color: '#7c3aed' }}>
                                    {e.story_id}
                                  </code>
                                )}
                                {e.task_id && (
                                  <code style={{ marginLeft: 4, fontSize: '0.72rem', color: '#0d9488' }}>
                                    {e.task_id}
                                  </code>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
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
