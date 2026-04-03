/**
 * API client for the SpecForge Quality Guardian module (Module 7).
 *
 * Endpoints:
 *   GET    /api/v1/projects/{projectId}/quality/checklists
 *   POST   /api/v1/projects/{projectId}/quality/checklists
 *   GET    /api/v1/projects/{projectId}/quality/checklists/{checklistId}
 *   PUT    /api/v1/projects/{projectId}/quality/checklists/{checklistId}/items/{itemId}
 *   DELETE /api/v1/projects/{projectId}/quality/checklists/{checklistId}
 *   GET    /api/v1/projects/{projectId}/quality/test-suites
 *   POST   /api/v1/projects/{projectId}/quality/test-suites
 *   GET    /api/v1/projects/{projectId}/quality/test-suites/{suiteId}
 *   GET    /api/v1/projects/{projectId}/quality/reports
 *   POST   /api/v1/projects/{projectId}/quality/reports
 */

const BASE = '/api/v1';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type ChecklistItemStatus = 'pass' | 'fail' | 'skip' | 'pending';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type TestCaseType = 'unit' | 'integration' | 'contract' | 'e2e';

export const CHECKLIST_STATUS_COLOR: Record<ChecklistItemStatus, string> = {
  pass: '#059669',
  fail: '#dc2626',
  skip: '#ca8a04',
  pending: '#6b7280',
};

export const CHECKLIST_STATUS_ICON: Record<ChecklistItemStatus, string> = {
  pass: '✅',
  fail: '❌',
  skip: '⏭️',
  pending: '⏳',
};

export const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  critical: '#7f1d1d',
  high: '#dc2626',
  medium: '#ca8a04',
  low: '#2563eb',
  info: '#6b7280',
};

export const SEVERITY_BG: Record<SeverityLevel, string> = {
  critical: '#fef2f2',
  high: '#fef2f2',
  medium: '#fefce8',
  low: '#eff6ff',
  info: '#f3f4f6',
};

export const TEST_TYPE_COLOR: Record<TestCaseType, string> = {
  unit: '#7c3aed',
  integration: '#2563eb',
  contract: '#059669',
  e2e: '#ca8a04',
};

export const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export interface ChecklistItem {
  item_id: string;
  category: string;
  description: string;
  status: ChecklistItemStatus;
  notes: string;
}

export interface Checklist {
  checklist_id: string;
  project_id: string;
  title: string;
  spec_id: string | null;
  created_at: string;
  items: ChecklistItem[];
}

export interface ChecklistListResponse {
  project_id: string;
  checklists: Checklist[];
}

export interface TestCase {
  case_id: string;
  title: string;
  type: TestCaseType;
  description: string;
  acceptance_criteria: string[];
  status: 'draft' | 'active' | 'deprecated';
}

export interface TestSuite {
  suite_id: string;
  project_id: string;
  title: string;
  spec_id: string | null;
  created_at: string;
  test_cases: TestCase[];
}

export interface TestSuiteListResponse {
  project_id: string;
  suites: TestSuite[];
}

export interface AnalysisFinding {
  finding_id: string;
  severity: SeverityLevel;
  artifact_type: string;
  artifact_id: string;
  title: string;
  description: string;
  recommendation: string;
}

export interface AnalysisReport {
  report_id: string;
  project_id: string;
  created_at: string;
  summary: string;
  overall_score: number;
  findings: AnalysisFinding[];
}

export interface AnalysisReportListResponse {
  project_id: string;
  reports: AnalysisReport[];
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

export function listChecklists(projectId: string): Promise<ChecklistListResponse> {
  return request(`${BASE}/projects/${projectId}/quality/checklists`);
}

export function createChecklist(
  projectId: string,
  body: Pick<Checklist, 'title'> & Partial<Pick<Checklist, 'spec_id'>>
): Promise<Checklist> {
  return request(`${BASE}/projects/${projectId}/quality/checklists`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getChecklist(projectId: string, checklistId: string): Promise<Checklist> {
  return request(`${BASE}/projects/${projectId}/quality/checklists/${checklistId}`);
}

export function updateChecklistItem(
  projectId: string,
  checklistId: string,
  itemId: string,
  body: Partial<Pick<ChecklistItem, 'status' | 'notes'>>
): Promise<ChecklistItem> {
  return request(
    `${BASE}/projects/${projectId}/quality/checklists/${checklistId}/items/${itemId}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );
}

export function deleteChecklist(projectId: string, checklistId: string): Promise<void> {
  return request(`${BASE}/projects/${projectId}/quality/checklists/${checklistId}`, {
    method: 'DELETE',
  });
}

export function listTestSuites(projectId: string): Promise<TestSuiteListResponse> {
  return request(`${BASE}/projects/${projectId}/quality/test-suites`);
}

export function createTestSuite(
  projectId: string,
  body: Pick<TestSuite, 'title'> & Partial<Pick<TestSuite, 'spec_id'>>
): Promise<TestSuite> {
  return request(`${BASE}/projects/${projectId}/quality/test-suites`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getTestSuite(projectId: string, suiteId: string): Promise<TestSuite> {
  return request(`${BASE}/projects/${projectId}/quality/test-suites/${suiteId}`);
}

export function listAnalysisReports(projectId: string): Promise<AnalysisReportListResponse> {
  return request(`${BASE}/projects/${projectId}/quality/reports`);
}

export function createAnalysisReport(
  projectId: string,
  body: { summary: string }
): Promise<AnalysisReport> {
  return request(`${BASE}/projects/${projectId}/quality/reports`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

export function getDemoChecklist(): Checklist {
  return {
    checklist_id: 'demo-checklist-001',
    project_id: 'demo-project',
    title: 'Module 7 Quality Checklist',
    spec_id: 'spec-demo',
    created_at: '2026-04-10T08:00:00Z',
    items: [
      // Specification
      { item_id: 'i-001', category: 'Specification', description: 'All user stories have acceptance criteria', status: 'pass', notes: '' },
      { item_id: 'i-002', category: 'Specification', description: 'Non-functional requirements documented', status: 'pass', notes: '' },
      { item_id: 'i-003', category: 'Specification', description: 'Edge cases identified and documented', status: 'fail', notes: 'Missing error state scenarios for OAuth flow' },
      // Architecture
      { item_id: 'i-004', category: 'Architecture', description: 'API contracts defined for all public endpoints', status: 'pass', notes: '' },
      { item_id: 'i-005', category: 'Architecture', description: 'Data model reviewed for normalization', status: 'pass', notes: '' },
      { item_id: 'i-006', category: 'Architecture', description: 'Security threat model completed', status: 'pending', notes: '' },
      // Testing
      { item_id: 'i-007', category: 'Testing', description: 'Unit test coverage ≥ 80%', status: 'pass', notes: 'Coverage at 87%' },
      { item_id: 'i-008', category: 'Testing', description: 'Integration tests for all API endpoints', status: 'fail', notes: 'Missing tests for DELETE /sessions endpoint' },
      { item_id: 'i-009', category: 'Testing', description: 'E2E happy-path scenarios automated', status: 'skip', notes: 'Deferred to next sprint' },
      // Deployment
      { item_id: 'i-010', category: 'Deployment', description: 'CI/CD pipeline configured', status: 'pass', notes: '' },
      { item_id: 'i-011', category: 'Deployment', description: 'Environment variables documented in README', status: 'pending', notes: '' },
    ],
  };
}

export function getDemoTestSuite(): TestSuite {
  return {
    suite_id: 'demo-suite-001',
    project_id: 'demo-project',
    title: 'Core Domain Test Suite',
    spec_id: 'spec-demo',
    created_at: '2026-04-10T08:30:00Z',
    test_cases: [
      {
        case_id: 'tc-001',
        title: 'Session creation with valid payload',
        type: 'unit',
        description: 'Verify that creating a session with all required fields returns a valid session object.',
        acceptance_criteria: ['Returns session_id', 'Status is idle', 'started_at is set'],
        status: 'active',
      },
      {
        case_id: 'tc-002',
        title: 'Session status transition: idle → running',
        type: 'unit',
        description: 'Verify that a session can transition from idle to running status.',
        acceptance_criteria: ['Status updates to running', 'Timestamp recorded'],
        status: 'active',
      },
      {
        case_id: 'tc-003',
        title: 'GET /sessions returns all project sessions',
        type: 'integration',
        description: 'Verify that listing sessions for a project returns all created sessions.',
        acceptance_criteria: ['Returns array of sessions', 'Correct project_id filter applied'],
        status: 'active',
      },
      {
        case_id: 'tc-004',
        title: 'API contract: POST /sessions schema validation',
        type: 'contract',
        description: 'Validate request and response schemas match the OpenAPI specification.',
        acceptance_criteria: ['Request schema validated', 'Response schema validated', 'Error schema validated'],
        status: 'active',
      },
      {
        case_id: 'tc-005',
        title: 'User can create and execute a session end-to-end',
        type: 'e2e',
        description: 'Full user journey: create session, add task results, mark complete, view summary.',
        acceptance_criteria: ['Session created via UI', 'Tasks added and tracked', 'Summary visible', 'Status reflects completion'],
        status: 'active',
      },
      {
        case_id: 'tc-006',
        title: 'Compliance report linked to task result',
        type: 'integration',
        description: 'Verify that a compliance report is correctly linked to its parent task result.',
        acceptance_criteria: ['compliance_report_id set on task result', 'Report retrievable via result reference'],
        status: 'draft',
      },
    ],
  };
}

export function getDemoAnalysisReport(): AnalysisReport {
  return {
    report_id: 'demo-report-001',
    project_id: 'demo-project',
    created_at: '2026-04-10T09:00:00Z',
    summary: 'Overall quality is good. Three findings require attention before release.',
    overall_score: 74,
    findings: [
      {
        finding_id: 'f-001',
        severity: 'critical',
        artifact_type: 'Specification',
        artifact_id: 'spec-demo',
        title: 'Missing error handling spec for OAuth callback',
        description: 'The specification does not define behaviour when the OAuth provider returns an error code during the callback phase.',
        recommendation: 'Add a dedicated error scenario section covering provider errors, token expiry, and network failures.',
      },
      {
        finding_id: 'f-002',
        severity: 'high',
        artifact_type: 'Test Suite',
        artifact_id: 'suite-001',
        title: 'DELETE endpoint has no integration tests',
        description: 'The DELETE /sessions/{sessionId} endpoint is not covered by any integration test, leaving a gap in regression protection.',
        recommendation: 'Add at least two integration tests: one for successful deletion and one for deleting a non-existent resource (404).',
      },
      {
        finding_id: 'f-003',
        severity: 'medium',
        artifact_type: 'Architecture Plan',
        artifact_id: 'plan-demo',
        title: 'Security threat model not completed',
        description: 'The threat model section of the architecture plan is marked as pending. Auth flows and data storage have not been assessed.',
        recommendation: 'Complete the STRIDE threat model before the security review milestone.',
      },
      {
        finding_id: 'f-004',
        severity: 'low',
        artifact_type: 'Specification',
        artifact_id: 'spec-demo',
        title: 'Non-functional requirements lack measurable thresholds',
        description: 'Performance requirements state "fast response times" without defining specific latency targets.',
        recommendation: 'Update NFRs with measurable SLOs, e.g. p99 latency < 200 ms.',
      },
      {
        finding_id: 'f-005',
        severity: 'info',
        artifact_type: 'Task List',
        artifact_id: 'tasks-demo',
        title: 'E2E tests deferred to next sprint',
        description: 'The E2E test suite item was marked as skipped with a note to defer. This is documented and accepted.',
        recommendation: 'Ensure the deferred item is tracked in the next sprint backlog.',
      },
    ],
  };
}
