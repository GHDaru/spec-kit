/**
 * API client for the SpecForge Release Manager (Module 5).
 *
 * Endpoints:
 *   GET    /api/v1/projects/{projectId}/releases
 *   POST   /api/v1/projects/{projectId}/releases
 *   GET    /api/v1/projects/{projectId}/releases/changelog
 *   GET    /api/v1/projects/{projectId}/releases/summary
 *   GET    /api/v1/projects/{projectId}/releases/{version}
 *   PUT    /api/v1/projects/{projectId}/releases/{version}
 *   DELETE /api/v1/projects/{projectId}/releases/{version}
 *   POST   /api/v1/projects/{projectId}/releases/{version}/changes
 *   PUT    /api/v1/projects/{projectId}/releases/{version}/status
 *   DELETE /api/v1/projects/{projectId}/releases/{version}/changes/{changeId}
 */

const BASE = '/api/v1';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type ChangeType =
  | 'feat'
  | 'fix'
  | 'docs'
  | 'refactor'
  | 'test'
  | 'chore'
  | 'breaking';

export type ReleaseStatus = 'draft' | 'published' | 'yanked';

export const CHANGE_TYPE_ORDER: ChangeType[] = [
  'breaking',
  'feat',
  'fix',
  'refactor',
  'docs',
  'test',
  'chore',
];

export const CHANGE_TYPE_LABEL: Record<ChangeType, string> = {
  breaking: '💥 Breaking Changes',
  feat: '✨ Features',
  fix: '🐛 Bug Fixes',
  refactor: '♻️ Refactoring',
  docs: '📝 Documentation',
  test: '✅ Tests',
  chore: '🔧 Chores',
};

export const STATUS_COLOR: Record<ReleaseStatus, string> = {
  draft: '#6b7280',
  published: '#059669',
  yanked: '#dc2626',
};

export const STATUS_ICON: Record<ReleaseStatus, string> = {
  draft: '📝',
  published: '🚀',
  yanked: '⛔',
};

export interface ChangeEntry {
  change_id: string;
  change_type: ChangeType;
  description: string;
  task_id: string | null;
  story_id: string | null;
}

export interface ReleaseSchema {
  version: string;
  title: string;
  date: string;
  status: ReleaseStatus;
  task_list_id: string | null;
  spec_id: string | null;
  plan_id: string | null;
  notes: string;
  changes: ChangeEntry[];
}

export interface ReleaseLogResponse {
  project_name: string;
  notes: string;
  releases: ReleaseSchema[];
}

export interface ChangelogResponse {
  markdown: string;
}

export interface ReleaseLogSummary {
  total_releases: number;
  by_status: Record<ReleaseStatus, number>;
  total_changes: number;
  by_change_type: Record<ChangeType, number>;
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

export function getReleaseLog(projectId: string): Promise<ReleaseLogResponse> {
  return request(`${BASE}/projects/${projectId}/releases`);
}

export function createReleaseLog(
  projectId: string,
  body: Partial<ReleaseLogResponse>
): Promise<ReleaseLogResponse> {
  return request(`${BASE}/projects/${projectId}/releases`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getChangelog(projectId: string): Promise<ChangelogResponse> {
  return request(`${BASE}/projects/${projectId}/releases/changelog`);
}

export function getReleaseLogSummary(projectId: string): Promise<ReleaseLogSummary> {
  return request(`${BASE}/projects/${projectId}/releases/summary`);
}

export function getRelease(projectId: string, version: string): Promise<ReleaseSchema> {
  return request(`${BASE}/projects/${projectId}/releases/${version}`);
}

export function updateRelease(
  projectId: string,
  version: string,
  body: Partial<ReleaseSchema>
): Promise<ReleaseSchema> {
  return request(`${BASE}/projects/${projectId}/releases/${version}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteRelease(projectId: string, version: string): Promise<void> {
  return request(`${BASE}/projects/${projectId}/releases/${version}`, {
    method: 'DELETE',
  });
}

export function addChangeEntry(
  projectId: string,
  version: string,
  entry: Omit<ChangeEntry, 'change_id'>
): Promise<ChangeEntry> {
  return request(`${BASE}/projects/${projectId}/releases/${version}/changes`, {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export function updateReleaseStatus(
  projectId: string,
  version: string,
  status: ReleaseStatus
): Promise<ReleaseSchema> {
  return request(`${BASE}/projects/${projectId}/releases/${version}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function removeChangeEntry(
  projectId: string,
  version: string,
  changeId: string
): Promise<void> {
  return request(
    `${BASE}/projects/${projectId}/releases/${version}/changes/${changeId}`,
    { method: 'DELETE' }
  );
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

export function getDemoReleaseLog(): ReleaseLogResponse {
  return {
    project_name: 'Demo Project',
    notes: 'Auto-generated demo release log for Module 5.',
    releases: [
      {
        version: '5.0.0',
        title: 'Release Manager',
        date: '2026-04-03',
        status: 'published',
        task_list_id: 'tasks-demo',
        spec_id: 'spec-demo',
        plan_id: 'plan-demo',
        notes: 'Introduces the Release Manager module.',
        changes: [
          {
            change_id: 'c-001',
            change_type: 'feat',
            description: 'Add Release Manager module (Module 5)',
            task_id: 'us1-001',
            story_id: 'US-1',
          },
          {
            change_id: 'c-002',
            change_type: 'feat',
            description: 'Add changelog Markdown generation',
            task_id: 'us1-002',
            story_id: 'US-2',
          },
          {
            change_id: 'c-003',
            change_type: 'feat',
            description: 'Add release summary statistics endpoint',
            task_id: 'us2-001',
            story_id: 'US-3',
          },
          {
            change_id: 'c-004',
            change_type: 'docs',
            description: 'Document all Module 5 REST endpoints',
            task_id: null,
            story_id: null,
          },
          {
            change_id: 'c-005',
            change_type: 'test',
            description: 'Add 40 integration tests for releases API',
            task_id: null,
            story_id: null,
          },
        ],
      },
      {
        version: '4.0.0',
        title: 'Task Forge',
        date: '2026-02-15',
        status: 'published',
        task_list_id: null,
        spec_id: null,
        plan_id: null,
        notes: 'Introduces the Task Forge module.',
        changes: [
          {
            change_id: 'c-101',
            change_type: 'feat',
            description: 'Add Task Forge module (Module 4)',
            task_id: null,
            story_id: 'US-4',
          },
          {
            change_id: 'c-102',
            change_type: 'feat',
            description: 'Add dependency graph with cycle detection',
            task_id: null,
            story_id: 'US-5',
          },
          {
            change_id: 'c-103',
            change_type: 'feat',
            description: 'Add GitHub Issues export preview',
            task_id: null,
            story_id: 'US-6',
          },
          {
            change_id: 'c-104',
            change_type: 'fix',
            description: 'Fix phase ordering in YAML persistence',
            task_id: 'fix-001',
            story_id: null,
          },
        ],
      },
      {
        version: '3.0.0',
        title: 'Architecture Planner',
        date: '2026-01-10',
        status: 'published',
        task_list_id: null,
        spec_id: null,
        plan_id: null,
        notes: 'Introduces the Architecture Planner module.',
        changes: [
          {
            change_id: 'c-201',
            change_type: 'feat',
            description: 'Add Architecture Planner module (Module 3)',
            task_id: null,
            story_id: null,
          },
          {
            change_id: 'c-202',
            change_type: 'feat',
            description: 'Add ER diagram and tech stack selector',
            task_id: null,
            story_id: null,
          },
        ],
      },
      {
        version: '0.1.0',
        title: 'WIP: Next Steps',
        date: '',
        status: 'draft',
        task_list_id: null,
        spec_id: null,
        plan_id: null,
        notes: 'Upcoming features being planned.',
        changes: [
          {
            change_id: 'c-301',
            change_type: 'feat',
            description: 'Planned: CI/CD pipeline integration',
            task_id: null,
            story_id: null,
          },
          {
            change_id: 'c-302',
            change_type: 'breaking',
            description: 'Planned: Rename projects root env variable',
            task_id: null,
            story_id: null,
          },
        ],
      },
    ],
  };
}
