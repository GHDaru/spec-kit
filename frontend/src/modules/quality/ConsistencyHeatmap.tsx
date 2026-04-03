import { accentColor } from './styles';

// Hard-coded demo alignment scores (0–100) for the heatmap matrix.
// Rows and columns are the four SDD artifact types.
const ARTIFACTS = ['Spec', 'Plan', 'Tasks', 'Code'] as const;
type Artifact = (typeof ARTIFACTS)[number];

const SCORES: Record<Artifact, Record<Artifact, number | null>> = {
  Spec:  { Spec: null, Plan: 91,  Tasks: 78, Code: 63 },
  Plan:  { Spec: 91,  Plan: null, Tasks: 88, Code: 71 },
  Tasks: { Spec: 78,  Plan: 88,  Tasks: null, Code: 82 },
  Code:  { Spec: 63,  Plan: 71,  Tasks: 82,  Code: null },
};

function scoreToColor(score: number): string {
  // Interpolate from red (0) → amber (50) → green (100)
  if (score >= 80) {
    const t = (score - 80) / 20; // 0→1
    const r = Math.round(5 + t * (4 - 5));
    const g = Math.round(150 + t * (197 - 150));
    const b = Math.round(105 + t * (66 - 105));
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (score >= 50) {
    const t = (score - 50) / 30; // 0→1
    const r = Math.round(220 + t * (5 - 220));
    const g = Math.round(170 + t * (150 - 170));
    const b = Math.round(0 + t * 105);
    return `rgb(${r}, ${g}, ${b})`;
  }
  // 0–49: red range
  const t = score / 50;
  const r = 220;
  const g = Math.round(t * 100);
  const b = Math.round(t * 40);
  return `rgb(${r}, ${g}, ${b})`;
}

function textColor(score: number): string {
  return score < 60 ? '#fff' : '#111827';
}

const CELL_SIZE = 80;
const LABEL_WIDTH = 64;

export function ConsistencyHeatmap() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Consistency Heatmap</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Alignment scores between SDD artifact types. Each cell shows how well two artifact categories
        reference the same requirements. Scores range from 0 (no alignment) to 100 (full alignment).
        Green = well-aligned · Amber = partial · Red = drift detected.
      </p>

      <div
        style={{
          background: '#faf5ff',
          border: `1px solid #d8b4fe`,
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: '0.82rem',
          color: accentColor,
        }}
      >
        ℹ️ This heatmap uses hard-coded demo values. In production, scores are computed by the
        Quality Guardian analysis engine by cross-referencing requirement IDs across artifacts.
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Score scale:</span>
        {[0, 25, 50, 75, 100].map((v) => (
          <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 3,
                background: scoreToColor(v),
                border: '1px solid #d1d5db',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: '#374151' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Matrix */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', userSelect: 'none' }}>
          <thead>
            <tr>
              {/* top-left corner */}
              <th style={{ width: LABEL_WIDTH, padding: '4px 8px' }} />
              {ARTIFACTS.map((col) => (
                <th
                  key={col}
                  style={{
                    width: CELL_SIZE,
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#374151',
                    padding: '4px 8px',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ARTIFACTS.map((row) => (
              <tr key={row}>
                <td
                  style={{
                    width: LABEL_WIDTH,
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#374151',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row}
                </td>
                {ARTIFACTS.map((col) => {
                  const score = SCORES[row][col];
                  if (score === null) {
                    return (
                      <td
                        key={col}
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          background: '#f3f4f6',
                          border: '2px solid #e5e7eb',
                          textAlign: 'center',
                          fontSize: '1.2rem',
                          color: '#d1d5db',
                        }}
                      >
                        —
                      </td>
                    );
                  }
                  const bg = scoreToColor(score);
                  const fg = textColor(score);
                  return (
                    <td
                      key={col}
                      title={`${row} ↔ ${col}: ${score}/100`}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        background: bg,
                        border: '2px solid #fff',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        cursor: 'default',
                        transition: 'filter 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.filter = 'brightness(1.12)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.filter = 'none';
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: fg }}>
                        {score}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: fg, opacity: 0.8 }}>/ 100</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {(() => {
          const allScores = ARTIFACTS.flatMap((r) =>
            ARTIFACTS.filter((c) => SCORES[r][c] !== null).map((c) => SCORES[r][c] as number)
          );
          const avg = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
          const minScore = Math.min(...allScores);
          const maxScore = Math.max(...allScores);
          return (
            <>
              <div
                style={{
                  background: '#f3f4f6',
                  borderRadius: 6,
                  padding: '8px 14px',
                  fontSize: '0.82rem',
                }}
              >
                <span style={{ color: '#6b7280' }}>Average: </span>
                <strong style={{ color: scoreToColor(avg) }}>{avg}/100</strong>
              </div>
              <div
                style={{
                  background: '#f3f4f6',
                  borderRadius: 6,
                  padding: '8px 14px',
                  fontSize: '0.82rem',
                }}
              >
                <span style={{ color: '#6b7280' }}>Lowest: </span>
                <strong style={{ color: scoreToColor(minScore) }}>{minScore}/100</strong>
                <span style={{ color: '#9ca3af', marginLeft: 4 }}>(Spec ↔ Code)</span>
              </div>
              <div
                style={{
                  background: '#f3f4f6',
                  borderRadius: 6,
                  padding: '8px 14px',
                  fontSize: '0.82rem',
                }}
              >
                <span style={{ color: '#6b7280' }}>Highest: </span>
                <strong style={{ color: scoreToColor(maxScore) }}>{maxScore}/100</strong>
                <span style={{ color: '#9ca3af', marginLeft: 4 }}>(Spec ↔ Plan)</span>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
