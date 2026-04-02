/**
 * API client for the SpecForge Architecture Planner (Module 3).
 *
 * REST endpoints (to be implemented on the backend):
 *   POST /api/v1/projects/{projectId}/plan/generate
 *   GET  /api/v1/projects/{projectId}/plan
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

// ──────────────────────────────────────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────────────────────────────────────

export type TechCategory =
  | 'language'
  | 'framework'
  | 'database'
  | 'infrastructure'
  | 'testing';

export interface TechOption {
  id: string;
  name: string;
  category: TechCategory;
  description: string;
  pros: string[];
  cons: string[];
  github_stars: number;
  weekly_downloads?: number;
  license: string;
  selected: boolean;
}

export interface EntityField {
  name: string;
  type: string;
  required: boolean;
  primary_key?: boolean;
  foreign_key?: string;
}

export interface Entity {
  name: string;
  description: string;
  fields: EntityField[];
}

export type Cardinality = 'one-to-one' | 'one-to-many' | 'many-to-many';

export interface Relationship {
  from_entity: string;
  to_entity: string;
  cardinality: Cardinality;
  label?: string;
}

export interface DataModel {
  entities: Entity[];
  relationships: Relationship[];
}

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  annotation?: string;
  children?: FileNode[];
}

export interface ProjectStructure {
  root: FileNode;
}

export interface ResearchOption {
  name: string;
  version: string;
  pros: string[];
  cons: string[];
  source_url: string;
}

export interface ResearchReport {
  topic: string;
  summary: string;
  options: ResearchOption[];
  recommendation: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface APIEndpoint {
  method: HttpMethod;
  path: string;
  summary: string;
  tags: string[];
  request_body?: string;
  response?: string;
}

export interface APIContract {
  title: string;
  version: string;
  base_path: string;
  endpoints: APIEndpoint[];
}

export interface PlanComplianceResult {
  passed: boolean;
  blocking_count: number;
  warning_count: number;
  violations: { principle: string; message: string; blocking: boolean }[];
}

export interface Plan {
  project_id: string;
  project_name: string;
  created_at: string;
  tech_stack: TechOption[];
  data_model: DataModel;
  project_structure: ProjectStructure;
  research_reports: ResearchReport[];
  api_contract: APIContract;
  compliance: PlanComplianceResult;
}

export interface GeneratePlanRequest {
  project_id: string;
  tech_preferences?: string[];
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
  return res.json() as Promise<T>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Endpoint functions
// ──────────────────────────────────────────────────────────────────────────────

export function generatePlan(body: GeneratePlanRequest): Promise<Plan> {
  return request<Plan>(`${BASE_URL}/projects/${body.project_id}/plan/generate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getPlan(projectId: string): Promise<Plan> {
  return request<Plan>(`${BASE_URL}/projects/${projectId}/plan`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Demo data (used when the backend is not yet available)
// ──────────────────────────────────────────────────────────────────────────────

export function getDemoPlan(projectId: string): Plan {
  return {
    project_id: projectId,
    project_name: projectId
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    created_at: new Date().toISOString(),
    tech_stack: [
      {
        id: 'python',
        name: 'Python 3.12',
        category: 'language',
        description: 'Primary implementation language.',
        pros: ['Huge ecosystem', 'Readable syntax', 'Strong AI/ML libraries'],
        cons: ['GIL limits true multi-threading', 'Slower than compiled languages'],
        github_stars: 62000,
        weekly_downloads: 12000000,
        license: 'PSF-2.0',
        selected: true,
      },
      {
        id: 'fastapi',
        name: 'FastAPI',
        category: 'framework',
        description: 'Async REST framework with auto-generated OpenAPI docs.',
        pros: ['Auto OpenAPI docs', 'Pydantic validation', 'High performance'],
        cons: ['Smaller ecosystem than Django', 'Less batteries-included'],
        github_stars: 80000,
        weekly_downloads: 6000000,
        license: 'MIT',
        selected: true,
      },
      {
        id: 'postgresql',
        name: 'PostgreSQL 16',
        category: 'database',
        description: 'Relational database for persistent storage.',
        pros: ['ACID compliant', 'JSONB support', 'Full-text search'],
        cons: ['Operational overhead', 'Vertical scaling limits'],
        github_stars: 16000,
        weekly_downloads: undefined,
        license: 'PostgreSQL',
        selected: true,
      },
      {
        id: 'react',
        name: 'React 19',
        category: 'framework',
        description: 'Frontend UI library.',
        pros: ['Massive ecosystem', 'Component reuse', 'React Server Components'],
        cons: ['Context re-renders', 'No built-in state manager'],
        github_stars: 230000,
        weekly_downloads: 25000000,
        license: 'MIT',
        selected: true,
      },
      {
        id: 'pytest',
        name: 'pytest',
        category: 'testing',
        description: 'Python testing framework.',
        pros: ['Fixture system', 'Parametrize', 'Great plugins'],
        cons: ['Can be slow on large suites without parallelism'],
        github_stars: 12000,
        weekly_downloads: 8000000,
        license: 'MIT',
        selected: true,
      },
      {
        id: 'docker',
        name: 'Docker + Compose',
        category: 'infrastructure',
        description: 'Container runtime for reproducible deployments.',
        pros: ['Environment parity', 'Easy local setup', 'CI/CD integration'],
        cons: ['Overhead vs bare metal', 'Image size management'],
        github_stars: 29000,
        weekly_downloads: undefined,
        license: 'Apache-2.0',
        selected: true,
      },
    ],
    data_model: {
      entities: [
        {
          name: 'Project',
          description: 'Represents a software project.',
          fields: [
            { name: 'id', type: 'UUID', required: true, primary_key: true },
            { name: 'name', type: 'string', required: true },
            { name: 'description', type: 'string', required: false },
            { name: 'created_at', type: 'datetime', required: true },
          ],
        },
        {
          name: 'Specification',
          description: 'A versioned specification document for a project.',
          fields: [
            { name: 'id', type: 'UUID', required: true, primary_key: true },
            {
              name: 'project_id',
              type: 'UUID',
              required: true,
              foreign_key: 'Project.id',
            },
            { name: 'version', type: 'string', required: true },
            { name: 'content', type: 'text', required: true },
            { name: 'status', type: 'enum(Draft,Review,Final)', required: true },
            { name: 'created_at', type: 'datetime', required: true },
          ],
        },
        {
          name: 'Plan',
          description: 'Architecture plan generated from a specification.',
          fields: [
            { name: 'id', type: 'UUID', required: true, primary_key: true },
            {
              name: 'spec_id',
              type: 'UUID',
              required: true,
              foreign_key: 'Specification.id',
            },
            { name: 'tech_stack', type: 'JSONB', required: true },
            { name: 'compliance_passed', type: 'boolean', required: true },
            { name: 'created_at', type: 'datetime', required: true },
          ],
        },
        {
          name: 'ResearchReport',
          description: 'AI-generated research report linked to a plan.',
          fields: [
            { name: 'id', type: 'UUID', required: true, primary_key: true },
            {
              name: 'plan_id',
              type: 'UUID',
              required: true,
              foreign_key: 'Plan.id',
            },
            { name: 'topic', type: 'string', required: true },
            { name: 'recommendation', type: 'text', required: true },
            { name: 'options', type: 'JSONB', required: true },
          ],
        },
      ],
      relationships: [
        { from_entity: 'Project', to_entity: 'Specification', cardinality: 'one-to-many', label: 'has' },
        { from_entity: 'Specification', to_entity: 'Plan', cardinality: 'one-to-many', label: 'generates' },
        { from_entity: 'Plan', to_entity: 'ResearchReport', cardinality: 'one-to-many', label: 'contains' },
      ],
    },
    project_structure: {
      root: {
        name: projectId,
        type: 'directory',
        annotation: 'Project root',
        children: [
          {
            name: 'src',
            type: 'directory',
            annotation: 'Application source code',
            children: [
              {
                name: 'api',
                type: 'directory',
                annotation: 'FastAPI routers and schemas',
                children: [
                  { name: 'main.py', type: 'file', annotation: 'App factory' },
                  { name: 'routers', type: 'directory', children: [
                    { name: 'projects.py', type: 'file' },
                    { name: 'specs.py', type: 'file' },
                    { name: 'plans.py', type: 'file' },
                  ]},
                  { name: 'schemas', type: 'directory', children: [
                    { name: 'project.py', type: 'file' },
                    { name: 'spec.py', type: 'file' },
                    { name: 'plan.py', type: 'file' },
                  ]},
                ],
              },
              {
                name: 'domain',
                type: 'directory',
                annotation: 'Core business logic',
                children: [
                  { name: 'project.py', type: 'file' },
                  { name: 'specification.py', type: 'file' },
                  { name: 'plan.py', type: 'file' },
                ],
              },
            ],
          },
          {
            name: 'frontend',
            type: 'directory',
            annotation: 'React + Vite UI',
            children: [
              { name: 'src', type: 'directory', children: [
                { name: 'App.tsx', type: 'file' },
                { name: 'api', type: 'directory' },
                { name: 'modules', type: 'directory' },
              ]},
              { name: 'package.json', type: 'file' },
              { name: 'vite.config.ts', type: 'file' },
            ],
          },
          {
            name: 'tests',
            type: 'directory',
            annotation: 'Pytest test suite',
            children: [
              { name: 'test_projects.py', type: 'file' },
              { name: 'test_specs.py', type: 'file' },
              { name: 'test_plans.py', type: 'file' },
            ],
          },
          { name: 'pyproject.toml', type: 'file', annotation: 'Python project metadata' },
          { name: 'docker-compose.yml', type: 'file', annotation: 'Local dev services' },
          { name: 'README.md', type: 'file' },
        ],
      },
    },
    research_reports: [
      {
        topic: 'Python Web Framework Selection',
        summary:
          'Evaluated FastAPI, Django REST Framework, and Flask for the REST API layer.',
        options: [
          {
            name: 'FastAPI',
            version: '0.115',
            pros: ['Async-first', 'Auto OpenAPI', 'Pydantic v2 built-in'],
            cons: ['Smaller community than Django', 'Manual auth setup'],
            source_url: 'https://fastapi.tiangolo.com',
          },
          {
            name: 'Django REST Framework',
            version: '3.15',
            pros: ['Batteries-included', 'Large community', 'Admin panel'],
            cons: ['Synchronous by default', 'More boilerplate'],
            source_url: 'https://www.django-rest-framework.org',
          },
          {
            name: 'Flask',
            version: '3.1',
            pros: ['Minimalist', 'Easy to learn', 'Flexible'],
            cons: ['Manual everything', 'No OpenAPI generation'],
            source_url: 'https://flask.palletsprojects.com',
          },
        ],
        recommendation:
          'FastAPI — best fit for async workloads, automatic OpenAPI documentation, and Pydantic v2 validation already used in the constitution engine.',
      },
      {
        topic: 'Database Selection',
        summary:
          'Evaluated PostgreSQL, SQLite, and MongoDB for structured persistence.',
        options: [
          {
            name: 'PostgreSQL',
            version: '16',
            pros: ['ACID', 'JSONB for flexible schemas', 'Full-text search'],
            cons: ['Operational overhead', 'Not serverless natively'],
            source_url: 'https://www.postgresql.org',
          },
          {
            name: 'SQLite',
            version: '3.45',
            pros: ['Zero config', 'File-based', 'Great for local dev'],
            cons: ['Limited concurrency', 'Not suitable for production scale'],
            source_url: 'https://www.sqlite.org',
          },
          {
            name: 'MongoDB',
            version: '7',
            pros: ['Flexible schema', 'Document model', 'Atlas cloud option'],
            cons: ['No ACID across collections', 'Schema management harder'],
            source_url: 'https://www.mongodb.com',
          },
        ],
        recommendation:
          'PostgreSQL — strong ACID guarantees, JSONB for semi-structured data (tech stack, research options), and excellent SQLAlchemy support.',
      },
      {
        topic: 'Frontend Testing Strategy',
        summary: 'Evaluated Vitest, Jest, and Playwright for frontend testing.',
        options: [
          {
            name: 'Vitest',
            version: '2.1',
            pros: ['Native Vite integration', 'Fast HMR-aware tests', 'Jest-compatible API'],
            cons: ['Younger ecosystem than Jest'],
            source_url: 'https://vitest.dev',
          },
          {
            name: 'Jest',
            version: '29',
            pros: ['Mature ecosystem', 'Huge plugin library'],
            cons: ['Slower with Vite projects', 'Extra config needed'],
            source_url: 'https://jestjs.io',
          },
          {
            name: 'Playwright',
            version: '1.44',
            pros: ['E2E cross-browser', 'Codegen', 'Visual comparison'],
            cons: ['Not for unit tests', 'Slower to run'],
            source_url: 'https://playwright.dev',
          },
        ],
        recommendation:
          'Vitest for unit/integration tests (already aligned with Vite build) + Playwright for end-to-end tests.',
      },
    ],
    api_contract: {
      title: `${projectId} API`,
      version: '1.0.0',
      base_path: '/api/v1',
      endpoints: [
        { method: 'GET', path: '/projects', summary: 'List all projects', tags: ['projects'], response: 'Project[]' },
        { method: 'POST', path: '/projects', summary: 'Create a new project', tags: ['projects'], request_body: 'ProjectCreateRequest', response: 'Project' },
        { method: 'GET', path: '/projects/{projectId}', summary: 'Get project details', tags: ['projects'], response: 'Project' },
        { method: 'GET', path: '/projects/{projectId}/specs', summary: 'List project specifications', tags: ['specs'], response: 'Specification[]' },
        { method: 'POST', path: '/projects/{projectId}/specs', summary: 'Create a specification', tags: ['specs'], request_body: 'SpecificationCreateRequest', response: 'Specification' },
        { method: 'GET', path: '/projects/{projectId}/plan', summary: 'Get architecture plan', tags: ['plans'], response: 'Plan' },
        { method: 'POST', path: '/projects/{projectId}/plan/generate', summary: 'Generate architecture plan from spec', tags: ['plans'], request_body: 'GeneratePlanRequest', response: 'Plan' },
        { method: 'GET', path: '/projects/{projectId}/plan/compliance', summary: 'Check plan against constitution', tags: ['plans', 'compliance'], response: 'ComplianceReport' },
      ],
    },
    compliance: {
      passed: true,
      blocking_count: 0,
      warning_count: 1,
      violations: [
        {
          principle: 'Documentation Coverage',
          message: 'API contract lacks response schema for 4xx error codes — consider adding RFC 7807 Problem Details.',
          blocking: false,
        },
      ],
    },
  };
}
