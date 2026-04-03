# Spec: Module 8 — Project Dashboard

**Feature**: `008-module-8-project-dashboard`  
**Created**: 2026-04-03  
**Status**: Approved  
**Module**: 8 of 8  
**SDD Step**: Cross-cutting visibility

---

## Overview

Module 8 — **Project Dashboard** — serves as the **main application shell** and entry point of the SpecForge React app. It provides a unified view of all specs, plans, tasks, and implementation progress across all features in the project. It enables teams to collaborate through spec review workflows, visualize the SDD phase timeline, and monitor quality metrics — all from a single dashboard.

---

## Domain Model

### Enumerations

| Enum | Values |
|------|--------|
| `SDDPhase` | `constitution`, `spec`, `plan`, `tasks`, `implement`, `done` |
| `PhaseStatus` | `pending`, `in-progress`, `complete`, `blocked` |
| `ReviewStatus` | `open`, `resolved`, `dismissed` |
| `TeamRole` | `owner`, `editor`, `reviewer`, `viewer` |

### Key Entities

#### `FeatureStatus`
Lifecycle state of a feature across all SDD phases.

| Field | Type | Description |
|-------|------|-------------|
| `feature_id` | `str` (UUID) | Unique identifier |
| `title` | `str` | Feature name |
| `description` | `str` | Short description |
| `sdd_phases` | `dict[SDDPhase, PhaseStatus]` | Status per SDD phase |
| `created_at` | `str` | ISO-8601 timestamp |
| `updated_at` | `str` | ISO-8601 timestamp |

#### `TeamMember`
A project collaborator with role and permissions.

| Field | Type | Description |
|-------|------|-------------|
| `member_id` | `str` (UUID) | Unique identifier |
| `project_id` | `str` | Reference to project |
| `name` | `str` | Display name |
| `email` | `str` | Email address |
| `role` | `TeamRole` | Permission level |
| `joined_at` | `str` | ISO-8601 timestamp |

#### `ReviewThread`
Collaborative discussion on a spec or plan artifact.

| Field | Type | Description |
|-------|------|-------------|
| `thread_id` | `str` (UUID) | Unique identifier |
| `project_id` | `str` | Reference to project |
| `artifact_id` | `str` | Artifact being reviewed |
| `artifact_type` | `str` | Type: `spec`, `plan`, `tasks` |
| `title` | `str` | Thread title |
| `status` | `ReviewStatus` | Thread status |
| `author` | `str` | Author name |
| `comments` | `list[dict]` | List of `{author, text, created_at}` |
| `created_at` | `str` | ISO-8601 timestamp |
| `updated_at` | `str` | ISO-8601 timestamp |

#### `ProjectMetrics`
Aggregated project health and velocity metrics.

| Field | Type | Description |
|-------|------|-------------|
| `project_id` | `str` | Reference to project |
| `computed_at` | `str` | ISO-8601 timestamp |
| `total_features` | `int` | Total number of features |
| `features_by_phase` | `dict[SDDPhase, int]` | Count of features at each phase |
| `spec_quality_avg` | `float` | Average spec quality score (0–100) |
| `compliance_rate` | `float` | Compliance pass rate (0–1) |
| `velocity_per_week` | `float` | Features completed per week |

Computed from a `Project` via `ProjectMetrics.from_project(project, computed_at)`.

#### `Project`
Root aggregate. Top-level container for all specs and features.

| Field | Type | Description |
|-------|------|-------------|
| `project_id` | `str` (UUID) | Unique identifier |
| `name` | `str` | Project name |
| `description` | `str` | Project description |
| `created_at` | `str` | ISO-8601 timestamp |
| `updated_at` | `str` | ISO-8601 timestamp |
| `team_members` | `list[TeamMember]` | Project team |
| `features` | `list[FeatureStatus]` | Feature portfolio |

Methods:
- `add_feature(feature)` — append feature; raises `ValueError` if `feature_id` exists
- `get_feature(feature_id)` — return feature or `None`
- `update_feature_phase(feature_id, phase, status)` — update phase status; raises `ValueError` if not found
- `add_member(member)` — append team member
- `get_member(member_id)` — return member or `None`

---

## Persistence

| Entity | Path |
|--------|------|
| `Project` | `projects/{project_id}/project.yaml` |
| `ReviewThread` | `projects/{project_id}/reviews/{thread_id}.yaml` |

Projects are discovered by scanning for `project.yaml` files in the projects root.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/projects` | List all projects |
| `POST` | `/api/v1/projects` | Create a new project |
| `GET` | `/api/v1/projects/{project_id}` | Get a project with features and team |
| `DELETE` | `/api/v1/projects/{project_id}` | Delete a project |
| `GET` | `/api/v1/projects/{project_id}/features` | List features for a project |
| `POST` | `/api/v1/projects/{project_id}/features` | Add a feature to a project |
| `PUT` | `/api/v1/projects/{project_id}/features/{feature_id}/phase` | Update a feature's phase status |
| `GET` | `/api/v1/projects/{project_id}/reviews` | List review threads |
| `POST` | `/api/v1/projects/{project_id}/reviews` | Create a review thread |
| `GET` | `/api/v1/projects/{project_id}/metrics` | Compute and return project metrics |

---

## React Components

### `FeaturePortfolio`
Card grid of all features with SDD phase progress steps (constitution → spec → plan → tasks → implement → done). Filterable by phase status. Supports demo mode.

### `SDDPhaseTimeline`
Horizontal Gantt-style table (features × phases) showing each feature's phase progression. Color-coded by `PhaseStatus`. Built with pure CSS — no chart library.

### `ReviewWorkflow`
Spec review screen with thread listing, expandable comments, and an inline form for creating new review threads. Supports both live backend and demo mode.

### `MetricsDashboard`
Metrics cards showing spec quality, compliance rate, and velocity. CSS progress bars for phase distribution chart. Supports demo mode.

### `NotificationCenter`
Dropdown-style notification panel with demo notifications. Read/unread toggle. All/Unread filter tabs.

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-1 | Projects must be persisted as `project.yaml` under the project directory |
| FR-2 | Listing projects scans the projects root for all `project.yaml` files |
| FR-3 | New features must initialize all six SDD phases with `pending` status |
| FR-4 | `PUT /features/{id}/phase` must return 422 for invalid phase or phase status values |
| FR-5 | Review threads are persisted as individual YAML files under `reviews/` |
| FR-6 | `ProjectMetrics.from_project()` computes `features_by_phase` from current phase statuses |
| FR-7 | Static sub-paths (`/features`, `/reviews`, `/metrics`) registered before parameterised `{project_id}` routes |
| FR-8 | All React components support demo mode without a running backend |
| FR-9 | `FeaturePortfolio` filters features by phase status client-side |
| FR-10 | `SDDPhaseTimeline` uses color-coded cells without external chart libraries |

---

## Acceptance Scenarios

### US-1 — Manage Project Portfolio

1. **Given** no projects exist, **When** a project is created, **Then** it appears in the project list with the correct name and description
2. **Given** a project exists, **When** features are added, **Then** each feature initializes with all six SDD phases in `pending` status
3. **Given** a feature in a project, **When** its `spec` phase is updated to `complete`, **Then** the change is persisted and reflected in subsequent reads
4. **Given** a project exists, **When** it is deleted, **Then** it no longer appears in the list

### US-2 — Review Workflow

1. **Given** a project, **When** a review thread is created, **Then** it appears in the project's review list with `open` status
2. **Given** a review thread, **When** the list endpoint is called, **Then** all threads with their metadata are returned
3. **Given** multiple review threads, **When** filtered in the UI, **Then** open/resolved threads are distinguishable

### US-3 — Project Metrics

1. **Given** a project with 4 features across different phases, **When** metrics are computed, **Then** `features_by_phase` correctly reflects the distribution
2. **Given** a project, **When** metrics are requested, **Then** all metric fields are present (`total_features`, `spec_quality_avg`, `compliance_rate`, `velocity_per_week`)
3. **Given** an unknown project, **When** metrics are requested, **Then** a 404 error is returned

---

*Created using SpecKit's Spec-Driven Development template.*
