import { useState } from 'react';
import { checkCompliance, type ComplianceReportResponse } from '../../api/constitution';
import { btnStyle, errorStyle, inputStyle } from './ConstitutionView';

export function ComplianceCheck() {
  const [projectId, setProjectId] = useState('');
  const [artifactPath, setArtifactPath] = useState('');
  const [report, setReport] = useState<ComplianceReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId.trim() || !artifactPath.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const data = await checkCompliance(projectId.trim(), artifactPath.trim());
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Compliance Check</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Validate an artifact file against the project's governing constitution.
        Blocking violations (MUST) cause the check to fail; SHOULD violations
        produce warnings.
      </p>

      <form onSubmit={handleCheck}>
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 16 }}
        >
          <div>
            <label style={labelStyle}>Project ID *</label>
            <input
              type="text"
              placeholder="e.g. my-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Artifact Path *</label>
            <input
              type="text"
              placeholder="e.g. specs/my-spec.md"
              value={artifactPath}
              onChange={(e) => setArtifactPath(e.target.value)}
              required
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ ...btnStyle, background: '#7c3aed' }}
        >
          {loading ? 'Checking…' : 'Run Compliance Check'}
        </button>
      </form>

      {error && <div style={{ ...errorStyle, marginTop: 16 }}>⚠ {error}</div>}

      {report && (
        <div style={{ marginTop: 20 }}>
          {/* Pass/Fail banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 14,
              background: report.passed ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${report.passed ? '#86efac' : '#fecaca'}`,
              color: report.passed ? '#15803d' : '#dc2626',
              fontWeight: 700,
              fontSize: '1.05rem',
            }}
          >
            {report.passed ? '✓ Passed' : '✗ Failed'} — {report.summary}
          </div>

          {/* Blocking violations */}
          {report.blocking_violations.length > 0 && (
            <ViolationSection
              title="Blocking Violations"
              violations={report.blocking_violations}
              color="#dc2626"
              bg="#fef2f2"
              border="#fecaca"
              icon="❌"
            />
          )}

          {/* Warning violations */}
          {report.warning_violations.length > 0 && (
            <ViolationSection
              title="Warning Violations"
              violations={report.warning_violations}
              color="#d97706"
              bg="#fffbeb"
              border="#fde68a"
              icon="⚠️"
            />
          )}

          {report.blocking_violations.length === 0 &&
            report.warning_violations.length === 0 && (
              <p style={{ color: '#6b7280' }}>No violations detected.</p>
            )}
        </div>
      )}
    </div>
  );
}

function ViolationSection({
  title,
  violations,
  color,
  bg,
  border,
  icon,
}: {
  title: string;
  violations: { principle_name: string; enforcement_level: string; message: string; line_number: number | null }[];
  color: string;
  bg: string;
  border: string;
  icon: string;
}) {
  return (
    <div>
      <h4 style={{ color, marginBottom: 8 }}>
        {icon} {title} ({violations.length})
      </h4>
      {violations.map((v, i) => (
        <div
          key={i}
          style={{
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 6,
            padding: '8px 12px',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              color,
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            {v.principle_name}
            {v.line_number !== null && (
              <span style={{ fontWeight: 400 }}> · line {v.line_number}</span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>{v.message}</p>
        </div>
      ))}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: 4,
};
