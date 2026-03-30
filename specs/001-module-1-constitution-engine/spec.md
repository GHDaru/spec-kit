# Feature Specification: Module 1 — Constitution Engine

**Feature Branch**: `001-module-1-constitution-engine`
**Created**: 2026-03-30
**Updated**: 2026-03-30
**Status**: Draft — Detailed Plan with DDD Domains, User Stories & Test Cases
**Parent Spec**: `specs/000-specforge-ai-case-tool/spec.md`
**Implementation**: `src/specify_cli/constitution.py` (domain model — complete)

---

## Overview

Module 1 — **Constitution Engine** — is the foundational module of SpecForge.  
It enables teams to define, store, version, and enforce the governing principles  
that every AI-generated artifact (spec, plan, task list) must comply with.  
The Constitution is the DNA of the project: without it, no subsequent module can  
operate meaningfully.

**Current implementation status**:

| Layer | Status | Location |
|---|---|---|
| Python domain model | ✅ Complete (39 tests) | `src/specify_cli/constitution.py` |
| Acceptance tests | ⬜ Required | `tests/test_constitution_acceptance.py` |
| FastAPI REST layer | ⬜ Required | `src/specforge_api/routers/constitution.py` |
| React UI components | ⬜ Required | `frontend/src/modules/constitution/` |

This specification focuses on **the complete construction scope** of Module 1:  
it documents the DDD domain analysis, all user stories, acceptance scenarios, and  
test cases that drive the full-stack implementation.

---

## Domain Analysis (DDD)

### Ubiquitous Language

The following terms are used consistently across all layers (code, docs, UI, API).

| Term | Definition |
|---|---|
| **Constitution** | The binding, versioned document that collects all governing principles of a project. Analogous to a legal constitution or team charter. |
| **Principle** | An individual rule inside the Constitution. Each principle has a name, a human-readable description, an enforcement level, and a category. |
| **Enforcement Level** | How strictly a principle must be followed: `MUST` (blocking), `SHOULD` (warning), `MAY` (advisory). |
| **Category** | Topical grouping of a principle: `architecture`, `testing`, `security`, `performance`, `workflow`, `general`. |
| **Compliance Gate** | The automated service that validates an artifact (a Markdown file) against all MUST/SHOULD principles of a given Constitution. |
| **Violation** | A detected breach of a specific principle in a specific artifact, including the enforcement level and a human-readable message. |
| **Compliance Report** | The output of a Compliance Gate check: a structured list of violations and an overall pass/fail verdict. |
| **Ratification** | The act of formally adopting a Constitution for the first time; sets the `ratification_date`. |
| **Amendment** | Any change to an existing Constitution after ratification; triggers a `bump_version` and updates `last_amended_date`. |
| **Semantic Version** | Three-part version number (`MAJOR.MINOR.PATCH`) used to track Constitution amendments over time. |
| **Artifact** | Any file produced during the SDD workflow (spec, plan, tasks) that must be validated against the Constitution. |

---

### Bounded Contexts

Module 1 spans two bounded contexts that interact at a well-defined boundary.

#### Bounded Context 1 — Project Governance (`governance`)

The **core domain** of the module.  Responsible for creating, editing, versioning,  
persisting, and exporting the Constitution.

```
[Governance Context]
│
├── Aggregate Root: Constitution
│   ├── Entity: Principle (local entity, identity = name)
│   ├── Value Object: EnforcementLevel  (MUST | SHOULD | MAY)
│   ├── Value Object: PrincipleCategory (architecture | testing | security |
│   │                                    performance | workflow | general)
│   └── Value Object: SemanticVersion   (MAJOR.MINOR.PATCH)
│
└── Domain Events
    ├── ConstitutionRatified   (project_name, version, ratification_date)
    ├── PrincipleAdded         (constitution_id, principle_name, category)
    ├── PrincipleRemoved       (constitution_id, principle_name)
    ├── PrincipleAmended       (constitution_id, principle_name, old/new description)
    └── ConstitutionAmended    (constitution_id, old_version, new_version, bump_type)
```

**Invariants** (enforced by the aggregate):

- A Principle `name` must be non-empty and unique within the Constitution.
- A Principle `description` must be non-empty.
- `version` must be a valid semantic version string (`\d+\.\d+\.\d+`).
- `ratification_date`, when set, must not be in the future.
- `last_amended_date`, when set, must be ≥ `ratification_date`.

---

#### Bounded Context 2 — Artifact Compliance (`compliance`)

The **supporting domain** that validates generated artifacts against an active  
Constitution.  It is stateless between checks — it reads the Constitution aggregate  
but never mutates it.

```
[Compliance Context]
│
├── Domain Service: ComplianceGate (stateless, pure function)
│   └── Input:  Constitution (reference), artifact_path (Path)
│   └── Output: ComplianceReport
│
├── Value Object: ComplianceViolation
│   ├── principle_name: str
│   ├── enforcement_level: EnforcementLevel
│   ├── message: str
│   └── line_number: Optional[int]
│
└── Value Object: ComplianceReport
    ├── artifact_path: Path
    ├── violations: List[ComplianceViolation]
    ├── passed: bool             (derived — True iff no blocking violations)
    ├── blocking_violations: list (derived — MUST-level violations)
    └── warning_violations: list  (derived — SHOULD-level violations)
```

**Invariants**:

- A missing artifact always produces a single blocking violation named `(file-exists)`.
- A `MUST` violation always sets `passed = False`.
- A `SHOULD` violation does NOT set `passed = False`; it appears only in `warning_violations`.
- `PrincipleCategory.GENERAL` principles produce no heuristic violations (no keyword signals).

---

### Context Map

```
 [Governance Context] ──reads──> [Compliance Context]
         │                                │
         │ Constitution aggregate          │ ComplianceGate service
         │ (owns state)                    │ (stateless, read-only reference)
         │                                 │
         └──────── shared kernel ──────────┘
                (EnforcementLevel, PrincipleCategory)
```

The two contexts share the `EnforcementLevel` and `PrincipleCategory` enums as a  
**shared kernel** — they are defined once in `constitution.py` and used by both.

---

## User Scenarios & Testing

### User Story 1 — Bootstrap a Constitution from a Template (Priority: P1)

As a **team lead starting a new project**, I want to generate a pre-populated  
Constitution from a standard template so that I have a solid, category-complete  
starting point without having to author all principles from scratch.

**Why this priority**: Every subsequent SDD step (spec, plan, tasks) depends on  
the Constitution existing.  Without a bootstrap mechanism, adoption friction is  
very high.

**Independent Test**: Run `Constitution.from_template("MyProject")` → verify the  
returned object has principles in at least the `architecture`, `testing`, and  
`security` categories, and that the result can be saved to disk and reloaded  
without data loss.

**Acceptance Scenarios**:

1. **Given** a new project with no existing constitution file, **When** the team  
   lead calls `Constitution.from_template("Acme API")`, **Then** a Constitution  
   with at least 5 principles covering architecture, testing, security,  
   performance, and workflow categories is returned.

2. **Given** a template-generated Constitution, **When** it is saved to  
   `constitution.md` and reloaded via `Constitution.load()`, **Then** the  
   reloaded object has identical project name, version, principles, and dates.

3. **Given** a template-generated Constitution, **When** `to_markdown()` is  
   called, **Then** the output starts with `# Acme API Constitution` and contains  
   a section for every principle.

---

### User Story 2 — Add and Manage Individual Principles (Priority: P1)

As a **developer or team lead**, I want to add, update, and remove individual  
principles in the Constitution so that governance evolves as the project matures.

**Why this priority**: Governance without the ability to change is rigid and will  
be ignored.  Principle management is the primary interaction loop with the  
Constitution.

**Independent Test**: Create a Constitution, add three principles, update one  
(remove + re-add), remove another → verify counts and names are correct at each  
step.

**Acceptance Scenarios**:

1. **Given** an empty Constitution, **When** `add_principle(Principle("TDD", ...))` is  
   called, **Then** `len(constitution.principles) == 1` and  
   `get_principle("TDD").name == "TDD"`.

2. **Given** a Constitution with a principle named `"Library-First"`, **When**  
   `remove_principle("Library-First")` is called, **Then** the method returns  
   `True` and the principle is no longer returned by `get_principle()`.

3. **Given** a Constitution with no principle named `"Unknown"`, **When**  
   `remove_principle("Unknown")` is called, **Then** the method returns `False`  
   and no error is raised.

4. **Given** a Constitution with principles in `testing` and `security`  
   categories, **When** `principles_by_category(PrincipleCategory.TESTING)` is  
   called, **Then** only the `testing` principles are returned.

5. **Given** a Constitution with `MUST` and `SHOULD` principles, **When**  
   `must_principles()` is called, **Then** only `MUST` principles are returned.

6. **Given** an existing principle with enforcement level `SHOULD`, **When** the  
   team re-adds the same principle with enforcement level `MUST`, **Then** the  
   constitution contains exactly one principle with that name and level `MUST`.

---

### User Story 3 — Validate an Artifact Against the Constitution (Priority: P1)

As a **developer submitting a plan or spec**, I want to run the Compliance Gate  
against my artifact so that I know whether it passes all governing principles  
before I proceed to the next SDD phase.

**Why this priority**: The Compliance Gate is the core governance enforcement  
mechanism.  Without it, the Constitution is only advisory.

**Independent Test**: Write a plan Markdown file that mentions `test` and  
`security` keywords → run `ComplianceGate.check()` → verify `report.passed == True`  
and `report.violations == []`.

**Acceptance Scenarios**:

1. **Given** an artifact file containing the word `"test"` and a Constitution with  
   a `MUST`-level `testing` principle, **When** `ComplianceGate.check(artifact)`  
   is called, **Then** `report.passed == True` and no violations are recorded.

2. **Given** an artifact file with no testing keywords and a Constitution with a  
   `MUST`-level `testing` principle, **When** `ComplianceGate.check(artifact)` is  
   called, **Then** `report.passed == False` and `len(report.blocking_violations) == 1`.

3. **Given** an artifact file with no performance keywords and a Constitution with  
   a `SHOULD`-level `performance` principle, **When** `ComplianceGate.check(artifact)`  
   is called, **Then** `report.passed == True` (non-blocking) and  
   `len(report.warning_violations) == 1`.

4. **Given** a file path that does not exist on disk, **When**  
   `ComplianceGate.check(missing_path)` is called, **Then** `report.passed == False`  
   and the blocking violation is named `"(file-exists)"`.

5. **Given** a Compliance Report with one blocking violation, **When**  
   `report.summary()` is called, **Then** the output contains `"❌"`,  
   the violation count, and the word `"blocking"`.

6. **Given** a Compliance Report with only warning violations, **When**  
   `report.summary()` is called, **Then** the output contains `"⚠️"` and  
   `"warning"`, and `report.passed == True`.

---

### User Story 4 — Track Constitution Amendments with Semantic Versioning (Priority: P2)

As a **team lead**, I want to bump the Constitution's semantic version whenever it  
is formally amended so that the team can trace which set of principles governed  
any given artifact.

**Why this priority**: Auditability is a secondary concern after correctness; the  
project can start with fixed versioning and add amendment tracking iteratively.

**Independent Test**: Create a `1.0.0` Constitution, call `bump_version("minor")`,  
verify version is `"1.1.0"` and `last_amended_date == date.today()`.

**Acceptance Scenarios**:

1. **Given** a Constitution at version `"1.0.0"`, **When** `bump_version("patch")`  
   is called, **Then** `version == "1.0.1"` and `last_amended_date == date.today()`.

2. **Given** a Constitution at version `"1.0.0"`, **When** `bump_version("minor")`  
   is called, **Then** `version == "1.1.0"` and the patch component resets to `0`.

3. **Given** a Constitution at version `"1.2.3"`, **When** `bump_version("major")`  
   is called, **Then** `version == "2.0.0"` and minor/patch reset to `0`.

4. **Given** a Constitution, **When** `bump_version("hotfix")` is called, **Then**  
   a `ValueError` is raised with the message `"Invalid bump type"`.

5. **Given** a Constitution with `ratification_date = date(2026, 1, 1)`, **When**  
   `bump_version("patch")` is called, **Then** `last_amended_date >= ratification_date`.

---

### User Story 5 — Save and Load a Constitution to/from Disk (Priority: P2)

As a **team**, we want to persist the Constitution as a human-readable Markdown  
file in version control so that it is accessible to all developers, tools, and AI  
agents without requiring a database.

**Why this priority**: Portability and version-control-friendliness are key  
design goals; the Markdown round-trip must be reliable.

**Independent Test**: Create a Constitution with diverse principles, save to a  
temp file, load it back, assert the loaded object is semantically equal to the  
original.

**Acceptance Scenarios**:

1. **Given** a Constitution with two principles of different categories, **When**  
   `save(path)` is called, **Then** the file is created at `path` and contains  
   valid Markdown with sections for every principle.

2. **Given** a saved constitution Markdown file, **When** `Constitution.load(path)`  
   is called, **Then** the returned object preserves `project_name`, `version`,  
   `ratification_date`, `last_amended_date`, and all principle fields.

3. **Given** a path that does not exist, **When** `Constitution.load(path)` is  
   called, **Then** a `FileNotFoundError` is raised.

4. **Given** a Constitution saved with `ratification_date = date(2026, 1, 15)` and  
   `last_amended_date = date(2026, 3, 30)`, **When** reloaded, **Then** both dates  
   are correctly restored as `date` objects.

---

### User Story 6 — Expose Constitution over a REST API (Priority: P2)

As an **AI agent or frontend application**, I want to read and update a  
project's Constitution through a REST API so that I can consume it  
programmatically without reading raw Markdown files.

**Why this priority**: The React UI and AI agents cannot call Python functions  
directly; a thin FastAPI layer is the bridge that unlocks the full SpecForge  
product.

**Independent Test**: Start the FastAPI test client, `GET /api/v1/projects/demo/constitution`,  
assert HTTP 200 and the returned JSON contains `project_name` and `principles`.

**Acceptance Scenarios**:

1. **Given** a project with an existing `constitution.md`, **When** a client sends  
   `GET /api/v1/projects/{project_id}/constitution`, **Then** the response is  
   HTTP 200 with a JSON body containing `project_name`, `version`, and `principles`.

2. **Given** a project with no constitution file, **When** a client sends  
   `GET /api/v1/projects/{project_id}/constitution`, **Then** the response is  
   HTTP 404 with a JSON error body.

3. **Given** a valid `ConstitutionCreateRequest` payload, **When** a client sends  
   `POST /api/v1/projects/{project_id}/constitution`, **Then** the response is  
   HTTP 201, a `constitution.md` file is written to disk, and the response body  
   reflects the saved Constitution.

4. **Given** an artifact file at a known path, **When** a client sends  
   `POST /api/v1/projects/{project_id}/constitution/check` with  
   `{"artifact_path": "<path>"}`, **Then** the response is HTTP 200 with a  
   `compliance_report` object containing `passed`, `blocking_violations`, and  
   `warning_violations`.

5. **Given** a Constitution that has been amended three times, **When** a client  
   sends `GET /api/v1/projects/{project_id}/constitution/history`, **Then** the  
   response contains an ordered list of amendment records with version and date.

---

### User Story 7 — Filter Principles by Category (Priority: P3)

As a **team lead conducting a governance review**, I want to filter principles  
by category so that I can audit a single domain area (e.g., all security rules)  
without scanning the full list.

**Why this priority**: Useful for large constitutions (10+ principles) but not  
needed for an MVP.

**Independent Test**: Create a Constitution with 6 principles across 3 categories,  
call `principles_by_category(PrincipleCategory.SECURITY)` → verify only security  
principles are returned.

**Acceptance Scenarios**:

1. **Given** a Constitution with principles in `testing`, `security`, and  
   `architecture`, **When** `principles_by_category(PrincipleCategory.SECURITY)` is  
   called, **Then** only security-category principles are returned and the count  
   is correct.

2. **Given** a Constitution with no `performance` principles, **When**  
   `principles_by_category(PrincipleCategory.PERFORMANCE)` is called, **Then** an  
   empty list is returned.

---

### User Story 8 — View a Rich Compliance Report (Priority: P3)

As a **developer reviewing a failing compliance check**, I want a clear,  
human-readable compliance report that shows exactly which principles were  
violated and what needs to change so that I can fix the artifact efficiently.

**Why this priority**: Developer experience polish; the gate already works, the  
report format is the refinement.

**Independent Test**: Generate a report with one blocking and one warning  
violation, call `report.summary()`, assert the output contains the violation  
names, symbols, and counts.

**Acceptance Scenarios**:

1. **Given** a `ComplianceReport` with zero violations, **When** `summary()` is  
   called, **Then** the output contains `"compliant"`.

2. **Given** a `ComplianceReport` with one `MUST`-level violation named  
   `"Test-First"`, **When** `summary()` is called, **Then** the output contains  
   `"❌"`, the violation count, and the word `"blocking"`.

3. **Given** a `ComplianceReport` with one `SHOULD`-level violation named  
   `"Perf"`, **When** `summary()` is called, **Then** the output contains `"⚠️"`,  
   the warning count, and the word `"warning"`, and `report.passed == True`.

---

### Edge Cases

- What happens when a Principle is added with a duplicate name? (current: silently appended — spec requires unique names within a Constitution)
- How does the system handle a constitution Markdown file that is malformed or truncated mid-principle?
- What if `bump_version` is called and there is no `ratification_date`?
- What if the artifact is a binary file (not valid UTF-8)?
- What if two principles from different categories both have keyword signals in the same artifact?
- What if the `project_name` contains special characters (e.g., `/`, `#`, `"`)?

---

## Requirements

### Functional Requirements

- **FR-001**: `Constitution` MUST validate that `project_name` is non-empty on creation.
- **FR-002**: `Constitution` MUST validate that `version` is a valid semantic version string.
- **FR-003**: `Principle` MUST validate that `name` and `description` are non-empty.
- **FR-004**: `Principle` MUST coerce plain string values for `enforcement_level` and `category` to their respective enum types.
- **FR-005**: `Constitution.add_principle()` MUST append the principle to the ordered list.
- **FR-006**: `Constitution.remove_principle(name)` MUST return `True` on success and `False` if the principle is not found.
- **FR-007**: `Constitution.get_principle(name)` MUST return the principle or `None`.
- **FR-008**: `Constitution.principles_by_category(category)` MUST return only principles of the given category.
- **FR-009**: `Constitution.must_principles()` MUST return only `MUST`-level principles.
- **FR-010**: `Constitution.bump_version(bump_type)` MUST accept `"major"`, `"minor"`, or `"patch"` and reject all others with `ValueError`.
- **FR-011**: `Constitution.bump_version()` MUST update `last_amended_date` to today's date.
- **FR-012**: `Constitution.to_markdown()` MUST produce a valid Markdown string that can be round-tripped through `Constitution.load()`.
- **FR-013**: `Constitution.save(path)` MUST write the Markdown representation to the given path.
- **FR-014**: `Constitution.load(path)` MUST raise `FileNotFoundError` when the file does not exist.
- **FR-015**: `Constitution.from_template(project_name)` MUST return a Constitution with at least one principle in each standard category.
- **FR-016**: `ComplianceGate.check(artifact_path)` MUST return a `ComplianceReport` with a blocking violation when the file does not exist.
- **FR-017**: `ComplianceGate.check()` MUST return `report.passed == False` when any `MUST`-level principle is violated.
- **FR-018**: `ComplianceGate.check()` MUST return `report.passed == True` when only `SHOULD`-level principles are violated.
- **FR-019**: `ComplianceReport.summary()` MUST include `"❌"` and the word `"blocking"` when blocking violations exist.
- **FR-020**: `ComplianceReport.summary()` MUST include `"⚠️"` and the word `"warning"` when only warning violations exist.
- **FR-021**: `ComplianceReport.summary()` MUST include the word `"compliant"` when no violations exist.
- **FR-022** *(API)*: `GET /api/v1/projects/{project_id}/constitution` MUST return HTTP 200 with the serialized Constitution.
- **FR-023** *(API)*: `GET /api/v1/projects/{project_id}/constitution` MUST return HTTP 404 when no constitution file is found.
- **FR-024** *(API)*: `POST /api/v1/projects/{project_id}/constitution` MUST create or overwrite the `constitution.md` and return HTTP 201.
- **FR-025** *(API)*: `POST /api/v1/projects/{project_id}/constitution/check` MUST run `ComplianceGate` and return HTTP 200 with the compliance report.

### Key Entities

- **Constitution**: Versioned set of governing principles. Identity = `project_name` (within a project scope).
- **Principle**: Individual rule. Identity = `name` (unique within a Constitution). Non-root entity managed through the Constitution aggregate.
- **ComplianceViolation**: A detected breach. Value object — no identity, fully described by its fields.
- **ComplianceReport**: The output of a compliance check. Value object — aggregates violations and derives `passed`.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: All 39 existing domain-model tests pass with zero regressions after each change.
- **SC-002**: A round-trip `save → load` cycle preserves 100% of principle data (name, description, enforcement level, category, dates).
- **SC-003**: `Constitution.from_template()` returns a Constitution with principles in at least 5 distinct categories.
- **SC-004**: `ComplianceGate` correctly classifies 100% of artifacts in the test suite as passing or failing.
- **SC-005** *(API)*: All 4 REST endpoints respond within 200ms under unit-test conditions.
- **SC-006**: Acceptance test suite (new `test_constitution_acceptance.py`) achieves 100% pass rate.

---

## Assumptions

- The domain model in `src/specify_cli/constitution.py` is the single source of truth; the API and UI only wrap it.
- Persistence is file-based (Markdown on disk) for the current phase; no database is introduced in Module 1.
- The FastAPI layer reads/writes constitution files relative to a configurable `projects_root` directory.
- Amendment history tracking is limited to what is embedded in the Markdown file (version + dates); a full audit log is deferred to a future module.
- The React UI is out of scope for this iteration; the API layer is the boundary.
- Python ≥ 3.11 is required (already enforced in `pyproject.toml`).
