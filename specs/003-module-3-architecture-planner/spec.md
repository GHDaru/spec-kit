# Feature Specification: Module 3 — Architecture Planner

**Feature Branch**: `003-module-3-architecture-planner`  
**Created**: 2026-04-03  
**Updated**: 2026-04-03  
**Status**: Draft — Detailed Spec with DDD Domains, User Stories & Requirements  
**Parent Spec**: `specs/000-specforge-ai-case-tool/spec.md`  
**Implementation**:  
- `src/specify_cli/plan.py` (domain model — complete)  
- `src/specforge_api/routers/plan.py` (REST layer — complete, 10 endpoints)  
- `src/specforge_api/schemas/plan.py` (API schemas — complete)  
- `frontend/src/modules/plan/` (React UI — complete)

---

## Overview

Module 3 — **Architecture Planner** — converts a feature specification (Module 2)
into a complete technical implementation plan. It produces technology-stack choices
with documented rationale, an entity-relationship data model, an API contract
(OpenAPI style), a project directory structure, and AI research reports that justify
each decision.

The Plan is the bridge between the "what" (Spec) and the "how" (tasks, code).
Without an approved Plan, Module 4 (Task Forge) cannot begin.

**Current implementation status**:

| Layer | Status | Location |
|---|---|---|
| Python domain model | ✅ Complete (36 tests) | `src/specify_cli/plan.py` |
| FastAPI REST layer | ✅ Complete (10 endpoints) | `src/specforge_api/routers/plan.py` |
| API schemas | ✅ Complete | `src/specforge_api/schemas/plan.py` |
| React UI components | ✅ Complete | `frontend/src/modules/plan/` |
| Acceptance test suite | ⬜ Recommended | `tests/test_plan_acceptance.py` |

---

## Domain Analysis (DDD)

### Ubiquitous Language

| Term | Definition |
|---|---|
| **Plan** | A complete technical implementation plan for a project. Aggregate root of Module 3. Identity = `project_name` (one plan per project). |
| **TechStack** | A single technology choice for one architectural layer (e.g. "backend: FastAPI"). Documented with rationale, alternatives, pros, and cons. Value object. |
| **ResearchReport** | An AI-generated investigation of technical options for a specific topic (e.g. "Database selection"). Aggregates `TechStack` entries per layer. |
| **ResearchStatus** | Lifecycle of a research report: `pending` → `in_progress` → `completed` | `failed`. |
| **DataModel** | The full entity-relationship model for the project. Contains ordered `DataModelEntity` definitions. |
| **DataModelEntity** | A named domain entity or database table (e.g. `User`, `Order`). Owns an ordered list of `EntityField` definitions. |
| **EntityField** | A single field within a `DataModelEntity`. Defined by name, type, required flag, primary-key flag, and description. |
| **FieldType** | Primitive type of an entity field: `string`, `integer`, `float`, `boolean`, `date`, `datetime`, `uuid`, `json`, `text`. |
| **APIContract** | A complete service interface definition (OpenAPI, GraphQL, or gRPC). Contains an ordered list of `APIEndpoint` definitions. |
| **APIEndpoint** | A single HTTP operation: path, method, summary, description, and grouping tags. |
| **HTTPMethod** | One of `GET`, `POST`, `PUT`, `PATCH`, `DELETE`. |
| **ContractFormat** | Format of the API contract: `openapi`, `graphql`, or `grpc`. |
| **ProjectStructure** | The proposed directory layout for the implementation. Represented as a nested dict tree with per-path annotations. |
| **Plan Version** | Semantic version string (`MAJOR.MINOR.PATCH`) tracking revisions to the Plan. |
| **Plan Round-trip** | The property that a `Plan` serialised to YAML and reloaded via `Plan.load()` is semantically identical to the original. |
| **Spec Reference** | Optional `spec_id` field on a Plan that traces it back to the originating Module 2 Spec. |

---

### Bounded Contexts

Module 3 has one primary bounded context and two external dependencies.

#### Bounded Context 1 — Architecture Planning (`planning`)

The **core domain**. Owns the creation, editing, versioning, and YAML persistence of
the Plan aggregate and all its sub-components.

```
[Planning Context]
│
├── Aggregate Root: Plan
│   ├── project_name: str         — identity
│   ├── spec_id: Optional[str]    — traceability link to Module 2
│   ├── summary: str
│   ├── version: str              — semantic version (default "1.0.0")
│   ├── notes: str
│   │
│   ├── List[TechStack]           — top-level technology choices (value objects)
│   │   ├── layer: str
│   │   ├── choice: str
│   │   ├── rationale: str
│   │   ├── alternatives: List[str]
│   │   ├── pros: List[str]
│   │   └── cons: List[str]
│   │
│   ├── List[ResearchReport]      — AI-generated investigations
│   │   ├── topic: str
│   │   ├── summary: str
│   │   ├── status: ResearchStatus   — pending | in_progress | completed | failed
│   │   ├── citations: List[str]
│   │   └── tech_stacks: List[TechStack]
│   │
│   ├── Optional[DataModel]       — entity-relationship model
│   │   ├── name: str
│   │   ├── notes: str
│   │   └── entities: List[DataModelEntity]
│   │       ├── name: str
│   │       ├── description: str
│   │       ├── relationships: List[str]
│   │       └── fields: List[EntityField]
│   │           ├── name: str
│   │           ├── field_type: FieldType
│   │           ├── required: bool
│   │           ├── primary_key: bool
│   │           └── description: str
│   │
│   ├── Optional[APIContract]     — service interface definition
│   │   ├── title: str
│   │   ├── version: str
│   │   ├── description: str
│   │   ├── format: ContractFormat   — openapi | graphql | grpc
│   │   ├── base_url: str
│   │   ├── schema_raw: str
│   │   └── endpoints: List[APIEndpoint]
│   │       ├── path: str
│   │       ├── method: HTTPMethod
│   │       ├── summary: str
│   │       ├── description: str
│   │       └── tags: List[str]
│   │
│   └── Optional[ProjectStructure]  — directory layout
│       ├── root: str
│       ├── description: str
│       ├── tree: dict              — nested directory tree
│       └── annotations: dict       — path → annotation map
│
└── Domain Events (conceptual)
    ├── PlanCreated          (project_name, version, spec_id)
    ├── TechStackAdded       (project_name, layer, choice)
    ├── ResearchReportAdded  (project_name, topic, status)
    ├── DataModelSet         (project_name, model_name)
    ├── APIContractSet       (project_name, contract_title)
    ├── ProjectStructureSet  (project_name, root)
    └── PlanVersionBumped    (project_name, old_version, new_version)
```

**Invariants** (enforced by the aggregate):

- `Plan.project_name` must be non-empty.
- `Plan.version` must be a valid semantic version string (`\d+\.\d+\.\d+`).
- `TechStack.layer`, `choice`, and `rationale` must be non-empty.
- `ResearchReport.topic` must be non-empty.
- `DataModelEntity.name` must be non-empty.
- `EntityField.name` must be non-empty.
- `APIEndpoint.path` must be non-empty.
- `APIContract.title` must be non-empty.
- `ProjectStructure.root` must be non-empty.
- `Plan.bump_version(bump)` accepts only `"major"`, `"minor"`, or `"patch"`.
- A `DataModel`, `APIContract`, or `ProjectStructure` can be set exactly once or replaced (no partial updates).

---

#### Bounded Context 2 — Specification Reference (external, read-only)

Module 3 optionally references the Spec from Module 2 via `spec_id`. The Plan does not
own or mutate the Spec; the reference is purely for traceability.

```
[Specification Context (Module 2)]  ──spec_id reference──>  [Planning Context]
```

---

#### Bounded Context 3 — Governance Compliance (external, read-only)

The `ComplianceGate` from Module 1 is consumed to validate the generated Plan against
the active Constitution before the team may proceed to Module 4.

```
[Governance Context (Module 1)]  ──ComplianceGate.check()──>  [Planning Context]
                                   (read-only, stateless)
```

---

### Context Map

```
[Planning Context]  ──saves to──>  YAML file on disk
       │                           (projects/{project_id}/plan.yaml)
       │
       └──── anti-corruption layer ────> [FastAPI REST Layer]
                   (routers/plan.py)
                         │
                         └──> React UI (frontend/src/modules/plan/)
                              ├── TechStackSelector
                              ├── ERDiagram
                              ├── ProjectTreePreview
                              ├── ResearchReportViewer
                              ├── APIContractEditor
                              └── PlanComplianceCheck
```

Persistence is YAML-based (file system). The FastAPI layer is a thin adapter;
no business logic lives in it.

---

## User Scenarios & Testing

### User Story 1 — Create an Architecture Plan (Priority: P1)

As a **technical lead starting implementation planning**, I want to create an
architecture plan linked to a feature spec so that I have a single source of
technical truth before any code is written.

**Why this priority**: No downstream artifact (tasks, code, tests) can be correctly
generated without an approved architecture plan. Plan creation is the entry point
of Module 3.

**Independent Test**: Instantiate `Plan(project_name="MyApp", spec_id="auth")`,
call `plan.save(path)`, reload with `Plan.load(path)` → assert round-trip equality on
`project_name`, `spec_id`, `version`, and `summary`.

**Acceptance Scenarios**:

1. **Given** a technical lead wants to plan a feature, **When** they call
   `Plan(project_name="MyApp", spec_id="auth-001", summary="Authentication service")`,
   **Then** a Plan is created with an empty `tech_stacks` list, no `data_model`, no
   `api_contract`, and no `project_structure`.

2. **Given** a newly created Plan, **When** `plan.save(path)` is called, **Then** a
   YAML file is written at `path` and the parent directory is created if absent.

3. **Given** a saved Plan, **When** `Plan.load(path)` is called, **Then** the returned
   object has identical `project_name`, `spec_id`, `version`, `summary`, and `notes`.

4. **Given** a path that does not exist, **When** `Plan.load(path)` is called, **Then**
   a `FileNotFoundError` is raised.

5. **Given** a Plan with `project_name=""` (empty string), **When** it is constructed,
   **Then** a `ValueError` is raised.

6. **Given** a Plan with `version="not-semver"`, **When** it is constructed, **Then**
   a `ValueError` is raised.

---

### User Story 2 — Select and Document Technology Stack Choices (Priority: P1)

As a **technical lead**, I want to record technology choices with rationale,
alternatives, pros, and cons so that the team understands why each technology was
selected and what trade-offs were accepted.

**Why this priority**: Tech stack decisions constrain all subsequent implementation
choices. They must be explicit and documented before task generation begins.

**Independent Test**: Create a Plan, add two TechStack entries (layers `"backend"` and
`"database"`), save and reload → verify both entries are present with all fields
intact.

**Acceptance Scenarios**:

1. **Given** a Plan with no tech stacks, **When** `plan.add_tech_stack(TechStack(...))` is
   called, **Then** `len(plan.tech_stacks) == 1`.

2. **Given** a TechStack with `layer="backend"`, `choice="FastAPI"`, and a rationale,
   **When** the Plan is saved and reloaded, **Then** the tech stack is present with
   all fields preserved.

3. **Given** a TechStack with an empty `layer`, **When** it is constructed, **Then**
   a `ValueError` is raised.

4. **Given** a TechStack with an empty `rationale`, **When** it is constructed, **Then**
   a `ValueError` is raised.

5. **Given** a Plan with two tech stacks, **When** it is saved and reloaded, **Then**
   both stacks are present in insertion order.

---

### User Story 3 — Add AI Research Reports (Priority: P1)

As a **technical lead or AI agent**, I want to attach AI-generated research reports
to the plan so that technology decisions are backed by documented investigation.

**Why this priority**: Research reports are the evidence that supports tech stack
choices. They prevent ad-hoc decisions and enable auditable architecture reviews.

**Independent Test**: Create a Plan, add a ResearchReport with two TechStack entries
for different layers, call `report.choices_for_layer("database")` → verify only the
database entry is returned.

**Acceptance Scenarios**:

1. **Given** a Plan with no research reports, **When**
   `plan.add_research_report(report)` is called, **Then** `len(plan.research_reports) == 1`.

2. **Given** a ResearchReport with `status=ResearchStatus.PENDING`, **When** it is added
   and the Plan is saved and reloaded, **Then** `report.status == ResearchStatus.PENDING`.

3. **Given** a ResearchReport with two TechStack entries for layers `"backend"` and
   `"database"`, **When** `report.choices_for_layer("database")` is called, **Then**
   only the `"database"` entry is returned.

4. **Given** a ResearchReport with an empty `topic`, **When** it is constructed,
   **Then** a `ValueError` is raised.

5. **Given** a Plan with a research report, **When** the Plan is saved and reloaded,
   **Then** the report's `topic`, `summary`, `citations`, and all its `tech_stacks`
   are preserved.

---

### User Story 4 — Define the Data Model (Priority: P1)

As a **technical lead or data architect**, I want to define the entity-relationship
data model for the project so that the team has a canonical schema reference before
implementation begins.

**Why this priority**: The data model defines the persistence layer. Without it,
implementation tasks cannot be written and the API contract cannot be correctly
designed.

**Independent Test**: Create a Plan, set a DataModel with two entities (`User` and
`Order`), add fields to each entity, save and reload → verify all entities and fields
are preserved.

**Acceptance Scenarios**:

1. **Given** a Plan with no data model, **When** `plan.set_data_model(data_model)` is
   called, **Then** `plan.data_model.name == data_model.name`.

2. **Given** a DataModel with two entities, **When** `data_model.get_entity("User")` is
   called, **Then** the `User` entity is returned.

3. **Given** a DataModel with no entity named `"Order"`, **When**
   `data_model.get_entity("Order")` is called, **Then** `None` is returned.

4. **Given** a DataModelEntity, **When** `entity.add_field(EntityField(...))` is called,
   **Then** `len(entity.fields) == 1`.

5. **Given** an EntityField with `primary_key=True`, **When** `entity.primary_key()` is
   called, **Then** the field is returned.

6. **Given** an EntityField with `field_type="uuid"` (string), **When** it is
   constructed, **Then** `field.field_type == FieldType.UUID` (coerced to enum).

7. **Given** a Plan with a full DataModel, **When** it is saved and reloaded, **Then**
   all entities, fields, and relationships are preserved.

---

### User Story 5 — Define the API Contract (Priority: P2)

As a **backend developer or API designer**, I want to define the service's API
contract so that frontend and integration teams can build against a stable interface.

**Why this priority**: The API contract is essential for parallel frontend/backend
development, but it can be drafted after the data model is approved.

**Independent Test**: Create an APIContract with two endpoints, call
`contract.endpoints_by_tag("users")` → verify only tagged endpoints are returned.

**Acceptance Scenarios**:

1. **Given** a Plan with no API contract, **When** `plan.set_api_contract(contract)` is
   called, **Then** `plan.api_contract.title == contract.title`.

2. **Given** an APIContract, **When** `contract.add_endpoint(APIEndpoint(...))` is called,
   **Then** `len(contract.endpoints) == 1`.

3. **Given** an APIContract with endpoints tagged `"users"` and `"orders"`, **When**
   `contract.endpoints_by_tag("users")` is called, **Then** only the `"users"` endpoints
   are returned.

4. **Given** an APIEndpoint with `method="post"` (lowercase string), **When** it is
   constructed, **Then** `endpoint.method == HTTPMethod.POST` (coerced to enum).

5. **Given** an APIEndpoint with an empty `path`, **When** it is constructed, **Then**
   a `ValueError` is raised.

6. **Given** a Plan with an API contract, **When** it is saved and reloaded, **Then**
   all endpoints, methods, paths, and tags are preserved.

---

### User Story 6 — Define the Project Directory Structure (Priority: P2)

As a **technical lead**, I want to define the proposed directory layout for the
project so that all team members and AI agents share a common structural reference.

**Why this priority**: Directory structure guides AI code generation and team
conventions. It is important but can follow the data model and API contract.

**Independent Test**: Create a Plan, set a ProjectStructure with a nested tree dict,
save and reload → verify `root` and `tree` are preserved.

**Acceptance Scenarios**:

1. **Given** a Plan with no project structure, **When**
   `plan.set_project_structure(structure)` is called, **Then**
   `plan.project_structure.root == structure.root`.

2. **Given** a ProjectStructure with a nested `tree` dict and `annotations`, **When**
   the Plan is saved and reloaded, **Then** `tree` and `annotations` are preserved
   with identical structure.

3. **Given** a ProjectStructure with an empty `root`, **When** it is constructed,
   **Then** a `ValueError` is raised.

---

### User Story 7 — Version the Architecture Plan (Priority: P2)

As a **technical lead**, I want to bump the Plan's semantic version when the
architecture is formally revised so that the team can trace which plan governed
any given implementation phase.

**Why this priority**: Auditability matters when the plan changes mid-sprint.
Semantic versioning is a secondary concern after correctness.

**Independent Test**: Create a Plan at `1.0.0`, call `plan.bump_version("minor")` →
verify `plan.version == "1.1.0"`.

**Acceptance Scenarios**:

1. **Given** a Plan at version `"1.0.0"`, **When** `plan.bump_version("patch")` is
   called, **Then** `plan.version == "1.0.1"`.

2. **Given** a Plan at version `"1.0.0"`, **When** `plan.bump_version("minor")` is
   called, **Then** `plan.version == "1.1.0"` and the patch component resets to `0`.

3. **Given** a Plan at version `"2.3.1"`, **When** `plan.bump_version("major")` is
   called, **Then** `plan.version == "3.0.0"` and minor/patch reset to `0`.

4. **Given** a Plan, **When** `plan.bump_version("hotfix")` is called, **Then** a
   `ValueError` is raised with the message `"Invalid bump type"`.

---

### User Story 8 — Expose the Plan via REST API (Priority: P2)

As an **AI agent or React UI**, I want to create and update the architecture plan
through a REST API so that I can consume plan data without reading raw YAML files.

**Why this priority**: The React frontend and AI agents cannot call Python functions
directly. The FastAPI layer is the integration boundary.

**Independent Test**: Start the FastAPI test client, `POST /api/v1/projects/demo/plan`
with a project name and summary → assert HTTP 201 and response body contains
`project_name`.

**Acceptance Scenarios**:

1. **Given** a project with no plan, **When** a client sends
   `GET /api/v1/projects/{project_id}/plan`, **Then** the response is HTTP 404.

2. **Given** a valid `PlanCreateRequest`, **When** a client sends
   `POST /api/v1/projects/{project_id}/plan`, **Then** the response is HTTP 201,
   a `plan.yaml` file is written to disk, and the body reflects the saved Plan.

3. **Given** a saved Plan, **When** a client sends
   `GET /api/v1/projects/{project_id}/plan`, **Then** the response is HTTP 200 with
   all plan fields including tech stacks, data model, API contract, and project structure.

4. **Given** a saved Plan, **When** a client sends
   `GET /api/v1/projects/{project_id}/plan/research-reports`, **Then** the response
   is HTTP 200 with the list of research reports.

5. **Given** a saved Plan, **When** a client sends
   `POST /api/v1/projects/{project_id}/plan/research-reports` with a report payload,
   **Then** the response is HTTP 201 and the report appears in subsequent GET responses.

6. **Given** a saved Plan with a data model, **When** a client sends
   `GET /api/v1/projects/{project_id}/plan/data-model`, **Then** the response is
   HTTP 200 with all entities and fields.

7. **Given** a saved Plan, **When** a client sends
   `PUT /api/v1/projects/{project_id}/plan/data-model` with a full data model payload,
   **Then** the response is HTTP 200 and the data model is replaced.

8. **Given** a saved Plan with an API contract, **When** a client sends
   `GET /api/v1/projects/{project_id}/plan/api-contract`, **Then** the response is
   HTTP 200 with all endpoints.

9. **Given** a saved Plan, **When** a client sends
   `PUT /api/v1/projects/{project_id}/plan/api-contract` with a contract payload,
   **Then** the response is HTTP 200 and the contract is replaced.

10. **Given** a saved Plan with a project structure, **When** a client sends
    `GET /api/v1/projects/{project_id}/plan/project-structure`, **Then** the response
    is HTTP 200 with the full tree.

11. **Given** a saved Plan, **When** a client sends
    `PUT /api/v1/projects/{project_id}/plan/project-structure` with a structure payload,
    **Then** the response is HTTP 200 and the structure is replaced.

---

### Edge Cases

- What happens when `Plan.load()` encounters a YAML file that is malformed or empty?
- What if `project_name` contains special characters (`/`, `#`, spaces)?
- What if `set_data_model()` is called twice? (current: silently replaces — spec requires deterministic replacement)
- What if a `DataModelEntity` is added with the same name as an existing entity?
- What if `bump_version` is called when `version` is already at `"0.0.0"`?
- What if the `plan.yaml` file is read-only (permissions error) during `save()`?
- What if `ResearchReport.from_dict()` receives an unknown `status` value?

---

## Requirements

### Functional Requirements

- **FR-001**: `Plan` MUST validate that `project_name` is non-empty on construction.
- **FR-002**: `Plan` MUST validate that `version` is a valid semantic version string (`\d+\.\d+\.\d+`).
- **FR-003**: `TechStack` MUST validate that `layer`, `choice`, and `rationale` are non-empty on construction.
- **FR-004**: `ResearchReport` MUST validate that `topic` is non-empty on construction.
- **FR-005**: `ResearchReport` MUST coerce a plain string value for `status` to the `ResearchStatus` enum.
- **FR-006**: `DataModelEntity` MUST validate that `name` is non-empty on construction.
- **FR-007**: `EntityField` MUST validate that `name` is non-empty on construction.
- **FR-008**: `EntityField` MUST coerce a plain string value for `field_type` to the `FieldType` enum.
- **FR-009**: `APIEndpoint` MUST validate that `path` is non-empty on construction.
- **FR-010**: `APIEndpoint` MUST coerce a plain string value for `method` to the `HTTPMethod` enum (case-insensitive).
- **FR-011**: `APIContract` MUST validate that `title` is non-empty on construction.
- **FR-012**: `APIContract` MUST coerce a plain string value for `format` to the `ContractFormat` enum.
- **FR-013**: `ProjectStructure` MUST validate that `root` is non-empty on construction.
- **FR-014**: `Plan.add_tech_stack()` MUST append the `TechStack` in insertion order.
- **FR-015**: `Plan.add_research_report()` MUST append the `ResearchReport` in insertion order.
- **FR-016**: `ResearchReport.add_tech_stack()` MUST append the `TechStack` within the report.
- **FR-017**: `ResearchReport.choices_for_layer(layer)` MUST return only `TechStack` entries whose `layer` matches the argument.
- **FR-018**: `Plan.set_data_model()` MUST set or atomically replace the current `data_model`.
- **FR-019**: `DataModelEntity.add_field()` MUST append the `EntityField` in insertion order.
- **FR-020**: `DataModelEntity.primary_key()` MUST return the first field with `primary_key=True`, or `None`.
- **FR-021**: `DataModel.add_entity()` MUST append the entity in insertion order.
- **FR-022**: `DataModel.get_entity(name)` MUST return the matching `DataModelEntity` or `None`.
- **FR-023**: `Plan.set_api_contract()` MUST set or atomically replace the current `api_contract`.
- **FR-024**: `APIContract.add_endpoint()` MUST append the `APIEndpoint` in insertion order.
- **FR-025**: `APIContract.endpoints_by_tag(tag)` MUST return only endpoints whose `tags` list contains the argument.
- **FR-026**: `Plan.set_project_structure()` MUST set or atomically replace the current `project_structure`.
- **FR-027**: `Plan.bump_version(bump)` MUST accept only `"major"`, `"minor"`, or `"patch"` and raise `ValueError` for any other value.
- **FR-028**: `Plan.save(path)` MUST write the plan as YAML to `path`, creating parent directories as needed.
- **FR-029**: `Plan.load(path)` MUST raise `FileNotFoundError` when the file does not exist.
- **FR-030**: A `save → load` round-trip MUST preserve all Plan fields: `project_name`, `spec_id`, `version`, `summary`, `notes`, all tech stacks, all research reports, the data model, the API contract, and the project structure.
- **FR-031** *(API)*: `GET /api/v1/projects/{project_id}/plan` MUST return HTTP 200 with the full plan, or HTTP 404 if absent.
- **FR-032** *(API)*: `POST /api/v1/projects/{project_id}/plan` MUST create the plan on disk and return HTTP 201.
- **FR-033** *(API)*: `GET /api/v1/projects/{project_id}/plan/research-reports` MUST return HTTP 200 with the list of reports.
- **FR-034** *(API)*: `POST /api/v1/projects/{project_id}/plan/research-reports` MUST append the report and return HTTP 201.
- **FR-035** *(API)*: `GET /api/v1/projects/{project_id}/plan/data-model` MUST return HTTP 200 with the data model, or HTTP 404 if absent.
- **FR-036** *(API)*: `PUT /api/v1/projects/{project_id}/plan/data-model` MUST set or replace the data model and return HTTP 200.
- **FR-037** *(API)*: `GET /api/v1/projects/{project_id}/plan/api-contract` MUST return HTTP 200 with the API contract, or HTTP 404 if absent.
- **FR-038** *(API)*: `PUT /api/v1/projects/{project_id}/plan/api-contract` MUST set or replace the API contract and return HTTP 200.
- **FR-039** *(API)*: `GET /api/v1/projects/{project_id}/plan/project-structure` MUST return HTTP 200 with the project structure, or HTTP 404 if absent.
- **FR-040** *(API)*: `PUT /api/v1/projects/{project_id}/plan/project-structure` MUST set or replace the project structure and return HTTP 200.

### Key Entities

- **Plan**: Complete technical implementation plan. Aggregate root. Identity = `project_name` (one plan per project). Persisted as YAML.
- **TechStack**: Technology choice for one architectural layer. Value object — no independent identity; managed through Plan or ResearchReport.
- **ResearchReport**: AI-generated investigation document. Aggregates TechStack entries. Managed through Plan.
- **DataModel**: Entity-relationship schema. Managed through Plan (set/replace only).
- **DataModelEntity**: Named domain entity or table. Managed through DataModel.
- **EntityField**: Single field in an entity. Value object — managed through DataModelEntity.
- **APIContract**: Service interface definition. Managed through Plan (set/replace only).
- **APIEndpoint**: Single HTTP operation. Value object — managed through APIContract.
- **ProjectStructure**: Directory layout definition. Managed through Plan (set/replace only).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: All 36 existing integration tests pass with zero regressions after any change.
- **SC-002**: A `save → load` round-trip preserves 100% of Plan data across all nested sub-components (tech stacks, research reports, data model, API contract, project structure).
- **SC-003**: `Plan.bump_version()` correctly resets subordinate version components on `major` and `minor` bumps.
- **SC-004**: All 10 REST endpoints respond within 200 ms under test-client conditions.
- **SC-005**: `DataModel.get_entity()` returns `None` — not an exception — when the entity is absent.
- **SC-006**: `Plan.load()` raises `FileNotFoundError` — not a generic exception — when the file is absent.
- **SC-007**: `ResearchReport.choices_for_layer()` never returns entries from a different layer.

---

## Assumptions

- The domain model in `src/specify_cli/plan.py` is the single source of truth; the API and UI only wrap it.
- Persistence is YAML-based (file system) at `projects/{project_id}/plan.yaml`.
- The FastAPI layer reads/writes plan files relative to the configurable `SPECFORGE_PROJECTS_ROOT`.
- One plan exists per project; there is no multi-plan management within a single project in this iteration.
- Plan versioning is manual (`bump_version` must be called explicitly); no auto-bump is triggered by sub-component changes.
- The React UI (`TechStackSelector`, `ERDiagram`, `ProjectTreePreview`, `ResearchReportViewer`, `APIContractEditor`) consumes the REST API exclusively.
- The `ComplianceGate` integration (via `PlanComplianceCheck` in the UI) is driven by the Module 1 Constitution Engine and requires Module 1 to be operational.
- Python ≥ 3.11 is required (already enforced in `pyproject.toml`).
