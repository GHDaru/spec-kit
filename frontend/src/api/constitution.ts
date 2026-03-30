/**
 * API client for the SpecForge Constitution Engine (Module 1).
 *
 * Covers the four REST endpoints:
 *   GET  /api/v1/projects/{projectId}/constitution
 *   POST /api/v1/projects/{projectId}/constitution
 *   POST /api/v1/projects/{projectId}/constitution/check
 *   GET  /api/v1/projects/{projectId}/constitution/history
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

// ──────────────────────────────────────────────────────────────────────────────
// Domain types (mirror the Pydantic schemas from specforge_api)
// ──────────────────────────────────────────────────────────────────────────────

export type EnforcementLevel = 'MUST' | 'SHOULD' | 'MAY';

export type PrincipleCategory =
  | 'architecture'
  | 'testing'
  | 'security'
  | 'performance'
  | 'workflow'
  | 'general';

export interface PrincipleSchema {
  name: string;
  description: string;
  enforcement_level: EnforcementLevel;
  category: PrincipleCategory;
}

export interface ConstitutionResponse {
  project_name: string;
  version: string;
  ratification_date: string | null;
  last_amended_date: string | null;
  principles: PrincipleSchema[];
}

export interface ConstitutionCreateRequest {
  project_name: string;
  principles: PrincipleSchema[];
}

export interface ComplianceViolationSchema {
  principle_name: string;
  enforcement_level: EnforcementLevel;
  message: string;
  line_number: number | null;
  is_blocking: boolean;
}

export interface ComplianceReportResponse {
  passed: boolean;
  blocking_violations: ComplianceViolationSchema[];
  warning_violations: ComplianceViolationSchema[];
  summary: string;
}

export interface AmendmentRecord {
  version: string;
  amended_date: string | null;
}

export interface ConstitutionHistoryResponse {
  project_name: string;
  amendments: AmendmentRecord[];
}

// ──────────────────────────────────────────────────────────────────────────────
// HTTP helpers
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
  return res.json() as Promise<T>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Endpoint functions
// ──────────────────────────────────────────────────────────────────────────────

export function getConstitution(projectId: string): Promise<ConstitutionResponse> {
  return request<ConstitutionResponse>(`${BASE_URL}/projects/${projectId}/constitution`);
}

export function createConstitution(
  projectId: string,
  body: ConstitutionCreateRequest,
): Promise<ConstitutionResponse> {
  return request<ConstitutionResponse>(`${BASE_URL}/projects/${projectId}/constitution`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function checkCompliance(
  projectId: string,
  artifactPath: string,
): Promise<ComplianceReportResponse> {
  return request<ComplianceReportResponse>(
    `${BASE_URL}/projects/${projectId}/constitution/check`,
    {
      method: 'POST',
      body: JSON.stringify({ artifact_path: artifactPath }),
    },
  );
}

export function getConstitutionHistory(
  projectId: string,
): Promise<ConstitutionHistoryResponse> {
  return request<ConstitutionHistoryResponse>(
    `${BASE_URL}/projects/${projectId}/constitution/history`,
  );
}
