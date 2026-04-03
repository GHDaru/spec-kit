import { useState } from 'react';
import {
  getDependencyGraph,
  setDependencyGraph,
  getDemoTaskList,
  type DependencyEdge,
} from '../../api/tasks';
import {
  btnStyle,
  btnSecondaryStyle,
  cardStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  labelStyle,
} from './styles';

function EdgeRow({ edge }: { edge: DependencyEdge }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 10px',
        borderBottom: '1px solid #f3f4f6',
        fontSize: '0.85rem',
      }}
    >
      <code style={{ color: '#0f766e', fontSize: '0.78rem' }}>{edge.source_id}</code>
      <span style={{ color: '#9ca3af' }}>→</span>
      <code style={{ color: '#6d28d9', fontSize: '0.78rem' }}>{edge.target_id}</code>
      {edge.label && (
        <span style={{ color: '#6b7280', fontSize: '0.75rem', fontStyle: 'italic' }}>
          {edge.label}
        </span>
      )}
    </div>
  );
}

export function DependencyGraphView() {
  const [projectId, setProjectId] = useState('');
  const [edges, setEdges] = useState<DependencyEdge[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  // Add edge form state
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const data = await getDependencyGraph(projectId.trim());
      setEdges(data.edges);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    const demo = getDemoTaskList();
    setEdges(demo.dependency_edges);
    setIsDemo(true);
    setError(null);
  }

  async function handleAddEdge() {
    if (!newSource.trim() || !newTarget.trim() || !edges) return;
    const newEdges = [
      ...edges,
      { source_id: newSource.trim(), target_id: newTarget.trim(), label: newLabel.trim() },
    ];
    if (isDemo) {
      setEdges(newEdges);
      setNewSource('');
      setNewTarget('');
      setNewLabel('');
      return;
    }
    setSaving(true);
    try {
      const result = await setDependencyGraph(projectId.trim(), newEdges);
      setEdges(result.edges);
      setNewSource('');
      setNewTarget('');
      setNewLabel('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  // Build unique nodes from edges
  const nodes = edges
    ? Array.from(new Set(edges.flatMap((e) => [e.source_id, e.target_id])))
    : [];

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Dependency Graph</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        View and edit the directed acyclic graph of task dependencies. Edges mean "source must
        complete before target starts."
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Project ID"
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

      {isDemo && <div style={demoBannerStyle}>⚠ Demo mode — data is not persisted.</div>}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {edges !== null && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
          {/* Edge list */}
          <div>
            <div style={labelStyle}>{edges.length} edges</div>
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              {edges.length === 0 && (
                <p style={{ color: '#9ca3af', fontSize: '0.85rem', padding: 14 }}>
                  No dependencies defined.
                </p>
              )}
              {edges.map((e, i) => (
                <EdgeRow key={i} edge={e} />
              ))}
            </div>

            {/* Add edge form */}
            <div style={{ ...cardStyle, marginTop: 16 }}>
              <div style={{ ...labelStyle, marginBottom: 8 }}>Add Edge</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Source task ID"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  style={{ ...inputStyle, flex: '1 1 130px' }}
                />
                <input
                  type="text"
                  placeholder="Target task ID"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  style={{ ...inputStyle, flex: '1 1 130px' }}
                />
                <input
                  type="text"
                  placeholder="Label (optional)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  style={{ ...inputStyle, flex: '1 1 100px' }}
                />
                <button
                  onClick={handleAddEdge}
                  disabled={saving || !newSource.trim() || !newTarget.trim()}
                  style={btnStyle}
                >
                  {saving ? 'Saving…' : '+ Add'}
                </button>
              </div>
            </div>
          </div>

          {/* Node list */}
          <div>
            <div style={labelStyle}>{nodes.length} nodes</div>
            <div style={cardStyle}>
              {nodes.map((n) => (
                <div
                  key={n}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    padding: '3px 0',
                    color: '#374151',
                  }}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
