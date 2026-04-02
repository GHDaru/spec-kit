/**
 * API client for the SpecForge Specification Studio (Module 2).
 *
 * Endpoints:
 *   GET    /api/v1/projects/{projectId}/specs
 *   POST   /api/v1/projects/{projectId}/specs/{specId}
 *   GET    /api/v1/projects/{projectId}/specs/{specId}
 *   POST   /api/v1/projects/{projectId}/specs/{specId}/stories
 *   PATCH  /api/v1/projects/{projectId}/specs/{specId}/stories/{storyId}
 *   DELETE /api/v1/projects/{projectId}/specs/{specId}/stories/{storyId}
 *   POST   /api/v1/projects/{projectId}/specs/{specId}/requirements
 *   POST   /api/v1/projects/{projectId}/specs/{specId}/clarifications
 *   POST   /api/v1/projects/{projectId}/specs/{specId}/clarifications/{itemId}/resolve
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

// ──────────────────────────────────────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────────────────────────────────────

export type Priority = 'P1' | 'P2' | 'P3';

export interface AcceptanceScenarioSchema {
  title: string;
  given: string;
  when: string;
  then: string;
}

export interface UserStorySchema {
  id: string;
  title: string;
  as_a: string;
  i_want: string;
  so_that: string;
  priority: Priority;
  scenarios: AcceptanceScenarioSchema[];
}

export interface FunctionalRequirementSchema {
  id: string;
  description: string;
  story_id: string | null;
}

export interface ClarificationItemSchema {
  id: string;
  description: string;
  status: 'open' | 'resolved';
  resolution: string | null;
}

export interface SpecSummary {
  spec_id: string;
  title: string;
  version: string;
  created_date: string | null;
  story_count: number;
  requirement_count: number;
  open_clarification_count: number;
}

export interface SpecListResponse {
  project_id: string;
  specs: SpecSummary[];
}

export interface SpecResponse {
  spec_id: string;
  title: string;
  description: string;
  version: string;
  created_date: string | null;
  user_stories: UserStorySchema[];
  requirements: FunctionalRequirementSchema[];
  clarifications: ClarificationItemSchema[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Request types
// ──────────────────────────────────────────────────────────────────────────────

export interface AcceptanceScenarioCreateRequest {
  title: string;
  given: string;
  when: string;
  then: string;
}

export interface AddUserStoryRequest {
  id?: string;
  title: string;
  as_a: string;
  i_want: string;
  so_that: string;
  priority: Priority;
  scenarios: AcceptanceScenarioCreateRequest[];
}

export interface AddRequirementRequest {
  description: string;
  story_id?: string | null;
}

export interface UpdateStoryPriorityRequest {
  priority: Priority;
}

export interface CreateSpecRequest {
  title: string;
  description?: string;
  user_stories?: AddUserStoryRequest[];
  requirements?: AddRequirementRequest[];
  clarifications?: { description: string }[];
}

// ──────────────────────────────────────────────────────────────────────────────
// HTTP helper
// ──────────────────────────────────────────────────────────────────────────────

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Endpoint functions
// ──────────────────────────────────────────────────────────────────────────────

export function listSpecs(projectId: string): Promise<SpecListResponse> {
  return request<SpecListResponse>(`${BASE_URL}/projects/${projectId}/specs`);
}

export function createSpec(
  projectId: string,
  specId: string,
  body: CreateSpecRequest,
): Promise<SpecResponse> {
  return request<SpecResponse>(`${BASE_URL}/projects/${projectId}/specs/${specId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getSpec(projectId: string, specId: string): Promise<SpecResponse> {
  return request<SpecResponse>(`${BASE_URL}/projects/${projectId}/specs/${specId}`);
}

export function addStory(
  projectId: string,
  specId: string,
  body: AddUserStoryRequest,
): Promise<SpecResponse> {
  return request<SpecResponse>(`${BASE_URL}/projects/${projectId}/specs/${specId}/stories`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateStoryPriority(
  projectId: string,
  specId: string,
  storyId: string,
  priority: Priority,
): Promise<SpecResponse> {
  return request<SpecResponse>(
    `${BASE_URL}/projects/${projectId}/specs/${specId}/stories/${storyId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ priority } satisfies UpdateStoryPriorityRequest),
    },
  );
}

export function removeStory(
  projectId: string,
  specId: string,
  storyId: string,
): Promise<void> {
  return request<void>(
    `${BASE_URL}/projects/${projectId}/specs/${specId}/stories/${storyId}`,
    { method: 'DELETE' },
  );
}

export function addRequirement(
  projectId: string,
  specId: string,
  body: AddRequirementRequest,
): Promise<SpecResponse> {
  return request<SpecResponse>(
    `${BASE_URL}/projects/${projectId}/specs/${specId}/requirements`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export function addClarification(
  projectId: string,
  specId: string,
  description: string,
): Promise<SpecResponse> {
  return request<SpecResponse>(
    `${BASE_URL}/projects/${projectId}/specs/${specId}/clarifications`,
    {
      method: 'POST',
      body: JSON.stringify({ description }),
    },
  );
}

export function resolveClarification(
  projectId: string,
  specId: string,
  itemId: string,
  resolution: string,
): Promise<SpecResponse> {
  return request<SpecResponse>(
    `${BASE_URL}/projects/${projectId}/specs/${specId}/clarifications/${itemId}/resolve`,
    {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    },
  );
}
