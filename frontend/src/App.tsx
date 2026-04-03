import { useState } from 'react';
import {
  ConstitutionView,
  ConstitutionCreate,
  ComplianceCheck,
  ConstitutionHistory,
} from './modules/constitution';
import {
  SpecView,
  SpecEditor,
  UserStoryBoard,
  RequirementsList,
  ClarificationPanel,
  SpecDiffViewer,
} from './modules/spec';
import {
  PlanView,
  TechStackSelector,
  ProjectTreePreview,
  ERDiagram,
  ResearchReportViewer,
  APIContractEditor,
} from './modules/plan';
import {
  TaskListView,
  TaskBoard,
  DependencyGraphView,
  TaskStatusTracker,
  GitHubIssuesExport,
} from './modules/tasks';
import {
  ReleaseListView,
  ChangelogViewer,
  ReleaseTimeline,
  ReleaseSummary,
  ReleaseEditor,
} from './modules/releases';
import {
  ExecutionConsole,
  TaskQueue,
  ParallelExecutionLanes,
  ComplianceReportPanel,
  RollbackDialog,
} from './modules/implement';
import {
  ChecklistBuilder,
  TestSuiteViewer,
  AnalysisReportViewer,
  ConsistencyHeatmap,
  CoverageMap,
} from './modules/quality';
import {
  FeaturePortfolio,
  SDDPhaseTimeline,
  ReviewWorkflow,
  MetricsDashboard,
  NotificationCenter,
} from './modules/dashboard';
import './App.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type Module = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

type Tab1 = 'view' | 'create' | 'check' | 'history';
type Tab2 = 'browse' | 'editor' | 'stories' | 'requirements' | 'clarifications' | 'diff';
type Tab3 = 'browse' | 'tech-stack' | 'structure' | 'data-model' | 'research' | 'api-contract';
type Tab4 = 'browse' | 'board' | 'deps' | 'progress' | 'export';
type Tab5 = 'browse' | 'editor' | 'changelog' | 'timeline' | 'summary';
type Tab6 = 'console' | 'queue' | 'lanes' | 'compliance' | 'rollback';
type Tab7 = 'checklist' | 'test-suite' | 'analysis' | 'heatmap' | 'coverage';
type Tab8 = 'portfolio' | 'timeline' | 'reviews' | 'metrics' | 'notifications';

// ── Module metadata ───────────────────────────────────────────────────────────

const MODULES: { id: Module; icon: string; label: string; description: string }[] = [
  { id: '1', icon: '⚖️',  label: 'Constitution',  description: 'Principles & Governance' },
  { id: '2', icon: '📐',  label: 'Spec Studio',    description: 'Requirements Intelligence' },
  { id: '3', icon: '🏗️',  label: 'Architecture',   description: 'Technical Design & Research' },
  { id: '4', icon: '🔨',  label: 'Task Forge',     description: 'Task Orchestration' },
  { id: '5', icon: '🚀',  label: 'Release Mgr',    description: 'Versioning & Changelog' },
  { id: '6', icon: '⚡',  label: 'Implement',      description: 'AI-Driven Code Generation' },
  { id: '7', icon: '🛡️',  label: 'Quality',        description: 'Testing & Validation' },
  { id: '8', icon: '📊',  label: 'Dashboard',      description: 'Visibility & Collaboration' },
];

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS_M1: { id: Tab1; label: string }[] = [
  { id: 'view',    label: '📖 View' },
  { id: 'create',  label: '✏️ Create' },
  { id: 'check',   label: '🔍 Compliance' },
  { id: 'history', label: '📜 History' },
];

const TABS_M2: { id: Tab2; label: string }[] = [
  { id: 'browse',         label: '📂 Browse' },
  { id: 'editor',         label: '✏️ Editor' },
  { id: 'stories',        label: '📋 Stories' },
  { id: 'requirements',   label: '📑 Requirements' },
  { id: 'clarifications', label: '💬 Clarifications' },
  { id: 'diff',           label: '🔀 Diff' },
];

const TABS_M3: { id: Tab3; label: string }[] = [
  { id: 'browse',       label: '📂 Browse' },
  { id: 'tech-stack',   label: '🔧 Tech Stack' },
  { id: 'structure',    label: '🌳 Structure' },
  { id: 'data-model',   label: '🗄️ Data Model' },
  { id: 'research',     label: '🔬 Research' },
  { id: 'api-contract', label: '🔌 API Contract' },
];

const TABS_M4: { id: Tab4; label: string }[] = [
  { id: 'browse',   label: '📂 Browse' },
  { id: 'board',    label: '🗂️ Task Board' },
  { id: 'deps',     label: '🔗 Dependencies' },
  { id: 'progress', label: '📊 Progress' },
  { id: 'export',   label: '🐙 GitHub Export' },
];

const TABS_M5: { id: Tab5; label: string }[] = [
  { id: 'browse',    label: '📂 Browse' },
  { id: 'editor',    label: '✏️ Editor' },
  { id: 'changelog', label: '📄 Changelog' },
  { id: 'timeline',  label: '📅 Timeline' },
  { id: 'summary',   label: '📊 Summary' },
];

const TABS_M6: { id: Tab6; label: string }[] = [
  { id: 'console',    label: '🖥️ Console' },
  { id: 'queue',      label: '📋 Task Queue' },
  { id: 'lanes',      label: '🔀 Parallel Lanes' },
  { id: 'compliance', label: '✅ Compliance' },
  { id: 'rollback',   label: '🔄 Rollback' },
];

const TABS_M7: { id: Tab7; label: string }[] = [
  { id: 'checklist',   label: '✅ Checklist' },
  { id: 'test-suite',  label: '🧪 Test Suites' },
  { id: 'analysis',    label: '📋 Analysis' },
  { id: 'heatmap',     label: '🌡️ Heatmap' },
  { id: 'coverage',    label: '🗺️ Coverage' },
];

const TABS_M8: { id: Tab8; label: string }[] = [
  { id: 'portfolio',     label: '📂 Portfolio' },
  { id: 'timeline',      label: '📅 Timeline' },
  { id: 'reviews',       label: '💬 Reviews' },
  { id: 'metrics',       label: '📊 Metrics' },
  { id: 'notifications', label: '🔔 Notifications' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SidebarItem({
  icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`sf-sidebar__item${active ? ' is-active' : ''}`}
      onClick={onClick}
      role="menuitem"
      aria-current={active ? 'page' : undefined}
      title={description}
    >
      <span className="sf-sidebar__icon" aria-hidden="true">{icon}</span>
      <span className="sf-sidebar__label">{label}</span>
    </button>
  );
}

function TabBar<T extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onSelect: (id: T) => void;
}) {
  return (
    <nav className="sf-tabs" role="tablist" aria-label="Module views">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={`sf-tabs__btn${active === t.id ? ' is-active' : ''}`}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [activeModule, setActiveModule] = useState<Module>('1');
  const [activeTab1, setActiveTab1] = useState<Tab1>('view');
  const [activeTab2, setActiveTab2] = useState<Tab2>('browse');
  const [activeTab3, setActiveTab3] = useState<Tab3>('browse');
  const [activeTab4, setActiveTab4] = useState<Tab4>('browse');
  const [activeTab5, setActiveTab5] = useState<Tab5>('browse');
  const [activeTab6, setActiveTab6] = useState<Tab6>('console');
  const [activeTab7, setActiveTab7] = useState<Tab7>('checklist');
  const [activeTab8, setActiveTab8] = useState<Tab8>('portfolio');

  const currentModule = MODULES.find((m) => m.id === activeModule)!;

  return (
    <div className="sf-shell">
      {/* ── Header ── */}
      <header className="sf-header">
        <span className="sf-header__logo">SpecForge</span>
        <span className="sf-header__module-name">
          {currentModule.icon} {currentModule.label} — {currentModule.description}
        </span>
      </header>

      {/* ── Body: sidebar + content ── */}
      <div className="sf-body">
        {/* Sidebar */}
        <aside className="sf-sidebar" role="navigation" aria-label="Module navigation">
          <nav role="menu">
            {MODULES.map((m) => (
              <SidebarItem
                key={m.id}
                icon={m.icon}
                label={m.label}
                description={m.description}
                active={activeModule === m.id}
                onClick={() => setActiveModule(m.id)}
              />
            ))}
          </nav>
        </aside>

        {/* Content column */}
        <div className="sf-content">
          {/* Tab bar */}
          {activeModule === '1' && (
            <TabBar tabs={TABS_M1} active={activeTab1} onSelect={setActiveTab1} />
          )}
          {activeModule === '2' && (
            <TabBar tabs={TABS_M2} active={activeTab2} onSelect={setActiveTab2} />
          )}
          {activeModule === '3' && (
            <TabBar tabs={TABS_M3} active={activeTab3} onSelect={setActiveTab3} />
          )}
          {activeModule === '4' && (
            <TabBar tabs={TABS_M4} active={activeTab4} onSelect={setActiveTab4} />
          )}
          {activeModule === '5' && (
            <TabBar tabs={TABS_M5} active={activeTab5} onSelect={setActiveTab5} />
          )}
          {activeModule === '6' && (
            <TabBar tabs={TABS_M6} active={activeTab6} onSelect={setActiveTab6} />
          )}
          {activeModule === '7' && (
            <TabBar tabs={TABS_M7} active={activeTab7} onSelect={setActiveTab7} />
          )}
          {activeModule === '8' && (
            <TabBar tabs={TABS_M8} active={activeTab8} onSelect={setActiveTab8} />
          )}

          {/* Main panel */}
          <main className="sf-main" role="tabpanel">
            {activeModule === '1' && (
              <>
                {activeTab1 === 'view'    && <ConstitutionView />}
                {activeTab1 === 'create'  && <ConstitutionCreate />}
                {activeTab1 === 'check'   && <ComplianceCheck />}
                {activeTab1 === 'history' && <ConstitutionHistory />}
              </>
            )}
            {activeModule === '2' && (
              <>
                {activeTab2 === 'browse'         && <SpecView />}
                {activeTab2 === 'editor'         && <SpecEditor />}
                {activeTab2 === 'stories'        && <UserStoryBoard />}
                {activeTab2 === 'requirements'   && <RequirementsList />}
                {activeTab2 === 'clarifications' && <ClarificationPanel />}
                {activeTab2 === 'diff'           && <SpecDiffViewer />}
              </>
            )}
            {activeModule === '3' && (
              <>
                {activeTab3 === 'browse'       && <PlanView />}
                {activeTab3 === 'tech-stack'   && <TechStackSelector />}
                {activeTab3 === 'structure'    && <ProjectTreePreview />}
                {activeTab3 === 'data-model'   && <ERDiagram />}
                {activeTab3 === 'research'     && <ResearchReportViewer />}
                {activeTab3 === 'api-contract' && <APIContractEditor />}
              </>
            )}
            {activeModule === '4' && (
              <>
                {activeTab4 === 'browse'   && <TaskListView />}
                {activeTab4 === 'board'    && <TaskBoard />}
                {activeTab4 === 'deps'     && <DependencyGraphView />}
                {activeTab4 === 'progress' && <TaskStatusTracker />}
                {activeTab4 === 'export'   && <GitHubIssuesExport />}
              </>
            )}
            {activeModule === '5' && (
              <>
                {activeTab5 === 'browse'    && <ReleaseListView />}
                {activeTab5 === 'editor'    && <ReleaseEditor />}
                {activeTab5 === 'changelog' && <ChangelogViewer />}
                {activeTab5 === 'timeline'  && <ReleaseTimeline />}
                {activeTab5 === 'summary'   && <ReleaseSummary />}
              </>
            )}
            {activeModule === '6' && (
              <>
                {activeTab6 === 'console'    && <ExecutionConsole />}
                {activeTab6 === 'queue'      && <TaskQueue />}
                {activeTab6 === 'lanes'      && <ParallelExecutionLanes />}
                {activeTab6 === 'compliance' && <ComplianceReportPanel />}
                {activeTab6 === 'rollback'   && <RollbackDialog />}
              </>
            )}
            {activeModule === '7' && (
              <>
                {activeTab7 === 'checklist'  && <ChecklistBuilder />}
                {activeTab7 === 'test-suite' && <TestSuiteViewer />}
                {activeTab7 === 'analysis'   && <AnalysisReportViewer />}
                {activeTab7 === 'heatmap'    && <ConsistencyHeatmap />}
                {activeTab7 === 'coverage'   && <CoverageMap />}
              </>
            )}
            {activeModule === '8' && (
              <>
                {activeTab8 === 'portfolio'     && <FeaturePortfolio />}
                {activeTab8 === 'timeline'      && <SDDPhaseTimeline />}
                {activeTab8 === 'reviews'       && <ReviewWorkflow />}
                {activeTab8 === 'metrics'       && <MetricsDashboard />}
                {activeTab8 === 'notifications' && <NotificationCenter />}
              </>
            )}
          </main>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="sf-footer">
        SpecForge · API{' '}
        <code>http://localhost:8000/api/v1</code>
      </footer>
    </div>
  );
}

export default App;
