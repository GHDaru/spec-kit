import { useState } from 'react';
import type { TechOption, TechCategory } from '../../api/plan';
import { inputStyle } from './styles';

const CATEGORY_LABELS: Record<TechCategory, string> = {
  language: '🖥️ Language',
  framework: '🏗️ Framework',
  database: '🗄️ Database',
  infrastructure: '🔧 Infrastructure',
  testing: '🧪 Testing',
};

const CATEGORY_COLOR: Record<TechCategory, string> = {
  language: '#1d4ed8',
  framework: '#7c3aed',
  database: '#0f766e',
  infrastructure: '#92400e',
  testing: '#b45309',
};

function StarCount({ stars }: { stars: number }) {
  const formatted =
    stars >= 1000 ? `${(stars / 1000).toFixed(0)}k` : String(stars);
  return (
    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>⭐ {formatted}</span>
  );
}

function TechCard({
  option,
  onToggle,
}: {
  option: TechOption;
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = CATEGORY_COLOR[option.category];

  return (
    <div
      style={{
        border: `2px solid ${option.selected ? color : '#e5e7eb'}`,
        borderRadius: 10,
        padding: '12px 14px',
        background: option.selected ? `${color}11` : '#fff',
        transition: 'border-color 0.15s, background 0.15s',
        cursor: 'pointer',
        position: 'relative',
      }}
      onClick={() => onToggle(option.id)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color,
            background: `${color}18`,
            borderRadius: 4,
            padding: '1px 6px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {CATEGORY_LABELS[option.category]}
        </span>
        <StarCount stars={option.github_stars} />
        {option.selected && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '0.75rem',
              color: '#16a34a',
              fontWeight: 700,
            }}
          >
            ✓ Selected
          </span>
        )}
      </div>

      <strong style={{ fontSize: '1rem' }}>{option.name}</strong>
      <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 6 }}>
        {option.license}
      </span>
      <p style={{ margin: '4px 0 6px', fontSize: '0.82rem', color: '#4b5563' }}>
        {option.description}
      </p>

      {/* Toggle pros/cons */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.78rem',
          color: '#6b7280',
          padding: 0,
          textDecoration: 'underline',
        }}
      >
        {expanded ? 'Hide details ▲' : 'Show pros/cons ▼'}
      </button>

      {expanded && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginTop: 8,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>
              ✅ Pros
            </p>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.78rem', color: '#374151' }}>
              {option.pros.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c' }}>
              ⚠️ Cons
            </p>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.78rem', color: '#374151' }}>
              {option.cons.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  options: TechOption[];
  onChange: (options: TechOption[]) => void;
}

export function TechStackSelector({ options, onChange }: Props) {
  const [filter, setFilter] = useState<TechCategory | 'all'>('all');

  function toggleOption(id: string) {
    onChange(options.map((o) => (o.id === id ? { ...o, selected: !o.selected } : o)));
  }

  const categories = ['all', ...new Set(options.map((o) => o.category))] as (
    | TechCategory
    | 'all'
  )[];

  const visible = filter === 'all' ? options : options.filter((o) => o.category === filter);

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>Technology Stack</h3>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 14 }}>
        Click a card to select or deselect a technology. Expand to see AI-researched pros and cons.
      </p>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            style={{
              ...inputStyle,
              flex: 'none',
              padding: '4px 12px',
              borderRadius: 20,
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: filter === cat ? 700 : 400,
              background: filter === cat ? '#1d4ed8' : '#f3f4f6',
              color: filter === cat ? '#fff' : '#374151',
              border: filter === cat ? '1px solid #1d4ed8' : '1px solid #d1d5db',
            }}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat as TechCategory]}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {visible.map((opt) => (
          <TechCard key={opt.id} option={opt} onToggle={toggleOption} />
        ))}
      </div>

      <p style={{ marginTop: 10, fontSize: '0.8rem', color: '#6b7280' }}>
        {options.filter((o) => o.selected).length} of {options.length} technologies selected
      </p>
    </div>
  );
}
