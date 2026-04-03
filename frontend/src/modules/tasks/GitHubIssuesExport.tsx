import { useState } from 'react';
import {
  getGitHubExport,
  getDemoTaskList,
  type IssuePreview,
} from '../../api/tasks';
import {
  btnStyle,
  btnSecondaryStyle,
  cardStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  labelStyle,
  PHASE_COLOR,
} from './styles';

function IssueCard({ issue }: { issue: IssuePreview }) {
  const [expanded, setExpanded] = useState(false);
  const phaseLabel = issue.labels.find((l) => l.startsWith('phase:'))?.replace('phase:', '') ?? '';

  return (
    <div
      style={{
        ...cardStyle,
        borderLeft: `3px solid ${PHASE_COLOR[phaseLabel] ?? '#6b7280'}`,
        cursor: 'pointer',
      }}
      onClick={() => setExpanded((v) => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
            {issue.title}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {issue.labels.map((label) => (
              <span
                key={label}
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: 3,
                  padding: '1px 6px',
                  fontSize: '0.68rem',
                  color: '#374151',
                }}
              >
                {label}
              </span>
            ))}
            {issue.milestone && (
              <span
                style={{
                  background: '#ede9fe',
                  border: '1px solid #ddd6fe',
                  borderRadius: 3,
                  padding: '1px 6px',
                  fontSize: '0.68rem',
                  color: '#6d28d9',
                }}
              >
                🏁 {issue.milestone}
              </span>
            )}
          </div>
        </div>
        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <pre
          style={{
            marginTop: 10,
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: '0.78rem',
            color: '#374151',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {issue.body}
        </pre>
      )}
    </div>
  );
}

export function GitHubIssuesExport() {
  const [projectId, setProjectId] = useState('');
  const [issues, setIssues] = useState<IssuePreview[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const data = await getGitHubExport(projectId.trim());
      setIssues(data.issues);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    const demo = getDemoTaskList();
    // Build issue previews from demo tasks
    const previews: IssuePreview[] = [];
    for (const phase of demo.phases) {
      for (const task of phase.tasks) {
        const labels = [`phase:${task.phase}`, ...task.tags.map((t) => `tag:${t}`)];
        if (task.parallel) labels.push('parallel');
        const bodyLines = [`**Phase**: ${task.phase}`, `**Status**: ${task.status}`];
        if (task.story_id) bodyLines.push(`**Story**: ${task.story_id}`);
        if (task.dependencies.length) bodyLines.push(`**Depends on**: ${task.dependencies.join(', ')}`);
        if (task.description) {
          bodyLines.push('');
          bodyLines.push(task.description);
        }
        previews.push({
          task_id: task.task_id,
          title: task.title,
          body: bodyLines.join('\n'),
          labels,
          milestone: task.phase,
        });
      }
    }
    setIssues(previews);
    setIsDemo(true);
    setError(null);
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>GitHub Issues Export</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Preview how tasks will appear as GitHub Issues. Each card shows the issue title, labels,
        milestone, and body. Click a card to expand the body.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Project ID"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={handleLoad} disabled={loading || !projectId.trim()} style={btnStyle}>
          {loading ? 'Loading…' : 'Load'}
        </button>
        <button onClick={handleLoadDemo} style={btnSecondaryStyle}>
          Load Demo
        </button>
      </div>

      {isDemo && (
        <div style={demoBannerStyle}>
          ⚠ Demo mode — this is a preview only. Actual GitHub export is not yet wired.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {issues !== null && (
        <div>
          <div style={{ ...labelStyle, marginBottom: 10 }}>
            {issues.length} issue{issues.length !== 1 ? 's' : ''} to export
          </div>
          {issues.map((issue) => (
            <IssueCard key={issue.task_id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}
