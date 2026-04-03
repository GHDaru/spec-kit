/**
 * API client for the SpecForge Task Forge (Module 4).
 *
 * Endpoints:
 *   GET  /api/v1/projects/{projectId}/tasks
 *   POST /api/v1/projects/{projectId}/tasks
 *   GET  /api/v1/projects/{projectId}/tasks/phases
 *   POST /api/v1/projects/{projectId}/tasks/phases/{phaseType}
 *   GET  /api/v1/projects/{projectId}/tasks/dependency-graph
 *   PUT  /api/v1/projects/{projectId}/tasks/dependency-graph
 *   GET  /api/v1/projects/{projectId}/tasks/github-export
 *   GET  /api/v1/projects/{projectId}/tasks/progress
 *   GET  /api/v1/projects/{projectId}/tasks/{taskId}
 *   PUT  /api/v1/projects/{projectId}/tasks/{taskId}/status
 */

const BASE = '/api/v1';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'complete';
export type PhaseType = 'setup' | 'foundational' | 'us1' | 'us2' | 'us3' | 'polish';

export const PHASE_ORDER: PhaseType[] = [
  'setup',
  'foundational',
  'us1',
  'us2',
  'us3',
  'polish',
];

export const PHASE_LABEL: Record<PhaseType, string> = {
  setup: 'Setup',
  foundational: 'Foundational',
  us1: 'User Story 1',
  us2: 'User Story 2',
  us3: 'User Story 3',
  polish: 'Polish',
};

export const STATUS_COLOR: Record<TaskStatus, string> = {
  pending: '#6b7280',
  in_progress: '#2563eb',
  blocked: '#dc2626',
  complete: '#059669',
};

export const STATUS_ICON: Record<TaskStatus, string> = {
  pending: '⏳',
  in_progress: '▶️',
  blocked: '🚫',
  complete: '✅',
};

export interface Task {
  task_id: string;
  title: string;
  description: string;
  phase: PhaseType;
  parallel: boolean;
  story_id: string | null;
  dependencies: string[];
  status: TaskStatus;
  tags: string[];
}

export interface Phase {
  phase_type: PhaseType;
  tasks: Task[];
}

export interface DependencyEdge {
  source_id: string;
  target_id: string;
  label: string;
}

export interface TaskListResponse {
  project_name: string;
  plan_id: string | null;
  spec_id: string | null;
  version: string;
  notes: string;
  phases: Phase[];
  dependency_edges: DependencyEdge[];
}

export interface DependencyGraphResponse {
  edges: DependencyEdge[];
}

export interface IssuePreview {
  task_id: string;
  title: string;
  body: string;
  labels: string[];
  milestone: string;
}

export interface GitHubExportResponse {
  issues: IssuePreview[];
}

export interface ProgressSummary {
  total: number;
  by_status: Record<TaskStatus, number>;
  by_phase: Record<PhaseType, Record<TaskStatus, number>>;
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
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function getTaskList(projectId: string): Promise<TaskListResponse> {
  return request(`${BASE}/projects/${projectId}/tasks`);
}

export function createTaskList(
  projectId: string,
  body: Partial<TaskListResponse>
): Promise<TaskListResponse> {
  return request(`${BASE}/projects/${projectId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listPhases(projectId: string): Promise<Phase[]> {
  return request(`${BASE}/projects/${projectId}/tasks/phases`);
}

export function addTaskToPhase(
  projectId: string,
  phaseType: PhaseType,
  task: Partial<Task>
): Promise<Task> {
  return request(`${BASE}/projects/${projectId}/tasks/phases/${phaseType}`, {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

export function getDependencyGraph(projectId: string): Promise<DependencyGraphResponse> {
  return request(`${BASE}/projects/${projectId}/tasks/dependency-graph`);
}

export function setDependencyGraph(
  projectId: string,
  edges: DependencyEdge[]
): Promise<DependencyGraphResponse> {
  return request(`${BASE}/projects/${projectId}/tasks/dependency-graph`, {
    method: 'PUT',
    body: JSON.stringify({ edges }),
  });
}

export function getGitHubExport(projectId: string): Promise<GitHubExportResponse> {
  return request(`${BASE}/projects/${projectId}/tasks/github-export`);
}

export function getProgress(projectId: string): Promise<ProgressSummary> {
  return request(`${BASE}/projects/${projectId}/tasks/progress`);
}

export function getTask(projectId: string, taskId: string): Promise<Task> {
  return request(`${BASE}/projects/${projectId}/tasks/${taskId}`);
}

export function updateTaskStatus(
  projectId: string,
  taskId: string,
  status: TaskStatus
): Promise<Task> {
  return request(`${BASE}/projects/${projectId}/tasks/${taskId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

export function getDemoTaskList(): TaskListResponse {
  return {
    project_name: 'Demo Project',
    plan_id: 'plan-demo',
    spec_id: 'spec-demo',
    version: '1.0.0',
    notes: 'Auto-generated demo task list for Module 4.',
    phases: [
      {
        phase_type: 'setup',
        tasks: [
          {
            task_id: 'setup-001',
            title: 'Bootstrap monorepo',
            description: 'Initialise Git repo, CI, and dev containers.',
            phase: 'setup',
            parallel: false,
            story_id: null,
            dependencies: [],
            status: 'complete',
            tags: ['infra'],
          },
          {
            task_id: 'setup-002',
            title: 'Configure linter & formatter',
            description: 'Set up Ruff, Black, and Prettier.',
            phase: 'setup',
            parallel: true,
            story_id: null,
            dependencies: ['setup-001'],
            status: 'complete',
            tags: ['dx'],
          },
        ],
      },
      {
        phase_type: 'foundational',
        tasks: [
          {
            task_id: 'foundational-001',
            title: 'Implement domain model',
            description: 'Create Python dataclasses for all domain entities.',
            phase: 'foundational',
            parallel: false,
            story_id: 'US-1',
            dependencies: ['setup-001'],
            status: 'complete',
            tags: ['backend', 'test-first'],
          },
          {
            task_id: 'foundational-002',
            title: 'Implement persistence layer',
            description: 'YAML serialisation for all aggregates.',
            phase: 'foundational',
            parallel: true,
            story_id: 'US-1',
            dependencies: ['foundational-001'],
            status: 'in_progress',
            tags: ['backend'],
          },
        ],
      },
      {
        phase_type: 'us1',
        tasks: [
          {
            task_id: 'us1-001',
            title: 'Implement POST /tasks endpoint',
            description: 'FastAPI handler + request/response schemas.',
            phase: 'us1',
            parallel: true,
            story_id: 'US-1',
            dependencies: ['foundational-001'],
            status: 'pending',
            tags: ['backend', 'api'],
          },
          {
            task_id: 'us1-002',
            title: 'Write integration tests for POST /tasks',
            description: 'Cover happy path and validation errors.',
            phase: 'us1',
            parallel: true,
            story_id: 'US-1',
            dependencies: ['us1-001'],
            status: 'pending',
            tags: ['test'],
          },
        ],
      },
      {
        phase_type: 'us2',
        tasks: [
          {
            task_id: 'us2-001',
            title: 'Implement PUT /tasks/{id}/status',
            description: 'Status transition endpoint.',
            phase: 'us2',
            parallel: false,
            story_id: 'US-2',
            dependencies: ['us1-001'],
            status: 'pending',
            tags: ['backend', 'api'],
          },
        ],
      },
      {
        phase_type: 'us3',
        tasks: [
          {
            task_id: 'us3-001',
            title: 'Implement GitHub Issues export',
            description: 'GET /tasks/github-export endpoint.',
            phase: 'us3',
            parallel: false,
            story_id: 'US-4',
            dependencies: ['us1-001'],
            status: 'pending',
            tags: ['backend', 'integrations'],
          },
        ],
      },
      {
        phase_type: 'polish',
        tasks: [
          {
            task_id: 'polish-001',
            title: 'Write CHANGELOG entry',
            description: 'Document Module 4 changes.',
            phase: 'polish',
            parallel: false,
            story_id: null,
            dependencies: [],
            status: 'pending',
            tags: ['docs'],
          },
        ],
      },
    ],
    dependency_edges: [
      { source_id: 'setup-001', target_id: 'setup-002', label: '' },
      { source_id: 'setup-001', target_id: 'foundational-001', label: '' },
      { source_id: 'foundational-001', target_id: 'foundational-002', label: '' },
      { source_id: 'foundational-001', target_id: 'us1-001', label: '' },
      { source_id: 'us1-001', target_id: 'us1-002', label: '' },
      { source_id: 'us1-001', target_id: 'us2-001', label: '' },
      { source_id: 'us1-001', target_id: 'us3-001', label: '' },
    ],
  };
}
