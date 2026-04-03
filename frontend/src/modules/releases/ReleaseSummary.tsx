import { useState } from 'react';
import {
  getDemoReleaseLog,
  getReleaseLogSummary,
  type ReleaseLogSummary,
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
  CHANGE_TYPE_COLOR,
  CHANGE_TYPE_BG,
} from './styles';

export function ReleaseSummary() {
  const [projectId, setProjectId] = useState('');
  const [summary, setSummary] = useState<ReleaseLogSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const data = await getReleaseLogSummary(projectId.trim());
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    const log = getDemoReleaseLog();
    const byStatus: Record<string, number> = { draft: 0, published: 0, yanked: 0 };
    const byChangeType: Record<string, number> = {};
    for (const ct of CHANGE_TYPE_ORDER) byChangeType[ct] = 0;
    let totalChanges = 0;
    for (const release of log.releases) {
      byStatus[release.status] = (byStatus[release.status] ?? 0) + 1;
      for (const c of release.changes) {
        byChangeType[c.change_type] = (byChangeType[c.change_type] ?? 0) + 1;
        totalChanges++;
      }
    }
    setSummary({
      total_releases: log.releases.length,
      by_status: byStatus as ReleaseLogSummary['by_status'],
      total_changes: totalChanges,
      by_change_type: byChangeType as ReleaseLogSummary['by_change_type'],
    });
    setIsDemo(true);
    setError(null);
  }

  const STATUS_ORDER = ['published', 'draft', 'yanked'] as const;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Release Summary</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Statistics dashboard for the release log — counts by status and change type.
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
          ⚠ Demo mode — showing sample summary. Backend not yet connected.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {summary && (
        <div>
          {/* Top-level KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
            <div
              style={{
                ...cardStyle,
                textAlign: 'center',
                borderTop: '3px solid #7c3aed',
                background: '#f5f3ff',
                border: '1px solid #c4b5fd',
              }}
            >
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#7c3aed' }}>
                {summary.total_releases}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>Total Releases</div>
            </div>
            <div
              style={{
                ...cardStyle,
                textAlign: 'center',
                borderTop: '3px solid #0d9488',
                background: '#f0fdfa',
                border: '1px solid #99f6e4',
              }}
            >
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0d9488' }}>
                {summary.total_changes}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>Total Changes</div>
            </div>
          </div>

          {/* By status */}
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, color: '#374151' }}>
              Releases by Status
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {STATUS_ORDER.map((s) => {
                const count = summary.by_status[s] ?? 0;
                return (
                  <div
                    key={s}
                    style={{
                      flex: 1,
                      minWidth: 100,
                      textAlign: 'center',
                      padding: '12px 8px',
                      background: STATUS_COLOR[s] + '11',
                      border: `1px solid ${STATUS_COLOR[s]}44`,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: STATUS_COLOR[s] }}>
                      {count}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                      {STATUS_ICON[s]} {s}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By change type */}
          <div style={cardStyle}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, color: '#374151' }}>
              Changes by Type
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CHANGE_TYPE_ORDER.map((ct) => {
                const count = summary.by_change_type[ct] ?? 0;
                const pct = summary.total_changes > 0 ? (count / summary.total_changes) * 100 : 0;
                return (
                  <div key={ct}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          background: CHANGE_TYPE_BG[ct],
                          color: CHANGE_TYPE_COLOR[ct],
                          border: `1px solid ${CHANGE_TYPE_COLOR[ct]}44`,
                          borderRadius: 3,
                          padding: '1px 7px',
                          fontWeight: 600,
                        }}
                      >
                        {CHANGE_TYPE_LABEL[ct]}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 600 }}>
                        {count}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: '#e5e7eb',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: CHANGE_TYPE_COLOR[ct],
                          borderRadius: 3,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
