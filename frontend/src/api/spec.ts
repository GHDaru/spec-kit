/**
 * API client for the SpecForge Specification Studio (Module 2).
 *
 * Endpoints:
 *   GET    /api/v1/projects/{projectId}/specs
 *   POST   /api/v1/projects/{projectId}/specs
 *   GET    /api/v1/projects/{projectId}/specs/{specId}
 *   PUT    /api/v1/projects/{projectId}/specs/{specId}
 *   DELETE /api/v1/projects/{projectId}/specs/{specId}
 *   POST   /api/v1/projects/{projectId}/specs/{specId}/clarifications
 *   PATCH  /api/v1/projects/{projectId}/specs/{specId}/clarifications/{itemId}/resolve
 *   PATCH  /api/v1/projects/{projectId}/specs/{specId}/clarifications/{itemId}/reject
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

// ──────────────────────────────────────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────────────────────────────────────

export type Priority = 'P1' | 'P2' | 'P3';

export interface AcceptanceScenarioSchema {
  id: string;
  given: string;
  when: string;
  then: string;
}

export interface UserStorySchema {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  acceptance_scenarios: AcceptanceScenarioSchema[];
}

export interface FunctionalRequirementSchema {
  id: string;
  description: string;
  story_id: string | null;
}

export interface ClarificationItemSchema {
  id: string;
  marker: string;
  suggestion: string;
  resolved: boolean;
  resolution: string | null;
}

export interface SpecSummaryResponse {
  id: string;
  feature_name: string;
  description: string;
  version: string;
  created_at: string;
  updated_at: string;
  story_count: number;
  requirement_count: number;
}

export interface SpecResponse {
  id: string;
  feature_name: string;
  description: string;
  version: string;
  user_stories: UserStorySchema[];
  functional_requirements: FunctionalRequirementSchema[];
  clarification_items: ClarificationItemSchema[];
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request types
// ──────────────────────────────────────────────────────────────────────────────

export interface AcceptanceScenarioCreateRequest {
  given: string;
  when: string;
  then: string;
}

export interface UserStoryCreateRequest {
  title: string;
  description: string;
  priority: Priority;
  acceptance_scenarios: AcceptanceScenarioCreateRequest[];
}

export interface FunctionalRequirementCreateRequest {
  description: string;
  story_id?: string | null;
}

export interface SpecCreateRequest {
  feature_name: string;
  description?: string;
  version?: string;
  user_stories?: UserStoryCreateRequest[];
  functional_requirements?: FunctionalRequirementCreateRequest[];
}

export interface SpecUpdateRequest {
  feature_name?: string;
  description?: string;
  version?: string;
  user_stories?: UserStoryCreateRequest[];
  functional_requirements?: FunctionalRequirementCreateRequest[];
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

export function listSpecs(projectId: string): Promise<SpecSummaryResponse[]> {
  return request<SpecSummaryResponse[]>(`${BASE_URL}/projects/${projectId}/specs`);
}

export function createSpec(projectId: string, body: SpecCreateRequest): Promise<SpecResponse> {
  return request<SpecResponse>(`${BASE_URL}/projects/${projectId}/specs`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getSpec(projectId: string, specId: string): Promise<SpecResponse> {
  return request<SpecResponse>(`${BASE_URL}/projects/${projectId}/specs/${specId}`);
}

export function updateSpec(
  projectId: string,
  specId: string,
  body: SpecUpdateRequest,
): Promise<SpecResponse> {
  return request<SpecResponse>(`${BASE_URL}/projects/${projectId}/specs/${specId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteSpec(projectId: string, specId: string): Promise<void> {
  return request<void>(`${BASE_URL}/projects/${projectId}/specs/${specId}`, {
    method: 'DELETE',
  });
}

export function addClarification(
  projectId: string,
  specId: string,
  marker: string,
  suggestion: string,
): Promise<ClarificationItemSchema> {
  return request<ClarificationItemSchema>(
    `${BASE_URL}/projects/${projectId}/specs/${specId}/clarifications`,
    {
      method: 'POST',
      body: JSON.stringify({ marker, suggestion }),
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
      method: 'PATCH',
      body: JSON.stringify({ resolution }),
    },
  );
}

export function rejectClarification(
  projectId: string,
  specId: string,
  itemId: string,
): Promise<SpecResponse> {
  return request<SpecResponse>(
    `${BASE_URL}/projects/${projectId}/specs/${specId}/clarifications/${itemId}/reject`,
    { method: 'PATCH' },
  );
}
