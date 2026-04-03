/**
 * API client for the SpecForge Project Dashboard module (Module 8).
 *
 * Endpoints:
 *   GET    /api/v1/projects
 *   POST   /api/v1/projects
 *   GET    /api/v1/projects/{projectId}
 *   DELETE /api/v1/projects/{projectId}
 *   GET    /api/v1/projects/{projectId}/features
 *   POST   /api/v1/projects/{projectId}/features
 *   PUT    /api/v1/projects/{projectId}/features/{featureId}/phase
 *   GET    /api/v1/projects/{projectId}/reviews
 *   POST   /api/v1/projects/{projectId}/reviews
 *   GET    /api/v1/projects/{projectId}/metrics
 */

const BASE = '/api/v1';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type SDDPhase = 'constitution' | 'spec' | 'plan' | 'tasks' | 'implement' | 'done';
export type PhaseStatus = 'not-started' | 'in-progress' | 'complete' | 'blocked';
export type ReviewStatus = 'open' | 'resolved' | 'dismissed';
export type TeamRole = 'owner' | 'contributor' | 'reviewer' | 'observer';
export type FeatureStatus = 'active' | 'paused' | 'archived';

export const SDD_PHASES: SDDPhase[] = [
  'constitution',
  'spec',
  'plan',
  'tasks',
  'implement',
  'done',
];

export const PHASE_LABEL: Record<SDDPhase, string> = {
  constitution: 'Constitution',
  spec: 'Spec',
  plan: 'Plan',
  tasks: 'Tasks',
  implement: 'Implement',
  done: 'Done',
};

export const PHASE_ICON: Record<SDDPhase, string> = {
  constitution: '⚖️',
  spec: '📐',
  plan: '🏗️',
  tasks: '🔨',
  implement: '⚡',
  done: '✅',
};

export const PHASE_STATUS_COLOR: Record<PhaseStatus, string> = {
  'not-started': '#d1d5db',
  'in-progress': '#2563eb',
  complete: '#059669',
  blocked: '#dc2626',
};

export const PHASE_STATUS_BG: Record<PhaseStatus, string> = {
  'not-started': '#f3f4f6',
  'in-progress': '#eff6ff',
  complete: '#f0fdf4',
  blocked: '#fef2f2',
};

export const REVIEW_STATUS_COLOR: Record<ReviewStatus, string> = {
  open: '#2563eb',
  resolved: '#059669',
  dismissed: '#6b7280',
};

export const REVIEW_STATUS_ICON: Record<ReviewStatus, string> = {
  open: '💬',
  resolved: '✅',
  dismissed: '🚫',
};

export interface PhaseProgress {
  phase: SDDPhase;
  status: PhaseStatus;
  completed_at: string | null;
}

export interface ReviewThread {
  thread_id: string;
  project_id: string;
  author: string;
  title: string;
  status: ReviewStatus;
  created_at: string;
  comments: ReviewComment[];
}

export interface ReviewComment {
  comment_id: string;
  author: string;
  body: string;
  created_at: string;
}

export interface TeamMember {
  member_id: string;
  name: string;
  role: TeamRole;
  avatar_initials: string;
}

export interface Feature {
  feature_id: string;
  project_id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  current_phase: SDDPhase;
  phase_progress: PhaseProgress[];
  created_at: string;
}

export interface FeatureListResponse {
  project_id: string;
  features: Feature[];
}

export interface ReviewListResponse {
  project_id: string;
  reviews: ReviewThread[];
}

export interface ProjectMetrics {
  project_id: string;
  total_features: number;
  features_by_phase: Record<SDDPhase, number>;
  spec_quality_avg: number;
  compliance_rate: number;
  velocity: number;
  as_of: string;
}

export interface Project {
  project_id: string;
  name: string;
  description: string;
  created_at: string;
  team: TeamMember[];
}

export interface ProjectListResponse {
  projects: Project[];
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

export function listProjects(): Promise<ProjectListResponse> {
  return request(`${BASE}/projects`);
}

export function createProject(
  body: Pick<Project, 'name' | 'description'>
): Promise<Project> {
  return request(`${BASE}/projects`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getProject(projectId: string): Promise<Project> {
  return request(`${BASE}/projects/${projectId}`);
}

export function deleteProject(projectId: string): Promise<void> {
  return request(`${BASE}/projects/${projectId}`, { method: 'DELETE' });
}

export function listFeatures(projectId: string): Promise<FeatureListResponse> {
  return request(`${BASE}/projects/${projectId}/features`);
}

export function createFeature(
  projectId: string,
  body: Pick<Feature, 'title' | 'description'>
): Promise<Feature> {
  return request(`${BASE}/projects/${projectId}/features`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateFeaturePhase(
  projectId: string,
  featureId: string,
  phase: SDDPhase,
  status: PhaseStatus
): Promise<Feature> {
  return request(`${BASE}/projects/${projectId}/features/${featureId}/phase`, {
    method: 'PUT',
    body: JSON.stringify({ phase, status }),
  });
}

export function listReviews(projectId: string): Promise<ReviewListResponse> {
  return request(`${BASE}/projects/${projectId}/reviews`);
}

export function createReview(
  projectId: string,
  body: Pick<ReviewThread, 'title' | 'author'>
): Promise<ReviewThread> {
  return request(`${BASE}/projects/${projectId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getMetrics(projectId: string): Promise<ProjectMetrics> {
  return request(`${BASE}/projects/${projectId}/metrics`);
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

export function getDemoProject(): { project: Project; features: Feature[] } {
  const project: Project = {
    project_id: 'demo-project',
    name: 'SpecForge Platform',
    description: 'A spec-driven CASE tool with 8 modules covering the full SDD lifecycle.',
    created_at: '2026-03-01T08:00:00Z',
    team: [
      { member_id: 'm-001', name: 'Alice Chen', role: 'owner', avatar_initials: 'AC' },
      { member_id: 'm-002', name: 'Bob Santos', role: 'contributor', avatar_initials: 'BS' },
      { member_id: 'm-003', name: 'Carol Park', role: 'reviewer', avatar_initials: 'CP' },
      { member_id: 'm-004', name: 'Dan Müller', role: 'observer', avatar_initials: 'DM' },
    ],
  };

  const mkProgress = (phases: Partial<Record<SDDPhase, PhaseStatus>>): PhaseProgress[] =>
    SDD_PHASES.map((p) => ({
      phase: p,
      status: phases[p] ?? 'not-started',
      completed_at: phases[p] === 'complete' ? '2026-03-20T12:00:00Z' : null,
    }));

  const features: Feature[] = [
    {
      feature_id: 'feat-001',
      project_id: 'demo-project',
      title: 'Constitution Engine',
      description: 'Manage project principles, governance rules and compliance checks.',
      status: 'active',
      current_phase: 'done',
      phase_progress: mkProgress({
        constitution: 'complete',
        spec: 'complete',
        plan: 'complete',
        tasks: 'complete',
        implement: 'complete',
        done: 'complete',
      }),
      created_at: '2026-03-01T08:00:00Z',
    },
    {
      feature_id: 'feat-002',
      project_id: 'demo-project',
      title: 'Specification Studio',
      description: 'AI-assisted spec writing with user stories and requirements management.',
      status: 'active',
      current_phase: 'implement',
      phase_progress: mkProgress({
        constitution: 'complete',
        spec: 'complete',
        plan: 'complete',
        tasks: 'complete',
        implement: 'in-progress',
      }),
      created_at: '2026-03-05T08:00:00Z',
    },
    {
      feature_id: 'feat-003',
      project_id: 'demo-project',
      title: 'Quality Guardian',
      description: 'Checklists, test suites and analysis reports for quality assurance.',
      status: 'active',
      current_phase: 'tasks',
      phase_progress: mkProgress({
        constitution: 'complete',
        spec: 'complete',
        plan: 'complete',
        tasks: 'in-progress',
      }),
      created_at: '2026-03-10T08:00:00Z',
    },
    {
      feature_id: 'feat-004',
      project_id: 'demo-project',
      title: 'Project Dashboard',
      description: 'Team visibility, review workflows and metrics for project health.',
      status: 'active',
      current_phase: 'plan',
      phase_progress: mkProgress({
        constitution: 'complete',
        spec: 'complete',
        plan: 'in-progress',
      }),
      created_at: '2026-03-15T08:00:00Z',
    },
  ];

  return { project, features };
}

export function getDemoMetrics(): ProjectMetrics {
  return {
    project_id: 'demo-project',
    total_features: 4,
    features_by_phase: {
      constitution: 0,
      spec: 0,
      plan: 1,
      tasks: 1,
      implement: 1,
      done: 1,
    },
    spec_quality_avg: 82,
    compliance_rate: 91,
    velocity: 3.5,
    as_of: '2026-04-10T09:00:00Z',
  };
}

export function getDemoReviews(): ReviewListResponse {
  return {
    project_id: 'demo-project',
    reviews: [
      {
        thread_id: 'rev-001',
        project_id: 'demo-project',
        author: 'Carol Park',
        title: 'Spec completeness for Quality Guardian',
        status: 'open',
        created_at: '2026-04-08T14:00:00Z',
        comments: [
          {
            comment_id: 'c-001',
            author: 'Carol Park',
            body: 'The acceptance criteria for the checklist builder are missing edge cases for empty categories.',
            created_at: '2026-04-08T14:00:00Z',
          },
          {
            comment_id: 'c-002',
            author: 'Alice Chen',
            body: 'Good catch — I will update the spec to include empty state handling.',
            created_at: '2026-04-08T14:30:00Z',
          },
        ],
      },
      {
        thread_id: 'rev-002',
        project_id: 'demo-project',
        author: 'Bob Santos',
        title: 'Architecture plan: database indexing strategy',
        status: 'resolved',
        created_at: '2026-04-05T10:00:00Z',
        comments: [
          {
            comment_id: 'c-003',
            author: 'Bob Santos',
            body: 'We should add a composite index on (project_id, status) for the features table.',
            created_at: '2026-04-05T10:00:00Z',
          },
          {
            comment_id: 'c-004',
            author: 'Alice Chen',
            body: 'Index added to the migration. Closing this thread.',
            created_at: '2026-04-06T09:15:00Z',
          },
        ],
      },
      {
        thread_id: 'rev-003',
        project_id: 'demo-project',
        author: 'Dan Müller',
        title: 'Dashboard metrics: velocity calculation method',
        status: 'dismissed',
        created_at: '2026-04-03T16:00:00Z',
        comments: [
          {
            comment_id: 'c-005',
            author: 'Dan Müller',
            body: 'Consider using story points instead of feature count for velocity.',
            created_at: '2026-04-03T16:00:00Z',
          },
        ],
      },
    ],
  };
}
