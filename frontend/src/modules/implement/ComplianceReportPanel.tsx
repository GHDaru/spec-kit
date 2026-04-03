import { useState } from 'react';
import {
  getDemoSession,
  getSession,
  type ExecutionSessionSchema,
  type ComplianceReportSchema,
  VERDICT_COLOR,
  VERDICT_ICON,
} from '../../api/implement';
import {
  btnStyle,
  btnSecondaryStyle,
  cardStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  labelStyle,
  VERDICT_BG,
  VERDICT_BORDER,
} from './styles';

export function ComplianceReportPanel() {
  const [projectId, setProjectId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [session, setSession] = useState<ExecutionSessionSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ComplianceReportSchema | null>(null);

  async function handleLoad() {
    if (!projectId.trim() || !sessionId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const data = await getSession(projectId.trim(), sessionId.trim());
      setSession(data);
      setSelectedReport(data.compliance_reports[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    const demo = getDemoSession();
    setSession(demo);
    setSelectedReport(demo.compliance_reports[0] ?? null);
    setIsDemo(true);
    setError(null);
  }

  function taskTitleForReport(report: ComplianceReportSchema): string {
    if (!session) return report.result_id.slice(0, 8);
    const result = session.task_results.find((r) => r.result_id === report.result_id);
    return result ? result.task_title : report.result_id.slice(0, 8);
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Compliance Report Panel</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Side-by-side view of spec requirements vs. generated code compliance — with
        pass/fail/warning badges per requirement.
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

      {isDemo && <div style={demoBannerStyle}>⚠ Demo mode — sample compliance data.</div>}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {session && session.compliance_reports.length === 0 && (
        <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No compliance reports in this session.</p>
      )}

      {session && session.compliance_reports.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
          {/* Report list */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Reports ({session.compliance_reports.length})</div>
            {session.compliance_reports.map((rpt) => {
              const color = VERDICT_COLOR[rpt.verdict];
              const isSelected = selectedReport?.report_id === rpt.report_id;
              return (
                <div
                  key={rpt.report_id}
                  onClick={() => setSelectedReport(rpt)}
                  style={{
                    ...cardStyle,
                    cursor: 'pointer',
                    background: isSelected ? VERDICT_BG[rpt.verdict] : '#f9fafb',
                    border: `1px solid ${isSelected ? VERDICT_BORDER[rpt.verdict] : '#e5e7eb'}`,
                    borderLeft: `4px solid ${color}`,
                    padding: '10px 12px',
                    marginBottom: 6,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 4 }}>
                    {taskTitleForReport(rpt)}
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color,
                      fontWeight: 700,
                    }}
                  >
                    {VERDICT_ICON[rpt.verdict]} {rpt.verdict.toUpperCase()}
                  </div>
                  {rpt.spec_id && (
                    <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 2 }}>
                      Spec: {rpt.spec_id}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Report detail */}
          {selectedReport && (
            <div>
              <div
                style={{
                  background: VERDICT_BG[selectedReport.verdict],
                  border: `1px solid ${VERDICT_BORDER[selectedReport.verdict]}`,
                  borderRadius: 8,
                  padding: '14px 16px',
                  marginBottom: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: '1.2rem' }}>{VERDICT_ICON[selectedReport.verdict]}</span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: VERDICT_COLOR[selectedReport.verdict],
                    }}
                  >
                    {selectedReport.verdict.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#6b7280', marginLeft: 'auto' }}>
                    {selectedReport.report_id.slice(0, 8)}…
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#374151' }}>
                  {selectedReport.summary}
                </p>
              </div>

              {/* Findings table */}
              {selectedReport.findings.length > 0 && (
                <div>
                  <div style={{ ...labelStyle, marginBottom: 8 }}>
                    Findings ({selectedReport.findings.length})
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, width: '40%' }}>
                            Requirement
                          </th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 600, width: '15%' }}>
                            Verdict
                          </th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>
                            Note
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.findings.map((finding, idx) => {
                          const v = finding.verdict as keyof typeof VERDICT_COLOR;
                          const fColor = VERDICT_COLOR[v] ?? '#6b7280';
                          return (
                            <tr
                              key={idx}
                              style={{ borderTop: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}
                            >
                              <td style={{ padding: '8px 12px', fontWeight: 500 }}>{finding.requirement}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    background: fColor + '22',
                                    color: fColor,
                                    border: `1px solid ${fColor}44`,
                                    borderRadius: 4,
                                    padding: '2px 8px',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {VERDICT_ICON[v as 'pass' | 'fail' | 'warning'] ?? '?'} {finding.verdict}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', color: '#6b7280' }}>{finding.note || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedReport.findings.length === 0 && (
                <p style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  No findings recorded for this report.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
