import type React from 'react';
import { useState } from 'react';
import {
  createSpec,
  type Priority,
  type AddUserStoryRequest,
  type AcceptanceScenarioCreateRequest,
  type AddRequirementRequest,
  type SpecResponse,
} from '../../api/spec';
import {
  inputStyle,
  textareaStyle,
  btnStyle,
  btnGhostStyle,
  errorStyle,
  successStyle,
  labelStyle,
  PRIORITY_COLOR,
} from './styles';

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3'];

const emptyScenario = (): AcceptanceScenarioCreateRequest => ({
  title: '',
  given: '',
  when: '',
  then: '',
});

const emptyStory = (): AddUserStoryRequest => ({
  title: '',
  as_a: '',
  i_want: '',
  so_that: '',
  priority: 'P1',
  scenarios: [],
});

const emptyReq = (): AddRequirementRequest => ({
  description: '',
  story_id: null,
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || `untitled-spec-${Date.now()}`;
}

function buildMarkdownPreview(
  title: string,
  description: string,
  stories: AddUserStoryRequest[],
  requirements: AddRequirementRequest[],
): string {
  const lines: string[] = [];
  lines.push(`# ${title || 'Untitled Feature'}`);
  lines.push('');
  if (description) {
    lines.push('## Description');
    lines.push('');
    lines.push(description);
    lines.push('');
  }

  if (stories.length > 0) {
    lines.push('## User Stories');
    lines.push('');
    for (const [i, s] of stories.entries()) {
      lines.push(`### US-${String(i + 1).padStart(3, '0')} [${s.priority}] — ${s.title || 'Untitled'}`);
      lines.push('');
      if (s.as_a || s.i_want || s.so_that) {
        lines.push(`As a ${s.as_a}, I want ${s.i_want}, so that ${s.so_that}`);
        lines.push('');
      }
      if (s.scenarios.length > 0) {
        lines.push('**Acceptance Scenarios:**');
        lines.push('');
        for (const sc of s.scenarios) {
          if (sc.given || sc.when || sc.then) {
            if (sc.title) lines.push(`*${sc.title}*`);
            lines.push(`- **Given** ${sc.given}`);
            lines.push(`  **When** ${sc.when}`);
            lines.push(`  **Then** ${sc.then}`);
            lines.push('');
          }
        }
      }
    }
  }

  if (requirements.length > 0) {
    lines.push('## Functional Requirements');
    lines.push('');
    for (const [i, r] of requirements.entries()) {
      const id = `FR-${String(i + 1).padStart(3, '0')}`;
      lines.push(`- **${id}**: ${r.description || 'TBD'}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function SpecEditor({
  projectId: initialProjectId,
  onCreated,
}: {
  projectId?: string;
  onCreated?: (spec: SpecResponse) => void;
}) {
  const [projectId, setProjectId] = useState(initialProjectId ?? '');
  const [specId, setSpecId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stories, setStories] = useState<AddUserStoryRequest[]>([emptyStory()]);
  const [requirements, setRequirements] = useState<AddRequirementRequest[]>([emptyReq()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<SpecResponse | null>(null);

  const preview = buildMarkdownPreview(title, description, stories, requirements);

  // ── Story helpers ─────────────────────────────────────────────────────────

  function updateStory(idx: number, field: keyof AddUserStoryRequest, value: string | AcceptanceScenarioCreateRequest[]) {
    setStories((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  }

  function addStory() {
    setStories((prev) => [...prev, emptyStory()]);
  }

  function removeStory(idx: number) {
    setStories((prev) => prev.filter((_, i) => i !== idx));
  }

  function addScenario(storyIdx: number) {
    setStories((prev) =>
      prev.map((s, i) =>
        i === storyIdx
          ? { ...s, scenarios: [...s.scenarios, emptyScenario()] }
          : s,
      ),
    );
  }

  function updateScenario(
    storyIdx: number,
    scIdx: number,
    field: keyof AcceptanceScenarioCreateRequest,
    value: string,
  ) {
    setStories((prev) =>
      prev.map((s, i) =>
        i === storyIdx
          ? {
              ...s,
              scenarios: s.scenarios.map((sc, j) =>
                j === scIdx ? { ...sc, [field]: value } : sc,
              ),
            }
          : s,
      ),
    );
  }

  function removeScenario(storyIdx: number, scIdx: number) {
    setStories((prev) =>
      prev.map((s, i) =>
        i === storyIdx
          ? { ...s, scenarios: s.scenarios.filter((_, j) => j !== scIdx) }
          : s,
      ),
    );
  }

  // ── Requirement helpers ───────────────────────────────────────────────────

  function updateReq(idx: number, field: keyof AddRequirementRequest, value: string | null) {
    setRequirements((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  }

  function addReq() {
    setRequirements((prev) => [...prev, emptyReq()]);
  }

  function removeReq(idx: number) {
    setRequirements((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId.trim() || !title.trim()) return;
    const resolvedSpecId = specId.trim() || slugify(title.trim());
    setLoading(true);
    setError(null);
    setCreated(null);
    try {
      const result = await createSpec(projectId.trim(), resolvedSpecId, {
        title: title.trim(),
        description: description.trim(),
        user_stories: stories.filter((s) => s.title.trim()),
        requirements: requirements.filter((r) => r.description.trim()),
      });
      setCreated(result);
      onCreated?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Spec Editor</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Define a new feature specification. The live Markdown preview updates as you type.
      </p>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* ── Left: Form ── */}
        <form onSubmit={handleSubmit} style={{ flex: 1, minWidth: 0 }}>
          {/* Project + meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Project ID *</label>
              <input
                type="text"
                placeholder="e.g. my-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Title *</label>
              <input
                type="text"
                placeholder="e.g. User Authentication"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Spec ID</label>
              <input
                type="text"
                placeholder={title ? slugify(title) : 'auto-generated'}
                value={specId}
                onChange={(e) => setSpecId(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="High-level description of this feature..."
              rows={3}
              style={{ ...textareaStyle, width: '100%' }}
            />
          </div>

          {/* User Stories */}
          <h4 style={{ marginBottom: 8, marginTop: 16 }}>User Stories</h4>
          {stories.map((story, si) => (
            <div
              key={si}
              style={{
                border: `2px solid ${PRIORITY_COLOR[story.priority] ?? '#e5e7eb'}`,
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
                background: '#fafafa',
                position: 'relative',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input
                    type="text"
                    value={story.title}
                    onChange={(e) => updateStory(si, 'title', e.target.value)}
                    placeholder="Short story title"
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select
                    value={story.priority}
                    onChange={(e) => updateStory(si, 'priority', e.target.value)}
                    style={{ ...inputStyle, width: '100%', color: PRIORITY_COLOR[story.priority] }}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p} style={{ color: PRIORITY_COLOR[p] }}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  {stories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStory(si)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#dc2626',
                        fontSize: '1rem',
                        padding: '8px',
                      }}
                      title="Remove story"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={labelStyle}>As a…</label>
                  <input
                    type="text"
                    value={story.as_a}
                    onChange={(e) => updateStory(si, 'as_a', e.target.value)}
                    placeholder="e.g. registered user"
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>I want…</label>
                  <input
                    type="text"
                    value={story.i_want}
                    onChange={(e) => updateStory(si, 'i_want', e.target.value)}
                    placeholder="e.g. to reset my password"
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>So that…</label>
                  <input
                    type="text"
                    value={story.so_that}
                    onChange={(e) => updateStory(si, 'so_that', e.target.value)}
                    placeholder="e.g. I can regain access"
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
              </div>

              {/* Acceptance Scenarios */}
              <div style={{ marginTop: 6 }}>
                <label style={{ ...labelStyle, color: '#7c3aed' }}>
                  Acceptance Scenarios
                </label>
                {story.scenarios.map((sc, sci) => (
                  <div
                    key={sci}
                    style={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                      padding: 10,
                      marginBottom: 6,
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                      <span
                        style={{
                          minWidth: 44,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#6b7280',
                        }}
                      >
                        Title
                      </span>
                      <input
                        type="text"
                        value={sc.title}
                        onChange={(e) => updateScenario(si, sci, 'title', e.target.value)}
                        placeholder="Short scenario label"
                        style={{ ...inputStyle, flex: 1, padding: '5px 10px', fontSize: '0.85rem' }}
                      />
                    </div>
                    {(['given', 'when', 'then'] as const).map((field) => (
                      <div key={field} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                        <span
                          style={{
                            minWidth: 44,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color:
                              field === 'given' ? '#7c3aed' : field === 'when' ? '#2563eb' : '#059669',
                          }}
                        >
                          {field.charAt(0).toUpperCase() + field.slice(1)}
                        </span>
                        <input
                          type="text"
                          value={sc[field]}
                          onChange={(e) => updateScenario(si, sci, field, e.target.value)}
                          placeholder={`… ${field} condition`}
                          style={{ ...inputStyle, flex: 1, padding: '5px 10px', fontSize: '0.85rem' }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => removeScenario(si, sci)}
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9ca3af',
                        fontSize: '0.85rem',
                      }}
                      title="Remove scenario"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addScenario(si)}
                  style={{ ...btnGhostStyle, fontSize: '0.78rem', padding: '4px 10px' }}
                >
                  + Add Scenario
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addStory} style={{ ...btnGhostStyle, marginBottom: 16 }}>
            + Add User Story
          </button>

          {/* Functional Requirements */}
          <h4 style={{ marginBottom: 8, marginTop: 4 }}>Functional Requirements</h4>
          {requirements.map((req, ri) => (
            <div
              key={ri}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  minWidth: 52,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#374151',
                  background: '#e5e7eb',
                  borderRadius: 4,
                  padding: '4px 6px',
                  textAlign: 'center',
                }}
              >
                FR-{String(ri + 1).padStart(3, '0')}
              </span>
              <input
                type="text"
                value={req.description}
                onChange={(e) => updateReq(ri, 'description', e.target.value)}
                placeholder="Describe the functional requirement…"
                style={{ ...inputStyle, flex: 1 }}
              />
              {requirements.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeReq(ri)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#dc2626',
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}
                  title="Remove requirement"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addReq} style={{ ...btnGhostStyle, marginBottom: 20 }}>
            + Add Requirement
          </button>

          <div>
            <button type="submit" disabled={loading} style={{ ...btnStyle, background: '#059669' }}>
              {loading ? 'Saving…' : '💾 Create Spec'}
            </button>
          </div>

          {error && <div style={{ ...errorStyle, marginTop: 16 }}>⚠ {error}</div>}

          {created && (
            <div style={successStyle}>
              <strong>✓ Spec created!</strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>
                <strong>{created.title}</strong> · v{created.version} ·{' '}
                {created.user_stories.length} stories · ID:{' '}
                <code style={{ fontSize: '0.75rem' }}>{created.spec_id}</code>
              </p>
            </div>
          )}
        </form>

        {/* ── Right: Live Markdown Preview ── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            position: 'sticky',
            top: 16,
            alignSelf: 'flex-start',
          }}
        >
          <div
            style={{
              background: '#1e293b',
              color: '#e2e8f0',
              borderRadius: '8px 8px 0 0',
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📄 Live Markdown Preview
          </div>
          <pre
            style={{
              margin: 0,
              padding: 16,
              background: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: '0 0 8px 8px',
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              lineHeight: 1.6,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 600,
              overflowY: 'auto',
              color: '#1e293b',
            }}
          >
            {preview}
          </pre>
        </div>
      </div>
    </div>
  );
}
