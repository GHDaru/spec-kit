import { useState } from 'react';
import type { APIContract, HttpMethod } from '../../api/plan';

const METHOD_COLOR: Record<HttpMethod, string> = {
  GET: '#15803d',
  POST: '#1d4ed8',
  PUT: '#b45309',
  PATCH: '#7c3aed',
  DELETE: '#dc2626',
};

const METHOD_BG: Record<HttpMethod, string> = {
  GET: '#f0fdf4',
  POST: '#eff6ff',
  PUT: '#fffbeb',
  PATCH: '#f5f3ff',
  DELETE: '#fef2f2',
};

function EndpointRow({ ep }: { ep: APIContract['endpoints'][number] }) {
  const [open, setOpen] = useState(false);
  const color = METHOD_COLOR[ep.method];
  const bg = METHOD_BG[ep.method];

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        marginBottom: 6,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          background: '#fff',
          border: 'none',
          padding: '8px 12px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: '0.78rem',
            color,
            background: bg,
            padding: '2px 8px',
            borderRadius: 4,
            minWidth: 52,
            textAlign: 'center',
          }}
        >
          {ep.method}
        </span>
        <code style={{ fontSize: '0.85rem', color: '#111827' }}>{ep.path}</code>
        <span style={{ marginLeft: 8, fontSize: '0.82rem', color: '#6b7280' }}>
          {ep.description}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 4 }}>
            {open ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {open && (ep.request_body || ep.response_schema) && (
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid #f3f4f6',
            background: '#f9fafb',
            display: 'grid',
            gridTemplateColumns: ep.request_body && ep.response_schema ? '1fr 1fr' : '1fr',
            gap: 12,
          }}
        >
          {ep.request_body && (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '0.72rem', fontWeight: 700, color: '#374151' }}>
                Request Body
              </p>
              <code
                style={{
                  display: 'block',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                  color: '#1d4ed8',
                }}
              >
                {ep.request_body}
              </code>
            </div>
          )}
          {ep.response_schema && (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '0.72rem', fontWeight: 700, color: '#374151' }}>
                Response
              </p>
              <code
                style={{
                  display: 'block',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                  color: '#15803d',
                }}
              >
                {ep.response_schema}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  contract: APIContract;
}

export function APIContractViewer({ contract }: Props) {
  const grouped = contract.endpoints.reduce<Record<string, typeof contract.endpoints>>(
    (acc, ep) => {
      const tag = 'other';
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(ep);
      return acc;
    },
    {},
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>API Contract</h3>
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {contract.title} v{contract.version} · base: <code>{contract.base_url}</code>
        </span>
      </div>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 14 }}>
        Click an endpoint to expand its request/response schema. Endpoints are grouped by tag.
      </p>

      {Object.entries(grouped).map(([tag, endpoints]) => (
        <div key={tag} style={{ marginBottom: 16 }}>
          <h4
            style={{
              margin: '0 0 8px',
              fontSize: '0.8rem',
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {tag}
          </h4>
          {endpoints.map((ep) => (
            <EndpointRow key={`${ep.method}-${ep.path}`} ep={ep} />
          ))}
        </div>
      ))}

      <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>
        {contract.endpoints.length} endpoints defined
      </p>
    </div>
  );
}
