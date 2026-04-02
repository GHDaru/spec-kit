import type { PlanComplianceResult } from '../../api/plan';

interface Props {
  compliance: PlanComplianceResult;
}

export function PlanComplianceCheck({ compliance }: Props) {
  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>Constitution Compliance</h3>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 14 }}>
        The generated plan is checked against the project constitution before proceeding to task generation.
      </p>

      {/* Summary badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 18px',
          borderRadius: 10,
          border: `2px solid ${compliance.passed ? '#86efac' : '#fca5a5'}`,
          background: compliance.passed ? '#f0fdf4' : '#fef2f2',
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: '2rem' }}>{compliance.passed ? '✅' : '❌'}</span>
        <div>
          <strong
            style={{
              fontSize: '1rem',
              color: compliance.passed ? '#15803d' : '#dc2626',
            }}
          >
            {compliance.passed ? 'Plan passes constitution compliance' : 'Plan violates constitution'}
          </strong>
          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#6b7280' }}>
            {compliance.blocking_count} blocking violation(s) · {compliance.warning_count} warning(s)
          </p>
        </div>
      </div>

      {/* Violations */}
      {compliance.violations.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: '0.875rem', color: '#374151' }}>
            Violations
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {compliance.violations.map((v) => (
              <div
                key={`${v.principle}-${v.message}`}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: `1px solid ${v.blocking ? '#fca5a5' : '#fde68a'}`,
                  background: v.blocking ? '#fef2f2' : '#fffbeb',
                }}
              >
                <span>{v.blocking ? '🚫' : '⚠️'}</span>
                <div>
                  <p
                    style={{
                      margin: '0 0 2px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: v.blocking ? '#dc2626' : '#b45309',
                    }}
                  >
                    {v.principle}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#4b5563' }}>{v.message}</p>
                </div>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    alignSelf: 'flex-start',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: v.blocking ? '#fca5a5' : '#fde68a',
                    color: v.blocking ? '#7f1d1d' : '#78350f',
                  }}
                >
                  {v.blocking ? 'BLOCKING' : 'WARNING'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {compliance.violations.length === 0 && (
        <p style={{ color: '#15803d', fontSize: '0.875rem' }}>
          No violations found. The plan fully satisfies all constitution principles.
        </p>
      )}

      <p style={{ marginTop: 14, fontSize: '0.75rem', color: '#9ca3af' }}>
        Powered by Module 1 — Constitution Engine ComplianceGate
      </p>
    </div>
  );
}
