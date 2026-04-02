import { useState } from 'react';
import {
  getSpec,
  updateSpec,
  type SpecResponse,
  type UserStorySchema,
  type Priority,
} from '../../api/spec';
import {
  inputStyle,
  btnStyle,
  errorStyle,
  PRIORITY_COLOR,
} from './styles';

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3'];

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '0.72rem',
        fontWeight: 700,
        color: '#fff',
        background: PRIORITY_COLOR[priority] ?? '#6b7280',
      }}
    >
      {priority}
    </span>
  );
}

function StoryCard({
  story,
  onChangePriority,
}: {
  story: UserStorySchema;
  onChangePriority: (id: string, priority: Priority) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        border: `2px solid ${PRIORITY_COLOR[story.priority] ?? '#e5e7eb'}`,
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 8,
        background: '#fff',
        cursor: 'pointer',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
        onClick={() => setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
      >
        <PriorityBadge priority={story.priority} />
        <span style={{ fontWeight: 600, fontSize: '0.9rem', flex: 1 }}>{story.title}</span>
        <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
          {story.acceptance_scenarios.length} scenario{story.acceptance_scenarios.length !== 1 ? 's' : ''}
        </span>
        <span style={{ color: '#9ca3af' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <>
          {story.description && (
            <p style={{ margin: '4px 0 8px', fontSize: '0.85rem', color: '#4b5563' }}>
              {story.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => onChangePriority(story.id, p)}
                style={{
                  padding: '3px 10px',
                  border: `2px solid ${PRIORITY_COLOR[p]}`,
                  borderRadius: 9999,
                  background: story.priority === p ? PRIORITY_COLOR[p] : 'transparent',
                  color: story.priority === p ? '#fff' : PRIORITY_COLOR[p],
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
          {story.acceptance_scenarios.length > 0 && (
            <div>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>
                Acceptance Scenarios:
              </span>
              {story.acceptance_scenarios.map((sc) => (
                <div
                  key={sc.id}
                  style={{
                    fontSize: '0.8rem',
                    background: '#f8fafc',
                    border: '1px solid #e5e7eb',
                    borderRadius: 4,
                    padding: '6px 10px',
                    marginTop: 4,
                  }}
                >
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
        </>
      )}
    </div>
  );
}

function KanbanColumn({
  priority,
  stories,
  onChangePriority,
}: {
  priority: Priority;
  stories: UserStorySchema[];
  onChangePriority: (id: string, priority: Priority) => void;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: '#f9fafb',
        borderRadius: 8,
        border: `2px solid ${PRIORITY_COLOR[priority]}22`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          background: PRIORITY_COLOR[priority],
          color: '#fff',
          borderRadius: '6px 6px 0 0',
          padding: '8px 14px',
          fontWeight: 700,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>{priority}</span>
        <span
          style={{
            background: 'rgba(255,255,255,0.25)',
            borderRadius: 9999,
            padding: '1px 8px',
            fontSize: '0.75rem',
          }}
        >
          {stories.length}
        </span>
      </div>
      <div style={{ padding: 10, flex: 1 }}>
        {stories.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', textAlign: 'center', margin: '20px 0' }}>
            No {priority} stories
          </p>
        )}
        {stories.map((s) => (
          <StoryCard key={s.id} story={s} onChangePriority={onChangePriority} />
        ))}
      </div>
    </div>
  );
}

export function UserStoryBoard() {
  const [projectId, setProjectId] = useState('');
  const [specId, setSpecId] = useState('');
  const [spec, setSpec] = useState<SpecResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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

  async function handleChangePriority(storyId: string, priority: Priority) {
    if (!spec) return;
    const updated: SpecResponse = {
      ...spec,
      user_stories: spec.user_stories.map((s) =>
        s.id === storyId ? { ...s, priority } : s,
      ),
    };
    setSpec(updated);

    setSaving(true);
    setSaved(false);
    try {
      await updateSpec(projectId.trim(), spec.id, {
        user_stories: updated.user_stories.map((s) => ({
          title: s.title,
          description: s.description,
          priority: s.priority,
          acceptance_scenarios: s.acceptance_scenarios.map((sc) => ({
            given: sc.given,
            when: sc.when,
            then: sc.then,
          })),
        })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>User Story Board</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Kanban view of user stories grouped by priority. Click a story to expand and
        reprioritize.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Project ID"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 160px' }}
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
      {saving && (
        <div style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: 8 }}>Saving…</div>
      )}
      {saved && (
        <div style={{ color: '#15803d', fontSize: '0.8rem', marginBottom: 8 }}>
          ✓ Priorities saved
        </div>
      )}

      {spec && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <strong>{spec.feature_name}</strong>{' '}
            <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>v{spec.version}</span>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {PRIORITIES.map((p) => (
              <KanbanColumn
                key={p}
                priority={p}
                stories={spec.user_stories.filter((s) => s.priority === p)}
                onChangePriority={handleChangePriority}
              />
            ))}
          </div>

          <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 8 }}>
            💡 Expand a card and click P1 / P2 / P3 to reprioritize. Changes are saved automatically.
          </p>
        </div>
      )}
    </div>
  );
}
