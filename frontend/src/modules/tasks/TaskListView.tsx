import { useState } from 'react';
import {
  getTaskList,
  getDemoTaskList,
  type TaskListResponse,
  PHASE_ORDER,
  PHASE_LABEL,
  STATUS_COLOR,
  STATUS_ICON,
  type TaskStatus,
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

const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'blocked', 'complete'];

export function TaskListView() {
  const [projectId, setProjectId] = useState('');
  const [taskList, setTaskList] = useState<TaskListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const data = await getTaskList(projectId.trim());
      setTaskList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    setTaskList(getDemoTaskList());
    setIsDemo(true);
    setError(null);
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Browse Task List</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Load and inspect the full implementation task list for a project.
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
          {loading ? 'Loading…' : 'Load'}
        </button>
        <button onClick={handleLoadDemo} style={btnSecondaryStyle}>
          Load Demo
        </button>
      </div>

      {isDemo && (
        <div style={demoBannerStyle}>
          ⚠ Demo mode — showing sample task list. Backend not yet connected.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {taskList && (
        <div>
          {/* Header */}
          <div
            style={{
              background: '#f0fdfa',
              border: '1px solid #99f6e4',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
            }}
          >
            <h3 style={{ margin: '0 0 4px' }}>{taskList.project_name}</h3>
            <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
              Version <strong>{taskList.version}</strong>
              {taskList.plan_id && (
                <> · Plan: <code style={{ fontSize: '0.75rem' }}>{taskList.plan_id}</code></>
              )}
              {taskList.spec_id && (
                <> · Spec: <code style={{ fontSize: '0.75rem' }}>{taskList.spec_id}</code></>
              )}
            </div>
            {taskList.notes && (
              <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#374151' }}>
                {taskList.notes}
              </p>
            )}
          </div>

          {/* Phase summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {PHASE_ORDER.map((phaseType) => {
              const phase = taskList.phases.find((p) => p.phase_type === phaseType);
              const tasks = phase?.tasks ?? [];
              const complete = tasks.filter((t) => t.status === 'complete').length;
              return (
                <div
                  key={phaseType}
                  style={{
                    ...cardStyle,
                    borderTop: `3px solid ${PHASE_COLOR[phaseType]}`,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: PHASE_COLOR[phaseType], marginBottom: 4 }}>
                    {PHASE_LABEL[phaseType]}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {tasks.length} task{tasks.length !== 1 ? 's' : ''} · {complete} done
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {STATUSES.map((s) => {
                      const count = tasks.filter((t) => t.status === s).length;
                      if (count === 0) return null;
                      return (
                        <span
                          key={s}
                          style={{
                            fontSize: '0.68rem',
                            background: STATUS_COLOR[s] + '22',
                            color: STATUS_COLOR[s],
                            border: `1px solid ${STATUS_COLOR[s]}44`,
                            borderRadius: 3,
                            padding: '1px 5px',
                            fontWeight: 600,
                          }}
                        >
                          {STATUS_ICON[s]} {count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dependency summary */}
          {taskList.dependency_edges.length > 0 && (
            <div style={cardStyle}>
              <div style={{ ...labelStyle, marginBottom: 8 }}>
                🔗 {taskList.dependency_edges.length} dependency edge{taskList.dependency_edges.length !== 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {taskList.dependency_edges.map((e, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      background: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: 4,
                      padding: '2px 8px',
                    }}
                  >
                    {e.source_id} → {e.target_id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
