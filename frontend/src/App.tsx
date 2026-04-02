import { useState } from 'react';
import {
  ConstitutionView,
  ConstitutionCreate,
  ComplianceCheck,
  ConstitutionHistory,
} from './modules/constitution';
import { PlanView } from './modules/plan';
import './App.css';

type Module = 'module1' | 'module3';
type Tab = 'view' | 'create' | 'check' | 'history';

const MODULES: { id: Module; label: string; subtitle: string }[] = [
  { id: 'module1', label: '🏛️ Module 1', subtitle: 'Constitution Engine' },
  { id: 'module3', label: '📐 Module 3', subtitle: 'Architecture Planner' },
];

const CONSTITUTION_TABS: { id: Tab; label: string }[] = [
  { id: 'view', label: '📖 View' },
  { id: 'create', label: '✏️ Create' },
  { id: 'check', label: '🔍 Compliance' },
  { id: 'history', label: '📜 History' },
];

function App() {
  const [activeModule, setActiveModule] = useState<Module>('module1');
  const [activeTab, setActiveTab] = useState<Tab>('view');

  const currentModuleMeta = MODULES.find((m) => m.id === activeModule)!;

  return (
    <div style={appStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={headerInner}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
            SpecForge
          </h1>
          <span style={{ fontSize: '0.8rem', color: '#93c5fd' }}>
            {currentModuleMeta.subtitle}
          </span>

          {/* Module switcher */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {MODULES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveModule(m.id)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: activeModule === m.id ? 700 : 400,
                  background: activeModule === m.id ? '#fff' : 'rgba(255,255,255,0.15)',
                  color: activeModule === m.id ? '#1e40af' : '#bfdbfe',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Tab navigation — only for Module 1 */}
      {activeModule === 'module1' && (
        <nav style={navStyle}>
          {CONSTITUTION_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                ...tabBtnBase,
                ...(activeTab === t.id ? tabBtnActive : tabBtnInactive),
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}

      {/* Content panel */}
      <main style={mainStyle}>
        {activeModule === 'module1' && (
          <>
            {activeTab === 'view' && <ConstitutionView />}
            {activeTab === 'create' && <ConstitutionCreate />}
            {activeTab === 'check' && <ComplianceCheck />}
            {activeTab === 'history' && <ConstitutionHistory />}
          </>
        )}
        {activeModule === 'module3' && <PlanView />}
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
  maxWidth: 900,
  margin: '0 auto',
  padding: '16px 0',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
};

const navStyle: React.CSSProperties = {
  background: '#1d4ed8',
  padding: '0 24px',
  display: 'flex',
  gap: 4,
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
  maxWidth: 900,
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
