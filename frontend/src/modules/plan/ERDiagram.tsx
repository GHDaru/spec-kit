import type { DataModel, Entity, Relationship } from '../../api/plan';

const CARDINALITY_SYMBOL: Record<string, string> = {
  'one-to-one': '1 — 1',
  'one-to-many': '1 — ∞',
  'many-to-many': '∞ — ∞',
};

function EntityBox({ entity }: { entity: Entity }) {
  return (
    <div
      style={{
        border: '2px solid #1d4ed8',
        borderRadius: 8,
        minWidth: 180,
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        background: '#fff',
        flex: '0 0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#1d4ed8',
          color: '#fff',
          padding: '6px 10px',
          fontWeight: 700,
          fontSize: '0.9rem',
        }}
      >
        {entity.name}
      </div>

      {/* Fields */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <tbody>
          {entity.fields.map((f) => (
            <tr
              key={f.name}
              style={{
                borderBottom: '1px solid #f3f4f6',
                background: f.primary_key ? '#eff6ff' : 'transparent',
              }}
            >
              <td
                style={{
                  padding: '4px 8px',
                  fontFamily: 'monospace',
                  color: f.primary_key ? '#1d4ed8' : f.foreign_key ? '#7c3aed' : '#111827',
                  fontWeight: f.primary_key ? 700 : 400,
                }}
              >
                {f.primary_key && '🔑 '}
                {f.foreign_key && '🔗 '}
                {f.name}
              </td>
              <td style={{ padding: '4px 8px', color: '#6b7280', textAlign: 'right' }}>
                {f.type}
                {!f.required && ' ?'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Description */}
      {entity.description && (
        <div
          style={{
            padding: '4px 8px 6px',
            fontSize: '0.72rem',
            color: '#9ca3af',
            fontStyle: 'italic',
            borderTop: '1px solid #f3f4f6',
          }}
        >
          {entity.description}
        </div>
      )}
    </div>
  );
}

function RelationshipRow({ rel }: { rel: Relationship }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: '#f8fafc',
        borderRadius: 6,
        border: '1px solid #e2e8f0',
        fontSize: '0.82rem',
      }}
    >
      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1d4ed8' }}>
        {rel.from_entity}
      </span>
      <span style={{ color: '#9ca3af' }}>
        {rel.label ? `—[${rel.label}]→` : '→'}
      </span>
      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#7c3aed' }}>
        {rel.to_entity}
      </span>
      <span
        style={{
          marginLeft: 'auto',
          fontSize: '0.72rem',
          background: '#e0e7ff',
          color: '#3730a3',
          borderRadius: 4,
          padding: '1px 6px',
          fontWeight: 600,
        }}
      >
        {CARDINALITY_SYMBOL[rel.cardinality]}
      </span>
    </div>
  );
}

interface Props {
  dataModel: DataModel;
}

export function ERDiagram({ dataModel }: Props) {
  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>Data Model</h3>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 14 }}>
        Entity definitions with fields (🔑 primary key, 🔗 foreign key) and their relationships.
      </p>

      {/* Entity cards */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {dataModel.entities.map((e) => (
          <EntityBox key={e.name} entity={e} />
        ))}
      </div>

      {/* Relationships */}
      {dataModel.relationships.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: '0.875rem', color: '#374151' }}>
            Relationships
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dataModel.relationships.map((r, i) => (
              <RelationshipRow key={i} rel={r} />
            ))}
          </div>
        </div>
      )}

      <p style={{ marginTop: 12, fontSize: '0.75rem', color: '#9ca3af' }}>
        {dataModel.entities.length} entities · {dataModel.relationships.length} relationships
      </p>
    </div>
  );
}
