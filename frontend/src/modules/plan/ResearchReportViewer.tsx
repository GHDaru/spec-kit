import { useState } from 'react';
import {
  getPlan,
  getDemoPlan,
  type ResearchReport,
  type ResearchFinding,
} from '../../api/plan';
import {
  btnStyle,
  btnSecondaryStyle,
  errorStyle,
  inputStyle,
  demoBannerStyle,
  RECOMMENDATION_COLOR,
  RECOMMENDATION_ICON,
} from './styles';

function FindingCard({ finding }: { finding: ResearchFinding }) {
  const [expanded, setExpanded] = useState(false);
  const color = RECOMMENDATION_COLOR[finding.recommendation];
  const icon = RECOMMENDATION_ICON[finding.recommendation];

  return (
    <div
      style={{
        border: `1px solid ${color}40`,
        borderLeft: `4px solid ${color}`,
        borderRadius: '0 8px 8px 0',
        background: finding.recommendation === 'recommended'
          ? '#f0fdf4'
          : finding.recommendation === 'alternative'
          ? '#fffbeb'
          : '#fef2f2',
        marginBottom: 8,
        overflow: 'hidden',
      }}
    >
      {/* Finding header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v);
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{icon}</span>
          <strong style={{ fontSize: '0.9rem', color: '#111827' }}>{finding.option}</strong>
          <span
            style={{
              fontSize: '0.72rem',
              background: `${color}18`,
              color: color,
              border: `1px solid ${color}40`,
              borderRadius: 3,
              padding: '1px 6px',
              fontWeight: 700,
              textTransform: 'capitalize' as const,
            }}
          >
            {finding.recommendation}
          </span>
        </div>
        <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Finding summary (always shown) */}
      <div style={{ padding: '0 12px 8px', fontSize: '0.82rem', color: '#374151' }}>
        {finding.summary}
      </div>

      {/* Sources (expandable) */}
      {expanded && finding.sources.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            borderTop: `1px solid ${color}20`,
            background: 'rgba(255,255,255,0.5)',
          }}
        >
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#6b7280',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Sources
          </div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {finding.sources.map((src) => (
              <li key={src} style={{ fontSize: '0.78rem', color: '#374151', marginBottom: 2 }}>
                {src}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReportCard({ report }: { report: ResearchReport }) {
  const [expanded, setExpanded] = useState(true);
  const recommended = report.findings.filter((f) => f.recommendation === 'recommended').length;
  const alternative = report.findings.filter((f) => f.recommendation === 'alternative').length;
  const avoid = report.findings.filter((f) => f.recommendation === 'avoid').length;

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        marginBottom: 16,
        overflow: 'hidden',
      }}
    >
      {/* Report header */}
      <div
        style={{
          background: '#1e3a8a',
          color: '#fff',
          padding: '10px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v);
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{report.id}</span>
            <strong style={{ fontSize: '0.95rem' }}>{report.topic}</strong>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 4,
              fontSize: '0.72rem',
              opacity: 0.8,
            }}
          >
            <span>✅ {recommended} recommended</span>
            <span>⚠️ {alternative} alternative</span>
            <span>❌ {avoid} avoid</span>
          </div>
        </div>
        <span style={{ fontSize: '0.9rem' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '12px 16px' }}>
          {/* Summary */}
          <p style={{ margin: '0 0 12px', fontSize: '0.875rem', color: '#374151' }}>
            {report.summary}
          </p>

          {/* Findings */}
          <div style={{ marginBottom: 12 }}>
            {report.findings.map((f) => (
              <FindingCard key={f.option} finding={f} />
            ))}
          </div>

          {/* Conclusion */}
          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 6,
              padding: '10px 14px',
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#0369a1',
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              💡 Conclusion
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#0c4a6e' }}>
              {report.conclusion}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function ResearchReportViewer() {
  const [projectId, setProjectId] = useState('');
  const [planId, setPlanId] = useState('');
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  async function handleLoad() {
    if (!projectId.trim() || !planId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const plan = await getPlan(projectId.trim(), planId.trim());
      setReports(plan.research_reports);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    setReports(getDemoPlan().research_reports);
    setIsDemo(true);
    setError(null);
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Research Reports</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        AI-generated research reports evaluating technical options, libraries, and architectural decisions.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Project ID"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 140 }}
        />
        <input
          type="text"
          placeholder="Plan ID"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          style={{ ...inputStyle, flex: 1, minWidth: 140 }}
        />
        <button
          onClick={handleLoad}
          disabled={loading || !projectId.trim() || !planId.trim()}
          style={btnStyle}
        >
          {loading ? 'Loading…' : 'Load'}
        </button>
        <button onClick={handleLoadDemo} style={btnSecondaryStyle}>
          Load Demo
        </button>
      </div>

      {isDemo && <div style={demoBannerStyle}>⚠ Demo mode — backend not yet connected.</div>}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {reports.length > 0 && (
        <div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 12 }}>
            {reports.length} report{reports.length !== 1 ? 's' : ''}
          </div>
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
