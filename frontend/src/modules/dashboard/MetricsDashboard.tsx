import { useState } from 'react';
import {
  getMetrics,
  getDemoMetrics,
  type ProjectMetrics,
  SDD_PHASES,
  PHASE_LABEL,
  PHASE_ICON,
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

function scoreColor(score: number): string {
  if (score >= 80) return '#059669';
  if (score >= 60) return '#ca8a04';
  return '#dc2626';
}

function MetricCard({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string | number;
  unit?: string;
  note?: string;
}) {
  return (
    <div
      style={{
        background: accentLight,
        border: `1px solid ${accentBorder}`,
        borderRadius: 8,
        padding: '14px 18px',
        minWidth: 130,
        flex: 1,
      }}
    >
      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: '1.8rem',
          fontWeight: 800,
          color: accentColor,
          lineHeight: 1,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: '0.9rem', fontWeight: 400, color: '#6b7280', marginLeft: 2 }}>
            {unit}
          </span>
        )}
      </div>
      {note && (
        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 4 }}>{note}</div>
      )}
    </div>
  );
}

export function MetricsDashboard() {
  const [projectId, setProjectId] = useState('');
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const result = await getMetrics(projectId.trim());
      setMetrics(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    setMetrics(getDemoMetrics());
    setIsDemo(true);
    setError(null);
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Metrics Dashboard</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Project health metrics including phase distribution, spec quality, compliance rate and
        delivery velocity.
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
          ⚠ Demo mode — showing sample metrics. Connect a backend project to use live data.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {metrics && (
        <div>
          {/* Summary cards */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            <MetricCard
              label="Total Features"
              value={metrics.total_features}
              note="across all phases"
            />
            <MetricCard
              label="Spec Quality Avg"
              value={metrics.spec_quality_avg}
              unit="/100"
              note={
                metrics.spec_quality_avg >= 80
                  ? '✅ Good'
                  : metrics.spec_quality_avg >= 60
                  ? '⚠ Needs work'
                  : '❌ Critical'
              }
            />
            <MetricCard
              label="Compliance Rate"
              value={`${metrics.compliance_rate}%`}
              note={metrics.compliance_rate >= 90 ? '✅ On target' : '⚠ Below target'}
            />
            <MetricCard
              label="Velocity"
              value={metrics.velocity}
              unit=" feat/wk"
              note="features completed per week"
            />
          </div>

          {/* Spec quality gauge bar */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              <span style={{ color: '#374151' }}>Spec Quality</span>
              <span style={{ color: scoreColor(metrics.spec_quality_avg) }}>
                {metrics.spec_quality_avg}/100
              </span>
            </div>
            <div
              style={{ height: 12, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${metrics.spec_quality_avg}%`,
                  background: scoreColor(metrics.spec_quality_avg),
                  borderRadius: 6,
                  transition: 'width 0.4s',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginTop: 10,
                marginBottom: 4,
              }}
            >
              <span style={{ color: '#374151' }}>Compliance Rate</span>
              <span style={{ color: scoreColor(metrics.compliance_rate) }}>
                {metrics.compliance_rate}%
              </span>
            </div>
            <div
              style={{ height: 12, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${metrics.compliance_rate}%`,
                  background: scoreColor(metrics.compliance_rate),
                  borderRadius: 6,
                  transition: 'width 0.4s',
                }}
              />
            </div>
          </div>

          {/* Phase distribution bar chart */}
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 16,
              background: '#f9fafb',
            }}
          >
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#374151',
                marginBottom: 14,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Features by Phase
            </div>
            {SDD_PHASES.map((phase) => {
              const count = metrics.features_by_phase[phase] ?? 0;
              const barPct =
                metrics.total_features > 0
                  ? (count / metrics.total_features) * 100
                  : 0;
              return (
                <div key={phase} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      marginBottom: 3,
                    }}
                  >
                    <span style={{ color: '#374151' }}>
                      {PHASE_ICON[phase]} {PHASE_LABEL[phase]}
                    </span>
                    <span style={{ fontWeight: 700, color: accentColor }}>{count}</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: '#e5e7eb',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${barPct}%`,
                        background: accentColor,
                        borderRadius: 4,
                        transition: 'width 0.4s',
                        minWidth: count > 0 ? 6 : 0,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 12, fontSize: '0.72rem', color: '#9ca3af' }}>
            As of: {metrics.as_of.replace('T', ' ').slice(0, 16)} UTC
          </div>
        </div>
      )}

      {!metrics && !loading && !error && (
        <div style={{ color: '#9ca3af', fontStyle: 'italic', marginTop: 24 }}>
          Enter a project ID, or click "Load Demo" to see sample data.
        </div>
      )}
    </div>
  );
}
