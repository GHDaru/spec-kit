import { useState } from 'react';
import {
  getConstitution,
  type ConstitutionResponse,
  type PrincipleSchema,
} from '../../api/constitution';

const ENFORCEMENT_BADGE: Record<string, string> = {
  MUST: '#dc2626',
  SHOULD: '#d97706',
  MAY: '#16a34a',
};

function PrincipleBadge({ level }: { level: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '0.7rem',
        fontWeight: 700,
        color: '#fff',
        background: ENFORCEMENT_BADGE[level] ?? '#6b7280',
        marginRight: 6,
      }}
    >
      {level}
    </span>
  );
}

function PrincipleCard({ principle }: { principle: PrincipleSchema }) {
  return (
    <div
      style={{
        borderLeft: `4px solid ${ENFORCEMENT_BADGE[principle.enforcement_level] ?? '#6b7280'}`,
        background: '#f9fafb',
        borderRadius: '0 8px 8px 0',
        padding: '10px 14px',
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <PrincipleBadge level={principle.enforcement_level} />
        <span
          style={{
            fontSize: '0.7rem',
            background: '#e5e7eb',
            borderRadius: 4,
            padding: '1px 6px',
            color: '#374151',
          }}
        >
          {principle.category}
        </span>
      </div>
      <strong style={{ display: 'block', marginBottom: 2 }}>{principle.name}</strong>
      <p style={{ margin: 0, fontSize: '0.875rem', color: '#4b5563' }}>
        {principle.description}
      </p>
    </div>
  );
}

export function ConstitutionView() {
  const [projectId, setProjectId] = useState('');
  const [constitution, setConstitution] = useState<ConstitutionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setConstitution(null);
    try {
      const data = await getConstitution(projectId.trim());
      setConstitution(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>View Constitution</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Load the governing constitution for an existing project.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Project ID (e.g. my-project)"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          style={inputStyle}
        />
        <button onClick={handleLoad} disabled={loading || !projectId.trim()} style={btnStyle}>
          {loading ? 'Loading…' : 'Load'}
        </button>
      </div>

      {error && <div style={errorStyle}>⚠ {error}</div>}

      {constitution && (
        <div>
          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
            }}
          >
            <h3 style={{ margin: '0 0 4px' }}>{constitution.project_name}</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#0369a1' }}>
              Version <strong>{constitution.version}</strong>
              {constitution.ratification_date &&
                ` · Ratified ${constitution.ratification_date}`}
              {constitution.last_amended_date &&
                ` · Last amended ${constitution.last_amended_date}`}
            </p>
          </div>

          <h4 style={{ marginBottom: 8 }}>
            Principles ({constitution.principles.length})
          </h4>
          {constitution.principles.length === 0 && (
            <p style={{ color: '#6b7280' }}>No principles defined.</p>
          )}
          {constitution.principles.map((p, i) => (
            <PrincipleCard key={`${i}-${p.name}`} principle={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// Shared micro-styles (exported for reuse)
export const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: '0.95rem',
  outline: 'none',
};

export const btnStyle: React.CSSProperties = {
  padding: '8px 18px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.9rem',
};

export const errorStyle: React.CSSProperties = {
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 6,
  padding: '10px 14px',
  color: '#dc2626',
  marginBottom: 12,
};
