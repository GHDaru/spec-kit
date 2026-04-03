import { useState } from 'react';
import {
  getProgress,
  getDemoTaskList,
  type ProgressSummary,
  PHASE_ORDER,
  PHASE_LABEL,
  STATUS_COLOR,
  STATUS_ICON,
  type TaskStatus,
} from '../../api/tasks';
import {
  btnStyle,
  btnSecondaryStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  labelStyle,
  PHASE_COLOR,
} from './styles';

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 8,
          background: '#e5e7eb',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: 4,
            transition: 'width 0.4s',
          }}
        />
      </div>
      <span style={{ fontSize: '0.75rem', color: '#6b7280', minWidth: 34 }}>
        {value}/{total}
      </span>
    </div>
  );
}

const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'blocked', 'complete'];

export function TaskStatusTracker() {
  const [projectId, setProjectId] = useState('');
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const data = await getProgress(projectId.trim());
      setProgress(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    const demo = getDemoTaskList();
    // Compute progress from demo
    const by_status: Record<string, number> = { pending: 0, in_progress: 0, blocked: 0, complete: 0 };
    const by_phase: Record<string, Record<string, number>> = {};
    for (const pt of PHASE_ORDER) {
      by_phase[pt] = { pending: 0, in_progress: 0, blocked: 0, complete: 0 };
    }
    let total = 0;
    for (const phase of demo.phases) {
      for (const task of phase.tasks) {
        by_status[task.status]++;
        by_phase[phase.phase_type][task.status]++;
        total++;
      }
    }
    setProgress({ total, by_status: by_status as ProgressSummary['by_status'], by_phase: by_phase as ProgressSummary['by_phase'] });
    setIsDemo(true);
    setError(null);
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Progress Tracker</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Overall task completion by status and by phase.
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

      {isDemo && <div style={demoBannerStyle}>⚠ Demo mode — computed from demo data.</div>}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {progress && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* By status */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 10 }}>
              Overall — {progress.total} tasks
            </div>
            {STATUSES.map((s) => (
              <div key={s} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: '0.82rem', color: STATUS_COLOR[s], fontWeight: 600 }}>
                    {STATUS_ICON[s]} {s.replace('_', ' ')}
                  </span>
                </div>
                <ProgressBar
                  value={progress.by_status[s] ?? 0}
                  total={progress.total}
                  color={STATUS_COLOR[s]}
                />
              </div>
            ))}
          </div>

          {/* By phase */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 10 }}>By Phase</div>
            {PHASE_ORDER.map((pt) => {
              const phaseData = progress.by_phase[pt] ?? {};
              const phaseTotal = Object.values(phaseData).reduce((a, b) => a + b, 0);
              const completed = phaseData['complete'] ?? 0;
              return (
                <div key={pt} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: PHASE_COLOR[pt],
                      }}
                    >
                      {PHASE_LABEL[pt]}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {completed}/{phaseTotal} done
                    </span>
                  </div>
                  <ProgressBar value={completed} total={phaseTotal} color={PHASE_COLOR[pt]} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
