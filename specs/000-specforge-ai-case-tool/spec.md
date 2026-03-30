# Product Roadmap: SpecForge

**Feature Branch**: `000-specforge-ai-case-tool`  
**Created**: 2026-03-27  
**Updated**: 2026-03-28  
**Status**: Draft — Revised (React-First Visual Modules)  
**Type**: AI-Powered CASE Tool — Product Roadmap & Specification

---

## 🏷️ Project Baptism

### Name: **SpecForge**

> *"Where intent becomes software."*

**SpecForge** is an AI-powered Computer-Aided Software Engineering (CASE) tool built on top of the Spec-Driven Development (SDD) methodology pioneered by SpecKit. It evolves SpecKit from a CLI toolkit into a full-featured, **visually interactive web application** where teams can evolve their software through structured AI-guided specification, planning, and implementation — one feature at a time, with full visibility into the entire development lifecycle.

The name **Forge** reflects the core metaphor: raw ideas and requirements are **forged** through fire (AI reasoning), structure (specs and plans), and craft (implementation) into high-quality software.

**Tagline**: *AI that builds from your intent, not your guesses.*

---

## Overview

SpecForge provides an end-to-end CASE platform that enables software teams to:

1. Capture and evolve product intent through AI-assisted specifications
2. Automatically generate implementation plans from specs
3. Break work into executable, traceable tasks
4. Implement features using configurable AI coding agents
5. Validate quality against the original intent
6. Evolve their product over time with full spec-driven traceability

SpecForge is built around the **six-phase SDD workflow** and exposes each phase as an **interactive, visual module** that users can engage with through a **React web application**. The React front-end communicates with a Python API layer that wraps the existing SpecKit/SpecForge domain models (such as the Module 1 Constitution Engine already implemented in `src/specify_cli/constitution.py`). Teams can start with just the first module and expand over time.

> **Design Principle — Visual-First**: Every module MUST expose a React-based user interface as its primary interaction surface. CLI access remains available for automation and scripting, but the **React app is the canonical product interface**. No module is considered "done" until it has a functional, tested React UI.

---

## Architecture Overview

SpecForge is a **full-stack web application** with the following layers:

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React (TypeScript) + Vite | Visual module interfaces, real-time feedback |
| **Component Library** | shadcn/ui + Tailwind CSS | Consistent, accessible UI components |
| **State Management** | Zustand or React Query | Client-side state + server data synchronization |
| **API Layer** | FastAPI (Python) | Thin REST/WebSocket bridge exposing domain models |
| **Domain Models** | Python (`src/specify_cli/`) | Core business logic (Constitution Engine, etc.) |
| **AI Integration** | LangChain / direct API calls | AI-guided wizards and content generation |
| **Persistence** | SQLite (dev) → PostgreSQL (prod) | Structured storage of all SDD artifacts |

The **Constitution Engine** already implemented in `src/specify_cli/constitution.py` (`Constitution`, `Principle`, `ComplianceGate` entities — verified, 39 passing tests) serves as the reference implementation that the Module 1 React UI wraps via the FastAPI layer. No reimplementation is required; only the API bridge needs to be added.

---

## Major Modules & Feature Roadmap

The product is organized into **eight major modules**, each corresponding to a phase or cross-cutting concern in the Spec-Driven Development lifecycle. **Every module includes a dedicated React interface** — this is a hard requirement, not an optional enhancement.

---

### Module 1 — **Constitution Engine** *(Principles & Governance)*

**Phase**: Pre-development setup  
**Priority**: P1 — Foundation for all subsequent modules  
**SDD Step**: `speckit.constitution`  
**Status**: Domain model implemented (`src/specify_cli/constitution.py`) — React UI required

**What it does**: Enables teams to define, store, version, and enforce the governing principles that every AI-generated artifact must comply with. The Constitution is the DNA of the project. **The existing Python domain model (Principle, Constitution, ComplianceGate) is exposed via a FastAPI endpoint and consumed by the React UI below.**

**Key Features**:

- AI-guided constitution wizard that interviews the team to generate project principles
- Customizable principle categories: architecture, testing, security, performance, workflow
- Constitution version control — track amendments over time
- Automatic constitution compliance gate before plan and task generation
- Export to all supported AI agent formats (Claude, Gemini, Copilot, Cursor, etc.)

**Visual Interface (React)**:

- **`ConstitutionWizard`** — multi-step form that guides the user through defining each principle category; connects to the AI interview flow and previews the generated `constitution.md` in real time
- **`PrincipleCard`** — editable card component for a single `Principle`, showing name, description, enforcement level badge (`MUST` / `SHOULD` / `MAY`) and category icon; supports inline editing
- **`ConstitutionEditor`** — full-page editor listing all principles in grouped category sections; allows drag-and-drop reordering, add/remove, and bulk export
- **`ComplianceGateBadge`** — visual indicator (green ✓ / red ✗ / yellow ⚠) showing whether a given artifact passes the current constitution; used across all module screens
- **`ConstitutionVersionHistory`** — timeline view of all constitution amendments with diff highlighting between versions

**Key Entities** *(already implemented in `src/specify_cli/constitution.py`)*:

- `Constitution` — versioned set of governing principles
- `Principle` — individual rule with name, description, and enforcement level
- `ComplianceGate` — automated check that validates plan/task documents against the constitution

**API Endpoints** (FastAPI, wraps existing domain model):

- `GET /api/v1/projects/{project_id}/constitution` — load constitution
- `POST /api/v1/projects/{project_id}/constitution` — create or update constitution
- `POST /api/v1/projects/{project_id}/constitution/check` — run `ComplianceGate` against an artifact
- `GET /api/v1/projects/{project_id}/constitution/history` — list amendment history

---

### Module 2 — **Specification Studio** *(Requirements Intelligence)*

**Phase**: Requirements definition  
**Priority**: P1 — Core user-facing value proposition  
**SDD Step**: `speckit.specify` + `speckit.clarify`

**What it does**: Transforms vague ideas into structured, prioritized feature specifications through AI dialogue. The specification is the source of truth that all other artifacts derive from.

**Key Features**:

- Natural language feature description → full structured spec (user stories, acceptance scenarios, requirements)
- AI-powered clarification mode: surfaces ambiguities, contradictions, and under-specified areas
- User story prioritization (P1, P2, P3) with independent testability validation
- Given/When/Then scenario builder for acceptance criteria
- Functional requirements auto-numbering (FR-001, FR-002...)
- Spec diff viewer — visual comparison between spec versions
- Branch-per-feature workflow: each spec lives on a dedicated feature branch
- Multi-language spec authoring with English as canonical language

**Visual Interface (React)**:

- **`SpecEditor`** — split-pane editor with a structured form on the left and a live Markdown preview on the right; supports inline AI suggestions
- **`UserStoryBoard`** — Kanban-style board of user stories organized by priority (P1 / P2 / P3) with drag-and-drop reprioritization
- **`ScenarioBuilder`** — visual Given/When/Then form for building acceptance scenarios; validates completeness before saving
- **`ClarificationPanel`** — side panel listing all `[NEEDS CLARIFICATION]` markers with AI-suggested resolutions; one-click accept/reject per item
- **`SpecDiffViewer`** — side-by-side diff of two spec versions with color-coded additions and removals
- **`RequirementsList`** — sortable, filterable table of functional requirements with traceability links to user stories

**Key Entities**:

- `Spec` — complete feature specification document
- `UserStory` — prioritized user journey with acceptance scenarios
- `AcceptanceScenario` — Given/When/Then test condition
- `FunctionalRequirement` — numbered, traceable requirement
- `ClarificationItem` — identified ambiguity with resolution status

---

### Module 3 — **Architecture Planner** *(Technical Design & Research)*

**Phase**: Technical planning  
**Priority**: P1 — Required before task generation  
**SDD Step**: `speckit.plan`

**What it does**: Converts specifications into detailed implementation plans including technology choices, project structure, and data models. AI research agents investigate technical options and organizational constraints automatically.

**Key Features**:

- AI research agent pipeline: investigates libraries, frameworks, benchmarks, and security implications
- Technology stack selection with documented rationale
- Project structure generator (single project, web app, mobile + API)
- Data model designer with entity-relationship visualization
- API contract generator (OpenAPI/GraphQL schemas)
- Constitution compliance gate before implementation begins
- Complexity tracking — justifications for architectural trade-offs
- Quickstart validation scenario generator
- Plan-to-spec traceability matrix

**Visual Interface (React)**:

- **`TechStackSelector`** — interactive card grid for choosing languages, frameworks, and databases; each card shows AI-researched pros/cons and community health metrics
- **`ERDiagram`** — interactive entity-relationship diagram built with React Flow; drag nodes to arrange, click to edit field definitions
- **`ProjectTreePreview`** — collapsible file-tree component showing the generated directory structure with annotations for each key directory
- **`ResearchReportViewer`** — structured viewer for AI research reports with collapsible sections per evaluated option; links back to source citations
- **`APIContractEditor`** — OpenAPI schema editor with syntax highlighting and live validation; renders a visual endpoint list alongside the raw YAML/JSON
- **`PlanComplianceCheck`** — runs `ComplianceGate` (Module 1) against the generated plan and displays results inline before the user can proceed

**Key Entities**:

- `Plan` — complete technical implementation plan
- `ResearchReport` — AI-generated investigation of technical options
- `DataModel` — entity definitions and relationships
- `APIContract` — service interface definition (OpenAPI, GraphQL, etc.)
- `ProjectStructure` — directory layout for the implementation

---

### Module 4 — **Task Forge** *(Task Orchestration & Management)*

**Phase**: Task breakdown  
**Priority**: P1 — Required before implementation  
**SDD Step**: `speckit.tasks`

**What it does**: Transforms implementation plans into a structured, phased task list with explicit parallelization opportunities, dependencies, and user-story traceability.

**Key Features**:

- Automatic 6-phase task structure (Setup → Foundational → US1 → US2 → US3 → Polish)
- Parallel task identification — marks tasks that can run concurrently `[P]`
- Story-to-task traceability: every task maps back to a user story
- Task dependency graph visualization (DAG)
- Checkpoint gates between phases for independent user story validation
- Task status tracking: pending → in-progress → blocked → complete
- GitHub Issues export (`speckit.taskstoissues`)
- Test-first enforcement: test tasks generated before implementation tasks
- Incremental delivery planner: MVP (P1 only) → Full product (P1 + P2 + P3)

**Visual Interface (React)**:

- **`TaskBoard`** — phase-grouped Kanban board with columns for each SDD phase; cards show task ID, parallelism badge `[P]`, status color, and story link
- **`DependencyGraph`** — interactive DAG visualization (React Flow) showing task dependencies; highlights the critical path; blocked tasks shown in red
- **`CheckpointGate`** — modal dialog with a checklist of exit criteria before advancing to the next phase; shows constitution compliance status
- **`TaskStatusTracker`** — sidebar showing overall progress: tasks complete per phase, blocked count, estimated remaining work
- **`GitHubIssuesExport`** — preview panel showing which tasks will be exported as GitHub Issues, with label and assignee mapping

**Key Entities**:

- `TaskList` — ordered set of implementation tasks for a feature
- `Task` — individual unit of work with ID, parallelism flag, and story link
- `Phase` — grouped set of tasks (Setup, Foundational, US1, US2, US3, Polish)
- `Checkpoint` — validation gate between phases
- `DependencyGraph` — directed acyclic graph of task dependencies

---

### Module 5 — **AI Agent Hub** *(Multi-Agent Integration Platform)*

**Phase**: Cross-cutting  
**Priority**: P1 — Enables actual code generation  
**SDD Step**: Underlies `speckit.implement`

**What it does**: Manages the integration with AI coding agents (Claude, Gemini, GitHub Copilot, Cursor, etc.) and routes specification artifacts to the appropriate agent for implementation.

**Key Features**:

- Unified agent configuration — one setup, multiple agents
- Agent capability matrix: which agents support which SpecForge modules
- Command file generation for all 23+ supported agents in native formats (Markdown, TOML)
- Agent-specific directory scaffolding (`.claude/commands/`, `.gemini/commands/`, etc.)
- Agent health check: CLI availability, version validation
- Agent context file management: auto-updates agent memory with current spec/plan state
- Custom agent onboarding wizard for new agents not yet in the catalog
- Extension system: community-contributed agent integrations

**Visual Interface (React)**:

- **`AgentCatalog`** — grid of agent cards (logo, name, status: installed / not found / updating); click to configure or add a new agent
- **`AgentCapabilityMatrix`** — interactive table showing which SpecForge modules each configured agent supports; cells are color-coded by support level
- **`AgentSetupWizard`** — guided multi-step form for onboarding a new agent: detect CLI, set directory, preview generated command files
- **`CommandFilePreview`** — syntax-highlighted preview of generated command files in their native format (Markdown / TOML) with copy-to-clipboard
- **`AgentHealthDashboard`** — real-time health panel showing CLI version, last context update timestamp, and any validation warnings per agent

**Key Entities**:

- `Agent` — AI coding assistant configuration (CLI tool, directory, format)
- `AgentCommand` — generated prompt file for a specific SpecKit command
- `AgentContext` — current project state file fed to the agent as memory
- `Extension` — community-contributed capability plugin

---

### Module 6 — **Implement & Execute** *(AI-Driven Code Generation)*

**Phase**: Implementation  
**Priority**: P2 — Depends on Modules 2–5  
**SDD Step**: `speckit.implement`

**What it does**: Orchestrates the execution of tasks through AI coding agents, providing real-time progress tracking, error recovery, and code review against the original specification.

**Key Features**:

- One-click task execution: sends task context to the selected AI agent
- Task-by-task execution with checkpoint validation
- Spec compliance checker: validates generated code against functional requirements
- Parallel task launcher: executes `[P]` tasks concurrently
- Automatic branch management: creates and commits to the feature branch
- Error recovery suggestions: AI-powered guidance when implementation fails
- Incremental delivery tracker: shows which user stories are complete and testable
- Rollback support: revert to last valid checkpoint

**Visual Interface (React)**:

- **`ExecutionConsole`** — terminal-style live log panel (using xterm.js embedded in React) showing AI agent output in real time; supports pause, resume, and copy
- **`TaskQueue`** — ordered list of tasks with live status icons; currently executing task pulsates; completed tasks show green checkmark with elapsed time
- **`ParallelExecutionLanes`** — multi-lane view for `[P]` tasks running concurrently; each lane shows an independent progress bar and log tail
- **`ComplianceReportPanel`** — side-by-side spec requirement vs. generated code diff with pass/fail badges per requirement
- **`RollbackDialog`** — modal for selecting a previous checkpoint to roll back to; shows a diff of what will be reverted

**Key Entities**:

- `ExecutionSession` — active implementation run with task queue and state
- `TaskResult` — outcome of executing a single task (success, failure, partial)
- `ComplianceReport` — spec-vs-code validation result
- `Checkpoint` — validated state after a user story phase completes

---

### Module 7 — **Quality Guardian** *(Testing & Validation)*

**Phase**: Verification  
**Priority**: P2 — Critical for production readiness  
**SDD Step**: `speckit.analyze` + `speckit.checklist`

**What it does**: Validates that implemented features fulfill the original specification through AI-powered analysis, acceptance test generation, and custom quality checklists.

**Key Features**:

- Acceptance scenario → test case generator (unit, integration, contract)
- Cross-artifact consistency analysis: spec ↔ plan ↔ tasks ↔ code alignment
- Custom quality checklist builder with category-based tracking
- AI analysis report: ambiguities, gaps, and contradictions in spec/plan/tasks
- Test coverage mapping: which acceptance scenarios have corresponding tests
- Performance benchmark validator against plan constraints
- Security requirements compliance checker (from constitution)
- Quickstart scenario validator: end-to-end validation from `quickstart.md`

**Visual Interface (React)**:

- **`TestSuiteViewer`** — tree view of generated test cases grouped by acceptance scenario; each node shows test type (unit/integration/contract), status badge, and link to the source scenario
- **`ConsistencyHeatmap`** — matrix visualization of artifact alignment (spec ↔ plan ↔ tasks ↔ code); cells colored by consistency score; click to drill into the specific gap
- **`ChecklistBuilder`** — drag-and-drop checklist editor with category grouping, item status toggle (pass / fail / skip), and progress bar per category
- **`AnalysisReportViewer`** — structured AI report with severity-sorted findings; each finding links to the artifact and line where the issue was detected
- **`CoverageMap`** — visual mapping of which acceptance scenarios have associated tests; uncovered scenarios highlighted in amber

**Key Entities**:

- `TestSuite` — generated test cases derived from acceptance scenarios
- `AnalysisReport` — AI consistency check result across all artifacts
- `Checklist` — custom quality verification list by category
- `ChecklistItem` — individual verification step with status

---

### Module 8 — **Project Dashboard** *(Visibility & Team Collaboration)*

**Phase**: Cross-cutting  
**Priority**: P1 — Required from v0.1 as the app entry point  
**SDD Step**: Cross-cutting visibility

**What it does**: Serves as the **main application shell** and entry point of the SpecForge React app. Provides a unified view of all specs, plans, tasks, and implementation progress across all features in the project. Enables teams to collaborate, review, and evolve the product roadmap over time.

**Key Features**:

- Feature portfolio view: all specs with status (Draft → Planned → In Progress → Done)
- SDD phase status per feature: constitution ✓ → spec ✓ → plan ✓ → tasks ✓ → implement ✓
- Team assignment and collaboration on specs and plans
- Spec review workflow: comment, suggest, approve
- Roadmap timeline: feature delivery forecast based on task complexity
- Metrics dashboard: spec quality scores, implementation velocity, compliance rates
- Changelog auto-generation from merged spec branches
- Notification system: spec updates, blocked tasks, checkpoint completions
- Integration with GitHub Issues, GitHub Projects, and GitHub Actions

**Visual Interface (React)**:

- **`AppShell`** — root layout with top navigation bar (project switcher, notifications, user avatar), left sidebar (module navigator), and main content area; rendered by React Router
- **`FeaturePortfolio`** — card grid of all features with SDD phase progress steps (constitution → spec → plan → tasks → done); filterable by status and phase
- **`SDDPhaseTimeline`** — horizontal swimlane chart showing each feature's phase progression over calendar time (Gantt-style); hover for details
- **`ReviewWorkflow`** — spec review screen with inline comment threads (similar to GitHub PR review); supports suggest-edit mode
- **`MetricsDashboard`** — charts (recharts) showing spec quality over time, task velocity, and compliance pass rates
- **`NotificationCenter`** — dropdown panel for real-time notifications (WebSocket-based) with read/unread state and deep links to the relevant artifact

**Key Entities**:

- `Project` — top-level container for all specs and features
- `FeatureStatus` — lifecycle state of a feature across all SDD phases
- `ReviewThread` — collaborative discussion on a spec or plan artifact
- `TeamMember` — project collaborator with role and permissions

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Getting Started: From Idea to First Spec via the React App (Priority: P1)

A solo developer or product manager opens the SpecForge web app in their browser, sees the **FeaturePortfolio** dashboard, clicks "New Feature", and is guided through the **ConstitutionWizard** to define governing principles. They then describe their idea in plain language in the **SpecEditor** and within minutes have a structured specification with user stories, acceptance criteria, and functional requirements — all visible in the React UI — ready to share with their team.

**Why this priority**: This is the core value proposition of SpecForge. The React UI is the primary interface; the user must be able to go from zero to a complete spec entirely within the app without touching the CLI.

**Independent Test**: Can be fully tested by opening the app, entering a feature description in the `SpecEditor`, and validating that a structured spec is displayed with at least one user story (with Given/When/Then scenarios), at least three functional requirements, and a success criteria section — all rendered visually in the React UI.

**Acceptance Scenarios**:

1. **Given** a user has created a project with a constitution via the `ConstitutionWizard`, **When** they type a feature description in the `SpecEditor` and click "Generate Spec", **Then** the UI renders a spec with at least one P1 user story, three functional requirements, and measurable success criteria
2. **Given** the spec is generated and displayed, **When** the user clicks "Clarify" in the `ClarificationPanel`, **Then** the AI surfaces at least two ambiguities (e.g., password policy, session expiry) with proposed resolutions shown as interactive cards
3. **Given** ambiguities are shown in the `ClarificationPanel`, **When** the user accepts or edits each resolution, **Then** the `SpecEditor` updates in real time and the clarification panel empties

---

### User Story 2 — From Spec to Implementation Plan (Priority: P1)

A technical lead views a finished spec in the React app, clicks "Generate Plan" in the **Architecture Planner** module, selects a tech stack using the **TechStackSelector**, and sees the **ERDiagram** and **ProjectTreePreview** populate automatically. The **PlanComplianceCheck** badge confirms constitution compliance before they proceed.

**Why this priority**: The plan is the bridge between the "what" (spec) and the "how" (tasks + code). Without a plan, tasks cannot be generated.

**Independent Test**: Can be tested by providing a completed spec and clicking "Generate Plan"; validate that the UI renders a tech stack selection, a project tree, an ER diagram with at least two entities, and a passing compliance badge.

**Acceptance Scenarios**:

1. **Given** a completed spec, **When** the user selects a tech stack via `TechStackSelector` and clicks "Generate Plan", **Then** the `ProjectTreePreview` and `ERDiagram` render with the plan contents, and the `ComplianceGateBadge` shows green
2. **Given** a plan is generated, **When** the research phase completes, **Then** the `ResearchReportViewer` shows at least three library options with pros/cons
3. **Given** a plan with data entities, **When** the data model phase completes, **Then** the `ERDiagram` renders all entities and their relationships interactively

---

### User Story 3 — From Plan to Tasks and Visual Execution (Priority: P1)

A developer views a complete plan in the React app, clicks "Generate Tasks" in the **Task Forge** module, sees the **TaskBoard** populate with phases and cards, and then launches task execution via the **ExecutionConsole** — tracking progress visually task by task until the feature checkpoint passes.

**Why this priority**: Task generation + execution is the final mile that produces working software. The visual tracking is what distinguishes SpecForge from running scripts manually.

**Independent Test**: Can be tested by providing plan.md and spec.md and clicking "Generate Tasks"; validate that the `TaskBoard` renders at minimum 3 phases, at least one `[P]` badge on a task card, and at least one checkpoint gate.

**Acceptance Scenarios**:

1. **Given** a complete plan and spec, **When** the user clicks "Generate Tasks", **Then** the `TaskBoard` renders at least 3 phases, each user story in its own column, and parallelizable tasks with a `[P]` badge
2. **Given** a tasks board, **When** the user launches Phase 3 (User Story 1) via the `ExecutionConsole`, **Then** all P1 task cards turn green and the `CheckpointGate` modal shows a passing validation with independently runnable tests
3. **Given** all phases completed, **When** the user clicks "Run Quickstart Validation", **Then** all acceptance scenarios from the original spec show green checkmarks in the `TestSuiteViewer`

---

### User Story 4 — Multi-Agent & Team Collaboration (Priority: P2)

A team of developers using different AI tools (one using Claude, another using Cursor, another using GitHub Copilot) all work on the same SpecForge project. The **AgentCatalog** UI shows all configured agents, and the **AgentCapabilityMatrix** lets the team verify each agent's support level. The **ConstitutionEditor** and **SpecEditor** show which agents have up-to-date context files.

**Why this priority**: Teams rarely use a single AI tool. Multi-agent support is what makes SpecForge a team platform, not just a solo tool.

**Independent Test**: Can be tested by opening the AgentCatalog and confirming that configured agents show correct health status, capability matrix entries, and generated command file previews via `CommandFilePreview`.

**Acceptance Scenarios**:

1. **Given** a project configured with three agents in `AgentCatalog`, **When** each developer runs the `speckit.specify` command via their own agent, **Then** the same structured spec is produced and all three agents' context files show "Up to date" in `AgentHealthDashboard`
2. **Given** a spec is updated, **When** the user clicks "Sync All Agents" in the `AgentHealthDashboard`, **Then** all agent context files update and the timestamps refresh in the UI

---

### User Story 5 — Quality Assurance & Roadmap Evolution via Dashboard (Priority: P1)

A product manager opens SpecForge and lands on the **FeaturePortfolio** (now P1 as it is the app entry point). They see all features across the SDD lifecycle, click into the **ConsistencyHeatmap** in the Quality Guardian module to detect gaps, and navigate to **SDDPhaseTimeline** to update the roadmap for the next sprint.

**Why this priority**: The Dashboard is now P1 because it is the app shell — the entry point that frames all other modules. Without it, there is no app to open.

**Independent Test**: Can be tested with a project containing at least two features in different SDD phases by validating that `FeaturePortfolio` shows each feature with its correct phase status and progress steps.

**Acceptance Scenarios**:

1. **Given** a project with multiple features in different phases, **When** the user opens the SpecForge app, **Then** `FeaturePortfolio` shows each feature with its SDD phase progress steps and completion percentage
2. **Given** a spec and plan with inconsistencies, **When** the user opens `ConsistencyHeatmap` in Module 7, **Then** the cells with gaps are colored amber/red and clicking one opens the artifact at the exact location of the inconsistency

---

### Edge Cases

- What happens when a spec references entities that conflict with the constitution (e.g., a spec requires real-time data but the constitution forbids WebSockets)?
- How does the system handle a plan generated against a spec that was subsequently updated?
- What happens when an AI agent fails to implement a task — does the system retry, skip, or halt?
- How does spec versioning work when multiple team members edit the same spec simultaneously?
- What happens when a task marked `[P]` has an undeclared dependency on another parallel task?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create a project with a constitution defining governing principles via the React `ConstitutionWizard` UI
- **FR-002**: System MUST generate a structured spec from a natural language feature description and render it in the React `SpecEditor`
- **FR-003**: System MUST identify and surface spec ambiguities through AI clarification, displayed as interactive cards in the `ClarificationPanel`
- **FR-004**: System MUST generate a technical plan and render it visually via `TechStackSelector`, `ERDiagram`, and `ProjectTreePreview` React components
- **FR-005**: System MUST generate a phased, parallelized task list and render it in the React `TaskBoard` with phase columns and `[P]` badges
- **FR-006**: System MUST support all 23+ AI coding agents in the SpecKit agent catalog and display them in the `AgentCatalog` React UI
- **FR-007**: System MUST generate agent-specific command files in the correct format and directory for each configured agent, with previews shown in `CommandFilePreview`
- **FR-008**: System MUST validate spec and plan compliance against the project constitution and display the result via `ComplianceGateBadge` inline on every module screen
- **FR-009**: System MUST track task execution progress with per-task status and phase checkpoints, displayed in real time in the `ExecutionConsole` and `TaskQueue`
- **FR-010**: System MUST generate tests derived from acceptance scenarios before implementation tasks and show them in the `TestSuiteViewer`
- **FR-011**: System MUST provide cross-artifact consistency analysis (spec ↔ plan ↔ tasks ↔ code) rendered as a `ConsistencyHeatmap`
- **FR-012**: System MUST support feature-branch-per-spec workflow integrated with git
- **FR-013**: System MUST allow teams to review, comment, and approve specs collaboratively via the `ReviewWorkflow` component
- **FR-014**: System MUST provide a React `AppShell` that serves as the project dashboard and entry point, routing to each of the eight module interfaces
- **FR-015**: System MUST expose all domain model operations (Constitution Engine, etc.) via a FastAPI REST layer consumed by the React frontend
- **FR-016**: The React frontend MUST be built with TypeScript and Vite; the component library MUST be based on shadcn/ui + Tailwind CSS
- **FR-017**: The existing `Constitution`, `Principle`, and `ComplianceGate` entities implemented in `src/specify_cli/constitution.py` MUST be reused as-is through the FastAPI layer — no duplication in the frontend

### Key Entities

- **Project**: Top-level container; has a constitution, multiple features, and configured agents
- **Feature**: A single spec-plan-tasks-implementation lifecycle unit; lives on its own git branch
- **Spec**: Structured requirements document with user stories, acceptance scenarios, and requirements
- **Plan**: Technical implementation plan with tech stack, structure, data model, and contracts
- **Tasks**: Phased, parallelized task list traceable back to user stories and spec requirements
- **Agent**: Configured AI coding assistant with associated command files and context
- **CheckpointResult**: The outcome of an independent user story validation

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with no prior SDD experience can generate a complete spec, plan, and task list for a new feature in under 30 minutes entirely within the React web app — no CLI required
- **SC-002**: Generated specs achieve ≥90% coverage of the feature description (as evaluated by the AI analyzer)
- **SC-003**: Task execution through an AI agent achieves a ≥80% first-pass success rate (tasks complete without manual intervention)
- **SC-004**: All generated artifacts (spec, plan, tasks) are fully traceable — every task links to a user story, every user story links to functional requirements, all traceability is navigable through the React UI
- **SC-005**: The platform supports all 23+ agents in the SpecKit agent catalog with zero manual configuration beyond selecting the agent in `AgentCatalog`
- **SC-006**: Teams with 3+ developers using different AI agents can collaborate on the same project with no artifact conflicts
- **SC-007**: Cross-artifact analysis detects ≥95% of spec-plan-task inconsistencies introduced intentionally in test scenarios, surfaced in the `ConsistencyHeatmap`
- **SC-008**: All eight modules load and render their primary React component within 2 seconds on a standard broadband connection
- **SC-009**: The `ComplianceGateBadge` correctly reflects the current compliance status on every module screen without requiring a manual refresh

---

## Assumptions

- SpecForge builds upon SpecKit's existing CLI and template infrastructure (command files, templates, agent scaffolding); this infrastructure is **not replaced** — it is packaged as the backend logic exposed through FastAPI
- **The primary user-facing interface is a React web application (TypeScript + Vite + shadcn/ui + Tailwind CSS)**; the CLI infrastructure continues to power the backend, but users interact with SpecForge through the React app, not by invoking CLI commands directly
- The existing Python domain models in `src/specify_cli/` (especially the Module 1 Constitution Engine — `Constitution`, `Principle`, `ComplianceGate`, implemented and fully tested in `src/specify_cli/constitution.py` with 39 passing tests) are reused through a FastAPI REST layer; no domain logic is duplicated in the frontend
- Each module MUST deliver a functional React interface before it is considered complete — "CLI-only" is not an acceptable final state for any module
- The primary user persona is a software developer or technical product manager familiar with Git workflows
- Teams are assumed to use GitHub (or compatible git hosting) for version control
- AI agent CLI tools (claude, gemini, cursor-agent, etc.) must be pre-installed by the user; SpecForge manages configuration only
- Mobile support (iOS, Android) is out of scope for v1.0; the React app targets desktop/tablet browsers
- SpecForge is language-agnostic; it does not enforce any specific programming language or framework for the software being built

---

## Phased Delivery Plan

| Phase | Modules | Milestone |
|-------|---------|-----------|
| **v0.1 — React Foundation** | Module 8 (`AppShell` + `FeaturePortfolio`), Module 1 React UI (`ConstitutionWizard`, `ConstitutionEditor`, `ComplianceGateBadge`) wrapping existing Constitution Engine | React app running; users can create projects and define constitutions visually |
| **v0.2 — Spec & Plan** | Module 2 React UI (`SpecEditor`, `UserStoryBoard`, `ClarificationPanel`), Module 3 React UI (`TechStackSelector`, `ERDiagram`, `ProjectTreePreview`) | Complete SDD workflow phases 1–3 visible in the app |
| **v0.3 — Tasks & Execute** | Module 4 React UI (`TaskBoard`, `DependencyGraph`, `CheckpointGate`), Module 6 React UI (`ExecutionConsole`, `TaskQueue`, `ParallelExecutionLanes`) | End-to-end task generation and AI-driven execution with live visual progress |
| **v0.4 — Agent Hub & Quality** | Module 5 React UI (`AgentCatalog`, `AgentCapabilityMatrix`, `CommandFilePreview`), Module 7 React UI (`TestSuiteViewer`, `ConsistencyHeatmap`, `ChecklistBuilder`) | Multi-agent support and quality validation fully visual |
| **v1.0 — Platform** | Module 8 full (`ReviewWorkflow`, `MetricsDashboard`, `NotificationCenter`) + hardening | Team collaboration, metrics, notifications, and public release |

---

*Document created using SpecKit's Spec-Driven Development template.*  
*Revised 2026-03-28: modules redesigned as React visual interfaces; Architecture Overview and per-module Visual Interface sections added; CLI-first assumption replaced with React-first.*  
*Next steps: `/speckit.plan` to generate the technical implementation plan for the React app and FastAPI layer.*
