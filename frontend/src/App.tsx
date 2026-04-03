import type React from 'react';
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
import './App.css';

type Module = '1' | '2' | '3' | '4' | '5' | '6';

type Tab1 = 'view' | 'create' | 'check' | 'history';
type Tab2 = 'browse' | 'editor' | 'stories' | 'requirements' | 'clarifications' | 'diff';
type Tab3 = 'browse' | 'tech-stack' | 'structure' | 'data-model' | 'research' | 'api-contract';
type Tab4 = 'browse' | 'board' | 'deps' | 'progress' | 'export';
type Tab5 = 'browse' | 'editor' | 'changelog' | 'timeline' | 'summary';

type Tab6 = 'console' | 'queue' | 'lanes' | 'compliance' | 'rollback';

const TABS_M1: { id: Tab1; label: string }[] = [
  { id: 'view', label: '📖 View' },
  { id: 'create', label: '✏️ Create' },
  { id: 'check', label: '🔍 Compliance' },
  { id: 'history', label: '📜 History' },
];

const TABS_M2: { id: Tab2; label: string }[] = [
  { id: 'browse', label: '📂 Browse' },
  { id: 'editor', label: '✏️ Editor' },
  { id: 'stories', label: '📋 Stories' },
  { id: 'requirements', label: '📑 Requirements' },
  { id: 'clarifications', label: '💬 Clarifications' },
  { id: 'diff', label: '🔀 Diff' },
];

const TABS_M3: { id: Tab3; label: string }[] = [
  { id: 'browse', label: '📂 Browse' },
  { id: 'tech-stack', label: '🔧 Tech Stack' },
  { id: 'structure', label: '🌳 Structure' },
  { id: 'data-model', label: '🗄️ Data Model' },
  { id: 'research', label: '🔬 Research' },
  { id: 'api-contract', label: '🔌 API Contract' },
];

const TABS_M4: { id: Tab4; label: string }[] = [
  { id: 'browse', label: '📂 Browse' },
  { id: 'board', label: '🗂️ Task Board' },
  { id: 'deps', label: '🔗 Dependencies' },
  { id: 'progress', label: '📊 Progress' },
  { id: 'export', label: '🐙 GitHub Export' },
];

const TABS_M5: { id: Tab5; label: string }[] = [
  { id: 'browse', label: '📂 Browse' },
  { id: 'editor', label: '✏️ Editor' },
  { id: 'changelog', label: '📄 Changelog' },
  { id: 'timeline', label: '📅 Timeline' },
  { id: 'summary', label: '📊 Summary' },
];

const TABS_M6: { id: Tab6; label: string }[] = [
  { id: 'console', label: '🖥️ Console' },
  { id: 'queue', label: '📋 Task Queue' },
  { id: 'lanes', label: '🔀 Parallel Lanes' },
  { id: 'compliance', label: '✅ Compliance' },
  { id: 'rollback', label: '🔄 Rollback' },
];

function App() {
  const [activeModule, setActiveModule] = useState<Module>('1');
  const [activeTab1, setActiveTab1] = useState<Tab1>('view');
  const [activeTab2, setActiveTab2] = useState<Tab2>('browse');
  const [activeTab3, setActiveTab3] = useState<Tab3>('browse');
  const [activeTab4, setActiveTab4] = useState<Tab4>('browse');
  const [activeTab5, setActiveTab5] = useState<Tab5>('browse');
  const [activeTab6, setActiveTab6] = useState<Tab6>('console');

  return (
    <div style={appStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={headerInner}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
            SpecForge
          </h1>
          {/* Module Switcher */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {([
              { id: '1' as Module, label: 'Module 1 — Constitution Engine' },
              { id: '2' as Module, label: 'Module 2 — Specification Studio' },
              { id: '3' as Module, label: 'Module 3 — Architecture Planner' },
              { id: '4' as Module, label: 'Module 4 — Task Forge' },
              { id: '5' as Module, label: 'Module 5 — Release Manager' },
              { id: '6' as Module, label: 'Module 6 — Implement & Execute' },
            ]).map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveModule(m.id)}
                style={{
                  padding: '6px 14px',
                  background: activeModule === m.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 6,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: activeModule === m.id ? 700 : 400,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Module subtitle */}
      <div style={subtitleStyle}>
        {activeModule === '1' ? (
          <span>⚖️ Constitution Engine — Principles &amp; Governance</span>
        ) : activeModule === '2' ? (
          <span>📐 Specification Studio — Requirements Intelligence</span>
        ) : activeModule === '3' ? (
          <span>🏗️ Architecture Planner — Technical Design &amp; Research</span>
        ) : activeModule === '4' ? (
          <span>🔨 Task Forge — Task Orchestration &amp; Management</span>
        ) : activeModule === '5' ? (
          <span>🚀 Release Manager — Versioning &amp; Changelog</span>
        ) : (
          <span>⚡ Implement &amp; Execute — AI-Driven Code Generation</span>
        )}
      </div>

      {/* Tab navigation */}
      <nav style={navStyle}>
        {activeModule === '1'
          ? TABS_M1.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab1(t.id)}
                style={{
                  ...tabBtnBase,
                  ...(activeTab1 === t.id ? tabBtnActive : tabBtnInactive),
                }}
              >
                {t.label}
              </button>
            ))
          : activeModule === '2'
          ? TABS_M2.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab2(t.id)}
                style={{
                  ...tabBtnBase,
                  ...(activeTab2 === t.id ? tabBtnActive : tabBtnInactive),
                }}
              >
                {t.label}
              </button>
            ))
          : activeModule === '3'
          ? TABS_M3.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab3(t.id)}
                style={{
                  ...tabBtnBase,
                  ...(activeTab3 === t.id ? tabBtnActive : tabBtnInactive),
                }}
              >
                {t.label}
              </button>
            ))
          : activeModule === '4'
          ? TABS_M4.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab4(t.id)}
                style={{
                  ...tabBtnBase,
                  ...(activeTab4 === t.id ? tabBtnActive : tabBtnInactive),
                }}
              >
                {t.label}
              </button>
            ))
          : TABS_M5.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab5(t.id)}
                style={{
                  ...tabBtnBase,
                  ...(activeTab5 === t.id ? tabBtnActive : tabBtnInactive),
                }}
              >
                {t.label}
              </button>
            ))}
        {activeModule === '6' &&
          TABS_M6.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab6(t.id)}
              style={{
                ...tabBtnBase,
                ...(activeTab6 === t.id ? tabBtnActive : tabBtnInactive),
              }}
            >
              {t.label}
            </button>
          ))}
      </nav>

      {/* Content panel */}
      <main style={mainStyle}>
        {activeModule === '1' && (
          <>
            {activeTab1 === 'view' && <ConstitutionView />}
            {activeTab1 === 'create' && <ConstitutionCreate />}
            {activeTab1 === 'check' && <ComplianceCheck />}
            {activeTab1 === 'history' && <ConstitutionHistory />}
          </>
        )}
        {activeModule === '2' && (
          <>
            {activeTab2 === 'browse' && <SpecView />}
            {activeTab2 === 'editor' && <SpecEditor />}
            {activeTab2 === 'stories' && <UserStoryBoard />}
            {activeTab2 === 'requirements' && <RequirementsList />}
            {activeTab2 === 'clarifications' && <ClarificationPanel />}
            {activeTab2 === 'diff' && <SpecDiffViewer />}
          </>
        )}
        {activeModule === '3' && (
          <>
            {activeTab3 === 'browse' && <PlanView />}
            {activeTab3 === 'tech-stack' && <TechStackSelector />}
            {activeTab3 === 'structure' && <ProjectTreePreview />}
            {activeTab3 === 'data-model' && <ERDiagram />}
            {activeTab3 === 'research' && <ResearchReportViewer />}
            {activeTab3 === 'api-contract' && <APIContractEditor />}
          </>
        )}
        {activeModule === '4' && (
          <>
            {activeTab4 === 'browse' && <TaskListView />}
            {activeTab4 === 'board' && <TaskBoard />}
            {activeTab4 === 'deps' && <DependencyGraphView />}
            {activeTab4 === 'progress' && <TaskStatusTracker />}
            {activeTab4 === 'export' && <GitHubIssuesExport />}
          </>
        )}
        {activeModule === '5' && (
          <>
            {activeTab5 === 'browse' && <ReleaseListView />}
            {activeTab5 === 'editor' && <ReleaseEditor />}
            {activeTab5 === 'changelog' && <ChangelogViewer />}
            {activeTab5 === 'timeline' && <ReleaseTimeline />}
            {activeTab5 === 'summary' && <ReleaseSummary />}
          </>
        )}
        {activeModule === '6' && (
          <>
            {activeTab6 === 'console' && <ExecutionConsole />}
            {activeTab6 === 'queue' && <TaskQueue />}
            {activeTab6 === 'lanes' && <ParallelExecutionLanes />}
            {activeTab6 === 'compliance' && <ComplianceReportPanel />}
            {activeTab6 === 'rollback' && <RollbackDialog />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={footerStyle}>
        SpecForge · API{' '}
        <code style={{ fontSize: '0.8rem' }}>http://localhost:8000/api/v1</code>
      </footer>
    </div>
  );
}

export default App;

// ── Styles ───────────────────────────────────────────────────────────────────

const appStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  background: '#f3f4f6',
  color: '#111827',
};

const headerStyle: React.CSSProperties = {
  background: '#1e40af',
  color: '#fff',
  padding: '0 24px',
};

const headerInner: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: '12px 0',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
};

const subtitleStyle: React.CSSProperties = {
  background: '#1e3a8a',
  color: '#bfdbfe',
  fontSize: '0.78rem',
  padding: '4px 24px',
  textAlign: 'center',
};

const navStyle: React.CSSProperties = {
  background: '#1d4ed8',
  padding: '0 24px',
  display: 'flex',
  gap: 4,
  flexWrap: 'wrap',
};

const tabBtnBase: React.CSSProperties = {
  padding: '10px 18px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontWeight: 500,
  borderBottom: '3px solid transparent',
  transition: 'color 0.15s',
};

const tabBtnActive: React.CSSProperties = {
  color: '#fff',
  borderBottom: '3px solid #fff',
};

const tabBtnInactive: React.CSSProperties = {
  color: '#bfdbfe',
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  maxWidth: 1100,
  width: '100%',
  margin: '0 auto',
  padding: 24,
  background: '#fff',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  borderRadius: '0 0 8px 8px',
};

const footerStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '12px',
  fontSize: '0.8rem',
  color: '#6b7280',
};
