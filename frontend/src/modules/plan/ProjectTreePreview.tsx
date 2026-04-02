import { useState } from 'react';
import { getPlan, getDemoPlan, type FileNode } from '../../api/plan';
import {
  btnStyle,
  btnSecondaryStyle,
  errorStyle,
  inputStyle,
  demoBannerStyle,
} from './styles';

function FileTreeNode({
  node,
  depth,
}: {
  node: FileNode;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.type === 'directory';
  const hasChildren = isDir && node.children && node.children.length > 0;

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 0',
          cursor: hasChildren ? 'pointer' : 'default',
          borderRadius: 4,
        }}
        onClick={() => hasChildren && setOpen((v) => !v)}
        role={hasChildren ? 'button' : undefined}
        tabIndex={hasChildren ? 0 : undefined}
        onKeyDown={(e) => {
          if (hasChildren && (e.key === 'Enter' || e.key === ' ')) setOpen((v) => !v);
        }}
      >
        {/* Expand/collapse icon */}
        <span style={{ width: 16, flexShrink: 0, color: '#9ca3af', fontSize: '0.75rem' }}>
          {isDir
            ? hasChildren
              ? open
                ? '▼'
                : '▶'
              : '·'
            : ''}
        </span>

        {/* File/folder icon */}
        <span style={{ fontSize: '0.9rem' }}>
          {isDir ? (open ? '📂' : '📁') : getFileIcon(node.name)}
        </span>

        {/* Name */}
        <span
          style={{
            fontSize: '0.85rem',
            color: isDir ? '#1e40af' : '#111827',
            fontWeight: isDir ? 600 : 400,
            fontFamily: isDir ? 'inherit' : 'monospace',
          }}
        >
          {node.name}
        </span>

        {/* Description */}
        {node.description && (
          <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 4 }}>
            — {node.description}
          </span>
        )}
      </div>

      {/* Children */}
      {isDir && open && node.children && node.children.length > 0 && (
        <div
          style={{
            borderLeft: '2px solid #e5e7eb',
            marginLeft: 8,
            paddingLeft: 4,
          }}
        >
          {node.children.map((child) => (
            <FileTreeNode key={child.name} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function getFileIcon(name: string): string {
  if (name.endsWith('.py')) return '🐍';
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return '🔷';
  if (name.endsWith('.js') || name.endsWith('.jsx')) return '🟨';
  if (name.endsWith('.md')) return '📝';
  if (name.endsWith('.toml') || name.endsWith('.yaml') || name.endsWith('.yml')) return '⚙️';
  if (name.endsWith('.json')) return '{}';
  if (name === 'Dockerfile') return '🐳';
  if (name.startsWith('.env')) return '🔑';
  return '📄';
}

export function ProjectTreePreview() {
  const [projectId, setProjectId] = useState('');
  const [planId, setPlanId] = useState('');
  const [tree, setTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  async function handleLoad() {
    if (!projectId.trim() || !planId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const plan = await getPlan(projectId.trim(), planId.trim());
      setTree(plan.project_structure);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    setTree(getDemoPlan().project_structure);
    setIsDemo(true);
    setError(null);
  }

  function countNodes(node: FileNode): { files: number; dirs: number } {
    let files = 0;
    let dirs = 0;
    if (node.type === 'file') {
      files = 1;
    } else {
      dirs = 1;
      for (const child of node.children ?? []) {
        const counts = countNodes(child);
        files += counts.files;
        dirs += counts.dirs;
      }
    }
    return { files, dirs };
  }

  const counts = tree ? countNodes(tree) : null;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Project Structure</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Browse the generated project directory tree with annotations for each key file.
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

      {tree && (
        <div>
          {counts && (
            <div
              style={{
                display: 'flex',
                gap: 16,
                fontSize: '0.78rem',
                color: '#6b7280',
                marginBottom: 12,
              }}
            >
              <span>📁 {counts.dirs} directories</span>
              <span>📄 {counts.files} files</span>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                Click directories to expand/collapse
              </span>
            </div>
          )}
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 16,
              background: '#fafafa',
              fontFamily: 'monospace',
            }}
          >
            <FileTreeNode node={tree} depth={0} />
          </div>
        </div>
      )}
    </div>
  );
}
