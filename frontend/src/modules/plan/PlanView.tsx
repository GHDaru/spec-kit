import { useState } from 'react';
import { generatePlan, getDemoPlan, type Plan, type TechOption } from '../../api/plan';
import { TechStackSelector } from './TechStackSelector';
import { ProjectTreePreview } from './ProjectTreePreview';
import { ERDiagram } from './ERDiagram';
import { ResearchReportViewer } from './ResearchReportViewer';
import { APIContractViewer } from './APIContractViewer';
import { PlanComplianceCheck } from './PlanComplianceCheck';
import { inputStyle, btnStyle, errorStyle } from './styles';

type PlanTab =
  | 'tech'
  | 'tree'
  | 'er'
  | 'research'
  | 'api'
  | 'compliance';

const PLAN_TABS: { id: PlanTab; label: string }[] = [
  { id: 'tech', label: '🏗️ Tech Stack' },
  { id: 'tree', label: '🌳 Project Tree' },
  { id: 'er', label: '📊 Data Model' },
  { id: 'research', label: '🔬 Research' },
  { id: 'api', label: '📋 API Contract' },
  { id: 'compliance', label: '✅ Compliance' },
];

export function PlanView() {
  const [projectId, setProjectId] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [activeTab, setActiveTab] = useState<PlanTab>('tech');

  async function handleGenerate() {
    const id = projectId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const data = await generatePlan({ project_id: id });
      setPlan(data);
    } catch {
      // Backend not yet available — fall back to demo data
      setPlan(getDemoPlan(id));
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }

  function updateTechStack(updated: TechOption[]) {
    if (!plan) return;
    setPlan({ ...plan, tech_stack: updated });
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Architecture Planner</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: 16 }}>
        Generate a technical implementation plan from a project specification — technology stack, project structure,
        data model, API contract, and constitution compliance.
      </p>

      {/* Generate form */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Project ID (e.g. my-project)"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          style={inputStyle}
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !projectId.trim()}
          style={{ ...btnStyle, background: '#7c3aed' }}
        >
          {loading ? 'Generating…' : '⚡ Generate Plan'}
        </button>
      </div>

      {error && <div style={errorStyle}>⚠ {error}</div>}

      {isDemo && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 6,
            padding: '8px 14px',
            marginBottom: 12,
            fontSize: '0.82rem',
            color: '#92400e',
          }}
        >
          🔶 <strong>Demo mode</strong> — backend not yet available. Showing sample architecture plan
          for <strong>{projectId.trim()}</strong>.
        </div>
      )}

      {plan && (
        <div>
          {/* Plan header */}
          <div
            style={{
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              borderRadius: 8,
              padding: '10px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#4c1d95' }}>
                {plan.project_name}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#7c3aed' }}>
                Generated {new Date(plan.created_at).toLocaleString()} ·{' '}
                {plan.tech_stack.filter((t) => t.selected).length} technologies selected ·{' '}
                {plan.data_model.entities.length} entities
              </p>
            </div>
            <span
              style={{
                marginLeft: 'auto',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 700,
                background: plan.compliance.passed ? '#f0fdf4' : '#fef2f2',
                color: plan.compliance.passed ? '#15803d' : '#dc2626',
                border: `1px solid ${plan.compliance.passed ? '#86efac' : '#fca5a5'}`,
              }}
            >
              {plan.compliance.passed ? '✅ Compliant' : '❌ Non-compliant'}
            </span>
          </div>

          {/* Sub-tabs */}
          <nav
            style={{
              display: 'flex',
              gap: 2,
              borderBottom: '2px solid #e5e7eb',
              marginBottom: 20,
              flexWrap: 'wrap',
            }}
          >
            {PLAN_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === t.id ? '2px solid #7c3aed' : '2px solid transparent',
                  marginBottom: -2,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: activeTab === t.id ? 700 : 400,
                  color: activeTab === t.id ? '#7c3aed' : '#6b7280',
                  transition: 'color 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          {activeTab === 'tech' && (
            <TechStackSelector
              options={plan.tech_stack}
              onChange={updateTechStack}
            />
          )}
          {activeTab === 'tree' && (
            <ProjectTreePreview root={plan.project_structure.root} />
          )}
          {activeTab === 'er' && <ERDiagram dataModel={plan.data_model} />}
          {activeTab === 'research' && (
            <ResearchReportViewer reports={plan.research_reports} />
          )}
          {activeTab === 'api' && (
            <APIContractViewer contract={plan.api_contract} />
          )}
          {activeTab === 'compliance' && (
            <PlanComplianceCheck compliance={plan.compliance} />
          )}
        </div>
      )}
    </div>
  );
}
