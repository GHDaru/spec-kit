# Spec: Module 6 — Implement & Execute

**Feature**: `006-module-6-implement-execute`  
**Created**: 2026-04-03  
**Status**: Approved  
**Module**: 6 of 8  
**SDD Step**: `speckit.implement`

---

## Overview

Module 6 — **Implement & Execute** — orchestrates the execution of development tasks through AI coding agents. It provides real-time execution tracking, checkpoint validation, spec compliance reporting, and rollback support so teams can see exactly which tasks are running, which have passed compliance checks, and how to recover from failures.

---

## Domain Model

### Enumerations

| Enum | Values |
|------|--------|
| `TaskResultStatus` | `pending`, `running`, `success`, `failure`, `skipped` |
| `SessionStatus` | `idle`, `running`, `paused`, `completed`, `failed` |
| `ComplianceVerdict` | `pass`, `fail`, `warning` |

### Key Entities

#### `ExecutionSession`
Root aggregate. Represents one active implementation run.

| Field | Type | Description |
|-------|------|-------------|
| `session_id` | `str` (UUID) | Unique identifier |
| `project_id` | `str` | Reference to the project |
| `task_list_id` | `str \| None` | Reference to Module 4 TaskList |
| `spec_id` | `str \| None` | Reference to Module 2 Spec |
| `plan_id` | `str \| None` | Reference to Module 3 Plan |
| `agent` | `str` | AI coding agent name (e.g. `claude`, `copilot`) |
| `status` | `SessionStatus` | Current session lifecycle status |
| `started_at` | `str` | ISO-8601 timestamp |
| `completed_at` | `str \| None` | ISO-8601 timestamp when done |
| `notes` | `str` | Free-form session notes |
| `task_results` | `list[TaskResult]` | Ordered list of task execution results |
| `checkpoints` | `list[Checkpoint]` | Validated checkpoints in this session |

#### `TaskResult`
Outcome of executing one task.

| Field | Type | Description |
|-------|------|-------------|
| `result_id` | `str` (UUID) | Unique identifier |
| `task_id` | `str` | Reference to the task executed |
| `task_title` | `str` | Human-readable task title |
| `status` | `TaskResultStatus` | Execution outcome |
| `output` | `str` | Console / AI agent output |
| `error_message` | `str \| None` | Failure reason if status is `failure` |
| `started_at` | `str` | ISO-8601 timestamp |
| `completed_at` | `str \| None` | ISO-8601 timestamp |
| `compliance_report_id` | `str \| None` | Link to associated ComplianceReport |

#### `ComplianceReport`
Spec-vs-code validation result for a task result.

| Field | Type | Description |
|-------|------|-------------|
| `report_id` | `str` (UUID) | Unique identifier |
| `result_id` | `str` | Associated TaskResult |
| `spec_id` | `str \| None` | Spec being checked |
| `verdict` | `ComplianceVerdict` | Overall verdict |
| `summary` | `str` | Short human-readable summary |
| `findings` | `list[dict]` | List of `{requirement, verdict, note}` items |

#### `Checkpoint`
A validated, named snapshot after a user story phase completes.

| Field | Type | Description |
|-------|------|-------------|
| `checkpoint_id` | `str` (UUID) | Unique identifier |
| `label` | `str` | Human-readable label (e.g. "US-1 complete") |
| `story_id` | `str \| None` | Reference to the user story |
| `created_at` | `str` | ISO-8601 timestamp |
| `notes` | `str` | Free-form notes |

---

## Functional Requirements

### FR-1: Create an execution session
`POST /api/v1/projects/{project_id}/sessions` — Create a new `ExecutionSession` for a project and persist it as `sessions/{session_id}.yaml`.

### FR-2: List sessions
`GET /api/v1/projects/{project_id}/sessions` — Return all sessions for the project.

### FR-3: Get session
`GET /api/v1/projects/{project_id}/sessions/{session_id}` — Return a single session by ID, 404 if absent.

### FR-4: Update session status
`PUT /api/v1/projects/{project_id}/sessions/{session_id}/status` — Update the session status (`idle`, `running`, `paused`, `completed`, `failed`).

### FR-5: Delete session
`DELETE /api/v1/projects/{project_id}/sessions/{session_id}` — Remove a session file; 404 if absent.

### FR-6: Add task result
`POST /api/v1/projects/{project_id}/sessions/{session_id}/results` — Append a `TaskResult` to the session.

### FR-7: Update task result
`PUT /api/v1/projects/{project_id}/sessions/{session_id}/results/{result_id}` — Update a task result's status and output.

### FR-8: Add compliance report
`POST /api/v1/projects/{project_id}/sessions/{session_id}/results/{result_id}/compliance` — Attach a `ComplianceReport` to a task result.

### FR-9: Add checkpoint
`POST /api/v1/projects/{project_id}/sessions/{session_id}/checkpoints` — Append a `Checkpoint` to the session.

### FR-10: Get session summary
`GET /api/v1/projects/{project_id}/sessions/{session_id}/summary` — Return counts of task results by status and compliance verdicts.

---

## User Stories

### US-1: Session Lifecycle Management
**As a** development lead,  
**I want to** create and manage execution sessions,  
**So that** I can track each implementation run independently.

**Acceptance scenarios**:
- Create session → 201 with session_id
- List sessions → returns all sessions for project
- Get session → returns full session data
- Update status → session status changes correctly
- Delete session → 204, subsequent GET returns 404

### US-2: Task Execution Tracking
**As a** developer,  
**I want to** record the outcome of each task execution,  
**So that** I have a full audit trail of what was implemented and how.

**Acceptance scenarios**:
- Add task result → appended to session
- Update task result → status and output updated
- Result status transitions: pending → running → success / failure / skipped

### US-3: Spec Compliance Verification
**As a** QA engineer,  
**I want to** attach compliance reports to task results,  
**So that** I can see whether generated code satisfies the original spec.

**Acceptance scenarios**:
- Add compliance report → linked to task result
- Verdict `pass` / `fail` / `warning` correctly persisted
- Findings list preserved and returned

### US-4: Checkpoint & Rollback Support
**As a** developer,  
**I want to** create named checkpoints after each user story is complete,  
**So that** I can identify safe rollback points if later tasks fail.

**Acceptance scenarios**:
- Add checkpoint → appended to session
- Checkpoint includes label, story_id, timestamp, notes

### US-5: Session Summary
**As a** project manager,  
**I want to** get a summary of an execution session,  
**So that** I can quickly assess progress and compliance status.

**Acceptance scenarios**:
- Summary returns task counts by status
- Summary returns compliance verdict counts
- Summary returns total checkpoints count
