import { useState } from 'react';
import {
  getTaskList,
  getDemoTaskList,
  updateTaskStatus,
  type TaskListResponse,
  type Task,
  type TaskStatus,
  PHASE_ORDER,
  PHASE_LABEL,
  STATUS_COLOR,
  STATUS_ICON,
} from '../../api/tasks';
import {
  btnStyle,
  btnSecondaryStyle,
  btnSmallStyle,
  cardStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  PHASE_COLOR,
} from './styles';

const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'blocked', 'complete'];

function TaskCard({
  task,
  projectId,
  isDemo,
  onStatusChange,
}: {
  task: Task;
  projectId: string;
  isDemo: boolean;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}) {
  const [changing, setChanging] = useState(false);

  async function handleStatusChange(newStatus: TaskStatus) {
    if (isDemo) {
      onStatusChange(task.task_id, newStatus);
      return;
    }
    setChanging(true);
    try {
      await updateTaskStatus(projectId, task.task_id, newStatus);
      onStatusChange(task.task_id, newStatus);
    } finally {
      setChanging(false);
    }
  }

  return (
    <div
      style={{
        ...cardStyle,
        borderLeft: `3px solid ${STATUS_COLOR[task.status]}`,
        opacity: task.status === 'complete' ? 0.75 : 1,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#9ca3af', flexShrink: 0 }}>
          {task.task_id}
        </span>
        {task.parallel && (
          <span
            style={{
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: 3,
              padding: '1px 5px',
              fontSize: '0.68rem',
              color: '#92400e',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            [P]
          </span>
        )}
        <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem' }}>{task.title}</span>
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          {task.tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-block',
                background: '#e0f2fe',
                borderRadius: 3,
                padding: '1px 5px',
                fontSize: '0.68rem',
                color: '#0369a1',
                marginRight: 4,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Story link */}
      {task.story_id && (
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>
          📋 {task.story_id}
        </div>
      )}

      {/* Status selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <span style={{ fontSize: '0.75rem', color: STATUS_COLOR[task.status], fontWeight: 600 }}>
          {STATUS_ICON[task.status]} {task.status.replace('_', ' ')}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
          {STATUSES.filter((s) => s !== task.status).map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={changing}
              style={{
                ...btnSmallStyle,
                background: STATUS_COLOR[s],
                fontSize: '0.68rem',
                padding: '2px 6px',
              }}
              title={`Mark as ${s.replace('_', ' ')}`}
            >
              {STATUS_ICON[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TaskBoard() {
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

  function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    if (!taskList) return;
    setTaskList({
      ...taskList,
      phases: taskList.phases.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((t) =>
          t.task_id === taskId ? { ...t, status: newStatus } : t
        ),
      })),
    });
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Task Board</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Phase-grouped view of all implementation tasks. Click status icons to update task status.
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
          ⚠ Demo mode — showing sample task data. Backend not yet connected.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {taskList && (
        <div>
          <div
            style={{
              background: '#f0fdfa',
              border: '1px solid #99f6e4',
              borderRadius: 8,
              padding: '10px 16px',
              marginBottom: 20,
            }}
          >
            <strong>{taskList.project_name}</strong>
            <span style={{ color: '#6b7280', fontSize: '0.82rem', marginLeft: 12 }}>
              v{taskList.version}
            </span>
            {taskList.spec_id && (
              <span style={{ color: '#6b7280', fontSize: '0.82rem', marginLeft: 12 }}>
                Spec: <code style={{ fontSize: '0.75rem' }}>{taskList.spec_id}</code>
              </span>
            )}
          </div>

          {PHASE_ORDER.map((phaseType) => {
            const phase = taskList.phases.find((p) => p.phase_type === phaseType);
            if (!phase) return null;
            return (
              <div key={phaseType} style={{ marginBottom: 24 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                    borderBottom: `2px solid ${PHASE_COLOR[phaseType]}`,
                    paddingBottom: 6,
                  }}
                >
                  <span
                    style={{
                      background: PHASE_COLOR[phaseType],
                      color: '#fff',
                      borderRadius: 4,
                      padding: '2px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}
                  >
                    {PHASE_LABEL[phaseType]}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {phase.tasks.length} task{phase.tasks.length !== 1 ? 's' : ''} ·{' '}
                    {phase.tasks.filter((t) => t.status === 'complete').length} complete
                  </span>
                </div>
                {phase.tasks.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No tasks in this phase.</p>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: 10,
                    }}
                  >
                    {phase.tasks.map((task) => (
                      <TaskCard
                        key={task.task_id}
                        task={task}
                        projectId={projectId}
                        isDemo={isDemo}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
