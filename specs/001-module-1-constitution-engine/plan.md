# Implementation Plan: Module 1 — Constitution Engine

**Branch**: `001-module-1-constitution-engine`
**Date**: 2026-03-30
**Spec**: `specs/001-module-1-constitution-engine/spec.md`
**Input**: Feature specification above, with DDD analysis, 8 user stories, and 25 functional requirements.

---

## Summary

Module 1 delivers the Constitution Engine — the governance foundation for all  
SpecForge modules.  The Python domain model is **already implemented and tested**  
(613 lines, 39 tests).  This plan covers the three remaining layers:

1. **Acceptance tests** — verify end-to-end user stories against the domain model.
2. **FastAPI REST layer** — thin bridge exposing the domain model over HTTP.
3. *(Future)* **React UI** — visual front-end (deferred; not in this iteration).

---

## Technical Context

**Language/Version**: Python 3.11+  
**Primary Dependencies**: `fastapi>=0.110`, `uvicorn[standard]`, `pydantic>=2.0`  
**Storage**: File-based Markdown (no database in Module 1)  
**Testing**: `pytest>=7.0`, `pytest-cov`, `httpx[socks]` (FastAPI test client)  
**Target Platform**: Linux/macOS/Windows server or local dev  
**Project Type**: Library + REST API service  
**Performance Goals**: All 4 REST endpoints respond < 200ms under local test conditions  
**Constraints**: No database dependency; all state persisted as `constitution.md` files  
**Scale/Scope**: Single-project file I/O per request; concurrency handled by FastAPI defaults

---

## DDD Domain Summary

### Core Domain: Governance Context

| Concept | DDD Type | Python Class |
|---|---|---|
| Constitution | Aggregate Root | `Constitution` |
| Principle | Local Entity (managed through root) | `Principle` |
| EnforcementLevel | Value Object (Enum) | `EnforcementLevel` |
| PrincipleCategory | Value Object (Enum) | `PrincipleCategory` |
| Semantic Version | Value Object (encapsulated by helpers) | `_validate_semver`, `_parse_semver` |
| ConstitutionRatified | Domain Event | (raised on `from_template` / first `save`) |
| PrincipleAdded | Domain Event | (raised on `add_principle`) |
| ConstitutionAmended | Domain Event | (raised on `bump_version`) |

### Supporting Domain: Compliance Context

| Concept | DDD Type | Python Class |
|---|---|---|
| ComplianceGate | Domain Service (stateless) | `ComplianceGate` |
| ComplianceReport | Value Object | `ComplianceReport` |
| ComplianceViolation | Value Object | `ComplianceViolation` |

### Context Map

```
[Governance Context] ──── shared kernel (EnforcementLevel, PrincipleCategory) ────
       │                                                                            │
       │  Constitution (owns state; saves/loads Markdown)                          │
       │                                                                            ▼
       └──────── read-only reference ──────────────────────> [Compliance Context]
                                                              ComplianceGate (reads Constitution,
                                                              never mutates it)
```

---

## Constitution Check

*The module's own principles apply to this implementation plan.*

| Principle | Status |
|---|---|
| Test-First Development | ✅ Tests written before / alongside implementation |
| Architecture Consistency | ✅ Domain model is the single source of truth; API only wraps it |
| Security by Design | ✅ No secrets, no external data sources; artifact paths are validated |
| Spec-Driven Workflow | ✅ This plan was produced from `spec.md` |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-module-1-constitution-engine/
├── spec.md          ← Specification (DDD domains, user stories, test cases)
└── plan.md          ← This file (implementation plan)
```

### Source Code

```text
src/specify_cli/
└── constitution.py          ← Domain model (COMPLETE — no changes required)

src/specforge_api/           ← NEW: FastAPI application package
├── __init__.py
├── main.py                  ← FastAPI app factory; mounts all routers
├── config.py                ← Configuration (projects_root path, etc.)
├── schemas/
│   └── constitution.py      ← Pydantic request/response schemas
└── routers/
    └── constitution.py      ← Four REST endpoints for Module 1

tests/
├── test_constitution.py               ← Existing unit tests (DO NOT MODIFY)
└── test_constitution_acceptance.py    ← NEW: acceptance tests (User Stories 1–8)
```

---

## Phased Implementation Plan

### Phase 0 — Acceptance Tests (User Stories 1–5, US-7, US-8)

**Goal**: Write failing acceptance tests for the domain model that prove each user  
story end-to-end. These tests exercise the Python API in realistic, combined  
scenarios rather than isolated unit tests.

**Tasks**:

- [ ] **T0-01** — Create `tests/test_constitution_acceptance.py`
  - `TestUS1_BootstrapFromTemplate` — covers US-1 scenarios 1–3
  - `TestUS2_ManagePrinciples` — covers US-2 scenarios 1–6
  - `TestUS3_ComplianceGate` — covers US-3 scenarios 1–6
  - `TestUS4_SemanticVersioning` — covers US-4 scenarios 1–5
  - `TestUS5_SaveAndLoad` — covers US-5 scenarios 1–4
  - `TestUS7_FilterByCategory` — covers US-7 scenarios 1–2
  - `TestUS8_ComplianceReport` — covers US-8 scenarios 1–3

- [ ] **T0-02** — Run acceptance tests → all pass (domain model already complete).

**Exit criteria**: `pytest tests/test_constitution_acceptance.py -v` → 100% pass.

---

### Phase 1 — Pydantic Schemas

**Goal**: Define the data transfer objects (request bodies and response models)  
that the FastAPI layer will use.  No logic — only structure.

**Tasks**:

- [ ] **T1-01** — Create `src/specforge_api/__init__.py` (empty marker)
- [ ] **T1-02** — Create `src/specforge_api/config.py`
  - `Settings` class with `projects_root: Path` (configurable via `SPECFORGE_PROJECTS_ROOT` env var; default `./projects`)
- [ ] **T1-03** — Create `src/specforge_api/schemas/constitution.py`
  - `PrincipleSchema` — mirrors `Principle` fields
  - `ConstitutionResponse` — full constitution payload
  - `ConstitutionCreateRequest` — `project_name`, optional `principles`
  - `ComplianceCheckRequest` — `artifact_path: str`
  - `ComplianceViolationSchema` — mirrors `ComplianceViolation`
  - `ComplianceReportResponse` — `passed`, `blocking_violations`, `warning_violations`, `summary`
  - `AmendmentRecord` — `version`, `amended_date` (for history endpoint)
  - `ConstitutionHistoryResponse` — `project_name`, `amendments: list[AmendmentRecord]`

**Exit criteria**: `from specforge_api.schemas.constitution import ConstitutionResponse` imports without error.

---

### Phase 2 — FastAPI Router

**Goal**: Implement the four REST endpoints documented in FR-022 – FR-025.

**Tasks**:

- [ ] **T2-01** — Create `src/specforge_api/routers/constitution.py`

  ```
  GET  /api/v1/projects/{project_id}/constitution        → ConstitutionResponse | 404
  POST /api/v1/projects/{project_id}/constitution        → ConstitutionResponse | 201
  POST /api/v1/projects/{project_id}/constitution/check  → ComplianceReportResponse | 200
  GET  /api/v1/projects/{project_id}/constitution/history → ConstitutionHistoryResponse | 200
  ```

  Implementation notes:
  - Each endpoint resolves the `constitution.md` path as  
    `{projects_root}/{project_id}/constitution.md`
  - `GET` → `Constitution.load(path)` or `HTTPException(404)`
  - `POST` → `Constitution(project_name, principles)` → `constitution.save(path)` → HTTP 201
  - `POST .../check` → `Constitution.load(path)` → `ComplianceGate(constitution).check(artifact)` → `ComplianceReportResponse`
  - `GET .../history` → parse version + dates from existing file; return one amendment record per known version (MVP: single record from current file)

- [ ] **T2-02** — Create `src/specforge_api/main.py`
  - `create_app()` factory function
  - Mount the constitution router with prefix `/api/v1`

**Exit criteria**: All four route functions defined and importable.

---

### Phase 3 — API Integration Tests (User Story 6)

**Goal**: Write and pass integration tests for the FastAPI layer using  
`httpx.AsyncClient` and a temporary `projects_root` directory.

**Tasks**:

- [ ] **T3-01** — Create `tests/test_constitution_api.py`
  - `TestGetConstitution` — 200 with data, 404 without file
  - `TestCreateConstitution` — 201 creates file, body reflects saved data
  - `TestComplianceCheck` — 200 with passing artifact, 200 with failing artifact (violations present)
  - `TestConstitutionHistory` — 200 with amendment records

- [ ] **T3-02** — Run full test suite: `pytest tests/ -v` → all tests pass.

**Exit criteria**: `pytest tests/test_constitution_api.py -v` → 100% pass.

---

### Phase 4 — Package Integration

**Goal**: Register the new `specforge_api` package so it is importable and  
optionally installable.

**Tasks**:

- [ ] **T4-01** — Update `pyproject.toml`
  - Add `[project.optional-dependencies] api = ["fastapi>=0.110", "uvicorn[standard]>=0.29", "pydantic>=2.0"]`
  - Ensure `packages` includes `specforge_api` in addition to `specify_cli`

- [ ] **T4-02** — Verify `pip install -e ".[api]"` succeeds and `python -c "from specforge_api.main import create_app"` works.

**Exit criteria**: Package installs cleanly; imports succeed.

---

### Phase 5 — Final Validation

**Tasks**:

- [ ] **T5-01** — Run full test suite: `pytest tests/ -v --tb=short` → all existing + new tests pass.
- [ ] **T5-02** — Check linting: `ruff check src/ tests/` (if ruff configured) or `flake8`.
- [ ] **T5-03** — Run code review tool.
- [ ] **T5-04** — Run CodeQL security scan.

---

## Test Strategy

### Test Pyramid

```
          ┌─────────────────────┐
          │   Acceptance Tests  │  ← 30+ new tests in test_constitution_acceptance.py
          │   (user stories)    │    High-level, realistic scenarios
          ├─────────────────────┤
          │  Integration Tests  │  ← 20+ new tests in test_constitution_api.py
          │  (REST API layer)   │    FastAPI test client + tmp disk fixtures
          ├─────────────────────┤
          │     Unit Tests      │  ← 39 existing tests in test_constitution.py
          │   (domain model)    │    Fast, isolated, no I/O (except tmp_path)
          └─────────────────────┘
```

### Coverage Targets

| File | Target Coverage |
|---|---|
| `src/specify_cli/constitution.py` | ≥ 95% (currently ~90% from unit tests alone) |
| `src/specforge_api/routers/constitution.py` | ≥ 90% |
| `src/specforge_api/schemas/constitution.py` | ≥ 80% |

---

## Complexity Tracking

> No Constitution violations require justification.

| Decision | Rationale |
|---|---|
| File-based persistence (not SQLite/PostgreSQL) | Module 1 explicitly defers database to future module; Markdown-on-disk is the canonical SDD artifact format and keeps the module dependency-free |
| FastAPI over Flask/Django | FastAPI's async-native Pydantic integration matches the domain model's dataclass structure naturally; also consistent with SpecForge's stated architecture |
| Separate `specforge_api` package | Keeps the CLI (`specify_cli`) dependency-free; API deps are optional-install via `[api]` extra |
| No React UI in this iteration | React UI is a separate, larger workstream; the API layer is the correct integration boundary for this plan |
