import { useState } from 'react';
import {
  listFeatures,
  getDemoProject,
  type Feature,
  type FeatureListResponse,
  type SDDPhase,
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
  cardStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  accentColor,
  accentLight,
  accentBorder,
} from './styles';

const STATUS_OPTIONS: { value: PhaseStatus | ''; label: string }[] = [
  { value: '', label: 'All phases' },
  { value: 'in-progress', label: '🔄 In Progress' },
  { value: 'complete', label: '✅ Complete' },
  { value: 'blocked', label: '🚫 Blocked' },
  { value: 'not-started', label: '⬜ Not Started' },
];

function PhaseSteps({ feature }: { feature: Feature }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginTop: 8, flexWrap: 'wrap' }}>
      {SDD_PHASES.map((phase) => {
        const progress = feature.phase_progress.find((p) => p.phase === phase);
        const status: PhaseStatus = progress?.status ?? 'not-started';
        const color = PHASE_STATUS_COLOR[status];
        const bg = PHASE_STATUS_BG[status];
        const isCurrent = feature.current_phase === phase;
        return (
          <div
            key={phase}
            title={`${PHASE_LABEL[phase]}: ${status}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              minWidth: 52,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: bg,
                border: `2px solid ${isCurrent ? color : color + '66'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                boxShadow: isCurrent ? `0 0 0 2px ${color}44` : 'none',
              }}
            >
              {PHASE_ICON[phase]}
            </div>
            <span
              style={{
                fontSize: '0.6rem',
                color: isCurrent ? color : '#9ca3af',
                fontWeight: isCurrent ? 700 : 400,
                textAlign: 'center',
              }}
            >
              {PHASE_LABEL[phase]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function FeaturePortfolio() {
  const [projectId, setProjectId] = useState('');
  const [data, setData] = useState<FeatureListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [filterStatus, setFilterStatus] = useState<PhaseStatus | ''>('');

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

  const filtered: Feature[] = data
    ? filterStatus
      ? data.features.filter(
          (f) =>
            f.phase_progress.some((p) => p.status === filterStatus) ||
            (filterStatus === 'not-started' && f.current_phase === 'constitution')
        )
      : data.features
    : [];

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Feature Portfolio</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Overview of all features and their SDD phase progress. Each card shows the six phases from
        Constitution through Done.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
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

      {/* Filter */}
      {data && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value as PhaseStatus | '')}
              style={{
                padding: '4px 12px',
                border: `1px solid ${filterStatus === opt.value ? accentColor : '#d1d5db'}`,
                borderRadius: 4,
                background: filterStatus === opt.value ? accentLight : '#fff',
                color: filterStatus === opt.value ? accentColor : '#374151',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: filterStatus === opt.value ? 700 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {isDemo && (
        <div style={demoBannerStyle}>
          ⚠ Demo mode — showing sample feature portfolio. Connect a backend project to use live data.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {data && (
        <>
          <div
            style={{
              background: accentLight,
              border: `1px solid ${accentBorder}`,
              borderRadius: 8,
              padding: '10px 16px',
              marginBottom: 16,
            }}
          >
            <span style={{ fontWeight: 700, color: accentColor }}>
              Project: {data.project_id}
            </span>
            <span style={{ marginLeft: 12, fontSize: '0.82rem', color: '#6b7280' }}>
              {filtered.length} of {data.features.length} feature{data.features.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filtered.length === 0 && (
            <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No features match the current filter.</p>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 14,
            }}
          >
            {filtered.map((feature) => {
              const currentPhaseProg = feature.phase_progress.find(
                (p) => p.phase === feature.current_phase
              );
              const currentStatus: PhaseStatus = currentPhaseProg?.status ?? 'not-started';
              const statusColor = PHASE_STATUS_COLOR[currentStatus];
              const statusBg = PHASE_STATUS_BG[currentStatus];

              const doneCount = feature.phase_progress.filter(
                (p) => p.status === 'complete'
              ).length;

              return (
                <div
                  key={feature.feature_id}
                  style={{
                    ...cardStyle,
                    borderLeft: `4px solid ${accentColor}`,
                    background: '#fff',
                    border: `1px solid #e5e7eb`,
                    borderLeftColor: accentColor,
                    borderLeftWidth: 4,
                    borderLeftStyle: 'solid',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
                        {feature.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 3 }}>
                        {feature.description}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          background: statusBg,
                          color: statusColor,
                          border: `1px solid ${statusColor}44`,
                          borderRadius: 4,
                          padding: '2px 7px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {PHASE_ICON[feature.current_phase]} {PHASE_LABEL[feature.current_phase]}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
                        {doneCount}/6 phases
                      </span>
                    </div>
                  </div>

                  <PhaseSteps feature={feature} />

                  {/* Phase completion bar */}
                  <div
                    style={{
                      height: 4,
                      background: '#e5e7eb',
                      borderRadius: 2,
                      overflow: 'hidden',
                      marginTop: 8,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${(doneCount / 6) * 100}%`,
                        background: doneCount === 6 ? '#059669' : accentColor,
                        borderRadius: 2,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div style={{ color: '#9ca3af', fontStyle: 'italic', marginTop: 24 }}>
          Enter a project ID, or click "Load Demo" to see sample data.
        </div>
      )}
    </div>
  );
}
