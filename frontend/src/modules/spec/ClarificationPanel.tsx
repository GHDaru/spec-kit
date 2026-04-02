import { useState } from 'react';
import {
  getSpec,
  addClarification,
  resolveClarification,
  type SpecResponse,
  type ClarificationItemSchema,
} from '../../api/spec';
import {
  inputStyle,
  textareaStyle,
  btnStyle,
  btnGhostStyle,
  errorStyle,
  labelStyle,
} from './styles';

function ClarificationCard({
  item,
  onResolve,
}: {
  item: ClarificationItemSchema;
  onResolve: (id: string, resolution: string) => void;
}) {
  const [resolution, setResolution] = useState('');
  const [expanded, setExpanded] = useState(item.status !== 'resolved');

  if (item.status === 'resolved') {
    return (
      <div
        style={{
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: 6,
          padding: '8px 12px',
          marginBottom: 6,
          opacity: 0.8,
        }}
      >
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#15803d' }}>
          ✓ Resolved: {item.description}
        </div>
        {item.resolution && (
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#4b5563' }}>{item.resolution}</p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: 6,
        padding: '10px 12px',
        marginBottom: 8,
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: expanded ? 8 : 0 }}
        onClick={() => setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 600, flex: 1 }}>⚠ {item.description}</span>
        <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <>
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>Resolution text</label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Type your resolution…"
              rows={2}
              style={{ ...textareaStyle, width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onResolve(item.id, resolution)}
              disabled={!resolution.trim()}
              style={{ ...btnStyle, background: '#059669', padding: '6px 14px', fontSize: '0.85rem' }}
            >
              ✓ Resolve
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function ClarificationPanel() {
  const [projectId, setProjectId] = useState('');
  const [specId, setSpecId] = useState('');
  const [spec, setSpec] = useState<SpecResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  async function handleLoad() {
    if (!projectId.trim() || !specId.trim()) return;
    setLoading(true);
    setError(null);
    setSpec(null);
    try {
      const data = await getSpec(projectId.trim(), specId.trim());
      setSpec(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(itemId: string, resolution: string) {
    if (!spec) return;
    try {
      const updated = await resolveClarification(projectId.trim(), spec.spec_id, itemId, resolution);
      setSpec(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  async function handleAdd() {
    if (!spec || !newDescription.trim()) return;
    setAddLoading(true);
    try {
      const updated = await addClarification(projectId.trim(), spec.spec_id, newDescription.trim());
      setSpec(updated);
      setNewDescription('');
      setShowAdd(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setAddLoading(false);
    }
  }

  const pending = spec?.clarifications.filter((c) => c.status === 'open') ?? [];
  const resolved = spec?.clarifications.filter((c) => c.status === 'resolved') ?? [];

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Clarification Panel</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Review ambiguities and under-specified areas in your spec. Resolve each item to
        track resolution status.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Project ID"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 140px' }}
        />
        <input
          type="text"
          placeholder="Spec ID"
          value={specId}
          onChange={(e) => setSpecId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          style={{ ...inputStyle, flex: '2 1 240px' }}
        />
        <button
          onClick={handleLoad}
          disabled={loading || !projectId.trim() || !specId.trim()}
          style={btnStyle}
        >
          {loading ? 'Loading…' : 'Load'}
        </button>
      </div>

      {error && <div style={errorStyle}>⚠ {error}</div>}

      {spec && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div>
              <strong>{spec.title}</strong>
              <span style={{ color: '#6b7280', fontSize: '0.85rem', marginLeft: 8 }}>
                {pending.length} pending · {resolved.length} resolved
              </span>
            </div>
            <button onClick={() => setShowAdd((s) => !s)} style={btnGhostStyle}>
              + Add Clarification
            </button>
          </div>

          {showAdd && (
            <div
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 8,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <h4 style={{ margin: '0 0 10px' }}>New Clarification Item</h4>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Description *</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. What happens when login fails?"
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleAdd}
                  disabled={addLoading || !newDescription.trim()}
                  style={{ ...btnStyle, background: '#0369a1', padding: '6px 14px', fontSize: '0.85rem' }}
                >
                  {addLoading ? 'Adding…' : 'Add Item'}
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  style={{ ...btnStyle, background: '#6b7280', padding: '6px 14px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {spec.clarifications.length === 0 && (
            <p style={{ color: '#6b7280' }}>
              No clarification items. Use the button above to add items manually, or they will be
              detected automatically during AI spec generation.
            </p>
          )}

          {pending.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8, color: '#d97706' }}>
                ⚠ Pending ({pending.length})
              </h4>
              {pending.map((c) => (
                <ClarificationCard
                  key={c.id}
                  item={c}
                  onResolve={handleResolve}
                />
              ))}
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <h4 style={{ marginBottom: 8, color: '#6b7280' }}>
                Resolved ({resolved.length})
              </h4>
              {resolved.map((c) => (
                <ClarificationCard
                  key={c.id}
                  item={c}
                  onResolve={handleResolve}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
