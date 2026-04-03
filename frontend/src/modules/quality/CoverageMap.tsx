import { useState } from 'react';
import { accentColor, accentLight, accentBorder } from './styles';

interface Scenario {
  id: string;
  feature: string;
  title: string;
  covered: boolean;
}

const DEMO_SCENARIOS: Scenario[] = [
  { id: 'sc-001', feature: 'Constitution Engine', title: 'User creates a new constitution', covered: true },
  { id: 'sc-002', feature: 'Constitution Engine', title: 'Compliance check fails on missing principle', covered: true },
  { id: 'sc-003', feature: 'Constitution Engine', title: 'User views constitution history', covered: false },
  { id: 'sc-004', feature: 'Specification Studio', title: 'User generates spec from constitution', covered: true },
  { id: 'sc-005', feature: 'Specification Studio', title: 'AI clarification panel resolves ambiguity', covered: true },
  { id: 'sc-006', feature: 'Specification Studio', title: 'Spec diff viewer shows changes between versions', covered: false },
  { id: 'sc-007', feature: 'Specification Studio', title: 'User exports user stories as markdown', covered: false },
  { id: 'sc-008', feature: 'Quality Guardian', title: 'User loads checklist and toggles item status', covered: true },
  { id: 'sc-009', feature: 'Quality Guardian', title: 'Test suite tree expands to show all cases', covered: true },
  { id: 'sc-010', feature: 'Quality Guardian', title: 'Analysis report sorts by severity', covered: false },
  { id: 'sc-011', feature: 'Project Dashboard', title: 'Feature portfolio filtered by phase', covered: false },
  { id: 'sc-012', feature: 'Project Dashboard', title: 'Review thread marked as resolved', covered: false },
  { id: 'sc-013', feature: 'Project Dashboard', title: 'Metrics dashboard shows velocity', covered: true },
];

const COVERED_COLOR = '#059669';
const COVERED_BG = '#f0fdf4';
const COVERED_BORDER = '#86efac';
const UNCOVERED_COLOR = '#b45309';
const UNCOVERED_BG = '#fffbeb';
const UNCOVERED_BORDER = '#fcd34d';

function featureGroups(scenarios: Scenario[]): Record<string, Scenario[]> {
  return scenarios.reduce<Record<string, Scenario[]>>((acc, sc) => {
    if (!acc[sc.feature]) acc[sc.feature] = [];
    acc[sc.feature].push(sc);
    return acc;
  }, {});
}

export function CoverageMap() {
  const [showUncoveredOnly, setShowUncoveredOnly] = useState(false);

  const filtered = showUncoveredOnly
    ? DEMO_SCENARIOS.filter((s) => !s.covered)
    : DEMO_SCENARIOS;

  const coveredCount = DEMO_SCENARIOS.filter((s) => s.covered).length;
  const totalCount = DEMO_SCENARIOS.length;
  const pct = Math.round((coveredCount / totalCount) * 100);

  const groups = featureGroups(filtered);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Coverage Map</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Acceptance scenarios and their test coverage status. Green = covered by at least one automated
        test. Amber = no test found. This view uses demo data.
      </p>

      {/* Summary bar */}
      <div
        style={{
          background: accentLight,
          border: `1px solid ${accentBorder}`,
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <span style={{ fontWeight: 700, color: accentColor }}>
            Coverage: {coveredCount}/{totalCount} scenarios
          </span>
          <span
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: pct >= 70 ? COVERED_COLOR : UNCOVERED_COLOR,
            }}
          >
            {pct}%
          </span>
          <button
            onClick={() => setShowUncoveredOnly((v) => !v)}
            style={{
              marginLeft: 'auto',
              padding: '4px 12px',
              border: `1px solid ${showUncoveredOnly ? UNCOVERED_COLOR : '#d1d5db'}`,
              borderRadius: 4,
              background: showUncoveredOnly ? UNCOVERED_BG : '#fff',
              color: showUncoveredOnly ? UNCOVERED_COLOR : '#374151',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: showUncoveredOnly ? 700 : 400,
            }}
          >
            {showUncoveredOnly ? '⚠ Uncovered only' : 'Show all'}
          </button>
        </div>
        {/* Coverage bar */}
        <div
          style={{
            height: 10,
            background: '#e5e7eb',
            borderRadius: 5,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: pct >= 70 ? COVERED_COLOR : UNCOVERED_COLOR,
              borderRadius: 5,
              transition: 'width 0.4s',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <span style={{ fontSize: '0.78rem', color: COVERED_COLOR, fontWeight: 600 }}>
            ✅ Covered: {coveredCount}
          </span>
          <span style={{ fontSize: '0.78rem', color: UNCOVERED_COLOR, fontWeight: 600 }}>
            ⚠ Uncovered: {totalCount - coveredCount}
          </span>
        </div>
      </div>

      {/* Scenario groups */}
      {Object.entries(groups).map(([feature, scenarios]) => {
        const featureCovered = scenarios.filter((s) => s.covered).length;
        const featurePct = Math.round((featureCovered / scenarios.length) * 100);
        return (
          <div
            key={feature}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 14,
              marginBottom: 14,
              background: '#f9fafb',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', flex: 1 }}>
                {feature}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: featurePct >= 70 ? COVERED_COLOR : UNCOVERED_COLOR,
                }}
              >
                {featureCovered}/{scenarios.length} ({featurePct}%)
              </span>
            </div>
            {/* Feature-level bar */}
            <div
              style={{
                height: 4,
                background: '#e5e7eb',
                borderRadius: 2,
                overflow: 'hidden',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${featurePct}%`,
                  background: featurePct >= 70 ? COVERED_COLOR : UNCOVERED_COLOR,
                  borderRadius: 2,
                }}
              />
            </div>

            {scenarios.map((sc) => (
              <div
                key={sc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 10px',
                  background: sc.covered ? COVERED_BG : UNCOVERED_BG,
                  border: `1px solid ${sc.covered ? COVERED_BORDER : UNCOVERED_BORDER}`,
                  borderLeft: `3px solid ${sc.covered ? COVERED_COLOR : UNCOVERED_COLOR}`,
                  borderRadius: 5,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: '1rem' }}>{sc.covered ? '✅' : '⚠️'}</span>
                <span
                  style={{
                    flex: 1,
                    fontSize: '0.85rem',
                    color: sc.covered ? '#065f46' : '#78350f',
                  }}
                >
                  {sc.title}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: sc.covered ? COVERED_COLOR : UNCOVERED_COLOR,
                  }}
                >
                  {sc.covered ? 'COVERED' : 'NO TESTS'}
                </span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.65rem',
                    color: '#9ca3af',
                  }}
                >
                  {sc.id}
                </span>
              </div>
            ))}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>
          All scenarios are covered! 🎉
        </p>
      )}
    </div>
  );
}
