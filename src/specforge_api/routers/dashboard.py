"""FastAPI router for Project Dashboard (Module 8).

Endpoints
---------
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/{project_id}
DELETE /api/v1/projects/{project_id}
GET    /api/v1/projects/{project_id}/features
POST   /api/v1/projects/{project_id}/features
PUT    /api/v1/projects/{project_id}/features/{feature_id}/phase
GET    /api/v1/projects/{project_id}/reviews
POST   /api/v1/projects/{project_id}/reviews
GET    /api/v1/projects/{project_id}/metrics

NOTE: Static sub-paths (features, reviews, metrics) are registered BEFORE
the bare parameterised {project_id} route so FastAPI matches them correctly.
"""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from specify_cli.dashboard import (
    FeatureStatus,
    PhaseStatus,
    Project,
    ProjectMetrics,
    ReviewThread,
    SDDPhase,
    TeamMember,
)
from specforge_api.config import Settings, settings as default_settings
from specforge_api.schemas.dashboard import (
    FeatureCreateRequest,
    FeatureListResponse,
    FeatureStatusSchema,
    PhaseUpdateRequest,
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectMetricsSchema,
    ProjectSchema,
    ReviewListResponse,
    ReviewThreadCreateRequest,
    ReviewThreadSchema,
    TeamMemberSchema,
)

router = APIRouter()


def _get_settings() -> Settings:
    return default_settings


def _project_path(project_id: str, projects_root: Path) -> Path:
    return projects_root / project_id / "project.yaml"


def _reviews_dir(project_id: str, projects_root: Path) -> Path:
    return projects_root / project_id / "reviews"


def _review_path(project_id: str, thread_id: str, projects_root: Path) -> Path:
    return _reviews_dir(project_id, projects_root) / f"{thread_id}.yaml"


def _load_project_or_404(project_id: str, cfg: Settings) -> Project:
    path = _project_path(project_id, cfg.projects_root)
    try:
        return Project.load(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found",
        )


# ---------------------------------------------------------------------------
# Conversion helpers: domain → schema
# ---------------------------------------------------------------------------


def _member_schema(m: TeamMember) -> TeamMemberSchema:
    return TeamMemberSchema(
        member_id=m.member_id,
        project_id=m.project_id,
        name=m.name,
        email=m.email,
        role=m.role.value,
        joined_at=m.joined_at,
    )


def _feature_schema(f: FeatureStatus) -> FeatureStatusSchema:
    return FeatureStatusSchema(
        feature_id=f.feature_id,
        title=f.title,
        description=f.description,
        sdd_phases={k.value: v.value for k, v in f.sdd_phases.items()},
        created_at=f.created_at,
        updated_at=f.updated_at,
    )


def _project_schema(project: Project) -> ProjectSchema:
    return ProjectSchema(
        project_id=project.project_id,
        name=project.name,
        description=project.description,
        created_at=project.created_at,
        updated_at=project.updated_at,
        team_members=[_member_schema(m) for m in project.team_members],
        features=[_feature_schema(f) for f in project.features],
    )


def _review_schema(thread: ReviewThread) -> ReviewThreadSchema:
    return ReviewThreadSchema(
        thread_id=thread.thread_id,
        project_id=thread.project_id,
        artifact_id=thread.artifact_id,
        artifact_type=thread.artifact_type,
        title=thread.title,
        status=thread.status.value,
        author=thread.author,
        comments=thread.comments,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
    )


# ---------------------------------------------------------------------------
# List projects  (static — must precede any parameterised /projects/{id} route)
# ---------------------------------------------------------------------------


@router.get(
    "/projects",
    response_model=ProjectListResponse,
    summary="List all projects",
)
def list_projects(cfg: Settings = Depends(_get_settings)) -> ProjectListResponse:
    """Return all projects found in the projects root directory."""
    projects_root = cfg.projects_root
    projects: list[ProjectSchema] = []
    if projects_root.exists():
        for yaml_file in sorted(projects_root.glob("*/project.yaml")):
            try:
                project = Project.load(yaml_file)
                projects.append(_project_schema(project))
            except Exception:
                continue
    return ProjectListResponse(projects=projects)


# ---------------------------------------------------------------------------
# Create project
# ---------------------------------------------------------------------------


@router.post(
    "/projects",
    response_model=ProjectSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
)
def create_project(
    body: ProjectCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> ProjectSchema:
    """Create and persist a new Project."""
    project = Project(
        name=body.name,
        description=body.description,
        created_at=body.created_at,
        updated_at=body.updated_at,
    )
    path = _project_path(project.project_id, cfg.projects_root)
    project.save(path)
    return _project_schema(project)


# ---------------------------------------------------------------------------
# Static sub-resource routes must appear BEFORE /projects/{project_id}
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# List features
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/features",
    response_model=FeatureListResponse,
    summary="List all features in a project",
)
def list_features(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> FeatureListResponse:
    """Return all features for *project_id*."""
    project = _load_project_or_404(project_id, cfg)
    return FeatureListResponse(
        project_id=project_id,
        features=[_feature_schema(f) for f in project.features],
    )


# ---------------------------------------------------------------------------
# Add feature
# ---------------------------------------------------------------------------


@router.post(
    "/projects/{project_id}/features",
    response_model=FeatureStatusSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Add a feature to a project",
)
def add_feature(
    project_id: str,
    body: FeatureCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> FeatureStatusSchema:
    """Append a new feature to *project_id*."""
    project = _load_project_or_404(project_id, cfg)
    feature = FeatureStatus(
        title=body.title,
        description=body.description,
        created_at=body.created_at,
        updated_at=body.updated_at,
        sdd_phases=body.sdd_phases,
    )
    project.add_feature(feature)
    path = _project_path(project_id, cfg.projects_root)
    project.save(path)
    return _feature_schema(feature)


# ---------------------------------------------------------------------------
# Update feature phase
# ---------------------------------------------------------------------------


@router.put(
    "/projects/{project_id}/features/{feature_id}/phase",
    response_model=FeatureStatusSchema,
    summary="Update a phase status on a feature",
)
def update_feature_phase(
    project_id: str,
    feature_id: str,
    body: PhaseUpdateRequest,
    cfg: Settings = Depends(_get_settings),
) -> FeatureStatusSchema:
    """Set a new phase status on *feature_id* within *project_id*."""
    try:
        SDDPhase(body.phase)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid phase '{body.phase}'. Must be one of: {[p.value for p in SDDPhase]}",
        )
    try:
        PhaseStatus(body.phase_status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid phase_status '{body.phase_status}'. Must be one of: {[s.value for s in PhaseStatus]}",
        )
    project = _load_project_or_404(project_id, cfg)
    feature = project.update_feature_phase(feature_id, body.phase, body.phase_status)
    if feature is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feature '{feature_id}' not found in project '{project_id}'",
        )
    path = _project_path(project_id, cfg.projects_root)
    project.save(path)
    return _feature_schema(feature)


# ---------------------------------------------------------------------------
# List reviews
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/reviews",
    response_model=ReviewListResponse,
    summary="List all review threads for a project",
)
def list_reviews(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> ReviewListResponse:
    """Return all review threads for *project_id* (empty list if none exist)."""
    # Verify project exists before scanning reviews
    _load_project_or_404(project_id, cfg)
    reviews_dir = _reviews_dir(project_id, cfg.projects_root)
    threads: list[ReviewThreadSchema] = []
    if reviews_dir.exists():
        for yaml_file in sorted(reviews_dir.glob("*.yaml")):
            try:
                thread = ReviewThread.load(yaml_file)
                threads.append(_review_schema(thread))
            except Exception:
                continue
    return ReviewListResponse(project_id=project_id, reviews=threads)


# ---------------------------------------------------------------------------
# Create review thread
# ---------------------------------------------------------------------------


@router.post(
    "/projects/{project_id}/reviews",
    response_model=ReviewThreadSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a review thread for a project",
)
def create_review(
    project_id: str,
    body: ReviewThreadCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> ReviewThreadSchema:
    """Create and persist a new ReviewThread for *project_id*."""
    # Verify project exists
    _load_project_or_404(project_id, cfg)
    thread = ReviewThread(
        project_id=project_id,
        artifact_id=body.artifact_id,
        artifact_type=body.artifact_type,
        title=body.title,
        author=body.author,
        created_at=body.created_at,
        updated_at=body.updated_at,
        status=body.status,
        comments=body.comments,
    )
    path = _review_path(project_id, thread.thread_id, cfg.projects_root)
    thread.save(path)
    return _review_schema(thread)


# ---------------------------------------------------------------------------
# Get project metrics
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/metrics",
    response_model=ProjectMetricsSchema,
    summary="Get computed metrics for a project",
)
def get_metrics(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> ProjectMetricsSchema:
    """Compute and return metrics for *project_id*."""
    from datetime import datetime, timezone

    project = _load_project_or_404(project_id, cfg)
    computed_at = datetime.now(timezone.utc).isoformat()
    metrics = ProjectMetrics.from_project(project, computed_at)
    return ProjectMetricsSchema(
        project_id=metrics.project_id,
        computed_at=metrics.computed_at,
        total_features=metrics.total_features,
        features_by_phase=metrics.features_by_phase,
        spec_quality_avg=metrics.spec_quality_avg,
        compliance_rate=metrics.compliance_rate,
        velocity_per_week=metrics.velocity_per_week,
    )


# ---------------------------------------------------------------------------
# Get project  (parameterised — must come AFTER all static sub-paths)
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}",
    response_model=ProjectSchema,
    summary="Get a single project",
)
def get_project(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> ProjectSchema:
    """Return a single project by *project_id*, or 404 if absent."""
    project = _load_project_or_404(project_id, cfg)
    return _project_schema(project)


# ---------------------------------------------------------------------------
# Delete project  (parameterised — must come AFTER all static sub-paths)
# ---------------------------------------------------------------------------


@router.delete(
    "/projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project",
)
def delete_project(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> None:
    """Remove the project.yaml file for *project_id*."""
    path = _project_path(project_id, cfg.projects_root)
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found",
        )
    path.unlink()
