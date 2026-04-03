import { useState } from 'react';
import {
  listTestSuites,
  getDemoTestSuite,
  type TestSuiteListResponse,
  TEST_TYPE_COLOR,
} from '../../api/quality';
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

export function TestSuiteViewer() {
  const [projectId, setProjectId] = useState('');
  const [data, setData] = useState<TestSuiteListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const result = await listTestSuites(projectId.trim());
      setData(result);
      setExpandedSuites(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    const demo = getDemoTestSuite();
    setData({ project_id: demo.project_id, suites: [demo] });
    setExpandedSuites(new Set([demo.suite_id]));
    setIsDemo(true);
    setError(null);
  }

  function toggleSuite(suiteId: string) {
    setExpandedSuites((prev) => {
      const next = new Set(prev);
      if (next.has(suiteId)) next.delete(suiteId);
      else next.add(suiteId);
      return next;
    });
  }

  function toggleCase(caseId: string) {
    setExpandedCases((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Test Suite Viewer</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Browse test suites and their individual test cases. Expand a suite to see cases; expand a case to see acceptance criteria.
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
        <button
          onClick={handleLoad}
          disabled={loading || !projectId.trim()}
          style={btnStyle}
        >
          {loading ? 'Loading…' : 'Load'}
        </button>
        <button onClick={handleLoadDemo} style={btnSecondaryStyle}>
          Load Demo
        </button>
      </div>

      {isDemo && (
        <div style={demoBannerStyle}>
          ⚠ Demo mode — showing sample test suite. Connect a backend project to use live data.
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
            <span style={{ fontWeight: 700, color: accentColor }}>Project: {data.project_id}</span>
            <span style={{ marginLeft: 12, fontSize: '0.82rem', color: '#6b7280' }}>
              {data.suites.length} suite{data.suites.length !== 1 ? 's' : ''}
              {' · '}
              {data.suites.reduce((acc, s) => acc + s.test_cases.length, 0)} test cases
            </span>
          </div>

          {data.suites.length === 0 && (
            <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No test suites found.</p>
          )}

          {data.suites.map((suite) => {
            const isOpen = expandedSuites.has(suite.suite_id);
            const typeCounts: Partial<Record<string, number>> = {};
            suite.test_cases.forEach((tc) => {
              typeCounts[tc.type] = (typeCounts[tc.type] ?? 0) + 1;
            });

            return (
              <div
                key={suite.suite_id}
                style={{
                  ...cardStyle,
                  borderLeft: `4px solid ${accentColor}`,
                  background: isOpen ? accentLight : '#f9fafb',
                  marginBottom: 10,
                }}
              >
                {/* Suite header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleSuite(suite.suite_id)}
                >
                  <span style={{ fontSize: '1rem' }}>{isOpen ? '▾' : '▸'}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', flex: 1 }}>
                    🧪 {suite.title}
                  </span>
                  {/* Type badges */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Object.entries(typeCounts).map(([type, count]) => {
                      const color = TEST_TYPE_COLOR[type as keyof typeof TEST_TYPE_COLOR] ?? '#6b7280';
                      return (
                        <span
                          key={type}
                          style={{
                            fontSize: '0.7rem',
                            background: color + '22',
                            color,
                            border: `1px solid ${color}44`,
                            borderRadius: 4,
                            padding: '1px 6px',
                            fontWeight: 600,
                          }}
                        >
                          {type}: {count}
                        </span>
                      );
                    })}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {suite.test_cases.length} cases
                  </span>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 12 }}>
                    {suite.test_cases.length === 0 && (
                      <p style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.85rem' }}>
                        No test cases in this suite.
                      </p>
                    )}
                    {suite.test_cases.map((tc) => {
                      const typeColor =
                        TEST_TYPE_COLOR[tc.type] ?? '#6b7280';
                      const caseOpen = expandedCases.has(tc.case_id);
                      return (
                        <div
                          key={tc.case_id}
                          style={{
                            background: '#fff',
                            border: `1px solid ${typeColor}33`,
                            borderLeft: `3px solid ${typeColor}`,
                            borderRadius: 5,
                            padding: '8px 10px',
                            marginBottom: 5,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              cursor: 'pointer',
                            }}
                            onClick={() => toggleCase(tc.case_id)}
                          >
                            <span style={{ fontSize: '0.85rem' }}>
                              {caseOpen ? '▾' : '▸'}
                            </span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                background: typeColor + '22',
                                color: typeColor,
                                border: `1px solid ${typeColor}44`,
                                borderRadius: 3,
                                padding: '1px 6px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                              }}
                            >
                              {tc.type}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem', flex: 1 }}>
                              {tc.title}
                            </span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: tc.status === 'active' ? '#059669' : '#9ca3af',
                                fontWeight: 600,
                              }}
                            >
                              {tc.status}
                            </span>
                          </div>

                          {caseOpen && (
                            <div style={{ marginTop: 8, paddingLeft: 24 }}>
                              <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: '#374151' }}>
                                {tc.description}
                              </p>
                              {tc.acceptance_criteria.length > 0 && (
                                <div>
                                  <div
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      color: '#6b7280',
                                      marginBottom: 3,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.05em',
                                    }}
                                  >
                                    Acceptance Criteria
                                  </div>
                                  {tc.acceptance_criteria.map((ac, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        display: 'flex',
                                        gap: 6,
                                        fontSize: '0.8rem',
                                        color: '#374151',
                                        marginBottom: 2,
                                      }}
                                    >
                                      <span style={{ color: '#059669' }}>✓</span>
                                      <span>{ac}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
