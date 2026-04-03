# Feature Specification: Module 2 — Specification Studio

**Feature Branch**: `002-module-2-specification-studio`  
**Created**: 2026-04-03  
**Updated**: 2026-04-03  
**Status**: Draft — Detailed Spec with DDD Domains, User Stories & Requirements  
**Parent Spec**: `specs/000-specforge-ai-case-tool/spec.md`  
**Implementation**:  
- `src/specify_cli/spec.py` (domain model — complete)  
- `src/specforge_api/routers/spec.py` (REST layer — complete, 9 endpoints)  
- `src/specforge_api/schemas/spec.py` (API schemas — complete)  
- `frontend/src/modules/spec/` (React UI — complete)

---

## Overview

Module 2 — **Specification Studio** — transforms vague feature ideas into structured,
prioritized, and independently testable specifications. It is the primary authoring
surface of the SpecForge workflow: everything downstream (plans, tasks, code) derives
from the Spec produced here.

**Current implementation status**:

| Layer | Status | Location |
|---|---|---|
| Python domain model | ✅ Complete (34 tests) | `src/specify_cli/spec.py` |
| FastAPI REST layer | ✅ Complete (9 endpoints) | `src/specforge_api/routers/spec.py` |
| API schemas | ✅ Complete | `src/specforge_api/schemas/spec.py` |
| React UI components | ✅ Complete | `frontend/src/modules/spec/` |
| Acceptance test suite | ⬜ Recommended | `tests/test_spec_acceptance.py` |

---

## Domain Analysis (DDD)

### Ubiquitous Language

| Term | Definition |
|---|---|
| **Spec** | A complete, structured feature specification document. The aggregate root of Module 2. Identity = `spec_id` within a project. |
| **UserStory** | A prioritized user journey. Captures the role (`as_a`), the desired capability (`i_want`), and the business benefit (`so_that`). Identity = `id` (e.g. `US-001`). |
| **AcceptanceScenario** | A concrete Given/When/Then test condition for a user story. Value object — fully described by its four fields. |
| **FunctionalRequirement** | A numbered, atomic, traceable rule the system must satisfy. Identity = auto-generated `id` (e.g. `FR-001`). Optionally traces back to a `UserStory` via `story_id`. |
| **ClarificationItem** | An identified ambiguity or under-specified area in the spec. Identity = auto-generated `id` (e.g. `CL-001`). Has a lifecycle: `open` → `resolved`. |
| **Priority** | Relative urgency of a user story: `P1` (must-have, MVP), `P2` (should-have), `P3` (nice-to-have). |
| **ClarificationStatus** | Lifecycle state of a `ClarificationItem`: `open` (unresolved) or `resolved` (answered with a resolution note). |
| **Spec Round-trip** | The property that a `Spec` serialised to Markdown and reloaded via `Spec.load()` is semantically identical to the original. |
| **Spec Version** | Semantic version string (`MAJOR.MINOR.PATCH`) tracking the revision state of a Spec. |

---

### Bounded Contexts

Module 2 spans a single bounded context with one external dependency.

#### Bounded Context 1 — Specification Authoring (`specification`)

The **core domain**. Owns the creation, editing, versioning, and persistence of the
Spec aggregate and all its subordinate entities.

```
[Specification Context]
│
├── Aggregate Root: Spec
│   ├── id: spec_id (str)           — uniqueness scoped to project
│   ├── title: str
│   ├── description: str
│   ├── version: str                — semantic version (default "1.0.0")
│   ├── created_date: Optional[date]
│   │
│   ├── Entity: UserStory           — identity = id (e.g. "US-001")
│   │   ├── title: str
│   │   ├── as_a: str
│   │   ├── i_want: str
│   │   ├── so_that: str
│   │   ├── priority: Priority      — value object (P1 | P2 | P3)
│   │   └── scenarios: List[AcceptanceScenario]   — ordered value objects
│   │       ├── title: str
│   │       ├── given: str
│   │       ├── when: str
│   │       └── then: str
│   │
│   ├── Entity: FunctionalRequirement  — identity = id (e.g. "FR-001")
│   │   ├── description: str
│   │   └── story_id: Optional[str] — traceability link
│   │
│   └── Entity: ClarificationItem   — identity = id (e.g. "CL-001")
│       ├── description: str
│       ├── status: ClarificationStatus   — open | resolved
│       └── resolution: Optional[str]
│
└── Domain Events (conceptual)
    ├── SpecCreated        (spec_id, title, created_date)
    ├── UserStoryAdded     (spec_id, story_id, priority)
    ├── UserStoryRemoved   (spec_id, story_id)
    ├── StoryPriorityChanged (spec_id, story_id, old_priority, new_priority)
    ├── RequirementAdded   (spec_id, req_id, story_id)
    ├── ClarificationOpened   (spec_id, item_id)
    └── ClarificationResolved (spec_id, item_id, resolution)
```

**Invariants** (enforced by the aggregate):

- `Spec.spec_id` and `Spec.title` must be non-empty.
- `UserStory.id`, `title`, `as_a`, `i_want`, `so_that` must all be non-empty.
- `AcceptanceScenario.title`, `given`, `when`, `then` must all be non-empty.
- `FunctionalRequirement.id` and `description` must be non-empty.
- `ClarificationItem.id` and `description` must be non-empty.
- Auto-generated IDs (`FR-XXX`, `CL-XXX`, `US-XXX`) are sequential and 1-indexed.
- A `ClarificationItem` transitions from `open` to `resolved` exactly once and cannot be reopened.

---

#### Bounded Context 2 — Governance Compliance (external dependency)

The `ComplianceGate` from **Module 1** is consumed as a read-only service. Module 2
does not mutate the Constitution; it only reads it to validate that a Spec satisfies
the active Constitution before the team can proceed to Module 3.

```
[Module 1 — Governance Context]  ──read-only──>  [Specification Context]
       Constitution aggregate                       (validates via ComplianceGateBadge)
```

---

### Context Map

```
[Specification Context]  ──saves to──>  Markdown file on disk
        │                               (projects/{project_id}/specs/{spec_id}/spec.md)
        │
        └──────── anti-corruption layer ────────> [FastAPI REST Layer]
                      (routers/spec.py)
                             │
                             └──> React UI (frontend/src/modules/spec/)
```

Persistence is Markdown-based (file system). The FastAPI layer is a thin adapter;
no business logic lives in it.

---

## User Scenarios & Testing

### User Story 1 — Create a Spec from Scratch (Priority: P1)

As a **developer starting a new feature**, I want to create a structured feature
specification so that I have a single source of truth before writing any code.

**Why this priority**: Every downstream artifact (plan, tasks, code) derives from the
Spec. Without the ability to create a Spec, the entire workflow is blocked.

**Independent Test**: Instantiate `Spec(spec_id="auth", title="User Authentication")`,
add one user story and one functional requirement, call `save(path)`, reload with
`Spec.load(path)` → assert round-trip equality on all fields.

**Acceptance Scenarios**:

1. **Given** a developer wants to start a new feature, **When** they call
   `Spec(spec_id="auth", title="User Authentication", description="Allows users to log in")`,
   **Then** a Spec is created with an empty story list and no requirements.

2. **Given** a newly created Spec, **When** `spec.to_markdown()` is called,
   **Then** the output contains the title, a User Stories section, a Functional
   Requirements section, and a Clarifications section.

3. **Given** a Spec with one story and one requirement, **When** `spec.save(path)` is
   called, **Then** the file is created at `path` containing valid Markdown.

4. **Given** a saved Spec file, **When** `Spec.load(path)` is called, **Then** the
   returned object has identical `spec_id`, `title`, `description`, `version`,
   `created_date`, stories, requirements, and clarifications.

5. **Given** a path that does not exist on disk, **When** `Spec.load(path)` is called,
   **Then** a `FileNotFoundError` is raised.

---

### User Story 2 — Add and Manage User Stories (Priority: P1)

As a **product owner or developer**, I want to add, retrieve, and remove user stories
so that the specification accurately reflects the current scope.

**Why this priority**: User stories are the primary building blocks of the Spec.
Managing them is the central interaction loop.

**Independent Test**: Create a Spec, add three stories (P1, P2, P1), remove the P2
one, call `get_story` for the removed ID → verify it returns `None`.

**Acceptance Scenarios**:

1. **Given** an empty Spec, **When** `spec.add_story(story)` is called, **Then**
   `len(spec.user_stories) == 1` and `spec.get_story(story.id).title == story.title`.

2. **Given** a Spec with story `"US-001"`, **When** `spec.remove_story("US-001")` is
   called, **Then** the method returns `True` and `spec.get_story("US-001")` returns
   `None`.

3. **Given** a Spec with no story `"US-999"`, **When** `spec.remove_story("US-999")`
   is called, **Then** the method returns `False` and no error is raised.

4. **Given** a Spec with stories at priorities P1, P2, P1, **When**
   `spec.stories_by_priority(Priority.P1)` is called, **Then** exactly 2 stories are
   returned.

5. **Given** a UserStory with `priority="p2"` (lowercase string), **When** the story
   is constructed, **Then** `story.priority == Priority.P2` (coerced automatically).

6. **Given** a UserStory with an empty `title`, **When** it is constructed, **Then**
   a `ValueError` is raised.

---

### User Story 3 — Define Acceptance Scenarios for a Story (Priority: P1)

As a **developer or QA engineer**, I want to attach Given/When/Then acceptance
scenarios to a user story so that the spec is independently testable before
implementation begins.

**Why this priority**: Scenarios are the bridge between requirements and tests.
Without them, the spec is not independently verifiable.

**Independent Test**: Create a UserStory, add two AcceptanceScenarios, call
`story.to_markdown()` → verify the output contains both scenarios with their Given,
When, Then fields.

**Acceptance Scenarios**:

1. **Given** a UserStory with no scenarios, **When** `story.add_scenario(scenario)` is
   called, **Then** `len(story.scenarios) == 1`.

2. **Given** a completed AcceptanceScenario, **When** `scenario.to_markdown()` is
   called, **Then** the output contains the `title`, `given`, `when`, and `then`
   values formatted as bold Markdown labels.

3. **Given** an AcceptanceScenario with an empty `given` field, **When** it is
   constructed, **Then** a `ValueError` is raised.

4. **Given** a UserStory with two scenarios, **When** `story.to_markdown()` is called,
   **Then** both scenarios appear in the output in insertion order.

---

### User Story 4 — Add Functional Requirements (Priority: P1)

As a **developer**, I want to add numbered functional requirements to the spec
so that each system-level rule is explicitly tracked and traceable to a user story.

**Why this priority**: Functional requirements are the precise, testable rules the
implementation must satisfy. They drive acceptance tests and API design.

**Independent Test**: Create a Spec, call `add_requirement("System MUST ...")` twice →
verify IDs are `"FR-001"` and `"FR-002"` respectively.

**Acceptance Scenarios**:

1. **Given** an empty Spec, **When** `spec.add_requirement("System MUST log all errors")`
   is called, **Then** the requirement has `id == "FR-001"`.

2. **Given** a Spec with one requirement, **When** a second requirement is added,
   **Then** the second requirement has `id == "FR-002"`.

3. **Given** a requirement added with `story_id="US-001"`, **When**
   `spec.requirements[0].story_id` is accessed, **Then** it equals `"US-001"`.

4. **Given** a requirement with a non-empty description, **When** `req.to_markdown()`
   is called, **Then** the output contains the `id` and `description`.

---

### User Story 5 — Manage Clarification Items (Priority: P2)

As a **developer or analyst**, I want to record and resolve ambiguities found in the
spec so that all under-specified areas are addressed before implementation.

**Why this priority**: Clarifications prevent silent assumptions from leaking into the
implementation. They are important but can be managed after the initial spec draft.

**Independent Test**: Add two clarification items, resolve one with a resolution text,
call `spec.open_clarifications()` → verify only the unresolved item is returned.

**Acceptance Scenarios**:

1. **Given** an empty Spec, **When** `spec.add_clarification("What is the timeout?")` is
   called, **Then** the item has `id == "CL-001"` and `status == ClarificationStatus.OPEN`.

2. **Given** a Spec with two open clarification items, **When**
   `spec.resolve_clarification("CL-001", "Timeout is 30 seconds")` is called, **Then**
   the method returns `True`, `item.status == ClarificationStatus.RESOLVED`, and
   `item.resolution == "Timeout is 30 seconds"`.

3. **Given** a Spec with no item `"CL-999"`, **When**
   `spec.resolve_clarification("CL-999", "irrelevant")` is called, **Then** the method
   returns `False`.

4. **Given** a Spec with one open and one resolved item, **When**
   `spec.open_clarifications()` is called, **Then** only the open item is returned.

---

### User Story 6 — Expose Spec via REST API (Priority: P2)

As an **AI agent or React UI**, I want to create, read, and update specs through a
REST API so that I can consume spec data without reading raw Markdown files.

**Why this priority**: The React frontend and AI agents cannot call Python functions
directly. The FastAPI layer is the integration boundary.

**Independent Test**: Start the FastAPI test client, `POST /api/v1/projects/demo/specs/auth`
with a title and description → assert HTTP 201 and response body contains `spec_id`.

**Acceptance Scenarios**:

1. **Given** a project with no existing specs, **When** a client sends
   `GET /api/v1/projects/{project_id}/specs`, **Then** the response is HTTP 200 with
   an empty `specs` list.

2. **Given** a valid `CreateSpecRequest` payload, **When** a client sends
   `POST /api/v1/projects/{project_id}/specs/{spec_id}`, **Then** the response is
   HTTP 201, the `spec.md` file is written to disk, and the response body reflects
   the saved Spec.

3. **Given** a saved Spec, **When** a client sends
   `GET /api/v1/projects/{project_id}/specs/{spec_id}`, **Then** the response is
   HTTP 200 with the full spec including stories, requirements, and clarifications.

4. **Given** a non-existent spec, **When** a client sends
   `GET /api/v1/projects/{project_id}/specs/{spec_id}`, **Then** the response is
   HTTP 404.

5. **Given** a saved Spec, **When** a client sends
   `POST /api/v1/projects/{project_id}/specs/{spec_id}/stories` with a story payload,
   **Then** the response is HTTP 201 and the story appears in the spec.

6. **Given** a saved Spec with story `"US-001"`, **When** a client sends
   `PATCH /api/v1/projects/{project_id}/specs/{spec_id}/stories/US-001` with
   `{"priority": "P3"}`, **Then** the response is HTTP 200 and the story's priority
   is updated.

7. **Given** a saved Spec with story `"US-001"`, **When** a client sends
   `DELETE /api/v1/projects/{project_id}/specs/{spec_id}/stories/US-001`, **Then**
   the response is HTTP 204 and the story is removed.

8. **Given** a saved Spec, **When** a client sends
   `POST /api/v1/projects/{project_id}/specs/{spec_id}/requirements` with a description,
   **Then** the response is HTTP 201 and the requirement appears in the spec with an
   auto-generated `FR-XXX` id.

9. **Given** a saved Spec, **When** a client sends
   `POST /api/v1/projects/{project_id}/specs/{spec_id}/clarifications` with a description,
   **Then** the response is HTTP 201 and the clarification appears with status `open`.

10. **Given** a saved Spec with open clarification `"CL-001"`, **When** a client sends
    `POST /api/v1/projects/{project_id}/specs/{spec_id}/clarifications/CL-001/resolve`
    with `{"resolution": "Confirmed: 30s timeout"}`, **Then** the response is HTTP 200
    and `status` becomes `resolved`.

---

### User Story 7 — Filter Stories by Priority (Priority: P3)

As a **product owner planning the MVP**, I want to filter user stories by priority so
that I can review only the P1 stories without scrolling through the full backlog.

**Why this priority**: Useful for larger specs but not required for the core flow.

**Independent Test**: Add 4 stories (2× P1, 1× P2, 1× P3), call
`spec.stories_by_priority(Priority.P2)` → verify exactly 1 story is returned.

**Acceptance Scenarios**:

1. **Given** a Spec with P1 and P2 stories, **When**
   `spec.stories_by_priority(Priority.P1)` is called, **Then** only P1 stories are
   returned.

2. **Given** a Spec with no P3 stories, **When**
   `spec.stories_by_priority(Priority.P3)` is called, **Then** an empty list is
   returned.

---

### Edge Cases

- What happens when `Spec.load()` encounters a Markdown file that is truncated or
  missing an expected section header?
- What if `spec_id` or `story id` contains special characters (`/`, `#`, spaces)?
- What if two stories are added with the same `id` string?
- What if `resolve_clarification` is called on an already-resolved item?
- What if the `spec.md` file on disk is read-only (permissions error) during `save()`?

---

## Requirements

### Functional Requirements

- **FR-001**: `Spec` MUST validate that `spec_id` and `title` are non-empty on construction.
- **FR-002**: `UserStory` MUST validate that `id`, `title`, `as_a`, `i_want`, and `so_that` are non-empty on construction.
- **FR-003**: `AcceptanceScenario` MUST validate that `title`, `given`, `when`, and `then` are non-empty on construction.
- **FR-004**: `FunctionalRequirement` MUST validate that `id` and `description` are non-empty on construction.
- **FR-005**: `ClarificationItem` MUST validate that `id` and `description` are non-empty on construction.
- **FR-006**: `UserStory` MUST coerce a plain string value for `priority` to the `Priority` enum (case-insensitive).
- **FR-007**: `ClarificationItem` MUST coerce a plain string value for `status` to the `ClarificationStatus` enum.
- **FR-008**: `Spec.add_story()` MUST append the story to `user_stories` in insertion order.
- **FR-009**: `Spec.remove_story(id)` MUST return `True` on success and `False` when the story is not found.
- **FR-010**: `Spec.get_story(id)` MUST return the matching `UserStory` or `None`.
- **FR-011**: `Spec.stories_by_priority(priority)` MUST return only stories whose `priority` matches the argument.
- **FR-012**: `Spec.add_requirement(description)` MUST auto-generate a sequential `FR-XXX` identifier.
- **FR-013**: `Spec.add_clarification(description)` MUST auto-generate a sequential `CL-XXX` identifier and set `status = open`.
- **FR-014**: `Spec.resolve_clarification(item_id, resolution)` MUST set `status = resolved` and record `resolution`, returning `True` on success and `False` when not found.
- **FR-015**: `Spec.open_clarifications()` MUST return only items with `status == open`.
- **FR-016**: `Spec.to_markdown()` MUST produce a Markdown string containing `## User Stories`, `## Functional Requirements`, and `## Clarifications` sections.
- **FR-017**: `Spec.save(path)` MUST write the Markdown representation to `path`, creating parent directories as needed.
- **FR-018**: `Spec.load(path)` MUST raise `FileNotFoundError` when the file does not exist.
- **FR-019**: A `save → load` round-trip MUST preserve all fields: `spec_id`, `title`, `description`, `version`, `created_date`, all stories, all requirements, and all clarifications.
- **FR-020** *(API)*: `GET /api/v1/projects/{project_id}/specs` MUST return HTTP 200 with a list of spec summaries.
- **FR-021** *(API)*: `POST /api/v1/projects/{project_id}/specs/{spec_id}` MUST create the spec on disk and return HTTP 201.
- **FR-022** *(API)*: `GET /api/v1/projects/{project_id}/specs/{spec_id}` MUST return HTTP 200 with the full spec, or HTTP 404 if absent.
- **FR-023** *(API)*: `POST /api/v1/projects/{project_id}/specs/{spec_id}/stories` MUST add the story and return HTTP 201.
- **FR-024** *(API)*: `PATCH /api/v1/projects/{project_id}/specs/{spec_id}/stories/{story_id}` MUST update the story's priority and return HTTP 200, or HTTP 404 if the story is absent.
- **FR-025** *(API)*: `DELETE /api/v1/projects/{project_id}/specs/{spec_id}/stories/{story_id}` MUST remove the story and return HTTP 204, or HTTP 404 if absent.
- **FR-026** *(API)*: `POST /api/v1/projects/{project_id}/specs/{spec_id}/requirements` MUST add the requirement and return HTTP 201.
- **FR-027** *(API)*: `POST /api/v1/projects/{project_id}/specs/{spec_id}/clarifications` MUST add an open clarification item and return HTTP 201.
- **FR-028** *(API)*: `POST /api/v1/projects/{project_id}/specs/{spec_id}/clarifications/{item_id}/resolve` MUST resolve the item and return HTTP 200, or HTTP 404 if absent.

### Key Entities

- **Spec**: Complete feature specification document. Aggregate root. Identity = `spec_id` scoped to a project.
- **UserStory**: Prioritized user journey. Managed through the Spec aggregate. Identity = `id`.
- **AcceptanceScenario**: Given/When/Then test condition. Value object — no independent identity.
- **FunctionalRequirement**: Numbered, traceable rule. Identity = auto-generated `FR-XXX`. Managed through Spec.
- **ClarificationItem**: Tracked ambiguity with lifecycle (`open` → `resolved`). Identity = auto-generated `CL-XXX`. Managed through Spec.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: All 34 existing integration tests pass with zero regressions after any change.
- **SC-002**: A `save → load` round-trip preserves 100% of Spec data across all entity types.
- **SC-003**: Auto-generated IDs (`FR-XXX`, `CL-XXX`) are correctly sequential and 1-indexed in all scenarios.
- **SC-004**: All 9 REST endpoints respond within 200 ms under test-client conditions.
- **SC-005**: The `open_clarifications()` method never returns resolved items.
- **SC-006**: `Spec.load()` raises `FileNotFoundError` — not a generic exception — when the file is absent.

---

## Assumptions

- The domain model in `src/specify_cli/spec.py` is the single source of truth; the API and UI only wrap it.
- Persistence is file-based (Markdown on disk) at `projects/{project_id}/specs/{spec_id}/spec.md`.
- The FastAPI layer reads/writes spec files relative to the configurable `SPECFORGE_PROJECTS_ROOT`.
- Spec versioning (`version` field) is managed externally; no auto-bump is triggered by story/requirement changes in this iteration.
- The React UI consumes the REST API exclusively; it does not read Markdown files directly.
- Python ≥ 3.11 is required (already enforced in `pyproject.toml`).
