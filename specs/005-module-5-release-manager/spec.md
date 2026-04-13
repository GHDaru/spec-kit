# Feature Specification: Module 5 — Release Manager

**Feature Branch**: `005-module-5-release-manager`
**Created**: 2026-04-03
**Updated**: 2026-04-03
**Status**: Draft — Detailed Spec with DDD Domains, User Stories & Requirements
**Parent Spec**: `specs/000-specforge-ai-case-tool/spec.md`
**Implementation**:
- `src/specify_cli/releases.py` (domain model — complete)
- `src/specforge_api/routers/releases.py` (REST layer — complete, 10 endpoints)
- `src/specforge_api/schemas/releases.py` (Pydantic schemas — complete)
- `tests/test_releases_api.py` (40 integration tests — complete)
- `frontend/src/api/releases.ts` (API client — complete)
- `frontend/src/modules/releases/` (React components — complete)

---

## 1. Module Overview

**Module 5 — Release Manager** is the versioning and changelog layer of SpecForge. It consumes the task list produced by Module 4 (Task Forge) and organises completed work into versioned releases with structured changelog entries, lifecycle status transitions, and Markdown-rendered changelogs.

### SDD Step
`speckit.releases`

### Core Value Proposition
Transform a completed task list into a semantically-versioned release history with human-readable changelogs, traceability back to user stories and tasks, and lifecycle management (draft → published → yanked).

---

## 2. DDD Domains

### 2.1 Release Aggregate

**Root Entity**: `ReleaseLog`

Represents the complete release history for a project, owned as a list of ordered `Release` entities.

**Value Objects**:
- `ChangeType` — enumeration: `feat | fix | docs | refactor | test | chore | breaking`
- `ReleaseStatus` — enumeration: `draft | published | yanked`

**Entities**:
- `ChangeEntry` — a single changelog item: change_id (UUID), change_type, description, optional task_id and story_id traceability links
- `Release` — a versioned release: version (SemVer), title, date (ISO-8601), status, optional task_list_id / spec_id / plan_id references, free-form notes, and an ordered list of `ChangeEntry` items

**Aggregates**:
- `ReleaseLog` — root aggregate owning all releases for a project; persisted as `releases.yaml` inside the project directory

### 2.2 Changelog Sub-domain

A rendering concern that groups `ChangeEntry` items by `ChangeType` (in canonical display order: `breaking → feat → fix → refactor → docs → test → chore`) and produces a Markdown document. Both the `Release` entity and the `ReleaseLog` root expose `changelog_markdown()` methods.

### 2.3 Cross-Module Traceability Sub-domain

Each `Release` may reference artefacts from earlier modules via optional foreign-key fields:
- `task_list_id` → Module 4 TaskList
- `spec_id` → Module 2 Spec
- `plan_id` → Module 3 Plan

Each `ChangeEntry` may reference:
- `task_id` → Module 4 Task
- `story_id` → Module 2 User Story

---

## 3. User Stories

### US-1 — Create and Manage a Release Log (Priority: P1)

**As a** developer who has completed a set of tasks,
**I want to** create a versioned release log for my project,
**So that** I can track what was shipped in each release.

**Acceptance Scenarios**:
1. Given a project without a release log, when the user POSTs a release log, then the system persists it and returns the full log.
2. Given an existing release log, when the user GETs it, then all releases and their change entries are returned.
3. Given no release log exists for a project, when the user GETs it, then the API returns HTTP 404.

### US-2 — Track Release Lifecycle (Priority: P1)

**As a** release manager,
**I want to** transition a release through draft → published → yanked states,
**So that** consumers know which releases are stable, in-progress, or retracted.

**Acceptance Scenarios**:
1. Given a release in `draft` status, when the user PUTs `published`, then the API persists the new status and returns the updated release.
2. Given a published release with critical issues, when the user PUTs `yanked`, then the status changes to `yanked`.
3. Given an invalid status value, when submitted via PUT, then the API returns HTTP 422 with a descriptive error.

### US-3 — Manage Change Entries (Priority: P1)

**As a** developer,
**I want to** add, view, and remove individual change entries within a release,
**So that** the changelog accurately reflects what changed between versions.

**Acceptance Scenarios**:
1. Given an existing release, when the user POSTs a change entry, then it is appended to the release and returned with a generated UUID.
2. Given a change entry with an invalid `change_type`, when submitted, then the API returns HTTP 422.
3. Given an existing change entry, when the user DELETEs it by ID, then it is removed and the API returns HTTP 204.
4. Given a non-existent change entry ID, when deleted, then the API returns HTTP 404.

### US-4 — Generate a Markdown Changelog (Priority: P2)

**As a** developer preparing a release,
**I want to** download the full changelog as a Markdown document,
**So that** I can include it in the project's CHANGELOG.md or release notes.

**Acceptance Scenarios**:
1. Given a release log with multiple releases, when the user GETs the changelog, then a Markdown document is returned with headings per release version.
2. Given a release with `breaking` and `feat` entries, when the changelog is rendered, then breaking changes appear before features.
3. Given a release log with no releases, when the changelog is requested, then only the project header is returned.

### US-5 — Inspect Release Summary Statistics (Priority: P2)

**As a** project manager,
**I want to** see a summary of the release log including counts by status and change type,
**So that** I can assess release health at a glance.

**Acceptance Scenarios**:
1. Given a release log with `draft` and `published` releases, when the user GETs the summary, then counts per status are returned.
2. Given releases with various change types, when the summary is fetched, then counts per change type are returned.
3. Given a release log with no releases, when the summary is fetched, then all counts are zero.

---

## 4. Functional Requirements

- **FR-001**: System MUST persist release logs as `releases.yaml` inside `projects/{project_id}/`.
- **FR-002**: System MUST support seven change types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `breaking`.
- **FR-003**: System MUST support three release statuses: `draft`, `published`, `yanked`.
- **FR-004**: System MUST auto-generate a UUID for each `ChangeEntry` when created via the API.
- **FR-005**: System MUST reject duplicate release versions within the same release log (HTTP 422).
- **FR-006**: System MUST provide a changelog endpoint returning Markdown grouped by change type.
- **FR-007**: System MUST render change types in canonical order: `breaking → feat → fix → refactor → docs → test → chore`.
- **FR-008**: System MUST provide a summary endpoint returning counts per status and per change type.
- **FR-009**: System MUST return HTTP 404 when a release log, release, or change entry is not found.
- **FR-010**: System MUST support optional cross-module traceability fields on both `Release` (`task_list_id`, `spec_id`, `plan_id`) and `ChangeEntry` (`task_id`, `story_id`).

---

## 5. Non-Functional Requirements

- **NFR-001**: All REST endpoints MUST respond in under 200 ms for release logs with ≤ 100 releases.
- **NFR-002**: Persistence MUST use YAML for human-readability (same as other modules).
- **NFR-003**: The domain model MUST be independent of FastAPI (pure Python dataclasses / enums).
- **NFR-004**: All endpoints MUST be covered by integration tests using the FastAPI test client.
- **NFR-005**: Version strings MUST follow Semantic Versioning (SemVer) conventions.

---

## 6. REST API Contract

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/v1/projects/{project_id}/releases` | Get the full release log |
| POST   | `/api/v1/projects/{project_id}/releases` | Create a new release log |
| GET    | `/api/v1/projects/{project_id}/releases/changelog` | Get the full changelog as Markdown |
| GET    | `/api/v1/projects/{project_id}/releases/summary` | Get release log summary statistics |
| GET    | `/api/v1/projects/{project_id}/releases/{version}` | Get a single release |
| PUT    | `/api/v1/projects/{project_id}/releases/{version}` | Update a release's metadata |
| DELETE | `/api/v1/projects/{project_id}/releases/{version}` | Delete a release |
| POST   | `/api/v1/projects/{project_id}/releases/{version}/changes` | Add a change entry to a release |
| PUT    | `/api/v1/projects/{project_id}/releases/{version}/status` | Update a release's status |
| DELETE | `/api/v1/projects/{project_id}/releases/{version}/changes/{change_id}` | Remove a change entry |

> **Note**: Static sub-paths (`changelog`, `summary`) are registered before the parameterised `{version}` routes so FastAPI matches them correctly.

---

## 7. React Frontend Components

| Component | Description |
|-----------|-------------|
| `ReleaseListView` | Browse and load the release log; summary cards per release with status badge and change counts |
| `ReleaseEditor` | Form for creating/editing a release and managing its metadata (version, title, date, notes, links) |
| `ChangelogViewer` | Renders the full Markdown changelog with syntax highlighting; includes copy-to-clipboard action |
| `ReleaseTimeline` | Chronological timeline view of all releases with status colour-coding |
| `ReleaseSummary` | Summary panel showing counts by status and change type with visual indicators |

---

## 8. Domain Glossary

| Term | Definition |
|------|-----------|
| **Release** | A versioned snapshot of the project at a point in time, with a SemVer string, lifecycle status, and list of change entries |
| **Change Entry** | An atomic changelog item categorised by change type, optionally linked to a task and/or user story |
| **Change Type** | Category of a change: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, or `breaking` |
| **Release Status** | Lifecycle state of a release: `draft` (in progress), `published` (stable), or `yanked` (retracted) |
| **Release Log** | Root aggregate owning all releases for a project; persisted as `releases.yaml` |
| **Changelog** | A Markdown document listing all releases and their change entries, grouped by change type |
| **Traceability** | Optional links from a release or change entry back to Module 2/3/4 artefacts (spec, plan, task, user story) |

---

## 9. Open Questions

1. Should version strings be validated against SemVer format on write?
   — **Decision**: no strict validation in v1; version is stored as a free-form string but SemVer is the recommended convention.
2. Should status transitions be restricted (e.g., `yanked → draft` allowed)?
   — **Decision**: all transitions are allowed in v1; the `update_status` method accepts any valid `ReleaseStatus` value.
3. Should the changelog endpoint support filtering by version range?
   — **Decision**: out of scope for v1; the endpoint always returns the full changelog.
