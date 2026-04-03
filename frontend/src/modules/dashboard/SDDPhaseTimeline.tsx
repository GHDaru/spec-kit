import { useState } from 'react';
import {
  listFeatures,
  getDemoProject,
  type Feature,
  type FeatureListResponse,
  type PhaseStatus,
  SDD_PHASES,
  PHASE_LABEL,
  PHASE_ICON,
  PHASE_STATUS_COLOR,
  PHASE_STATUS_BG,
} from '../../api/dashboard';
import {
  btnStyle,
  btnSecondaryStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  accentColor,
  accentLight,
  accentBorder,
} from './styles';

const STATUS_LABELS: Record<PhaseStatus, string> = {
  'not-started': '—',
  'in-progress': '▶',
  complete: '✓',
  blocked: '!',
};

const COLUMN_WIDTH = 100;
const ROW_HEIGHT = 48;
const LABEL_WIDTH = 160;

function PhaseCell({ status }: { status: PhaseStatus }) {
  const color = PHASE_STATUS_COLOR[status];
  const bg = PHASE_STATUS_BG[status];
  return (
    <td
      title={status}
      style={{
        width: COLUMN_WIDTH,
        height: ROW_HEIGHT,
        background: bg,
        border: `1px solid ${color}44`,
        textAlign: 'center',
        verticalAlign: 'middle',
        fontSize: '0.85rem',
        fontWeight: 700,
        color,
        cursor: 'default',
      }}
    >
      <div>{STATUS_LABELS[status]}</div>
      <div style={{ fontSize: '0.6rem', opacity: 0.75, fontWeight: 400 }}>{status}</div>
    </td>
  );
}

export function SDDPhaseTimeline() {
  const [projectId, setProjectId] = useState('');
  const [data, setData] = useState<FeatureListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const result = await listFeatures(projectId.trim());
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    const { project, features } = getDemoProject();
    setData({ project_id: project.project_id, features });
    setIsDemo(true);
    setError(null);
  }

  function getStatus(feature: Feature, phase: string): PhaseStatus {
    const p = feature.phase_progress.find((pp) => pp.phase === phase);
    return p?.status ?? 'not-started';
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>SDD Phase Timeline</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Gantt-style view of features across the six SDD phases. Each row is a feature; each column is
        a phase. Colors indicate phase status.
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
          ⚠ Demo mode — showing sample phase timeline. Connect a backend project to use live data.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {data && (
        <div>
          <div
            style={{
              background: accentLight,
              border: `1px solid ${accentBorder}`,
              borderRadius: 8,
              padding: '10px 16px',
              marginBottom: 20,
            }}
          >
            <span style={{ fontWeight: 700, color: accentColor }}>
              Project: {data.project_id}
            </span>
            <span style={{ marginLeft: 12, fontSize: '0.82rem', color: '#6b7280' }}>
              {data.features.length} feature{data.features.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            {(['not-started', 'in-progress', 'complete', 'blocked'] as PhaseStatus[]).map(
              (s) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: PHASE_STATUS_BG[s],
                      border: `1px solid ${PHASE_STATUS_COLOR[s]}66`,
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#374151' }}>{s}</span>
                </div>
              )
            )}
          </div>

          {data.features.length === 0 && (
            <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No features found.</p>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: LABEL_WIDTH + COLUMN_WIDTH * 6 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      width: LABEL_WIDTH,
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#374151',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    Feature
                  </th>
                  {SDD_PHASES.map((phase) => (
                    <th
                      key={phase}
                      style={{
                        width: COLUMN_WIDTH,
                        textAlign: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: accentColor,
                        background: accentLight,
                        border: `1px solid ${accentBorder}`,
                        padding: '6px 4px',
                      }}
                    >
                      <div>{PHASE_ICON[phase]}</div>
                      <div>{PHASE_LABEL[phase]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.features.map((feature) => (
                  <tr key={feature.feature_id}>
                    <td
                      style={{
                        width: LABEL_WIDTH,
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#111827',
                        background: '#fafafa',
                        border: '1px solid #e5e7eb',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: LABEL_WIDTH,
                      }}
                      title={feature.title}
                    >
                      {feature.title}
                    </td>
                    {SDD_PHASES.map((phase) => (
                      <PhaseCell key={phase} status={getStatus(feature, phase)} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!data && !loading && !error && (
        <div style={{ color: '#9ca3af', fontStyle: 'italic', marginTop: 24 }}>
          Enter a project ID, or click "Load Demo" to see sample data.
        </div>
      )}
    </div>
  );
}
