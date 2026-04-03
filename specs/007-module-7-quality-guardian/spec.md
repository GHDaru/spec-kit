# Spec: Module 7 — Quality Guardian

**Feature**: `007-module-7-quality-guardian`  
**Created**: 2026-04-03  
**Status**: Approved  
**Module**: 7 of 8  
**SDD Step**: `speckit.analyze` + `speckit.checklist`

---

## Overview

Module 7 — **Quality Guardian** — validates that implemented features fulfill the original specification through AI-powered analysis, acceptance test generation, and custom quality checklists. It provides cross-artifact consistency checks (spec ↔ plan ↔ tasks ↔ code), test-case generation from acceptance scenarios, and a configurable checklist system for tracking quality gates.

---

## Domain Model

### Enumerations

| Enum | Values |
|------|--------|
| `ChecklistItemStatus` | `pending`, `pass`, `fail`, `skip` |
| `SeverityLevel` | `critical`, `high`, `medium`, `low`, `info` |
| `TestCaseType` | `unit`, `integration`, `contract`, `e2e` |

### Key Entities

#### `ChecklistItem`
An individual verification step within a checklist.

| Field | Type | Description |
|-------|------|-------------|
| `item_id` | `str` (UUID) | Unique identifier |
| `checklist_id` | `str` | Parent checklist |
| `category` | `str` | Grouping category (e.g. "Security", "Performance") |
| `description` | `str` | What to check |
| `status` | `ChecklistItemStatus` | Current verification status |
| `notes` | `str` | Free-form notes |
| `created_at` | `str` | ISO-8601 timestamp |
| `updated_at` | `str` | ISO-8601 timestamp |

#### `Checklist`
Root aggregate. Custom quality verification list for a project.

| Field | Type | Description |
|-------|------|-------------|
| `checklist_id` | `str` (UUID) | Unique identifier |
| `project_id` | `str` | Reference to the project |
| `title` | `str` | Checklist title |
| `description` | `str` | Purpose/scope of this checklist |
| `spec_id` | `str \| None` | Optional link to a Module 2 Spec |
| `created_at` | `str` | ISO-8601 timestamp |
| `updated_at` | `str` | ISO-8601 timestamp |
| `items` | `list[ChecklistItem]` | Verification items |

Methods:
- `add_item(item)` — append an item; raises `ValueError` if `item_id` exists
- `get_item(item_id)` — return item or `None`
- `update_item(item_id, status, notes)` — update mutable fields; raises `ValueError` if not found
- `summary()` — return counts by status and overall progress percentage

#### `TestCase`
A generated test case derived from an acceptance scenario.

| Field | Type | Description |
|-------|------|-------------|
| `case_id` | `str` (UUID) | Unique identifier |
| `suite_id` | `str` | Parent test suite |
| `scenario_ref` | `str` | Reference to acceptance scenario |
| `title` | `str` | Test case title |
| `test_type` | `TestCaseType` | Test level (unit/integration/contract/e2e) |
| `description` | `str` | What this test validates |
| `given` | `str` | Given condition |
| `when` | `str` | Action |
| `then` | `str` | Expected outcome |
| `status` | `str` | `pending`, `pass`, `fail` |

#### `TestSuite`
Collection of test cases for a feature or spec.

| Field | Type | Description |
|-------|------|-------------|
| `suite_id` | `str` (UUID) | Unique identifier |
| `project_id` | `str` | Reference to the project |
| `spec_id` | `str \| None` | Optional link to a Module 2 Spec |
| `title` | `str` | Suite title |
| `description` | `str` | Scope description |
| `created_at` | `str` | ISO-8601 timestamp |
| `test_cases` | `list[TestCase]` | Test cases in this suite |

#### `AnalysisFinding`
One issue found during artifact consistency analysis.

| Field | Type | Description |
|-------|------|-------------|
| `finding_id` | `str` (UUID) | Unique identifier |
| `report_id` | `str` | Parent analysis report |
| `severity` | `SeverityLevel` | How critical the issue is |
| `artifact_type` | `str` | Which artifact type (`spec`, `plan`, `tasks`, `code`) |
| `artifact_id` | `str \| None` | Optional reference to the artifact |
| `description` | `str` | What the issue is |
| `recommendation` | `str` | How to fix it |

#### `AnalysisReport`
AI consistency check result across all artifacts.

| Field | Type | Description |
|-------|------|-------------|
| `report_id` | `str` (UUID) | Unique identifier |
| `project_id` | `str` | Reference to the project |
| `spec_id` | `str \| None` | Spec that was analyzed |
| `title` | `str` | Report title |
| `summary` | `str` | Executive summary |
| `created_at` | `str` | ISO-8601 timestamp |
| `findings` | `list[AnalysisFinding]` | Sorted by severity (critical first) |

Methods:
- `add_finding(finding)` — append finding; raises `ValueError` if duplicate
- `summary_stats()` — return counts by severity and total finding count

---

## Persistence

| Entity | Path |
|--------|------|
| `Checklist` | `projects/{project_id}/quality/checklists/{checklist_id}.yaml` |
| `TestSuite` | `projects/{project_id}/quality/test-suites/{suite_id}.yaml` |
| `AnalysisReport` | `projects/{project_id}/quality/reports/{report_id}.yaml` |

All persisted using `yaml.safe_dump` / `yaml.safe_load`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/projects/{project_id}/quality/checklists` | List all checklists for a project |
| `POST` | `/api/v1/projects/{project_id}/quality/checklists` | Create a new checklist |
| `GET` | `/api/v1/projects/{project_id}/quality/checklists/{checklist_id}` | Get a checklist with all items |
| `PUT` | `/api/v1/projects/{project_id}/quality/checklists/{checklist_id}/items/{item_id}` | Update an item's status |
| `DELETE` | `/api/v1/projects/{project_id}/quality/checklists/{checklist_id}` | Delete a checklist |
| `GET` | `/api/v1/projects/{project_id}/quality/test-suites` | List all test suites |
| `POST` | `/api/v1/projects/{project_id}/quality/test-suites` | Create a test suite with cases |
| `GET` | `/api/v1/projects/{project_id}/quality/test-suites/{suite_id}` | Get a test suite |
| `GET` | `/api/v1/projects/{project_id}/quality/reports` | List analysis reports |
| `POST` | `/api/v1/projects/{project_id}/quality/reports` | Create an analysis report |

---

## React Components

### `ChecklistBuilder`
Drag-and-drop style checklist editor with category grouping, item status toggle (pass / fail / skip / pending), and progress bar per category. Supports both live backend and demo data.

### `TestSuiteViewer`
Tree view of generated test cases grouped by acceptance scenario. Each node shows test type badge (unit/integration/contract/e2e), status, and links to the source scenario.

### `AnalysisReportViewer`
Structured AI report with severity-sorted findings. Each finding links to the artifact and shows description and recommendation.

### `ConsistencyHeatmap`
Matrix visualization of artifact alignment (spec ↔ plan ↔ tasks ↔ code). Cells colored from red (0) to green (100) based on consistency score.

### `CoverageMap`
Visual mapping of which acceptance scenarios have associated tests. Uncovered scenarios highlighted in amber with per-feature progress bars.

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-1 | Checklists must be persisted as YAML files under the project directory |
| FR-2 | Item status transitions: `pending → pass`, `pending → fail`, `pending → skip`, any → `pending` |
| FR-3 | `Checklist.summary()` must return counts for all four statuses and an overall percentage |
| FR-4 | Test suites persist with embedded test cases in a single YAML file |
| FR-5 | Analysis reports persist findings sorted by severity (critical first) |
| FR-6 | All 10 API endpoints return appropriate HTTP status codes (200/201/204/404/422) |
| FR-7 | Static sub-paths (`checklists`, `test-suites`, `reports`) registered before parameterised routes |
| FR-8 | React components support demo mode without a running backend |
| FR-9 | `ChecklistBuilder` shows per-category progress bars |
| FR-10 | `ConsistencyHeatmap` uses color interpolation from red (0) to green (100) |

---

## Acceptance Scenarios

### US-1 — Create and Track Quality Checklists

1. **Given** a project exists, **When** a checklist is created with items in multiple categories, **Then** the checklist is persisted and retrievable with all items
2. **Given** a checklist with items, **When** an item status is updated to `pass`, **Then** the item status changes and `summary()` reflects the updated percentage
3. **Given** a checklist exists, **When** it is deleted, **Then** it no longer appears in the list

### US-2 — Generate and View Test Suites

1. **Given** a project with a spec, **When** a test suite is created with test cases, **Then** the suite is persisted and all test cases are retrievable
2. **Given** a test suite exists, **When** it is retrieved by ID, **Then** all test cases with type, Given/When/Then, and status are returned
3. **Given** multiple test suites, **When** the list endpoint is called, **Then** all suites for the project are returned

### US-3 — Analyze Artifact Consistency

1. **Given** a project, **When** an analysis report is created with findings, **Then** the report is persisted
2. **Given** an analysis report with mixed severity findings, **When** the report is retrieved, **Then** findings are sorted with critical first
3. **Given** multiple reports for a project, **When** the list endpoint is called, **Then** all reports are returned

---

*Created using SpecKit's Spec-Driven Development template.*
