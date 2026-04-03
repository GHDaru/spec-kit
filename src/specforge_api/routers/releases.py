"""FastAPI router for the Release Manager (Module 5).

Endpoints
---------
GET  /api/v1/projects/{project_id}/releases
POST /api/v1/projects/{project_id}/releases
GET  /api/v1/projects/{project_id}/releases/changelog
GET  /api/v1/projects/{project_id}/releases/summary
GET  /api/v1/projects/{project_id}/releases/{version}
PUT  /api/v1/projects/{project_id}/releases/{version}
DELETE /api/v1/projects/{project_id}/releases/{version}
POST /api/v1/projects/{project_id}/releases/{version}/changes
PUT  /api/v1/projects/{project_id}/releases/{version}/status
DELETE /api/v1/projects/{project_id}/releases/{version}/changes/{change_id}

NOTE: Static sub-paths (changelog, summary) are registered BEFORE the
parameterised {version} routes so FastAPI matches them correctly.
"""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from specify_cli.releases import (
    ChangeEntry,
    ChangeType,
    Release,
    ReleaseLog,
    ReleaseStatus,
)
from specforge_api.config import Settings, settings as default_settings
from specforge_api.schemas.releases import (
    ChangeEntryCreateRequest,
    ChangeEntrySchema,
    ChangelogSchema,
    ReleaseCreateRequest,
    ReleaseLogCreateRequest,
    ReleaseLogResponse,
    ReleaseLogSummarySchema,
    ReleaseSchema,
    ReleaseStatusUpdateRequest,
    ReleaseUpdateRequest,
)

router = APIRouter()


def _get_settings() -> Settings:
    return default_settings


def _releases_path(project_id: str, projects_root: Path) -> Path:
    return projects_root / project_id / "releases.yaml"


def _load_log_or_404(project_id: str, cfg: Settings) -> ReleaseLog:
    path = _releases_path(project_id, cfg.projects_root)
    try:
        return ReleaseLog.load(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Release log not found for project '{project_id}'",
        )


# ---------------------------------------------------------------------------
# Conversion helpers: domain → schema
# ---------------------------------------------------------------------------


def _change_schema(entry: ChangeEntry) -> ChangeEntrySchema:
    return ChangeEntrySchema(
        change_id=entry.change_id,
        change_type=entry.change_type.value,
        description=entry.description,
        task_id=entry.task_id,
        story_id=entry.story_id,
    )


def _release_schema(release: Release) -> ReleaseSchema:
    return ReleaseSchema(
        version=release.version,
        title=release.title,
        date=release.date,
        status=release.status.value,
        task_list_id=release.task_list_id,
        spec_id=release.spec_id,
        plan_id=release.plan_id,
        notes=release.notes,
        changes=[_change_schema(c) for c in release.changes],
    )


def _to_log_response(log: ReleaseLog) -> ReleaseLogResponse:
    return ReleaseLogResponse(
        project_name=log.project_name,
        notes=log.notes,
        releases=[_release_schema(r) for r in log.releases],
    )


# ---------------------------------------------------------------------------
# Conversion helpers: schema → domain
# ---------------------------------------------------------------------------


def _release_from_create(body: ReleaseCreateRequest) -> Release:
    release = Release(
        version=body.version,
        title=body.title,
        date=body.date,
        status=body.status,
        task_list_id=body.task_list_id,
        spec_id=body.spec_id,
        plan_id=body.plan_id,
        notes=body.notes,
    )
    for c in body.changes:
        release.add_change(
            ChangeEntry(
                change_id=c.change_id,
                change_type=c.change_type,
                description=c.description,
                task_id=c.task_id,
                story_id=c.story_id,
            )
        )
    return release


def _change_from_create(body: ChangeEntryCreateRequest) -> ChangeEntry:
    return ChangeEntry(
        change_type=body.change_type,
        description=body.description,
        task_id=body.task_id,
        story_id=body.story_id,
    )


# ---------------------------------------------------------------------------
# Release Log endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/releases",
    response_model=ReleaseLogResponse,
    summary="Get the release log for a project",
)
def get_release_log(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> ReleaseLogResponse:
    """Return the full release log for *project_id*, or 404 if absent."""
    log = _load_log_or_404(project_id, cfg)
    return _to_log_response(log)


@router.post(
    "/projects/{project_id}/releases",
    response_model=ReleaseLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a release log for a project",
)
def create_release_log(
    project_id: str,
    body: ReleaseLogCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> ReleaseLogResponse:
    """Create and persist a new release log for *project_id*."""
    log = ReleaseLog(project_name=body.project_name, notes=body.notes)
    for release_schema in body.releases:
        release = Release(
            version=release_schema.version,
            title=release_schema.title,
            date=release_schema.date,
            status=release_schema.status,
            task_list_id=release_schema.task_list_id,
            spec_id=release_schema.spec_id,
            plan_id=release_schema.plan_id,
            notes=release_schema.notes,
        )
        for c in release_schema.changes:
            release.add_change(
                ChangeEntry(
                    change_id=c.change_id,
                    change_type=c.change_type,
                    description=c.description,
                    task_id=c.task_id,
                    story_id=c.story_id,
                )
            )
        try:
            log.add_release(release)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            )
    path = _releases_path(project_id, cfg.projects_root)
    log.save(path)
    return _to_log_response(log)


# ---------------------------------------------------------------------------
# Changelog  (static — must come before {version})
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/releases/changelog",
    response_model=ChangelogSchema,
    summary="Get the full changelog as Markdown",
)
def get_changelog(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> ChangelogSchema:
    """Return the full changelog for *project_id* rendered as Markdown."""
    log = _load_log_or_404(project_id, cfg)
    return ChangelogSchema(markdown=log.changelog_markdown())


# ---------------------------------------------------------------------------
# Summary  (static — must come before {version})
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/releases/summary",
    response_model=ReleaseLogSummarySchema,
    summary="Get release log summary statistics",
)
def get_summary(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> ReleaseLogSummarySchema:
    """Return summary statistics (counts by status and change type) for *project_id*."""
    log = _load_log_or_404(project_id, cfg)
    s = log.summary()
    return ReleaseLogSummarySchema(
        total_releases=s["total_releases"],
        by_status=s["by_status"],
        total_changes=s["total_changes"],
        by_change_type=s["by_change_type"],
    )


# ---------------------------------------------------------------------------
# Single Release endpoints  (parameterised — must come after static routes)
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/releases/{version}",
    response_model=ReleaseSchema,
    summary="Get a single release",
)
def get_release(
    project_id: str,
    version: str,
    cfg: Settings = Depends(_get_settings),
) -> ReleaseSchema:
    """Return a single release by *version*, or 404 if not found."""
    log = _load_log_or_404(project_id, cfg)
    release = log.get_release(version)
    if release is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Release '{version}' not found in project '{project_id}'",
        )
    return _release_schema(release)


@router.put(
    "/projects/{project_id}/releases/{version}",
    response_model=ReleaseSchema,
    summary="Update a release's metadata",
)
def update_release(
    project_id: str,
    version: str,
    body: ReleaseUpdateRequest,
    cfg: Settings = Depends(_get_settings),
) -> ReleaseSchema:
    """Update the metadata (title, date, notes, links) of *version* in *project_id*."""
    log = _load_log_or_404(project_id, cfg)
    release = log.get_release(version)
    if release is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Release '{version}' not found in project '{project_id}'",
        )
    if body.title is not None:
        release.title = body.title
    if body.date is not None:
        release.date = body.date
    if body.task_list_id is not None:
        release.task_list_id = body.task_list_id
    if body.spec_id is not None:
        release.spec_id = body.spec_id
    if body.plan_id is not None:
        release.plan_id = body.plan_id
    if body.notes is not None:
        release.notes = body.notes
    path = _releases_path(project_id, cfg.projects_root)
    log.save(path)
    return _release_schema(release)


@router.delete(
    "/projects/{project_id}/releases/{version}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a release",
)
def delete_release(
    project_id: str,
    version: str,
    cfg: Settings = Depends(_get_settings),
) -> None:
    """Remove the release *version* from *project_id*'s release log."""
    log = _load_log_or_404(project_id, cfg)
    if not log.remove_release(version):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Release '{version}' not found in project '{project_id}'",
        )
    path = _releases_path(project_id, cfg.projects_root)
    log.save(path)


# ---------------------------------------------------------------------------
# Release Status  (must come before {change_id} route)
# ---------------------------------------------------------------------------


@router.put(
    "/projects/{project_id}/releases/{version}/status",
    response_model=ReleaseSchema,
    summary="Update a release's status",
)
def update_release_status(
    project_id: str,
    version: str,
    body: ReleaseStatusUpdateRequest,
    cfg: Settings = Depends(_get_settings),
) -> ReleaseSchema:
    """Set a new status on *version* within *project_id*'s release log."""
    try:
        new_status = ReleaseStatus(body.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status '{body.status}'. Must be one of: {[s.value for s in ReleaseStatus]}",
        )
    log = _load_log_or_404(project_id, cfg)
    release = log.get_release(version)
    if release is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Release '{version}' not found in project '{project_id}'",
        )
    release.update_status(new_status)
    path = _releases_path(project_id, cfg.projects_root)
    log.save(path)
    return _release_schema(release)


# ---------------------------------------------------------------------------
# Change entries
# ---------------------------------------------------------------------------


@router.post(
    "/projects/{project_id}/releases/{version}/changes",
    response_model=ChangeEntrySchema,
    status_code=status.HTTP_201_CREATED,
    summary="Add a change entry to a release",
)
def add_change_entry(
    project_id: str,
    version: str,
    body: ChangeEntryCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> ChangeEntrySchema:
    """Append a new change entry to *version* in *project_id*'s release log."""
    try:
        ChangeType(body.change_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid change_type '{body.change_type}'. Must be one of: {[ct.value for ct in ChangeType]}",
        )
    log = _load_log_or_404(project_id, cfg)
    release = log.get_release(version)
    if release is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Release '{version}' not found in project '{project_id}'",
        )
    entry = _change_from_create(body)
    release.add_change(entry)
    path = _releases_path(project_id, cfg.projects_root)
    log.save(path)
    return _change_schema(entry)


@router.delete(
    "/projects/{project_id}/releases/{version}/changes/{change_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a change entry from a release",
)
def remove_change_entry(
    project_id: str,
    version: str,
    change_id: str,
    cfg: Settings = Depends(_get_settings),
) -> None:
    """Remove the change entry *change_id* from *version* in *project_id*."""
    log = _load_log_or_404(project_id, cfg)
    release = log.get_release(version)
    if release is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Release '{version}' not found in project '{project_id}'",
        )
    if not release.remove_change(change_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Change entry '{change_id}' not found in release '{version}'",
        )
    path = _releases_path(project_id, cfg.projects_root)
    log.save(path)
