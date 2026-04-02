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
import './App.css';

type Module = '1' | '2';

type Tab1 = 'view' | 'create' | 'check' | 'history';
type Tab2 = 'browse' | 'editor' | 'stories' | 'requirements' | 'clarifications' | 'diff';

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

function App() {
  const [activeModule, setActiveModule] = useState<Module>('1');
  const [activeTab1, setActiveTab1] = useState<Tab1>('view');
  const [activeTab2, setActiveTab2] = useState<Tab2>('browse');

  return (
    <div style={appStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={headerInner}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
            SpecForge
          </h1>
          {/* Module Switcher */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            {([
              { id: '1' as Module, label: 'Module 1 — Constitution Engine' },
              { id: '2' as Module, label: 'Module 2 — Specification Studio' },
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
        ) : (
          <span>📐 Specification Studio — Requirements Intelligence</span>
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
          : TABS_M2.map((t) => (
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
