/**
 * API client for the SpecForge Architecture Planner (Module 3).
 *
 * NOTE: The backend for this module is not yet implemented.
 * getDemoPlan() provides rich demo data so the UI is fully usable.
 *
 * Future endpoints:
 *   GET    /api/v1/projects/{projectId}/plans
 *   POST   /api/v1/projects/{projectId}/plans/{planId}
 *   GET    /api/v1/projects/{projectId}/plans/{planId}
 *   PATCH  /api/v1/projects/{projectId}/plans/{planId}/tech-stack
 *   POST   /api/v1/projects/{projectId}/plans/{planId}/compliance-check
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

// ── Domain types ──────────────────────────────────────────────────────────

export type TechCategory = 'language' | 'framework' | 'database' | 'infrastructure' | 'testing';
export type Recommendation = 'recommended' | 'alternative' | 'avoid';
export type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-many';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface TechChoice {
  id: string;
  name: string;
  category: TechCategory;
  version?: string;
  rationale: string;
  pros: string[];
  cons: string[];
  selected: boolean;
}

export interface DataField {
  name: string;
  type: string;
  nullable: boolean;
  primary_key?: boolean;
  foreign_key?: string;
  description?: string;
}

export interface DataEntity {
  id: string;
  name: string;
  description: string;
  fields: DataField[];
}

export interface Relationship {
  from_entity: string;
  to_entity: string;
  type: RelationshipType;
  label: string;
}

export interface DataModel {
  entities: DataEntity[];
  relationships: Relationship[];
}

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  description?: string;
  children?: FileNode[];
}

export interface ResearchFinding {
  option: string;
  summary: string;
  recommendation: Recommendation;
  sources: string[];
}

export interface ResearchReport {
  id: string;
  topic: string;
  summary: string;
  findings: ResearchFinding[];
  conclusion: string;
}

export interface StatusCode {
  code: number;
  description: string;
}

export interface APIEndpoint {
  method: HttpMethod;
  path: string;
  description: string;
  request_body?: string;
  response_schema: string;
  status_codes: StatusCode[];
}

export interface APIContract {
  title: string;
  version: string;
  base_url: string;
  endpoints: APIEndpoint[];
}

export interface PlanComplianceResult {
  passed: boolean;
  blocking_count: number;
  warning_count: number;
  violations: { principle: string; message: string; blocking: boolean }[];
}

export interface PlanSummary {
  plan_id: string;
  spec_id: string;
  title: string;
  version: string;
  created_date: string | null;
  tech_stack_count: number;
  entity_count: number;
  endpoint_count: number;
}

export interface PlanListResponse {
  project_id: string;
  plans: PlanSummary[];
}

export interface PlanResponse {
  plan_id: string;
  spec_id: string;
  title: string;
  description: string;
  version: string;
  created_date: string | null;
  tech_stack: TechChoice[];
  data_model: DataModel;
  project_structure: FileNode;
  research_reports: ResearchReport[];
  api_contract: APIContract;
}

// ── Demo data ─────────────────────────────────────────────────────────────

export function getDemoPlan(): PlanResponse {
  return {
    plan_id: 'auth-service-plan',
    spec_id: 'user-auth-spec',
    title: 'User Authentication Service',
    description:
      'Complete technical plan for a secure, scalable authentication service with JWT tokens, refresh token rotation, and OAuth 2.0 integration.',
    version: '1.0.0',
    created_date: '2026-04-01',
    tech_stack: [
      {
        id: 'python',
        name: 'Python 3.12',
        category: 'language',
        version: '3.12',
        rationale: 'Mature ecosystem, strong typing with mypy, excellent async support',
        pros: ['Large ecosystem', 'Type hints + mypy', 'FastAPI integration', 'Rapid development'],
        cons: ['GIL limitations', 'Slower than Go/Rust for CPU-bound tasks'],
        selected: true,
      },
      {
        id: 'fastapi',
        name: 'FastAPI',
        category: 'framework',
        version: '0.115',
        rationale: 'Native async, automatic OpenAPI docs, Pydantic v2 integration',
        pros: ['Auto-generated docs', 'Type-safe', 'High performance', 'Dependency injection'],
        cons: ['Smaller community than Django', 'Less built-in features'],
        selected: true,
      },
      {
        id: 'sqlalchemy',
        name: 'SQLAlchemy 2',
        category: 'framework',
        version: '2.0',
        rationale: 'Modern async ORM with excellent PostgreSQL support and Alembic migrations',
        pros: ['Async support', 'Type-safe queries', 'Migrations via Alembic'],
        cons: ['Steeper learning curve', 'Verbose for simple queries'],
        selected: true,
      },
      {
        id: 'postgresql',
        name: 'PostgreSQL',
        category: 'database',
        version: '16',
        rationale: 'ACID compliance, strong indexing, native JSON support for metadata',
        pros: ['ACID', 'Mature & battle-tested', 'JSON support', 'Full-text search'],
        cons: ['Vertical scaling limits', 'More complex than SQLite for dev'],
        selected: true,
      },
      {
        id: 'redis',
        name: 'Redis',
        category: 'infrastructure',
        version: '7',
        rationale: 'In-memory refresh token store with automatic TTL expiry',
        pros: ['Sub-millisecond ops', 'TTL support', 'Pub/Sub', 'Cluster mode'],
        cons: ['Memory-only (persistence optional)', 'Additional infrastructure to manage'],
        selected: true,
      },
      {
        id: 'pytest',
        name: 'pytest',
        category: 'testing',
        version: '8',
        rationale: 'Industry standard with rich plugin ecosystem and async support via pytest-asyncio',
        pros: ['Fixtures', 'Parametrize', 'Async support', 'Coverage integration'],
        cons: ['Setup overhead for complex fixture graphs'],
        selected: true,
      },
    ],
    data_model: {
      entities: [
        {
          id: 'user',
          name: 'User',
          description: 'Core user account entity',
          fields: [
            { name: 'id', type: 'UUID', nullable: false, primary_key: true },
            { name: 'email', type: 'VARCHAR(255)', nullable: false, description: 'Unique user email' },
            { name: 'password_hash', type: 'VARCHAR(255)', nullable: false },
            { name: 'is_active', type: 'BOOLEAN', nullable: false },
            { name: 'is_verified', type: 'BOOLEAN', nullable: false },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false },
            { name: 'updated_at', type: 'TIMESTAMP', nullable: false },
          ],
        },
        {
          id: 'refresh_token',
          name: 'RefreshToken',
          description: 'Rotated refresh tokens stored in Redis with automatic TTL',
          fields: [
            { name: 'token_hash', type: 'VARCHAR(64)', nullable: false, primary_key: true },
            { name: 'user_id', type: 'UUID', nullable: false, foreign_key: 'User.id' },
            { name: 'issued_at', type: 'TIMESTAMP', nullable: false },
            { name: 'expires_at', type: 'TIMESTAMP', nullable: false },
            { name: 'revoked', type: 'BOOLEAN', nullable: false },
          ],
        },
        {
          id: 'oauth_account',
          name: 'OAuthAccount',
          description: 'Linked OAuth 2.0 provider accounts (Google, GitHub, etc.)',
          fields: [
            { name: 'id', type: 'UUID', nullable: false, primary_key: true },
            { name: 'user_id', type: 'UUID', nullable: false, foreign_key: 'User.id' },
            {
              name: 'provider',
              type: 'VARCHAR(50)',
              nullable: false,
              description: 'google, github, etc.',
            },
            { name: 'provider_user_id', type: 'VARCHAR(255)', nullable: false },
            { name: 'access_token', type: 'TEXT', nullable: true },
            { name: 'linked_at', type: 'TIMESTAMP', nullable: false },
          ],
        },
        {
          id: 'audit_log',
          name: 'AuditLog',
          description: 'Security event log for all authentication actions',
          fields: [
            { name: 'id', type: 'BIGSERIAL', nullable: false, primary_key: true },
            { name: 'user_id', type: 'UUID', nullable: true, foreign_key: 'User.id' },
            {
              name: 'event_type',
              type: 'VARCHAR(50)',
              nullable: false,
              description: 'login, logout, failed_login, token_refresh…',
            },
            { name: 'ip_address', type: 'INET', nullable: true },
            { name: 'user_agent', type: 'TEXT', nullable: true },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false },
          ],
        },
      ],
      relationships: [
        { from_entity: 'User', to_entity: 'RefreshToken', type: 'one-to-many', label: 'has many' },
        { from_entity: 'User', to_entity: 'OAuthAccount', type: 'one-to-many', label: 'has many' },
        { from_entity: 'User', to_entity: 'AuditLog', type: 'one-to-many', label: 'generates' },
      ],
    },
    project_structure: {
      name: 'auth-service',
      type: 'directory',
      description: 'Root project directory',
      children: [
        {
          name: 'src',
          type: 'directory',
          description: 'Application source code',
          children: [
            {
              name: 'auth',
              type: 'directory',
              description: 'Core authentication module',
              children: [
                { name: '__init__.py', type: 'file' },
                { name: 'models.py', type: 'file', description: 'SQLAlchemy ORM models' },
                { name: 'schemas.py', type: 'file', description: 'Pydantic request/response schemas' },
                { name: 'router.py', type: 'file', description: 'FastAPI route handlers' },
                { name: 'service.py', type: 'file', description: 'Business logic layer' },
                { name: 'security.py', type: 'file', description: 'JWT signing, Argon2 hashing' },
                { name: 'dependencies.py', type: 'file', description: 'FastAPI dependency injection' },
              ],
            },
            {
              name: 'oauth',
              type: 'directory',
              description: 'OAuth 2.0 provider integrations',
              children: [
                { name: '__init__.py', type: 'file' },
                { name: 'base.py', type: 'file', description: 'Abstract OAuth provider interface' },
                { name: 'google.py', type: 'file', description: 'Google OAuth 2.0 flow' },
                { name: 'github.py', type: 'file', description: 'GitHub OAuth flow' },
              ],
            },
            {
              name: 'database',
              type: 'directory',
              description: 'Database configuration and Alembic migrations',
              children: [
                { name: '__init__.py', type: 'file' },
                { name: 'session.py', type: 'file', description: 'Async SQLAlchemy session factory' },
                {
                  name: 'migrations',
                  type: 'directory',
                  description: 'Alembic migration scripts',
                  children: [
                    { name: 'env.py', type: 'file' },
                    { name: 'versions', type: 'directory', children: [] },
                  ],
                },
              ],
            },
            { name: 'main.py', type: 'file', description: 'FastAPI app factory and startup events' },
            {
              name: 'config.py',
              type: 'file',
              description: 'Environment-based configuration (pydantic-settings)',
            },
          ],
        },
        {
          name: 'tests',
          type: 'directory',
          description: 'Test suite (pytest)',
          children: [
            { name: 'conftest.py', type: 'file', description: 'Shared fixtures and test DB setup' },
            {
              name: 'test_auth.py',
              type: 'file',
              description: 'Auth endpoint integration tests',
            },
            { name: 'test_oauth.py', type: 'file', description: 'OAuth flow integration tests' },
            {
              name: 'test_security.py',
              type: 'file',
              description: 'JWT and hashing unit tests',
            },
          ],
        },
        { name: 'pyproject.toml', type: 'file', description: 'Project metadata and dependencies' },
        { name: 'Dockerfile', type: 'file', description: 'Production container image' },
        {
          name: 'docker-compose.yml',
          type: 'file',
          description: 'Local dev stack (app + postgres + redis)',
        },
        { name: '.env.example', type: 'file', description: 'Required environment variables template' },
        { name: 'README.md', type: 'file', description: 'Setup guide and API reference' },
      ],
    },
    research_reports: [
      {
        id: 'rr-001',
        topic: 'JWT vs Session-based Authentication',
        summary:
          'Evaluated stateless JWT tokens versus server-side sessions for the core authentication strategy.',
        findings: [
          {
            option: 'JWT with Refresh Token Rotation',
            summary:
              'Stateless access tokens (15 min TTL) with rotating refresh tokens stored in Redis. Industry standard for microservices and SPAs.',
            recommendation: 'recommended',
            sources: [
              'RFC 9068 — JWT Profile for OAuth 2.0 Access Tokens',
              'OWASP JWT Security Cheat Sheet',
            ],
          },
          {
            option: 'Server-side Sessions (Redis)',
            summary:
              'Full session state in Redis, validated on every request. Simpler revocation but adds a network hop per request.',
            recommendation: 'alternative',
            sources: ['OWASP Session Management Cheat Sheet'],
          },
          {
            option: 'Opaque Tokens (DB lookup)',
            summary:
              'Random token IDs looked up in the database on every request. Guaranteed instant revocation but high DB load at scale.',
            recommendation: 'avoid',
            sources: ['Auth0 Token Best Practices'],
          },
        ],
        conclusion:
          'Adopt JWT + refresh token rotation. Provides scalability (stateless access tokens reduce DB load) with security (short-lived access tokens, revokable refresh tokens via Redis TTL).',
      },
      {
        id: 'rr-002',
        topic: 'Password Hashing Algorithm',
        summary:
          'Compared modern password hashing algorithms for the best security-to-performance balance.',
        findings: [
          {
            option: 'Argon2id',
            summary:
              'Winner of the Password Hashing Competition (2015). Memory-hard, resistant to GPU and ASIC attacks. Python library: argon2-cffi.',
            recommendation: 'recommended',
            sources: ['OWASP Password Storage Cheat Sheet', 'RFC 9106 — Argon2'],
          },
          {
            option: 'bcrypt',
            summary:
              'Battle-tested since 1999. CPU-bound but lacks memory-hardness. Still acceptable for most use cases where Argon2 is unavailable.',
            recommendation: 'alternative',
            sources: ['NIST SP 800-63B'],
          },
          {
            option: 'SHA-256 (plain)',
            summary:
              'Not a password hashing algorithm. Extremely fast → trivially brute-forceable. Never use for password storage.',
            recommendation: 'avoid',
            sources: ['OWASP Cryptographic Storage Cheat Sheet'],
          },
        ],
        conclusion:
          'Use Argon2id with OWASP-recommended parameters (m=65536, t=3, p=4). Fall back to bcrypt only for legacy system compatibility.',
      },
    ],
    api_contract: {
      title: 'Auth Service API',
      version: '1.0.0',
      base_url: '/api/v1/auth',
      endpoints: [
        {
          method: 'POST',
          path: '/register',
          description: 'Register a new user account',
          request_body: '{ "email": "string", "password": "string" }',
          response_schema: '{ "user_id": "uuid", "email": "string", "is_verified": false }',
          status_codes: [
            { code: 201, description: 'User created successfully' },
            { code: 409, description: 'Email already registered' },
            { code: 422, description: 'Validation error (weak password, invalid email)' },
          ],
        },
        {
          method: 'POST',
          path: '/login',
          description: 'Authenticate with email and password — returns JWT token pair',
          request_body: '{ "email": "string", "password": "string" }',
          response_schema:
            '{ "access_token": "string", "refresh_token": "string", "token_type": "bearer" }',
          status_codes: [
            { code: 200, description: 'Authentication successful' },
            { code: 401, description: 'Invalid credentials' },
            { code: 429, description: 'Rate limit exceeded' },
          ],
        },
        {
          method: 'POST',
          path: '/refresh',
          description: 'Exchange refresh token for a new access + refresh token pair (rotation)',
          request_body: '{ "refresh_token": "string" }',
          response_schema:
            '{ "access_token": "string", "refresh_token": "string", "token_type": "bearer" }',
          status_codes: [
            { code: 200, description: 'Tokens refreshed' },
            { code: 401, description: 'Invalid or expired refresh token' },
          ],
        },
        {
          method: 'POST',
          path: '/logout',
          description: 'Revoke refresh token and invalidate the session',
          request_body: '{ "refresh_token": "string" }',
          response_schema: '{}',
          status_codes: [
            { code: 204, description: 'Logged out successfully' },
            { code: 401, description: 'Invalid token' },
          ],
        },
        {
          method: 'GET',
          path: '/me',
          description: 'Get the current authenticated user profile (requires Bearer token)',
          response_schema:
            '{ "user_id": "uuid", "email": "string", "is_verified": "boolean", "created_at": "string" }',
          status_codes: [
            { code: 200, description: 'User profile returned' },
            { code: 401, description: 'Not authenticated' },
          ],
        },
        {
          method: 'POST',
          path: '/verify-email',
          description: 'Verify email address with the token sent via email',
          request_body: '{ "token": "string" }',
          response_schema: '{ "verified": true }',
          status_codes: [
            { code: 200, description: 'Email verified successfully' },
            { code: 400, description: 'Invalid or expired verification token' },
          ],
        },
        {
          method: 'POST',
          path: '/oauth/{provider}/callback',
          description: 'Handle OAuth 2.0 provider callback (supported: google, github)',
          request_body: '{ "code": "string", "state": "string" }',
          response_schema:
            '{ "access_token": "string", "refresh_token": "string", "token_type": "bearer" }',
          status_codes: [
            { code: 200, description: 'OAuth login / account linking successful' },
            { code: 400, description: 'Invalid OAuth callback state' },
          ],
        },
      ],
    },
  };
}

// ── HTTP helper ───────────────────────────────────────────────────────────

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

// ── Endpoint functions ────────────────────────────────────────────────────

export function listPlans(projectId: string): Promise<PlanListResponse> {
  return request<PlanListResponse>(`${BASE_URL}/projects/${projectId}/plans`);
}

export function getPlan(projectId: string, planId: string): Promise<PlanResponse> {
  return request<PlanResponse>(`${BASE_URL}/projects/${projectId}/plans/${planId}`);
}
