import { useState } from 'react';
import {
  getChecklist,
  getDemoChecklist,
  updateChecklistItem,
  type Checklist,
  type ChecklistItem,
  type ChecklistItemStatus,
  CHECKLIST_STATUS_COLOR,
  CHECKLIST_STATUS_ICON,
} from '../../api/quality';
import {
  btnStyle,
  btnSecondaryStyle,
  cardStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  labelStyle,
  accentColor,
  accentLight,
  accentBorder,
} from './styles';

const STATUSES: ChecklistItemStatus[] = ['pass', 'fail', 'skip', 'pending'];

function categoryGroups(items: ChecklistItem[]): Record<string, ChecklistItem[]> {
  return items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
}

function categoryProgress(items: ChecklistItem[]): { done: number; total: number } {
  const done = items.filter((i) => i.status === 'pass' || i.status === 'skip').length;
  return { done, total: items.length };
}

export function ChecklistBuilder() {
  const [projectId, setProjectId] = useState('');
  const [checklistId, setChecklistId] = useState('');
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);

  async function handleLoad() {
    if (!projectId.trim() || !checklistId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const data = await getChecklist(projectId.trim(), checklistId.trim());
      setChecklist(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    setChecklist(getDemoChecklist());
    setIsDemo(true);
    setError(null);
  }

  async function handleToggleStatus(item: ChecklistItem) {
    if (!checklist) return;
    const nextStatus: ChecklistItemStatus =
      item.status === 'pending' ? 'pass' :
      item.status === 'pass' ? 'fail' :
      item.status === 'fail' ? 'skip' : 'pending';

    if (isDemo) {
      setChecklist({
        ...checklist,
        items: checklist.items.map((i) =>
          i.item_id === item.item_id ? { ...i, status: nextStatus } : i
        ),
      });
      return;
    }

    setUpdatingItem(item.item_id);
    try {
      const updated = await updateChecklistItem(
        checklist.project_id,
        checklist.checklist_id,
        item.item_id,
        { status: nextStatus }
      );
      setChecklist({
        ...checklist,
        items: checklist.items.map((i) =>
          i.item_id === item.item_id ? { ...i, ...updated } : i
        ),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setUpdatingItem(null);
    }
  }

  const groups = checklist ? categoryGroups(checklist.items) : {};
  const totalDone = checklist
    ? checklist.items.filter((i) => i.status === 'pass' || i.status === 'skip').length
    : 0;
  const totalItems = checklist ? checklist.items.length : 0;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Checklist Builder</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Review and toggle quality checklist items grouped by category. Click a status badge to cycle through pass → fail → skip → pending.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          placeholder="Project ID"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <input
          type="text"
          placeholder="Checklist ID"
          value={checklistId}
          onChange={(e) => setChecklistId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={handleLoad}
          disabled={loading || !projectId.trim() || !checklistId.trim()}
          style={btnStyle}
        >
          {loading ? 'Loading…' : 'Load'}
        </button>
        <button onClick={handleLoadDemo} style={btnSecondaryStyle}>
          Load Demo
        </button>
      </div>

      {isDemo && (
        <div style={demoBannerStyle}>
          ⚠ Demo mode — showing sample checklist. Connect a backend project to use live data.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {checklist && (
        <div>
          {/* Header */}
          <div
            style={{
              background: accentLight,
              border: `1px solid ${accentBorder}`,
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ margin: 0, color: accentColor }}>{checklist.title}</h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#6b7280' }}>
                {totalDone}/{totalItems} items resolved
              </span>
            </div>
            {/* Overall progress bar */}
            <div
              style={{
                marginTop: 8,
                height: 6,
                background: '#e5e7eb',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${totalItems > 0 ? (totalDone / totalItems) * 100 : 0}%`,
                  background: accentColor,
                  borderRadius: 3,
                  transition: 'width 0.3s',
                }}
              />
            </div>
            {/* Status legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {STATUSES.map((s) => {
                const count = checklist.items.filter((i) => i.status === s).length;
                const color = CHECKLIST_STATUS_COLOR[s];
                return (
                  <span key={s} style={{ fontSize: '0.75rem', color, fontWeight: 600 }}>
                    {CHECKLIST_STATUS_ICON[s]} {s}: {count}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Categories */}
          {Object.entries(groups).map(([category, items]) => {
            const { done, total } = categoryProgress(items);
            return (
              <div key={category} style={{ ...cardStyle, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
                    {category}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 'auto' }}>
                    {done}/{total}
                  </span>
                </div>
                {/* Category progress bar */}
                <div
                  style={{
                    height: 4,
                    background: '#e5e7eb',
                    borderRadius: 2,
                    overflow: 'hidden',
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${total > 0 ? (done / total) * 100 : 0}%`,
                      background: done === total ? '#059669' : accentColor,
                      borderRadius: 2,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>

                {items.map((item) => {
                  const color = CHECKLIST_STATUS_COLOR[item.status];
                  const isUpdating = updatingItem === item.item_id;
                  return (
                    <div
                      key={item.item_id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '8px 10px',
                        background: '#fff',
                        border: `1px solid ${color}33`,
                        borderLeft: `3px solid ${color}`,
                        borderRadius: 5,
                        marginBottom: 5,
                        opacity: isUpdating ? 0.6 : 1,
                      }}
                    >
                      <button
                        onClick={() => handleToggleStatus(item)}
                        disabled={isUpdating}
                        title="Click to cycle status"
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          background: color + '22',
                          color,
                          border: `1px solid ${color}44`,
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {CHECKLIST_STATUS_ICON[item.status]} {item.status}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', color: '#111827' }}>
                          {item.description}
                        </div>
                        {item.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                            📝 {item.notes}
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.68rem',
                          color: '#9ca3af',
                          flexShrink: 0,
                        }}
                      >
                        {item.item_id}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {!checklist && !loading && !error && (
        <div style={{ color: '#9ca3af', fontStyle: 'italic', marginTop: 24 }}>
          Enter a project ID and checklist ID, or click "Load Demo" to see sample data.
        </div>
      )}
    </div>
  );
}
