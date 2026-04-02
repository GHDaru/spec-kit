import { useState } from 'react';
import {
  getSpec,
  updateSpec,
  type SpecResponse,
  type FunctionalRequirementSchema,
} from '../../api/spec';
import {
  inputStyle,
  btnStyle,
  errorStyle,
} from './styles';

type SortField = 'id' | 'description' | 'story';
type SortDir = 'asc' | 'desc';

function RequirementRow({
  req,
  storyTitle,
  editing,
  editValue,
  onEdit,
  onEditChange,
  onEditSave,
  onEditCancel,
}: {
  req: FunctionalRequirementSchema;
  storyTitle: string | null;
  editing: boolean;
  editValue: string;
  onEdit: () => void;
  onEditChange: (v: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
}) {
  return (
    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
      <td style={tdStyle}>
        <code style={{ fontWeight: 700, color: '#2563eb' }}>{req.id}</code>
      </td>
      <td style={tdStyle}>
        {editing ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onEditSave();
                if (e.key === 'Escape') onEditCancel();
              }}
              style={{ ...inputStyle, flex: 1, padding: '4px 8px', fontSize: '0.85rem' }}
              autoFocus
            />
            <button
              onClick={onEditSave}
              style={{ ...btnStyle, padding: '4px 10px', fontSize: '0.8rem', background: '#059669' }}
            >
              ✓
            </button>
            <button
              onClick={onEditCancel}
              style={{ ...btnStyle, padding: '4px 10px', fontSize: '0.8rem', background: '#6b7280' }}
            >
              ✕
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '0.875rem' }}>{req.description}</span>
        )}
      </td>
      <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.8rem' }}>
        {storyTitle ?? '—'}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right' }}>
        {!editing && (
          <button
            onClick={onEdit}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#2563eb',
              fontSize: '0.8rem',
            }}
            title="Edit description"
          >
            ✏
          </button>
        )}
      </td>
    </tr>
  );
}

export function RequirementsList() {
  const [projectId, setProjectId] = useState('');
  const [specId, setSpecId] = useState('');
  const [spec, setSpec] = useState<SpecResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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

  function storyTitle(storyId: string | null): string | null {
    if (!storyId || !spec) return null;
    return spec.user_stories.find((s) => s.id === storyId)?.title ?? null;
  }

  function getRequirements() {
    if (!spec) return [];
    let reqs = [...spec.functional_requirements];

    if (filter.trim()) {
      const q = filter.toLowerCase();
      reqs = reqs.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (storyTitle(r.story_id)?.toLowerCase().includes(q) ?? false),
      );
    }

    reqs.sort((a, b) => {
      let va = '';
      let vb = '';
      if (sortField === 'id') { va = a.id; vb = b.id; }
      else if (sortField === 'description') { va = a.description; vb = b.description; }
      else { va = storyTitle(a.story_id) ?? ''; vb = storyTitle(b.story_id) ?? ''; }
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    return reqs;
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function sortIcon(field: SortField) {
    if (sortField !== field) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  async function saveEditedDescription(reqId: string, newDesc: string) {
    if (!spec) return;
    const updated = spec.functional_requirements.map((r) =>
      r.id === reqId ? { ...r, description: newDesc } : r,
    );
    setSpec({ ...spec, functional_requirements: updated });
    setEditingId(null);

    setSaving(true);
    try {
      await updateSpec(projectId.trim(), spec.id, {
        functional_requirements: updated.map((r) => ({
          description: r.description,
          story_id: r.story_id ?? null,
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Requirements List</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Sortable, filterable table of functional requirements with user story traceability.
        Click the pencil icon to edit a description inline.
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
          placeholder="Spec ID (UUID)"
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
      {saving && <div style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: 8 }}>Saving…</div>}

      {spec && (
        <div>
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '0.9rem' }}>{spec.feature_name}</strong>
            <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
              {spec.functional_requirements.length} requirement{spec.functional_requirements.length !== 1 ? 's' : ''}
            </span>
            <input
              type="text"
              placeholder="🔍 Filter requirements…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ ...inputStyle, width: 220, marginLeft: 'auto' }}
            />
          </div>

          {spec.functional_requirements.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No functional requirements defined for this spec.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ ...thStyle, cursor: 'pointer', width: 90 }} onClick={() => toggleSort('id')}>
                    ID{sortIcon('id')}
                  </th>
                  <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => toggleSort('description')}>
                    Description{sortIcon('description')}
                  </th>
                  <th style={{ ...thStyle, cursor: 'pointer', width: 180 }} onClick={() => toggleSort('story')}>
                    Linked Story{sortIcon('story')}
                  </th>
                  <th style={{ ...thStyle, width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {getRequirements().map((r) => (
                  <RequirementRow
                    key={r.id}
                    req={r}
                    storyTitle={storyTitle(r.story_id)}
                    editing={editingId === r.id}
                    editValue={editValue}
                    onEdit={() => { setEditingId(r.id); setEditValue(r.description); }}
                    onEditChange={setEditValue}
                    onEditSave={() => saveEditedDescription(r.id, editValue)}
                    onEditCancel={() => setEditingId(null)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '7px 10px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '0.8rem',
  color: '#374151',
  borderBottom: '2px solid #e5e7eb',
  userSelect: 'none',
};

const tdStyle: React.CSSProperties = {
  padding: '7px 10px',
  verticalAlign: 'middle',
};
