import { useState } from 'react';
import {
  listAnalysisReports,
  getDemoAnalysisReport,
  type AnalysisReport,
  type AnalysisReportListResponse,
  type SeverityLevel,
  SEVERITY_COLOR,
  SEVERITY_BG,
  SEVERITY_ORDER,
} from '../../api/quality';
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

const SEVERITY_LABELS: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'info'];
const SEVERITY_ICON: Record<SeverityLevel, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🔵',
  info: '⚪',
};

export function AnalysisReportViewer() {
  const [projectId, setProjectId] = useState('');
  const [data, setData] = useState<AnalysisReportListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    setSelectedReport(null);
    try {
      const result = await listAnalysisReports(projectId.trim());
      setData(result);
      if (result.reports.length > 0) setSelectedReport(result.reports[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    const demo = getDemoAnalysisReport();
    setData({ project_id: demo.project_id, reports: [demo] });
    setSelectedReport(demo);
    setIsDemo(true);
    setError(null);
  }

  const sortedFindings = selectedReport
    ? [...selectedReport.findings].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      )
    : [];

  function scoreColor(score: number): string {
    if (score >= 80) return '#059669';
    if (score >= 60) return '#ca8a04';
    return '#dc2626';
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Analysis Report Viewer</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        View quality analysis reports with findings sorted by severity. Critical findings appear first.
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
          ⚠ Demo mode — showing sample analysis report. Connect a backend project to use live data.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {data && data.reports.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {data.reports.map((r) => (
            <button
              key={r.report_id}
              onClick={() => setSelectedReport(r)}
              style={{
                padding: '4px 12px',
                border: `1px solid ${selectedReport?.report_id === r.report_id ? accentColor : '#d1d5db'}`,
                borderRadius: 4,
                background: selectedReport?.report_id === r.report_id ? accentLight : '#fff',
                color: selectedReport?.report_id === r.report_id ? accentColor : '#374151',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: selectedReport?.report_id === r.report_id ? 700 : 400,
              }}
            >
              {r.created_at.slice(0, 10)}
            </button>
          ))}
        </div>
      )}

      {selectedReport && (
        <div>
          {/* Report summary header */}
          <div
            style={{
              background: accentLight,
              border: `1px solid ${accentBorder}`,
              borderRadius: 8,
              padding: '14px 18px',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 2 }}>
                  Overall Score
                </div>
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: scoreColor(selectedReport.overall_score),
                    lineHeight: 1,
                  }}
                >
                  {selectedReport.overall_score}
                  <span style={{ fontSize: '1rem', fontWeight: 400 }}>/100</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#374151' }}>
                  {selectedReport.summary}
                </p>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>
                  Generated: {selectedReport.created_at.replace('T', ' ').slice(0, 16)} UTC
                </div>
              </div>
              {/* Severity breakdown */}
              <div style={{ display: 'flex', gap: 8 }}>
                {SEVERITY_LABELS.map((sev) => {
                  const count = selectedReport.findings.filter((f) => f.severity === sev).length;
                  if (count === 0) return null;
                  return (
                    <div key={sev} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem' }}>{SEVERITY_ICON[sev]}</div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: SEVERITY_COLOR[sev],
                        }}
                      >
                        {count}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>{sev}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Findings list */}
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#374151',
              marginBottom: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Findings ({sortedFindings.length})
          </div>

          {sortedFindings.map((finding) => {
            const color = SEVERITY_COLOR[finding.severity];
            const bg = SEVERITY_BG[finding.severity];
            const isExpanded = expandedFinding === finding.finding_id;

            return (
              <div
                key={finding.finding_id}
                style={{
                  background: bg,
                  border: `1px solid ${color}44`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 6,
                  marginBottom: 8,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    cursor: 'pointer',
                  }}
                  onClick={() =>
                    setExpandedFinding(isExpanded ? null : finding.finding_id)
                  }
                >
                  <span style={{ fontSize: '1rem' }}>{SEVERITY_ICON[finding.severity]}</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: color + '22',
                      color,
                      border: `1px solid ${color}55`,
                      borderRadius: 3,
                      padding: '1px 6px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {finding.severity}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: '#6b7280',
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 3,
                      padding: '1px 6px',
                    }}
                  >
                    {finding.artifact_type}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', flex: 1 }}>
                    {finding.title}
                  </span>
                  <span style={{ fontSize: '0.85rem', color }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      padding: '0 14px 14px',
                      borderTop: `1px solid ${color}22`,
                    }}
                  >
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          marginBottom: 4,
                        }}
                      >
                        Description
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151' }}>
                        {finding.description}
                      </p>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#059669',
                          textTransform: 'uppercase',
                          marginBottom: 4,
                        }}
                      >
                        Recommendation
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151' }}>
                        {finding.recommendation}
                      </p>
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: '0.72rem',
                        color: '#9ca3af',
                        fontFamily: 'monospace',
                      }}
                    >
                      Artifact ID: {finding.artifact_id} · Finding: {finding.finding_id}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data && data.reports.length === 0 && (
        <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No analysis reports found.</p>
      )}

      {!data && !loading && !error && (
        <div style={{ color: '#9ca3af', fontStyle: 'italic', marginTop: 24 }}>
          Enter a project ID, or click "Load Demo" to see sample data.
        </div>
      )}
    </div>
  );
}
