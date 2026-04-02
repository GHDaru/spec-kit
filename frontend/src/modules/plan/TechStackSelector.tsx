import { useState } from 'react';
import {
  getPlan,
  getDemoPlan,
  type TechChoice,
  type TechCategory,
} from '../../api/plan';
import {
  btnStyle,
  btnSecondaryStyle,
  errorStyle,
  inputStyle,
  labelStyle,
  demoBannerStyle,
  CATEGORY_COLOR,
  CATEGORY_ICON,
} from './styles';

const CATEGORIES: TechCategory[] = [
  'language',
  'framework',
  'database',
  'infrastructure',
  'testing',
];

function TechCard({
  tech,
  onToggle,
}: {
  tech: TechChoice;
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = CATEGORY_COLOR[tech.category];

  return (
    <div
      style={{
        border: `2px solid ${tech.selected ? color : '#e5e7eb'}`,
        borderRadius: 10,
        background: tech.selected ? `${color}08` : '#fff',
        padding: 14,
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: `${color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            flexShrink: 0,
          }}
        >
          {CATEGORY_ICON[tech.category]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '0.95rem' }}>{tech.name}</strong>
            {tech.version && (
              <span
                style={{
                  fontSize: '0.7rem',
                  background: '#f3f4f6',
                  borderRadius: 3,
                  padding: '1px 5px',
                  color: '#6b7280',
                }}
              >
                v{tech.version}
              </span>
            )}
            <span
              style={{
                fontSize: '0.7rem',
                background: `${color}18`,
                borderRadius: 3,
                padding: '1px 6px',
                color: color,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {tech.category}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
            {tech.rationale}
          </p>
        </div>

        {/* Toggle button */}
        <button
          onClick={() => onToggle(tech.id)}
          style={{
            padding: '5px 12px',
            background: tech.selected ? color : '#f3f4f6',
            color: tech.selected ? '#fff' : '#374151',
            border: `1px solid ${tech.selected ? color : '#d1d5db'}`,
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.78rem',
            flexShrink: 0,
          }}
        >
          {tech.selected ? '✓ Selected' : 'Select'}
        </button>
      </div>

      {/* Expand/collapse pros & cons */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#7c3aed',
          fontSize: '0.78rem',
          textAlign: 'left',
          padding: 0,
          fontWeight: 500,
        }}
      >
        {expanded ? '▲ Hide details' : '▼ Show pros & cons'}
      </button>

      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#15803d',
                marginBottom: 4,
              }}
            >
              ✅ Pros
            </div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {tech.pros.map((p) => (
                <li key={p} style={{ fontSize: '0.8rem', color: '#374151', marginBottom: 2 }}>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#dc2626',
                marginBottom: 4,
              }}
            >
              ⚠ Cons
            </div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {tech.cons.map((c) => (
                <li key={c} style={{ fontSize: '0.8rem', color: '#374151', marginBottom: 2 }}>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function TechStackSelector() {
  const [projectId, setProjectId] = useState('');
  const [planId, setPlanId] = useState('');
  const [techStack, setTechStack] = useState<TechChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [filterCategory, setFilterCategory] = useState<TechCategory | 'all'>('all');
  const [saved, setSaved] = useState(false);

  async function handleLoad() {
    if (!projectId.trim() || !planId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const plan = await getPlan(projectId.trim(), planId.trim());
      setTechStack(plan.tech_stack);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    setTechStack(getDemoPlan().tech_stack);
    setIsDemo(true);
    setError(null);
    setSaved(false);
  }

  function toggleSelection(id: string) {
    setTechStack((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)),
    );
    setSaved(false);
  }

  function handleSave() {
    // In demo mode, just show a success indicator
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const filtered =
    filterCategory === 'all'
      ? techStack
      : techStack.filter((t) => t.category === filterCategory);

  const selectedCount = techStack.filter((t) => t.selected).length;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Tech Stack Selector</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Choose and review the technology stack for your implementation plan.
      </p>

      {/* Load controls */}
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

      {isDemo && (
        <div style={demoBannerStyle}>
          ⚠ Demo mode — backend not yet connected. Tech stack selections are local only.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {techStack.length > 0 && (
        <>
          {/* Summary bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ ...labelStyle, marginBottom: 0 }}>
                {selectedCount} of {techStack.length} selected ·{' '}
              </span>
              {/* Category filter */}
              <button
                onClick={() => setFilterCategory('all')}
                style={{
                  padding: '4px 10px',
                  background: filterCategory === 'all' ? '#7c3aed' : '#f3f4f6',
                  color: filterCategory === 'all' ? '#fff' : '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                }}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    background: filterCategory === cat ? CATEGORY_COLOR[cat] : '#f3f4f6',
                    color: filterCategory === cat ? '#fff' : '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}
                >
                  {CATEGORY_ICON[cat]} {cat}
                </button>
              ))}
            </div>
            <button
              onClick={handleSave}
              style={{
                ...btnStyle,
                background: saved ? '#15803d' : '#7c3aed',
                fontSize: '0.85rem',
                padding: '6px 14px',
              }}
            >
              {saved ? '✓ Saved' : 'Save Selection'}
            </button>
          </div>

          {/* Tech cards grid */}
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}
          >
            {filtered.map((tech) => (
              <TechCard key={tech.id} tech={tech} onToggle={toggleSelection} />
            ))}
          </div>

          {filtered.length === 0 && (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>
              No technologies in this category.
            </p>
          )}
        </>
      )}
    </div>
  );
}
