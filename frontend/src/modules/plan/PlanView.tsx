import { useState } from 'react';
import {
  listPlans,
  getPlan,
  getDemoPlan,
  type PlanSummary,
  type PlanResponse,
  type TechChoice,
} from '../../api/plan';
import {
  btnStyle,
  btnSecondaryStyle,
  errorStyle,
  inputStyle,
  cardStyle,
  labelStyle,
  demoBannerStyle,
  CATEGORY_ICON,
} from './styles';

function PlanSummaryCard({
  plan,
  onSelect,
}: {
  plan: PlanSummary;
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
      onClick={() => onSelect(plan.plan_id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(plan.plan_id)}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <strong style={{ fontSize: '1rem' }}>{plan.title}</strong>
          <span
            style={{
              fontSize: '0.7rem',
              background: '#ede9fe',
              borderRadius: 4,
              padding: '2px 6px',
              color: '#6d28d9',
            }}
          >
            v{plan.version}
          </span>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 2 }}>
          Spec: <code style={{ fontSize: '0.75rem' }}>{plan.spec_id}</code>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: '#6b7280' }}>
          <span>🔧 {plan.tech_stack_count} technologies</span>
          <span>🗄️ {plan.entity_count} entities</span>
          <span>🔌 {plan.endpoint_count} endpoints</span>
          {plan.created_date && (
            <span>🕐 {new Date(plan.created_date).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <span style={{ color: '#7c3aed', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
        View →
      </span>
    </div>
  );
}

function TechBadge({ tech }: { tech: TechChoice }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: '#ede9fe',
        border: '1px solid #c4b5fd',
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: '0.78rem',
        color: '#5b21b6',
        marginRight: 4,
        marginBottom: 4,
      }}
    >
      <span>{CATEGORY_ICON[tech.category]}</span>
      <span>{tech.name}</span>
      {tech.version && <span style={{ color: '#7c3aed' }}>v{tech.version}</span>}
    </span>
  );
}

function PlanDetail({ plan }: { plan: PlanResponse }) {
  return (
    <div>
      {/* Plan header */}
      <div
        style={{
          background: '#faf5ff',
          border: '1px solid #ddd6fe',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: '0 0 4px' }}>{plan.title}</h3>
        <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: '#7c3aed' }}>
          Version <strong>{plan.version}</strong> · Plan:{' '}
          <code style={{ fontSize: '0.75rem' }}>{plan.plan_id}</code> · Spec:{' '}
          <code style={{ fontSize: '0.75rem' }}>{plan.spec_id}</code>
        </p>
        {plan.description && (
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>{plan.description}</p>
        )}
      </div>

      {/* Tech Stack summary */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ marginBottom: 8, color: '#4c1d95' }}>
          🔧 Tech Stack ({plan.tech_stack.filter((t) => t.selected).length} selected)
        </h4>
        <div>
          {plan.tech_stack
            .filter((t) => t.selected)
            .map((t) => (
              <TechBadge key={t.id} tech={t} />
            ))}
        </div>
      </div>

      {/* Data model summary */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ marginBottom: 8, color: '#4c1d95' }}>
          🗄️ Data Model ({plan.data_model.entities.length} entities,{' '}
          {plan.data_model.relationships.length} relationships)
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {plan.data_model.entities.map((entity) => (
            <div
              key={entity.id}
              style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: '0.82rem',
              }}
            >
              <strong>{entity.name}</strong>
              <span style={{ color: '#6b7280', marginLeft: 6 }}>
                {entity.fields.length} fields
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          {plan.data_model.relationships.map((r, i) => (
            <div key={i} style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 2 }}>
              <code>{r.from_entity}</code> →{' '}
              <span style={{ color: '#374151' }}>{r.label}</span> →{' '}
              <code>{r.to_entity}</code>
              <span
                style={{
                  fontSize: '0.7rem',
                  background: '#f3f4f6',
                  borderRadius: 3,
                  padding: '1px 5px',
                  marginLeft: 6,
                }}
              >
                {r.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* API contract summary */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ marginBottom: 8, color: '#4c1d95' }}>
          🔌 API Contract — {plan.api_contract.title} ({plan.api_contract.endpoints.length}{' '}
          endpoints)
        </h4>
        <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 6 }}>
          Base URL: <code>{plan.api_contract.base_url}</code> · v
          {plan.api_contract.version}
        </div>
        {plan.api_contract.endpoints.map((ep, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
              borderBottom: '1px solid #f3f4f6',
              fontSize: '0.85rem',
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.75rem',
                color: METHOD_COLOR[ep.method],
                width: 48,
                flexShrink: 0,
              }}
            >
              {ep.method}
            </span>
            <code style={{ fontSize: '0.8rem' }}>
              {plan.api_contract.base_url}
              {ep.path}
            </code>
            <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>{ep.description}</span>
          </div>
        ))}
      </div>

      {/* Research reports summary */}
      {plan.research_reports.length > 0 && (
        <div>
          <h4 style={{ marginBottom: 8, color: '#4c1d95' }}>
            🔬 Research Reports ({plan.research_reports.length})
          </h4>
          {plan.research_reports.map((r) => (
            <div
              key={r.id}
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 6,
                padding: '8px 12px',
                marginBottom: 6,
              }}
            >
              <strong style={{ fontSize: '0.9rem' }}>{r.topic}</strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#374151' }}>
                {r.conclusion}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const METHOD_COLOR: Record<string, string> = {
  GET: '#2563eb',
  POST: '#059669',
  PUT: '#d97706',
  PATCH: '#7c3aed',
  DELETE: '#dc2626',
};

export function PlanView() {
  const [projectId, setProjectId] = useState('');
  const [plans, setPlans] = useState<PlanSummary[] | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setPlans(null);
    setSelectedPlan(null);
    setIsDemo(false);
    try {
      const data = await listPlans(projectId.trim());
      setPlans(data.plans);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    const demo = getDemoPlan();
    setIsDemo(true);
    setError(null);
    setPlans([
      {
        plan_id: demo.plan_id,
        spec_id: demo.spec_id,
        title: demo.title,
        version: demo.version,
        created_date: demo.created_date,
        tech_stack_count: demo.tech_stack.filter((t) => t.selected).length,
        entity_count: demo.data_model.entities.length,
        endpoint_count: demo.api_contract.endpoints.length,
      },
    ]);
  }

  async function handleSelect(planId: string) {
    if (isDemo) {
      setSelectedPlan(getDemoPlan());
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const plan = await getPlan(projectId.trim(), planId);
      setSelectedPlan(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Browse Plans</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        List and inspect technical implementation plans for a project.
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
        <button
          onClick={handleLoad}
          disabled={loading || !projectId.trim()}
          style={btnStyle}
        >
          {loading ? 'Loading…' : 'Load'}
        </button>
        <button onClick={handleLoadDemo} style={btnSecondaryStyle}>
          Load Demo
        </button>
      </div>

      {isDemo && <div style={demoBannerStyle}>⚠ Demo mode — backend not yet connected. Showing sample plan data.</div>}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {selectedPlan && (
        <div>
          <button
            onClick={() => setSelectedPlan(null)}
            style={{
              ...btnStyle,
              background: '#6b7280',
              marginBottom: 16,
              fontSize: '0.8rem',
              padding: '6px 12px',
            }}
          >
            ← Back to list
          </button>
          {isDemo && <div style={demoBannerStyle}>⚠ Demo mode — backend not yet connected.</div>}
          <PlanDetail plan={selectedPlan} />
        </div>
      )}

      {!selectedPlan && plans !== null && (
        <div>
          <div style={{ ...labelStyle, marginBottom: 8 }}>
            {plans.length} plan{plans.length !== 1 ? 's' : ''} found
          </div>
          {plans.length === 0 && (
            <p style={{ color: '#6b7280' }}>No plans yet.</p>
          )}
          {plans.map((p) => (
            <PlanSummaryCard key={p.plan_id} plan={p} onSelect={handleSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
