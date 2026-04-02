import { useState } from 'react';
import type { FileNode } from '../../api/plan';

function TreeNode({
  node,
  depth,
  defaultOpen,
}: {
  node: FileNode;
  depth: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isDir = node.type === 'directory';
  const indent = depth * 18;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 0',
          paddingLeft: indent,
          cursor: isDir ? 'pointer' : 'default',
          borderRadius: 4,
          userSelect: 'none',
        }}
        onClick={() => isDir && setOpen((v) => !v)}
      >
        <span style={{ fontSize: '0.9rem', minWidth: 14, textAlign: 'center' }}>
          {isDir ? (open ? '📂' : '📁') : getFileIcon(node.name)}
        </span>
        <span
          style={{
            fontSize: '0.85rem',
            fontFamily: 'monospace',
            color: isDir ? '#1d4ed8' : '#111827',
            fontWeight: isDir ? 600 : 400,
          }}
        >
          {node.name}
          {isDir && '/'}
        </span>
        {node.annotation && (
          <span
            style={{
              fontSize: '0.72rem',
              color: '#9ca3af',
              fontStyle: 'italic',
              marginLeft: 4,
            }}
          >
            — {node.annotation}
          </span>
        )}
        {isDir && (
          <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginLeft: 'auto' }}>
            {open ? '▲' : '▼'}
          </span>
        )}
      </div>

      {isDir && open && node.children && (
        <div
          style={{
            borderLeft: '1px dashed #d1d5db',
            marginLeft: indent + 7,
          }}
        >
          {node.children.map((child) => (
            <TreeNode key={child.name} node={child} depth={depth + 1} defaultOpen={defaultOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

function getFileIcon(name: string): string {
  if (name.endsWith('.py')) return '🐍';
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return '🔷';
  if (name.endsWith('.json')) return '📋';
  if (name.endsWith('.md')) return '📝';
  if (name.endsWith('.yml') || name.endsWith('.yaml')) return '⚙️';
  if (name.endsWith('.toml')) return '⚙️';
  if (name.endsWith('.sh')) return '🔧';
  return '📄';
}

interface Props {
  root: FileNode;
}

export function ProjectTreePreview({ root }: Props) {
  const [expandAll, setExpandAll] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  function toggleExpandAll() {
    setExpandAll((v) => !v);
    setResetKey((k) => k + 1);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Project Structure</h3>
        <button
          type="button"
          onClick={toggleExpandAll}
          style={{
            background: 'none',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '3px 10px',
            fontSize: '0.78rem',
            cursor: 'pointer',
            color: '#374151',
          }}
        >
          {expandAll ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 12 }}>
        Click on a directory to expand or collapse. Italic annotations explain the purpose of each folder.
      </p>

      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '12px 16px',
          overflowX: 'auto',
        }}
      >
        <TreeNode key={resetKey} node={root} depth={0} defaultOpen={expandAll} />
      </div>
    </div>
  );
}
