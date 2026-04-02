import { useState } from 'react';
import { getSpec, type SpecResponse } from '../../api/spec';
import { inputStyle, btnStyle, errorStyle, labelStyle } from './styles';

function diffLines(
  oldText: string,
  newText: string,
): { type: 'equal' | 'added' | 'removed'; text: string }[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: { type: 'equal' | 'added' | 'removed'; text: string }[] = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const ol = oldLines[i];
    const nl = newLines[i];
    if (ol === nl) {
      result.push({ type: 'equal', text: ol ?? '' });
    } else {
      if (ol !== undefined) result.push({ type: 'removed', text: ol });
      if (nl !== undefined) result.push({ type: 'added', text: nl });
    }
  }
  return result;
}

function specToText(spec: SpecResponse): string {
  const lines: string[] = [];
  lines.push(`# ${spec.title}`);
  lines.push(`Version: ${spec.version}`);
  if (spec.description) lines.push(`\n${spec.description}`);
  lines.push('');

  for (const [i, s] of spec.user_stories.entries()) {
    lines.push(`[${s.priority}] US-${String(i + 1).padStart(3, '0')}: ${s.title}`);
    lines.push(`  As a ${s.as_a}, I want ${s.i_want}, so that ${s.so_that}`);
    for (const sc of s.scenarios) {
      if (sc.title) lines.push(`  Scenario: ${sc.title}`);
      lines.push(`  Given ${sc.given}`);
      lines.push(`  When  ${sc.when}`);
      lines.push(`  Then  ${sc.then}`);
    }
  }

  if (spec.requirements.length > 0) {
    lines.push('');
    lines.push('Functional Requirements:');
    for (const r of spec.requirements) {
      lines.push(`  ${r.id}: ${r.description}`);
    }
  }

  return lines.join('\n');
}

export function SpecDiffViewer() {
  const [projectId, setProjectId] = useState('');
  const [specIdA, setSpecIdA] = useState('');
  const [specIdB, setSpecIdB] = useState('');
  const [specA, setSpecA] = useState<SpecResponse | null>(null);
  const [specB, setSpecB] = useState<SpecResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCompare() {
    if (!projectId.trim() || !specIdA.trim() || !specIdB.trim()) return;
    setLoading(true);
    setError(null);
    setSpecA(null);
    setSpecB(null);
    try {
      const [a, b] = await Promise.all([
        getSpec(projectId.trim(), specIdA.trim()),
        getSpec(projectId.trim(), specIdB.trim()),
      ]);
      setSpecA(a);
      setSpecB(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const diff = specA && specB ? diffLines(specToText(specA), specToText(specB)) : null;

  const added = diff?.filter((d) => d.type === 'added').length ?? 0;
  const removed = diff?.filter((d) => d.type === 'removed').length ?? 0;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Spec Diff Viewer</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Compare two versions of a spec side-by-side. Enter two Spec IDs to see what changed.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Project ID</label>
          <input
            type="text"
            placeholder="my-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Spec A (older)</label>
          <input
            type="text"
            placeholder="UUID of spec A"
            value={specIdA}
            onChange={(e) => setSpecIdA(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Spec B (newer)</label>
          <input
            type="text"
            placeholder="UUID of spec B"
            value={specIdB}
            onChange={(e) => setSpecIdB(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={handleCompare}
            disabled={loading || !projectId.trim() || !specIdA.trim() || !specIdB.trim()}
            style={btnStyle}
          >
            {loading ? 'Loading…' : 'Compare'}
          </button>
        </div>
      </div>

      {error && <div style={errorStyle}>⚠ {error}</div>}

      {diff && specA && specB && (
        <div>
          {/* Summary bar */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 12,
              fontSize: '0.85rem',
              alignItems: 'center',
            }}
          >
            <span>
              <strong>{specA.title}</strong>{' '}
              <span style={{ color: '#6b7280' }}>v{specA.version}</span>
            </span>
            <span style={{ color: '#9ca3af' }}>→</span>
            <span>
              <strong>{specB.title}</strong>{' '}
              <span style={{ color: '#6b7280' }}>v{specB.version}</span>
            </span>
            <span style={{ marginLeft: 'auto' }}>
              <span style={{ color: '#15803d', fontWeight: 600 }}>+{added}</span>
              {' '}
              <span style={{ color: '#dc2626', fontWeight: 600 }}>-{removed}</span>
            </span>
          </div>

          {/* Unified diff view */}
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              overflow: 'hidden',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              lineHeight: 1.6,
            }}
          >
            {diff.map((line, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  background:
                    line.type === 'added'
                      ? '#dcfce7'
                      : line.type === 'removed'
                        ? '#fee2e2'
                        : i % 2 === 0
                          ? '#fff'
                          : '#f9fafb',
                  padding: '1px 0',
                }}
              >
                <span
                  style={{
                    minWidth: 20,
                    textAlign: 'center',
                    color:
                      line.type === 'added'
                        ? '#15803d'
                        : line.type === 'removed'
                          ? '#dc2626'
                          : '#9ca3af',
                    fontWeight: 700,
                    padding: '0 6px',
                    userSelect: 'none',
                    flexShrink: 0,
                  }}
                >
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
                </span>
                <span
                  style={{
                    padding: '0 10px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color:
                      line.type === 'added'
                        ? '#166534'
                        : line.type === 'removed'
                          ? '#991b1b'
                          : '#374151',
                  }}
                >
                  {line.text}
                </span>
              </div>
            ))}
          </div>

          {added === 0 && removed === 0 && (
            <p style={{ color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
              ✓ No differences found between the two specs.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
