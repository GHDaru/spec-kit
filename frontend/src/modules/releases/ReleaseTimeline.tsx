import { useState } from 'react';
import {
  getDemoReleaseLog,
  getReleaseLog,
  type ReleaseLogResponse,
  STATUS_COLOR,
  STATUS_ICON,
  CHANGE_TYPE_LABEL,
} from '../../api/releases';
import {
  btnStyle,
  btnSecondaryStyle,
  cardStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  labelStyle,
} from './styles';

const STATUS_ORDER = ['published', 'draft', 'yanked'] as const;

export function ReleaseTimeline() {
  const [projectId, setProjectId] = useState('');
  const [log, setLog] = useState<ReleaseLogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

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

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Release Timeline</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Visual timeline of all releases ordered from newest to oldest.
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
          ⚠ Demo mode — showing sample timeline. Backend not yet connected.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {log && (
        <div>
          {/* Status legend */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {STATUS_ORDER.map((s) => (
              <span
                key={s}
                style={{
                  fontSize: '0.78rem',
                  background: STATUS_COLOR[s] + '22',
                  color: STATUS_COLOR[s],
                  border: `1px solid ${STATUS_COLOR[s]}44`,
                  borderRadius: 4,
                  padding: '3px 10px',
                  fontWeight: 600,
                }}
              >
                {STATUS_ICON[s]} {s}
              </span>
            ))}
          </div>

          {/* Timeline */}
          <div style={{ position: 'relative', paddingLeft: 32 }}>
            {/* Vertical line */}
            <div
              style={{
                position: 'absolute',
                left: 10,
                top: 0,
                bottom: 0,
                width: 2,
                background: '#e5e7eb',
              }}
            />

            {log.releases.map((release, i) => (
              <div key={release.version} style={{ position: 'relative', marginBottom: 20 }}>
                {/* Dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: -27,
                    top: 14,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: STATUS_COLOR[release.status],
                    border: '2px solid #fff',
                    boxShadow: `0 0 0 2px ${STATUS_COLOR[release.status]}`,
                    zIndex: 1,
                  }}
                />

                <div
                  style={{
                    ...cardStyle,
                    margin: 0,
                    borderLeft: `3px solid ${STATUS_COLOR[release.status]}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem' }}>
                      {release.version}
                    </span>
                    {release.title && (
                      <span style={{ color: '#374151' }}>{release.title}</span>
                    )}
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.72rem',
                        color: STATUS_COLOR[release.status],
                        fontWeight: 600,
                      }}
                    >
                      {STATUS_ICON[release.status]} {release.status}
                    </span>
                    {release.date && (
                      <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{release.date}</span>
                    )}
                  </div>

                  {release.notes && (
                    <p style={{ margin: '0 0 8px', fontSize: '0.83rem', color: '#6b7280' }}>
                      {release.notes}
                    </p>
                  )}

                  {/* Change summary by type */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(
                      release.changes.reduce<Record<string, number>>((acc, c) => {
                        acc[c.change_type] = (acc[c.change_type] ?? 0) + 1;
                        return acc;
                      }, {})
                    ).map(([ct, count]) => (
                      <span
                        key={ct}
                        style={{
                          fontSize: '0.7rem',
                          background: '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #e5e7eb',
                          borderRadius: 3,
                          padding: '1px 6px',
                        }}
                      >
                        {CHANGE_TYPE_LABEL[ct as keyof typeof CHANGE_TYPE_LABEL]?.split(' ').slice(-1)[0] ?? ct} ×{count}
                      </span>
                    ))}
                    {release.changes.length === 0 && (
                      <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>No changes</span>
                    )}
                  </div>

                  {/* Links to other modules */}
                  {(release.task_list_id || release.spec_id || release.plan_id) && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {release.task_list_id && (
                        <span style={{ ...labelStyle, fontWeight: 400, fontSize: '0.72rem', color: '#0d9488', margin: 0 }}>
                          🔨 {release.task_list_id}
                        </span>
                      )}
                      {release.spec_id && (
                        <span style={{ ...labelStyle, fontWeight: 400, fontSize: '0.72rem', color: '#0891b2', margin: 0 }}>
                          📐 {release.spec_id}
                        </span>
                      )}
                      {release.plan_id && (
                        <span style={{ ...labelStyle, fontWeight: 400, fontSize: '0.72rem', color: '#8b5cf6', margin: 0 }}>
                          🏗️ {release.plan_id}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Connector label */}
                {i < log.releases.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: -20,
                      bottom: -14,
                      fontSize: '0.65rem',
                      color: '#d1d5db',
                    }}
                  >
                    ↓
                  </div>
                )}
              </div>
            ))}

            {log.releases.length === 0 && (
              <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>No releases found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
