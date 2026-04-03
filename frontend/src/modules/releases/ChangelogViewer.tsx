import { useState } from 'react';
import {
  getDemoReleaseLog,
  getChangelog,
  type ChangelogResponse,
} from '../../api/releases';
import {
  btnStyle,
  btnSecondaryStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
} from './styles';

export function ChangelogViewer() {
  const [projectId, setProjectId] = useState('');
  const [changelog, setChangelog] = useState<ChangelogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const data = await getChangelog(projectId.trim());
      setChangelog(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    const log = getDemoReleaseLog();
    // Build a simple changelog from demo data
    const lines: string[] = [`# Changelog — ${log.project_name}`, ''];
    for (const release of log.releases) {
      let heading = `## [${release.version}]`;
      if (release.date) heading += ` — ${release.date}`;
      if (release.title) heading += ` *${release.title}*`;
      lines.push(heading);
      lines.push('');
      if (release.notes) {
        lines.push(release.notes);
        lines.push('');
      }
      const byType: Record<string, string[]> = {};
      for (const c of release.changes) {
        if (!byType[c.change_type]) byType[c.change_type] = [];
        byType[c.change_type].push(c.description);
      }
      const ORDER = ['breaking', 'feat', 'fix', 'refactor', 'docs', 'test', 'chore'];
      const LABELS: Record<string, string> = {
        breaking: 'Breaking Changes', feat: 'Features', fix: 'Bug Fixes',
        refactor: 'Refactoring', docs: 'Documentation', test: 'Tests', chore: 'Chores',
      };
      for (const ct of ORDER) {
        if (byType[ct]?.length) {
          lines.push(`### ${LABELS[ct]}`);
          lines.push('');
          for (const d of byType[ct]) lines.push(`- ${d}`);
          lines.push('');
        }
      }
    }
    setChangelog({ markdown: lines.join('\n') });
    setIsDemo(true);
    setError(null);
  }

  function handleCopy() {
    if (changelog) navigator.clipboard.writeText(changelog.markdown);
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Changelog Viewer</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        View and copy the auto-generated Markdown changelog for a project.
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
        <button onClick={handleLoad} disabled={loading || !projectId.trim()} style={btnStyle}>
          {loading ? 'Loading…' : 'Generate'}
        </button>
        <button onClick={handleLoadDemo} style={btnSecondaryStyle}>
          Load Demo
        </button>
      </div>

      {isDemo && (
        <div style={demoBannerStyle}>
          ⚠ Demo mode — showing sample changelog. Backend not yet connected.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {changelog && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button onClick={handleCopy} style={{ ...btnStyle, padding: '6px 14px', fontSize: '0.82rem' }}>
              📋 Copy Markdown
            </button>
          </div>
          <pre
            style={{
              background: '#1e1e2e',
              color: '#cdd6f4',
              borderRadius: 8,
              padding: 20,
              fontSize: '0.82rem',
              lineHeight: 1.7,
              overflow: 'auto',
              maxHeight: 560,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {changelog.markdown}
          </pre>
        </div>
      )}
    </div>
  );
}
