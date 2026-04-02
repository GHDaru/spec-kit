import { useState } from 'react';
import {
  getPlan,
  getDemoPlan,
  type APIContract,
  type APIEndpoint,
} from '../../api/plan';
import {
  btnStyle,
  btnSecondaryStyle,
  errorStyle,
  inputStyle,
  demoBannerStyle,
  METHOD_COLOR,
} from './styles';

function StatusCodeBadge({ code, description }: { code: number; description: string }) {
  const color =
    code >= 500
      ? '#dc2626'
      : code >= 400
      ? '#d97706'
      : code >= 300
      ? '#2563eb'
      : '#15803d';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: '0.78rem',
        marginBottom: 2,
      }}
    >
      <span
        style={{
          fontWeight: 700,
          color,
          background: `${color}12`,
          border: `1px solid ${color}30`,
          borderRadius: 3,
          padding: '1px 6px',
          minWidth: 36,
          textAlign: 'center',
        }}
      >
        {code}
      </span>
      <span style={{ color: '#374151' }}>{description}</span>
    </div>
  );
}

function EndpointCard({ endpoint, baseUrl }: { endpoint: APIEndpoint; baseUrl: string }) {
  const [expanded, setExpanded] = useState(false);
  const color = METHOD_COLOR[endpoint.method] ?? '#374151';

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        marginBottom: 8,
        overflow: 'hidden',
      }}
    >
      {/* Endpoint header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          cursor: 'pointer',
          background: '#fafafa',
          borderBottom: expanded ? '1px solid #e5e7eb' : 'none',
        }}
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v);
        }}
      >
        {/* HTTP Method badge */}
        <span
          style={{
            fontWeight: 800,
            fontSize: '0.75rem',
            color,
            background: `${color}12`,
            border: `1px solid ${color}30`,
            borderRadius: 4,
            padding: '3px 8px',
            minWidth: 52,
            textAlign: 'center',
            letterSpacing: '0.05em',
          }}
        >
          {endpoint.method}
        </span>

        {/* Path */}
        <code
          style={{
            fontSize: '0.88rem',
            color: '#111827',
            flex: 1,
            minWidth: 0,
          }}
        >
          {baseUrl}{endpoint.path}
        </code>

        {/* Description */}
        <span
          style={{
            fontSize: '0.78rem',
            color: '#6b7280',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 280,
          }}
        >
          {endpoint.description}
        </span>

        <span style={{ color: '#9ca3af', fontSize: '0.75rem', marginLeft: 'auto' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '12px 14px', background: '#fff' }}>
          <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#374151' }}>
            {endpoint.description}
          </p>

          {/* Request body */}
          {endpoint.request_body && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#6b7280',
                  marginBottom: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Request Body
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '8px 12px',
                  background: '#1e293b',
                  color: '#e2e8f0',
                  borderRadius: 6,
                  fontSize: '0.8rem',
                  overflowX: 'auto',
                  fontFamily: 'monospace',
                }}
              >
                {endpoint.request_body}
              </pre>
            </div>
          )}

          {/* Response schema */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#6b7280',
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Response Schema
            </div>
            <pre
              style={{
                margin: 0,
                padding: '8px 12px',
                background: '#1e293b',
                color: '#86efac',
                borderRadius: 6,
                fontSize: '0.8rem',
                overflowX: 'auto',
                fontFamily: 'monospace',
              }}
            >
              {endpoint.response_schema}
            </pre>
          </div>

          {/* Status codes */}
          <div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#6b7280',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Status Codes
            </div>
            {endpoint.status_codes.map((sc) => (
              <StatusCodeBadge key={sc.code} code={sc.code} description={sc.description} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MethodSummary({ endpoints }: { endpoints: APIEndpoint[] }) {
  const counts = endpoints.reduce<Record<string, number>>((acc, ep) => {
    acc[ep.method] = (acc[ep.method] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
      {Object.entries(counts).map(([method, count]) => (
        <span
          key={method}
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: METHOD_COLOR[method] ?? '#374151',
            background: `${METHOD_COLOR[method] ?? '#374151'}12`,
            border: `1px solid ${METHOD_COLOR[method] ?? '#374151'}30`,
            borderRadius: 4,
            padding: '3px 10px',
          }}
        >
          {method} ×{count}
        </span>
      ))}
    </div>
  );
}

export function APIContractEditor() {
  const [projectId, setProjectId] = useState('');
  const [planId, setPlanId] = useState('');
  const [contract, setContract] = useState<APIContract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [filter, setFilter] = useState('');

  async function handleLoad() {
    if (!projectId.trim() || !planId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const plan = await getPlan(projectId.trim(), planId.trim());
      setContract(plan.api_contract);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    setContract(getDemoPlan().api_contract);
    setIsDemo(true);
    setError(null);
    setFilter('');
  }

  const filtered = contract
    ? contract.endpoints.filter(
        (ep) =>
          !filter ||
          ep.path.toLowerCase().includes(filter.toLowerCase()) ||
          ep.method.toLowerCase().includes(filter.toLowerCase()) ||
          ep.description.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>API Contract</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Browse the generated API endpoints with request/response schemas and status codes.
      </p>

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

      {isDemo && <div style={demoBannerStyle}>⚠ Demo mode — backend not yet connected.</div>}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {contract && (
        <div>
          {/* Contract header */}
          <div
            style={{
              background: '#faf5ff',
              border: '1px solid #ddd6fe',
              borderRadius: 8,
              padding: '10px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div>
              <strong style={{ fontSize: '1rem' }}>{contract.title}</strong>
              <span
                style={{
                  fontSize: '0.72rem',
                  background: '#ede9fe',
                  color: '#6d28d9',
                  borderRadius: 3,
                  padding: '1px 6px',
                  marginLeft: 8,
                }}
              >
                v{contract.version}
              </span>
            </div>
            <code style={{ fontSize: '0.82rem', color: '#7c3aed' }}>{contract.base_url}</code>
          </div>

          {/* Method summary */}
          <MethodSummary endpoints={contract.endpoints} />

          {/* Filter */}
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Filter by path, method or description…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Endpoints */}
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 8 }}>
            {filtered.length} of {contract.endpoints.length} endpoints
          </div>

          {filtered.map((ep, i) => (
            <EndpointCard key={i} endpoint={ep} baseUrl={contract.base_url} />
          ))}

          {filtered.length === 0 && (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>
              No endpoints match your filter.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
