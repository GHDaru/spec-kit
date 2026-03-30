import { useState } from 'react';
import {
  createConstitution,
  type ConstitutionResponse,
  type PrincipleSchema,
  type EnforcementLevel,
  type PrincipleCategory,
} from '../../api/constitution';
import { btnStyle, errorStyle, inputStyle } from './ConstitutionView';

const ENFORCEMENT_LEVELS: EnforcementLevel[] = ['MUST', 'SHOULD', 'MAY'];
const CATEGORIES: PrincipleCategory[] = [
  'architecture',
  'testing',
  'security',
  'performance',
  'workflow',
  'general',
];

const emptyPrinciple = (): PrincipleSchema => ({
  name: '',
  description: '',
  enforcement_level: 'MUST',
  category: 'general',
});

export function ConstitutionCreate() {
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [principles, setPrinciples] = useState<PrincipleSchema[]>([emptyPrinciple()]);
  const [result, setResult] = useState<ConstitutionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updatePrinciple(
    index: number,
    field: keyof PrincipleSchema,
    value: string,
  ) {
    setPrinciples((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  }

  function addPrinciple() {
    setPrinciples((prev) => [...prev, emptyPrinciple()]);
  }

  function removePrinciple(index: number) {
    setPrinciples((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId.trim() || !projectName.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await createConstitution(projectId.trim(), {
        project_name: projectName.trim(),
        principles,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Create Constitution</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Define a new governing constitution for a project. Principles must have
        unique names.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Project identifiers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
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
            <label style={labelStyle}>Project Name *</label>
            <input
              type="text"
              placeholder="e.g. My Awesome API"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Principles */}
        <h4 style={{ marginBottom: 8 }}>Principles</h4>
        {principles.map((p, i) => (
          <div
            key={i}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 14,
              marginBottom: 10,
              background: '#f9fafb',
              position: 'relative',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => updatePrinciple(i, 'name', e.target.value)}
                  placeholder="e.g. Test-First"
                  required
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Enforcement</label>
                  <select
                    value={p.enforcement_level}
                    onChange={(e) =>
                      updatePrinciple(i, 'enforcement_level', e.target.value)
                    }
                    style={{ ...inputStyle, width: '100%' }}
                  >
                    {ENFORCEMENT_LEVELS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Category</label>
                  <select
                    value={p.category}
                    onChange={(e) =>
                      updatePrinciple(i, 'category', e.target.value)
                    }
                    style={{ ...inputStyle, width: '100%' }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description *</label>
              <textarea
                value={p.description}
                onChange={(e) => updatePrinciple(i, 'description', e.target.value)}
                placeholder="Describe this principle..."
                required
                rows={2}
                style={{
                  ...inputStyle,
                  width: '100%',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>
            {principles.length > 1 && (
              <button
                type="button"
                onClick={() => removePrinciple(i)}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  color: '#dc2626',
                }}
                title="Remove principle"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addPrinciple}
          style={{
            ...btnStyle,
            background: '#f3f4f6',
            color: '#374151',
            border: '1px dashed #d1d5db',
            marginBottom: 16,
          }}
        >
          + Add Principle
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={loading}
            style={{ ...btnStyle, background: '#059669' }}
          >
            {loading ? 'Saving…' : 'Create Constitution'}
          </button>
        </div>
      </form>

      {error && <div style={{ ...errorStyle, marginTop: 16 }}>⚠ {error}</div>}

      {result && (
        <div
          style={{
            marginTop: 16,
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 8,
            padding: '12px 16px',
          }}
        >
          <strong style={{ color: '#15803d' }}>✓ Constitution created!</strong>
          <p style={{ margin: '6px 0 0', fontSize: '0.875rem' }}>
            <strong>{result.project_name}</strong> · v{result.version} ·{' '}
            {result.principles.length} principle(s)
          </p>
        </div>
      )}
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
