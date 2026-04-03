/**
 * API client for the SpecForge Implement & Execute module (Module 6).
 *
 * Endpoints:
 *   GET    /api/v1/projects/{projectId}/sessions
 *   POST   /api/v1/projects/{projectId}/sessions
 *   GET    /api/v1/projects/{projectId}/sessions/{sessionId}
 *   PUT    /api/v1/projects/{projectId}/sessions/{sessionId}/status
 *   DELETE /api/v1/projects/{projectId}/sessions/{sessionId}
 *   POST   /api/v1/projects/{projectId}/sessions/{sessionId}/results
 *   PUT    /api/v1/projects/{projectId}/sessions/{sessionId}/results/{resultId}
 *   POST   /api/v1/projects/{projectId}/sessions/{sessionId}/results/{resultId}/compliance
 *   POST   /api/v1/projects/{projectId}/sessions/{sessionId}/checkpoints
 *   GET    /api/v1/projects/{projectId}/sessions/{sessionId}/summary
 */

const BASE = '/api/v1';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type TaskResultStatus = 'pending' | 'running' | 'success' | 'failure' | 'skipped';
export type SessionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';
export type ComplianceVerdict = 'pass' | 'fail' | 'warning';

export const SESSION_STATUS_COLOR: Record<SessionStatus, string> = {
  idle: '#6b7280',
  running: '#2563eb',
  paused: '#ca8a04',
  completed: '#059669',
  failed: '#dc2626',
};

export const SESSION_STATUS_ICON: Record<SessionStatus, string> = {
  idle: '⏸️',
  running: '▶️',
  paused: '⏸',
  completed: '✅',
  failed: '❌',
};

export const TASK_STATUS_COLOR: Record<TaskResultStatus, string> = {
  pending: '#6b7280',
  running: '#2563eb',
  success: '#059669',
  failure: '#dc2626',
  skipped: '#ca8a04',
};

export const TASK_STATUS_ICON: Record<TaskResultStatus, string> = {
  pending: '⏳',
  running: '🔄',
  success: '✅',
  failure: '❌',
  skipped: '⏭️',
};

export const VERDICT_COLOR: Record<ComplianceVerdict, string> = {
  pass: '#059669',
  fail: '#dc2626',
  warning: '#ca8a04',
};

export const VERDICT_ICON: Record<ComplianceVerdict, string> = {
  pass: '✅',
  fail: '❌',
  warning: '⚠️',
};

export interface Finding {
  requirement: string;
  verdict: string;
  note: string;
}

export interface ComplianceReportSchema {
  report_id: string;
  result_id: string;
  spec_id: string | null;
  verdict: ComplianceVerdict;
  summary: string;
  findings: Finding[];
}

export interface TaskResultSchema {
  result_id: string;
  task_id: string;
  task_title: string;
  status: TaskResultStatus;
  output: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  compliance_report_id: string | null;
}

export interface CheckpointSchema {
  checkpoint_id: string;
  label: string;
  story_id: string | null;
  created_at: string;
  notes: string;
}

export interface ExecutionSessionSchema {
  session_id: string;
  project_id: string;
  task_list_id: string | null;
  spec_id: string | null;
  plan_id: string | null;
  agent: string;
  status: SessionStatus;
  started_at: string;
  completed_at: string | null;
  notes: string;
  task_results: TaskResultSchema[];
  compliance_reports: ComplianceReportSchema[];
  checkpoints: CheckpointSchema[];
}

export interface SessionListResponse {
  project_id: string;
  sessions: ExecutionSessionSchema[];
}

export interface SessionSummary {
  total_tasks: number;
  by_status: Record<TaskResultStatus, number>;
  total_compliance_reports: number;
  by_verdict: Record<ComplianceVerdict, number>;
  total_checkpoints: number;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function listSessions(projectId: string): Promise<SessionListResponse> {
  return request(`${BASE}/projects/${projectId}/sessions`);
}

export function createSession(
  projectId: string,
  body: Partial<ExecutionSessionSchema> & { agent: string; started_at: string }
): Promise<ExecutionSessionSchema> {
  return request(`${BASE}/projects/${projectId}/sessions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getSession(
  projectId: string,
  sessionId: string
): Promise<ExecutionSessionSchema> {
  return request(`${BASE}/projects/${projectId}/sessions/${sessionId}`);
}

export function updateSessionStatus(
  projectId: string,
  sessionId: string,
  status: SessionStatus
): Promise<ExecutionSessionSchema> {
  return request(`${BASE}/projects/${projectId}/sessions/${sessionId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function deleteSession(projectId: string, sessionId: string): Promise<void> {
  return request(`${BASE}/projects/${projectId}/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

export function addTaskResult(
  projectId: string,
  sessionId: string,
  body: Omit<TaskResultSchema, 'result_id' | 'compliance_report_id'>
): Promise<TaskResultSchema> {
  return request(`${BASE}/projects/${projectId}/sessions/${sessionId}/results`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateTaskResult(
  projectId: string,
  sessionId: string,
  resultId: string,
  body: Partial<Pick<TaskResultSchema, 'status' | 'output' | 'error_message' | 'completed_at'>>
): Promise<TaskResultSchema> {
  return request(
    `${BASE}/projects/${projectId}/sessions/${sessionId}/results/${resultId}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );
}

export function addComplianceReport(
  projectId: string,
  sessionId: string,
  resultId: string,
  body: Omit<ComplianceReportSchema, 'report_id' | 'result_id'>
): Promise<ComplianceReportSchema> {
  return request(
    `${BASE}/projects/${projectId}/sessions/${sessionId}/results/${resultId}/compliance`,
    { method: 'POST', body: JSON.stringify(body) }
  );
}

export function addCheckpoint(
  projectId: string,
  sessionId: string,
  body: Omit<CheckpointSchema, 'checkpoint_id'>
): Promise<CheckpointSchema> {
  return request(`${BASE}/projects/${projectId}/sessions/${sessionId}/checkpoints`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getSessionSummary(
  projectId: string,
  sessionId: string
): Promise<SessionSummary> {
  return request(`${BASE}/projects/${projectId}/sessions/${sessionId}/summary`);
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

export function getDemoSession(): ExecutionSessionSchema {
  return {
    session_id: 'demo-session-001',
    project_id: 'demo-project',
    task_list_id: 'tasks-demo',
    spec_id: 'spec-demo',
    plan_id: 'plan-demo',
    agent: 'claude',
    status: 'completed',
    started_at: '2026-04-03T09:00:00Z',
    completed_at: '2026-04-03T11:30:00Z',
    notes: 'Module 6 implementation session — demo data.',
    task_results: [
      {
        result_id: 'r-001',
        task_id: 'task-001',
        task_title: 'Scaffold project structure',
        status: 'success',
        output: '✅ Directory structure created successfully.\n📁 src/ plan/ tests/ frontend/',
        error_message: null,
        started_at: '2026-04-03T09:01:00Z',
        completed_at: '2026-04-03T09:03:00Z',
        compliance_report_id: 'rpt-001',
      },
      {
        result_id: 'r-002',
        task_id: 'task-002',
        task_title: 'Implement domain model (ExecutionSession)',
        status: 'success',
        output: '✅ Domain model implemented.\n📦 ExecutionSession, TaskResult, ComplianceReport, Checkpoint classes created.',
        error_message: null,
        started_at: '2026-04-03T09:04:00Z',
        completed_at: '2026-04-03T09:20:00Z',
        compliance_report_id: 'rpt-002',
      },
      {
        result_id: 'r-003',
        task_id: 'task-003',
        task_title: 'Create FastAPI router (10 endpoints)',
        status: 'success',
        output: '✅ Router created.\n🔌 10 endpoints registered under /api/v1/projects/{project_id}/sessions',
        error_message: null,
        started_at: '2026-04-03T09:21:00Z',
        completed_at: '2026-04-03T09:45:00Z',
        compliance_report_id: 'rpt-003',
      },
      {
        result_id: 'r-004',
        task_id: 'task-004',
        task_title: 'Write 40 integration tests',
        status: 'success',
        output: '✅ 40 tests written and passing.\n🧪 All status validations and persistence round-trips covered.',
        error_message: null,
        started_at: '2026-04-03T09:46:00Z',
        completed_at: '2026-04-03T10:15:00Z',
        compliance_report_id: null,
      },
      {
        result_id: 'r-005',
        task_id: 'task-005',
        task_title: 'Build React frontend (5 components)',
        status: 'success',
        output: '✅ Frontend components complete.\n⚛️ ExecutionConsole, TaskQueue, ParallelExecutionLanes, ComplianceReportPanel, RollbackDialog',
        error_message: null,
        started_at: '2026-04-03T10:16:00Z',
        completed_at: '2026-04-03T11:00:00Z',
        compliance_report_id: null,
      },
    ],
    compliance_reports: [
      {
        report_id: 'rpt-001',
        result_id: 'r-001',
        spec_id: 'spec-demo',
        verdict: 'pass',
        summary: 'All directory structure requirements met.',
        findings: [
          { requirement: 'FR-1: Create session', verdict: 'pass', note: '' },
        ],
      },
      {
        report_id: 'rpt-002',
        result_id: 'r-002',
        spec_id: 'spec-demo',
        verdict: 'pass',
        summary: 'Domain model fully compliant with spec.',
        findings: [
          { requirement: 'FR-1: ExecutionSession entity', verdict: 'pass', note: '' },
          { requirement: 'FR-6: TaskResult entity', verdict: 'pass', note: '' },
          { requirement: 'FR-8: ComplianceReport entity', verdict: 'pass', note: '' },
          { requirement: 'FR-9: Checkpoint entity', verdict: 'pass', note: '' },
        ],
      },
      {
        report_id: 'rpt-003',
        result_id: 'r-003',
        spec_id: 'spec-demo',
        verdict: 'warning',
        summary: 'All endpoints present; summary route ordering requires attention.',
        findings: [
          { requirement: 'FR-2: List sessions', verdict: 'pass', note: '' },
          { requirement: 'FR-3: Get session', verdict: 'pass', note: '' },
          { requirement: 'FR-10: Summary route', verdict: 'warning', note: 'Must be registered before parameterised routes' },
        ],
      },
    ],
    checkpoints: [
      {
        checkpoint_id: 'cp-001',
        label: 'US-1 complete: Session Lifecycle',
        story_id: 'US-1',
        created_at: '2026-04-03T09:45:00Z',
        notes: 'Create, list, get, update status, delete all working.',
      },
      {
        checkpoint_id: 'cp-002',
        label: 'US-2 complete: Task Execution Tracking',
        story_id: 'US-2',
        created_at: '2026-04-03T10:15:00Z',
        notes: 'Add and update task results working with correct status transitions.',
      },
      {
        checkpoint_id: 'cp-003',
        label: 'US-3 complete: Compliance Verification',
        story_id: 'US-3',
        created_at: '2026-04-03T10:30:00Z',
        notes: 'Compliance reports linked to task results and persisted.',
      },
    ],
  };
}
