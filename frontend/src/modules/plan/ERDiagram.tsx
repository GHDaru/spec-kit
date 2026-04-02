import type React from 'react';
import { useState } from 'react';
import { getPlan, getDemoPlan, type DataModel, type DataEntity } from '../../api/plan';
import {
  btnStyle,
  btnSecondaryStyle,
  errorStyle,
  inputStyle,
  demoBannerStyle,
} from './styles';

const REL_ICON: Record<string, string> = {
  'one-to-one': '1 — 1',
  'one-to-many': '1 — ∞',
  'many-to-many': '∞ — ∞',
};

function EntityCard({ entity }: { entity: DataEntity }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      style={{
        border: '1px solid #d1d5db',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      {/* Entity header */}
      <div
        style={{
          background: '#1e40af',
          color: '#fff',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v);
        }}
      >
        <div>
          <strong style={{ fontSize: '0.95rem' }}>{entity.name}</strong>
          <span
            style={{
              fontSize: '0.72rem',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 3,
              padding: '1px 6px',
              marginLeft: 8,
            }}
          >
            {entity.fields.length} fields
          </span>
        </div>
        <span style={{ fontSize: '0.8rem' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Entity description */}
      {expanded && entity.description && (
        <div
          style={{
            padding: '6px 14px',
            fontSize: '0.8rem',
            color: '#374151',
            background: '#eff6ff',
            borderBottom: '1px solid #dbeafe',
          }}
        >
          {entity.description}
        </div>
      )}

      {/* Fields table */}
      {expanded && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={thStyle}>Field</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Nullable</th>
              <th style={thStyle}>Flags</th>
              <th style={thStyle}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {entity.fields.map((field) => (
              <tr
                key={field.name}
                style={{
                  borderBottom: '1px solid #f3f4f6',
                  background: field.primary_key ? '#fafffe' : 'transparent',
                }}
              >
                <td style={tdStyle}>
                  <code
                    style={{
                      fontWeight: field.primary_key ? 700 : 400,
                      color: field.primary_key ? '#1e40af' : '#111827',
                    }}
                  >
                    {field.name}
                  </code>
                </td>
                <td style={tdStyle}>
                  <code
                    style={{
                      fontSize: '0.78rem',
                      color: '#7c3aed',
                      background: '#faf5ff',
                      padding: '1px 5px',
                      borderRadius: 3,
                    }}
                  >
                    {field.type}
                  </code>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {field.nullable ? (
                    <span style={{ color: '#9ca3af' }}>null</span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>NOT NULL</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {field.primary_key && (
                      <span style={badge('#d97706', '#fffbeb')}>🔑 PK</span>
                    )}
                    {field.foreign_key && (
                      <span style={badge('#2563eb', '#eff6ff')}>🔗 FK→{field.foreign_key}</span>
                    )}
                  </div>
                </td>
                <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.75rem' }}>
                  {field.description ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function badge(color: string, bg: string): React.CSSProperties {
  return {
    fontSize: '0.68rem',
    background: bg,
    color: color,
    border: `1px solid ${color}40`,
    borderRadius: 3,
    padding: '1px 5px',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  };
}

function RelationshipDiagram({ model }: { model: DataModel }) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 16,
        background: '#fafafa',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#6b7280',
          marginBottom: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Entity Relationships
      </div>
      {model.relationships.map((r, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
            fontSize: '0.85rem',
          }}
        >
          <span
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 4,
              padding: '3px 10px',
              fontWeight: 600,
              color: '#1e40af',
            }}
          >
            {r.from_entity}
          </span>
          <span style={{ color: '#9ca3af', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            ——{' '}
            <span style={{ color: '#374151', fontWeight: 600 }}>
              {r.label} ({REL_ICON[r.type]})
            </span>{' '}
            ——▶
          </span>
          <span
            style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 4,
              padding: '3px 10px',
              fontWeight: 600,
              color: '#15803d',
            }}
          >
            {r.to_entity}
          </span>
        </div>
      ))}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '6px 10px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '0.75rem',
  color: '#374151',
  borderBottom: '2px solid #e5e7eb',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 10px',
  verticalAlign: 'middle',
};

export function ERDiagram() {
  const [projectId, setProjectId] = useState('');
  const [planId, setPlanId] = useState('');
  const [dataModel, setDataModel] = useState<DataModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  async function handleLoad() {
    if (!projectId.trim() || !planId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const plan = await getPlan(projectId.trim(), planId.trim());
      setDataModel(plan.data_model);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    setDataModel(getDemoPlan().data_model);
    setIsDemo(true);
    setError(null);
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Data Model</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Entity definitions, field types, relationships, and primary/foreign key constraints.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Project ID"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 140 }}
        />
        <input
          type="text"
          placeholder="Plan ID"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          style={{ ...inputStyle, flex: 1, minWidth: 140 }}
        />
        <button
          onClick={handleLoad}
          disabled={loading || !projectId.trim() || !planId.trim()}
          style={btnStyle}
        >
          {loading ? 'Loading…' : 'Load'}
        </button>
        <button onClick={handleLoadDemo} style={btnSecondaryStyle}>
          Load Demo
        </button>
      </div>

      {isDemo && <div style={demoBannerStyle}>⚠ Demo mode — backend not yet connected.</div>}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {dataModel && (
        <div>
          <RelationshipDiagram model={dataModel} />
          <div
            style={{
              fontSize: '0.78rem',
              color: '#6b7280',
              marginBottom: 12,
            }}
          >
            {dataModel.entities.length} entities · {dataModel.relationships.length} relationships
          </div>
          {dataModel.entities.map((entity) => (
            <EntityCard key={entity.id} entity={entity} />
          ))}
        </div>
      )}
    </div>
  );
}
