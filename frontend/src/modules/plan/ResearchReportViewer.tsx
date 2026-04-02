import { useState } from 'react';
import type { ResearchReport } from '../../api/plan';

function OptionCard({
  opt,
}: {
  opt: ResearchReport['options'][number];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 8,
      }}
    >
      {/* Clickable header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          background: '#f9fafb',
          border: 'none',
          padding: '8px 12px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
          {opt.name}
        </span>
        <span
          style={{
            fontSize: '0.72rem',
            background: '#e5e7eb',
            borderRadius: 4,
            padding: '1px 6px',
            color: '#374151',
          }}
        >
          v{opt.version}
        </span>
        <a
          href={opt.source_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#2563eb' }}
        >
          Docs ↗
        </a>
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          style={{
            padding: '10px 12px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            background: '#fff',
          }}
        >
          <div>
            <p style={{ margin: '0 0 6px', fontSize: '0.78rem', fontWeight: 700, color: '#15803d' }}>
              ✅ Pros
            </p>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.8rem', color: '#374151' }}>
              {opt.pros.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: '0.78rem', fontWeight: 700, color: '#b91c1c' }}>
              ⚠️ Cons
            </p>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.8rem', color: '#374151' }}>
              {opt.cons.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportCard({ report }: { report: ResearchReport }) {
  const [open, setOpen] = useState(true);

  return (
    <div
      style={{
        border: '1px solid #bfdbfe',
        borderRadius: 10,
        marginBottom: 14,
        overflow: 'hidden',
      }}
    >
      {/* Report header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          background: '#eff6ff',
          border: 'none',
          padding: '10px 14px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '1rem' }}>🔬</span>
        <strong style={{ fontSize: '0.95rem', color: '#1e40af' }}>{report.topic}</strong>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6b7280' }}>
          {report.options.length} options evaluated {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{ padding: '12px 14px', background: '#fff' }}>
          <p style={{ margin: '0 0 12px', fontSize: '0.875rem', color: '#4b5563' }}>
            {report.summary}
          </p>

          <h5 style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#374151' }}>
            Options evaluated:
          </h5>
          {report.options.map((opt) => (
            <OptionCard key={opt.name} opt={opt} />
          ))}

          <div
            style={{
              marginTop: 10,
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 6,
              padding: '8px 12px',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              <strong style={{ color: '#15803d' }}>✓ Recommendation:</strong>{' '}
              <span style={{ color: '#374151' }}>{report.recommendation}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  reports: ResearchReport[];
}

export function ResearchReportViewer({ reports }: Props) {
  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>Research Reports</h3>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 14 }}>
        AI-generated investigation reports for each technical decision. Click a report or option to expand.
      </p>

      {reports.length === 0 && (
        <p style={{ color: '#9ca3af' }}>No research reports available.</p>
      )}

      {reports.map((r) => (
        <ReportCard key={r.topic} report={r} />
      ))}
    </div>
  );
}
