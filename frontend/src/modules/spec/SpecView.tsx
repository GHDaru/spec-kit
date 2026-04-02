import type React from 'react';
import { useState } from 'react';
import {
  listSpecs,
  getSpec,
  type SpecSummary,
  type SpecResponse,
} from '../../api/spec';
import {
  btnStyle,
  errorStyle,
  inputStyle,
  PRIORITY_COLOR,
  cardStyle,
  labelStyle,
} from './styles';

function SpecSummaryCard({
  spec,
  onSelect,
}: {
  spec: SpecSummary;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      <div
        style={{ flex: 1 }}
        onClick={() => onSelect(spec.spec_id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(spec.spec_id)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <strong style={{ fontSize: '1rem' }}>{spec.title}</strong>
          <span
            style={{
              fontSize: '0.7rem',
              background: '#e5e7eb',
              borderRadius: 4,
              padding: '2px 6px',
              color: '#374151',
            }}
          >
            v{spec.version}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: '#6b7280' }}>
          <span>📖 {spec.story_count} stories</span>
          <span>📋 {spec.requirement_count} requirements</span>
          {spec.open_clarification_count > 0 && (
            <span style={{ color: '#d97706' }}>⚠ {spec.open_clarification_count} open clarifications</span>
          )}
          {spec.created_date && (
            <span>🕐 {new Date(spec.created_date).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SpecDetail({ spec }: { spec: SpecResponse }) {
  const byPriority = (p: string) =>
    spec.user_stories.filter((s) => s.priority === p);

  return (
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
        <h3 style={{ margin: '0 0 4px' }}>{spec.title}</h3>
        <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#0369a1' }}>
          Version <strong>{spec.version}</strong> · ID:{' '}
          <code style={{ fontSize: '0.75rem' }}>{spec.spec_id}</code>
        </p>
        {spec.description && (
          <p style={{ margin: '6px 0 0', fontSize: '0.875rem', color: '#374151' }}>
            {spec.description}
          </p>
        )}
      </div>

      {/* User Stories by Priority */}
      {(['P1', 'P2', 'P3'] as const).map((p) => {
        const stories = byPriority(p);
        if (stories.length === 0) return null;
        return (
          <div key={p} style={{ marginBottom: 16 }}>
            <h4 style={{ color: PRIORITY_COLOR[p], marginBottom: 8 }}>
              {p} Stories ({stories.length})
            </h4>
            {stories.map((s) => (
              <div
                key={s.id}
                style={{
                  borderLeft: `4px solid ${PRIORITY_COLOR[p]}`,
                  background: '#f9fafb',
                  borderRadius: '0 8px 8px 0',
                  padding: '10px 14px',
                  marginBottom: 8,
                }}
              >
                <strong>{s.title}</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#4b5563' }}>
                  As a {s.as_a}, I want {s.i_want}, so that {s.so_that}
                </p>
                {s.scenarios.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>
                      Scenarios ({s.scenarios.length}):
                    </span>
                    {s.scenarios.map((sc) => (
                      <div
                        key={sc.title}
                        style={{
                          fontSize: '0.8rem',
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: 4,
                          padding: '6px 10px',
                          marginTop: 4,
                        }}
                      >
                        {sc.title && (
                          <div style={{ fontWeight: 600, color: '#374151', marginBottom: 2 }}>{sc.title}</div>
                        )}
                        <div>
                          <strong style={{ color: '#7c3aed' }}>Given</strong> {sc.given}
                        </div>
                        <div>
                          <strong style={{ color: '#2563eb' }}>When</strong> {sc.when}
                        </div>
                        <div>
                          <strong style={{ color: '#059669' }}>Then</strong> {sc.then}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {/* Requirements */}
      {spec.requirements.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 8 }}>
            Functional Requirements ({spec.requirements.length})
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Story</th>
              </tr>
            </thead>
            <tbody>
              {spec.requirements.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}>
                    <code style={{ fontWeight: 700 }}>{r.id}</code>
                  </td>
                  <td style={tdStyle}>{r.description}</td>
                  <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.8rem' }}>
                    {r.story_id
                      ? spec.user_stories.find((s) => s.id === r.story_id)?.title ?? r.story_id
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Clarifications */}
      {spec.clarifications.length > 0 && (
        <div>
          <h4 style={{ marginBottom: 8 }}>
            Clarifications ({spec.clarifications.filter((c) => c.status === 'open').length} pending)
          </h4>
          {spec.clarifications.map((c) => (
            <div
              key={c.id}
              style={{
                background: c.status === 'resolved' ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${c.status === 'resolved' ? '#86efac' : '#fde68a'}`,
                borderRadius: 6,
                padding: '8px 12px',
                marginBottom: 6,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>
                {c.status === 'resolved' ? '✓ Resolved' : '⚠ Pending'}: {c.description}
              </div>
              {c.resolution && (
                <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#15803d' }}>
                  Resolution: {c.resolution}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SpecView() {
  const [projectId, setProjectId] = useState('');
  const [specs, setSpecs] = useState<SpecSummary[] | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<SpecResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setSpecs(null);
    setSelectedSpec(null);
    try {
      const data = await listSpecs(projectId.trim());
      setSpecs(data.specs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(specId: string) {
    setLoading(true);
    setError(null);
    try {
      const spec = await getSpec(projectId.trim(), specId);
      setSelectedSpec(spec);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Browse Specs</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        List and inspect all feature specifications for a project.
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
        <button onClick={handleLoad} disabled={loading || !projectId.trim()} style={btnStyle}>
          {loading ? 'Loading…' : 'Load'}
        </button>
      </div>

      {error && <div style={errorStyle}>⚠ {error}</div>}

      {selectedSpec && (
        <div>
          <button
            onClick={() => setSelectedSpec(null)}
            style={{ ...btnStyle, background: '#6b7280', marginBottom: 16, fontSize: '0.8rem', padding: '6px 12px' }}
          >
            ← Back to list
          </button>
          <SpecDetail spec={selectedSpec} />
        </div>
      )}

      {!selectedSpec && specs !== null && (
        <div>
          <div style={{ ...labelStyle, marginBottom: 8 }}>
            {specs.length} spec{specs.length !== 1 ? 's' : ''} found
          </div>
          {specs.length === 0 && (
            <p style={{ color: '#6b7280' }}>No specs yet. Create one in the Editor tab.</p>
          )}
          {specs.map((s) => (
            <SpecSummaryCard
              key={s.spec_id}
              spec={s}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '6px 10px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '0.8rem',
  color: '#374151',
  borderBottom: '2px solid #e5e7eb',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 10px',
  verticalAlign: 'top',
};
