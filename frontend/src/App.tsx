import { useState } from 'react';
import {
  ConstitutionView,
  ConstitutionCreate,
  ComplianceCheck,
  ConstitutionHistory,
} from './modules/constitution';
import './App.css';

type Tab = 'view' | 'create' | 'check' | 'history';

const TABS: { id: Tab; label: string }[] = [
  { id: 'view', label: '📖 View' },
  { id: 'create', label: '✏️ Create' },
  { id: 'check', label: '🔍 Compliance' },
  { id: 'history', label: '📜 History' },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('view');

  return (
    <div style={appStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={headerInner}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
            SpecForge — Constitution Engine
          </h1>
          <span style={{ fontSize: '0.8rem', color: '#93c5fd' }}>Module 1</span>
        </div>
      </header>

      {/* Tab navigation */}
      <nav style={navStyle}>
        {TABS.map((t) => (
          <button
            key={t.id}
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

      {/* Content panel */}
      <main style={mainStyle}>
        {activeTab === 'view' && <ConstitutionView />}
        {activeTab === 'create' && <ConstitutionCreate />}
        {activeTab === 'check' && <ComplianceCheck />}
        {activeTab === 'history' && <ConstitutionHistory />}
      </main>

      {/* Footer */}
      <footer style={footerStyle}>
        SpecForge · Constitution Engine API ·{' '}
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
