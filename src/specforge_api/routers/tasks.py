"""FastAPI router for the Task Forge (Module 4).

Endpoints
---------
GET  /api/v1/projects/{project_id}/tasks
POST /api/v1/projects/{project_id}/tasks
GET  /api/v1/projects/{project_id}/tasks/phases
POST /api/v1/projects/{project_id}/tasks/phases/{phase_type}
GET  /api/v1/projects/{project_id}/tasks/dependency-graph
PUT  /api/v1/projects/{project_id}/tasks/dependency-graph
GET  /api/v1/projects/{project_id}/tasks/github-export
GET  /api/v1/projects/{project_id}/tasks/progress
GET  /api/v1/projects/{project_id}/tasks/{task_id}
PUT  /api/v1/projects/{project_id}/tasks/{task_id}/status

NOTE: Static sub-paths (phases, dependency-graph, github-export, progress) are
registered BEFORE the parameterised {task_id} routes so FastAPI matches them
correctly in declaration order.
"""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from specify_cli.tasks import (
    DependencyEdge,
    PhaseType,
    Task,
    TaskList,
    TaskStatus,
)
from specforge_api.config import Settings, settings as default_settings
from specforge_api.schemas.tasks import (
    DependencyEdgeSchema,
    DependencyGraphRequest,
    DependencyGraphSchema,
    GitHubExportSchema,
    IssuePreviewSchema,
    PhaseSchema,
    ProgressSummarySchema,
    TaskCreateRequest,
    TaskListCreateRequest,
    TaskListResponse,
    TaskSchema,
    TaskStatusUpdateRequest,
)

router = APIRouter()


def _get_settings() -> Settings:
    return default_settings


def _tasks_path(project_id: str, projects_root: Path) -> Path:
    return projects_root / project_id / "tasks.yaml"


def _load_tasks_or_404(project_id: str, cfg: Settings) -> TaskList:
    path = _tasks_path(project_id, cfg.projects_root)
    try:
        return TaskList.load(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task list not found for project '{project_id}'",
        )


# ---------------------------------------------------------------------------
# Conversion helpers: domain → schema
# ---------------------------------------------------------------------------


def _task_schema(task: Task) -> TaskSchema:
    return TaskSchema(
        task_id=task.task_id,
        title=task.title,
        description=task.description,
        phase=task.phase.value,
        parallel=task.parallel,
        story_id=task.story_id,
        dependencies=task.dependencies,
        status=task.status.value,
        tags=task.tags,
    )


def _phase_schema(phase) -> PhaseSchema:
    return PhaseSchema(
        phase_type=phase.phase_type.value,
        tasks=[_task_schema(t) for t in phase.tasks],
    )


def _edge_schema(edge: DependencyEdge) -> DependencyEdgeSchema:
    return DependencyEdgeSchema(
        source_id=edge.source_id,
        target_id=edge.target_id,
        label=edge.label,
    )


def _to_task_list_response(tl: TaskList) -> TaskListResponse:
    return TaskListResponse(
        project_name=tl.project_name,
        plan_id=tl.plan_id,
        spec_id=tl.spec_id,
        version=tl.version,
        notes=tl.notes,
        phases=[_phase_schema(p) for p in tl.phases],
        dependency_edges=[_edge_schema(e) for e in tl.dependency_edges],
    )


# ---------------------------------------------------------------------------
# Conversion helpers: schema → domain
# ---------------------------------------------------------------------------


def _task_from_create(s: TaskCreateRequest, phase_type: PhaseType, seq: int) -> Task:
    task_id = f"{phase_type.value}-{seq:03d}"
    return Task(
        task_id=task_id,
        title=s.title,
        description=s.description,
        phase=phase_type,
        parallel=s.parallel,
        story_id=s.story_id,
        dependencies=s.dependencies,
        status=s.status,
        tags=s.tags,
    )


def _task_from_schema(s: TaskSchema) -> Task:
    return Task(
        task_id=s.task_id,
        title=s.title,
        description=s.description,
        phase=s.phase,
        parallel=s.parallel,
        story_id=s.story_id,
        dependencies=s.dependencies,
        status=s.status,
        tags=s.tags,
    )


def _edge_from_schema(s: DependencyEdgeSchema) -> DependencyEdge:
    return DependencyEdge(source_id=s.source_id, target_id=s.target_id, label=s.label)


# ---------------------------------------------------------------------------
# Task List endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/tasks",
    response_model=TaskListResponse,
    summary="Get the task list for a project",
)
def get_task_list(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> TaskListResponse:
    """Return the full task list for *project_id*, or 404 if absent."""
    tl = _load_tasks_or_404(project_id, cfg)
    return _to_task_list_response(tl)


@router.post(
    "/projects/{project_id}/tasks",
    response_model=TaskListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a task list for a project",
)
def create_task_list(
    project_id: str,
    body: TaskListCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> TaskListResponse:
    """Create and persist a new task list for *project_id*."""
    tl = TaskList(
        project_name=body.project_name,
        plan_id=body.plan_id,
        spec_id=body.spec_id,
        notes=body.notes,
    )
    for phase_schema in body.phases:
        for task_schema in phase_schema.tasks:
            tl.add_task(_task_from_schema(task_schema))
    if body.dependency_edges:
        tl.set_dependency_edges([_edge_from_schema(e) for e in body.dependency_edges])
    path = _tasks_path(project_id, cfg.projects_root)
    tl.save(path)
    return _to_task_list_response(tl)


# ---------------------------------------------------------------------------
# Phases
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/tasks/phases",
    response_model=list[PhaseSchema],
    summary="List all phases with their tasks",
)
def list_phases(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> list[PhaseSchema]:
    """Return all phases (in canonical order) for *project_id*'s task list."""
    tl = _load_tasks_or_404(project_id, cfg)
    return [_phase_schema(p) for p in tl.phases]


@router.post(
    "/projects/{project_id}/tasks/phases/{phase_type}",
    response_model=TaskSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Add a task to a phase",
)
def add_task_to_phase(
    project_id: str,
    phase_type: str,
    body: TaskCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> TaskSchema:
    """Append a new task to the specified phase of *project_id*'s task list."""
    try:
        pt = PhaseType(phase_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid phase_type '{phase_type}'. Must be one of: {[p.value for p in PhaseType]}",
        )
    tl = _load_tasks_or_404(project_id, cfg)
    seq = len(tl.get_phase(pt).tasks) + 1
    task = _task_from_create(body, pt, seq)
    tl.add_task(task)
    path = _tasks_path(project_id, cfg.projects_root)
    tl.save(path)
    return _task_schema(task)


# ---------------------------------------------------------------------------
# Dependency Graph  (must come before {task_id} route)
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/tasks/dependency-graph",
    response_model=DependencyGraphSchema,
    summary="Get the task dependency graph",
)
def get_dependency_graph(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> DependencyGraphSchema:
    """Return the dependency graph for *project_id*'s task list."""
    tl = _load_tasks_or_404(project_id, cfg)
    return DependencyGraphSchema(edges=[_edge_schema(e) for e in tl.dependency_edges])


@router.put(
    "/projects/{project_id}/tasks/dependency-graph",
    response_model=DependencyGraphSchema,
    summary="Set the task dependency graph",
)
def set_dependency_graph(
    project_id: str,
    body: DependencyGraphRequest,
    cfg: Settings = Depends(_get_settings),
) -> DependencyGraphSchema:
    """Replace the full dependency graph for *project_id*'s task list."""
    tl = _load_tasks_or_404(project_id, cfg)
    try:
        tl.set_dependency_edges([_edge_from_schema(e) for e in body.edges])
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    path = _tasks_path(project_id, cfg.projects_root)
    tl.save(path)
    return DependencyGraphSchema(edges=[_edge_schema(e) for e in tl.dependency_edges])


# ---------------------------------------------------------------------------
# GitHub Export  (must come before {task_id} route)
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/tasks/github-export",
    response_model=GitHubExportSchema,
    summary="Get GitHub Issues export preview",
)
def get_github_export(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> GitHubExportSchema:
    """Return a GitHub Issues export preview for all tasks in *project_id*."""
    tl = _load_tasks_or_404(project_id, cfg)
    previews = tl.github_export()
    return GitHubExportSchema(
        issues=[
            IssuePreviewSchema(
                task_id=p["task_id"],
                title=p["title"],
                body=p["body"],
                labels=p["labels"],
                milestone=p["milestone"],
            )
            for p in previews
        ]
    )


# ---------------------------------------------------------------------------
# Progress  (must come before {task_id} route)
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/tasks/progress",
    response_model=ProgressSummarySchema,
    summary="Get task progress summary",
)
def get_progress(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> ProgressSummarySchema:
    """Return a progress summary (counts by status and by phase) for *project_id*."""
    tl = _load_tasks_or_404(project_id, cfg)
    summary = tl.progress_summary()
    return ProgressSummarySchema(
        total=summary["total"],
        by_status=summary["by_status"],
        by_phase=summary["by_phase"],
    )


# ---------------------------------------------------------------------------
# Single Task endpoints  (parameterised — must come after all static routes)
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/tasks/{task_id}",
    response_model=TaskSchema,
    summary="Get a single task",
)
def get_task(
    project_id: str,
    task_id: str,
    cfg: Settings = Depends(_get_settings),
) -> TaskSchema:
    """Return a single task by *task_id*, or 404 if not found."""
    tl = _load_tasks_or_404(project_id, cfg)
    task = tl.get_task(task_id)
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found in project '{project_id}'",
        )
    return _task_schema(task)


@router.put(
    "/projects/{project_id}/tasks/{task_id}/status",
    response_model=TaskSchema,
    summary="Update a task's status",
)
def update_task_status(
    project_id: str,
    task_id: str,
    body: TaskStatusUpdateRequest,
    cfg: Settings = Depends(_get_settings),
) -> TaskSchema:
    """Set a new status on *task_id* within *project_id*'s task list."""
    try:
        new_status = TaskStatus(body.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status '{body.status}'. Must be one of: {[s.value for s in TaskStatus]}",
        )
    tl = _load_tasks_or_404(project_id, cfg)
    task = tl.get_task(task_id)
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found in project '{project_id}'",
        )
    task.update_status(new_status)
    path = _tasks_path(project_id, cfg.projects_root)
    tl.save(path)
    return _task_schema(task)
