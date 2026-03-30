import { useState } from 'react';
import {
  getConstitutionHistory,
  type ConstitutionHistoryResponse,
} from '../../api/constitution';
import { btnStyle, errorStyle, inputStyle } from './ConstitutionView';

export function ConstitutionHistory() {
  const [projectId, setProjectId] = useState('');
  const [history, setHistory] = useState<ConstitutionHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setHistory(null);
    try {
      const data = await getConstitutionHistory(projectId.trim());
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Amendment History</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        View the version history of a project's constitution. Each entry
        represents an amendment (semantic version bump) along with its date.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Project ID (e.g. my-project)"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          style={inputStyle}
        />
        <button onClick={handleLoad} disabled={loading || !projectId.trim()} style={btnStyle}>
          {loading ? 'Loading…' : 'Load History'}
        </button>
      </div>

      {error && <div style={errorStyle}>⚠ {error}</div>}

      {history && (
        <div>
          <h3 style={{ marginBottom: 12 }}>{history.project_name}</h3>
          {history.amendments.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No amendment records found.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Version</th>
                  <th style={thStyle}>Amended Date</th>
                </tr>
              </thead>
              <tbody>
                {history.amendments.map((a, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: '1px solid #e5e7eb' }}
                  >
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>
                      {a.version}
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280' }}>
                      {a.amended_date ?? 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '0.8rem',
  color: '#374151',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
};
