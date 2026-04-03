# Feature Specification: Module 4 — Task Forge

**Feature Branch**: `004-module-4-task-forge`
**Created**: 2026-04-03
**Updated**: 2026-04-03
**Status**: Draft — Detailed Spec with DDD Domains, User Stories & Requirements
**Parent Spec**: `specs/000-specforge-ai-case-tool/spec.md`
**Implementation**:
- `src/specify_cli/tasks.py` (domain model — complete)
- `src/specforge_api/routers/tasks.py` (REST layer — complete, 10 endpoints)
- `src/specforge_api/schemas/tasks.py` (Pydantic schemas — complete)
- `tests/test_tasks_api.py` (36 integration tests — complete)
- `frontend/src/api/tasks.ts` (API client — complete)
- `frontend/src/modules/tasks/` (React components — complete)

---

## 1. Module Overview

**Module 4 — Task Forge** is the task orchestration and management layer of SpecForge. It consumes the implementation plan produced by Module 3 (Architecture Planner) and decomposes it into a structured, phased, parallelized task list with full user-story traceability.

### SDD Step
`speckit.tasks`

### Core Value Proposition
Transform an implementation plan into an ordered, dependency-aware task list that can be executed by developers or AI coding agents phase by phase, with real-time status tracking and GitHub Issues export.

---

## 2. DDD Domains

### 2.1 Task Aggregate

**Root Entity**: `TaskList`

Represents the complete set of implementation tasks for a feature, organized into phases.

**Value Objects**:
- `TaskStatus` — enumeration: `pending | in_progress | blocked | complete`
- `PhaseType` — enumeration: `setup | foundational | us1 | us2 | us3 | polish`
- `DependencyEdge` — directed link between two tasks (source_id → target_id, optional label)

**Entities**:
- `Task` — individual unit of work: id, title, description, phase, parallel flag `[P]`, story_id traceability, list of dependency IDs, status, tags
- `Phase` — named collection of tasks sharing a common phase type

**Aggregates**:
- `TaskList` — root aggregate owning all phases and their tasks; persisted as `tasks.yaml` inside the project directory

### 2.2 Dependency Graph Sub-domain

A directed acyclic graph (DAG) where nodes are task IDs and edges represent "must complete before" relationships. The graph is stored as a list of `DependencyEdge` objects inside the `TaskList` aggregate.

### 2.3 GitHub Export Sub-domain

A projection of the `TaskList` into GitHub Issues format. Each `Task` becomes an `IssuePreview` with title, body (markdown), labels derived from phase and tags, and a milestone derived from phase.

---

## 3. User Stories

### US-1 — Generate a Phased Task List from a Plan (Priority: P1)

**As a** developer who has completed an architecture plan,
**I want to** create a structured 6-phase task list from that plan,
**So that** I can execute the implementation in a predictable, traceable order.

**Acceptance Scenarios**:
1. Given a project with an existing plan, when the user POSTs a task list, then the system persists it and returns the full task list with phase groupings.
2. Given a persisted task list, when the user GETs it, then all tasks are returned with their phase, parallel flag, story_id, and status.
3. Given no task list exists for a project, when the user GETs it, then the API returns HTTP 404.

### US-2 — Track Task Status and Progress (Priority: P1)

**As a** developer executing tasks,
**I want to** update each task's status as I work through the list,
**So that** I and my team can see overall progress at a glance.

**Acceptance Scenarios**:
1. Given an existing task, when the user PUTs a new status (`in_progress`), then the API persists the change and returns the updated task.
2. Given tasks in multiple statuses, when the user GETs the progress summary, then the response includes counts per status and per phase.
3. Given a task set to `blocked`, when the progress is retrieved, then the blocked count is > 0.

### US-3 — Visualize Task Dependencies (Priority: P2)

**As a** developer or tech lead,
**I want to** see a dependency graph showing which tasks must complete before others,
**So that** I can plan parallel execution and identify the critical path.

**Acceptance Scenarios**:
1. Given a task list with dependencies set, when the user GETs the dependency graph, then all edges are returned as source → target pairs.
2. Given an empty dependency graph, when edges are added via PUT, then the graph is persisted and returned.

### US-4 — Export Tasks to GitHub Issues (Priority: P2)

**As a** project manager,
**I want to** preview and export the task list as GitHub Issues,
**So that** the team can track execution in GitHub.

**Acceptance Scenarios**:
1. Given a task list, when the user GETs the GitHub export, then every task is mapped to an issue preview with title, body, labels, and milestone.
2. Given tasks with phase tags, when exported, then the label includes the phase name.

---

## 4. Functional Requirements

- **FR-001**: System MUST persist task lists as `tasks.yaml` inside `projects/{project_id}/`.
- **FR-002**: System MUST support six phases: `setup`, `foundational`, `us1`, `us2`, `us3`, `polish`.
- **FR-003**: System MUST mark parallelizable tasks with a `parallel` boolean flag.
- **FR-004**: System MUST link every task to a user story via an optional `story_id` field.
- **FR-005**: System MUST support four task statuses: `pending`, `in_progress`, `blocked`, `complete`.
- **FR-006**: System MUST provide a progress summary endpoint returning counts per status and per phase.
- **FR-007**: System MUST support a dependency graph stored as a list of directed edges.
- **FR-008**: System MUST provide a GitHub Issues export endpoint returning `IssuePreview` objects.
- **FR-009**: System MUST return HTTP 404 when a task list or task does not exist.
- **FR-010**: System MUST support adding individual tasks to specific phases after the task list is created.

---

## 5. Non-Functional Requirements

- **NFR-001**: All REST endpoints MUST respond in under 200 ms for task lists with ≤ 200 tasks.
- **NFR-002**: Persistence MUST use YAML for human-readability (same as plan.yaml).
- **NFR-003**: The domain model MUST be independent of FastAPI (pure Python dataclasses / enums).
- **NFR-004**: All endpoints MUST be covered by integration tests using the FastAPI test client.

---

## 6. REST API Contract

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/v1/projects/{project_id}/tasks` | Get the full task list |
| POST   | `/api/v1/projects/{project_id}/tasks` | Create a new task list |
| GET    | `/api/v1/projects/{project_id}/tasks/phases` | List all phases with their tasks |
| POST   | `/api/v1/projects/{project_id}/tasks/phases/{phase_type}` | Add a task to a phase |
| GET    | `/api/v1/projects/{project_id}/tasks/{task_id}` | Get a single task |
| PUT    | `/api/v1/projects/{project_id}/tasks/{task_id}/status` | Update a task's status |
| GET    | `/api/v1/projects/{project_id}/tasks/dependency-graph` | Get the dependency graph |
| PUT    | `/api/v1/projects/{project_id}/tasks/dependency-graph` | Set dependency graph edges |
| GET    | `/api/v1/projects/{project_id}/tasks/github-export` | Get GitHub Issues export preview |
| GET    | `/api/v1/projects/{project_id}/tasks/progress` | Get progress summary |

---

## 7. React Frontend Components

| Component | Description |
|-----------|-------------|
| `TaskListView` | Browse and load task lists per project; summary cards per phase |
| `TaskBoard` | Phase-grouped Kanban board; task cards with `[P]` badge and status colour |
| `DependencyGraphView` | Table-based DAG showing edges (source → target); highlights blocked tasks |
| `TaskStatusTracker` | Sidebar-style progress bars per phase and per status |
| `GitHubIssuesExport` | Preview panel showing issue title, labels, milestone, and body |

---

## 8. Domain Glossary

| Term | Definition |
|------|-----------|
| **Task** | Atomic unit of implementation work; maps to one user story and one phase |
| **Phase** | Named group of tasks reflecting an SDD execution stage |
| **Parallel task** | A task that can execute concurrently with other parallel tasks in the same phase |
| **Dependency** | A "must complete before" relationship between two tasks |
| **Task List** | The root aggregate of all phases and tasks for a feature branch |
| **GitHub Export** | A projection of tasks as GitHub Issues for external tracking |

---

## 9. Open Questions

1. Should task IDs be auto-generated UUIDs or human-readable slugs (e.g. `setup-001`)?
   — **Decision**: human-readable, auto-generated in the format `{phase}-{sequence:03d}`.
2. Should dependency cycles be validated on write?
   — **Decision**: yes, the domain model rejects edges that would create a cycle.
3. Should the GitHub export actually call the GitHub API?
   — **Decision**: no — the endpoint returns an `IssuePreview` (preview only); actual creation is out of scope for this module.
