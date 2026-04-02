"""FastAPI router for the Specification Studio (Module 2).

Endpoints
---------
GET  /api/v1/projects/{project_id}/specs
POST /api/v1/projects/{project_id}/specs/{spec_id}
GET  /api/v1/projects/{project_id}/specs/{spec_id}
POST /api/v1/projects/{project_id}/specs/{spec_id}/stories
PATCH /api/v1/projects/{project_id}/specs/{spec_id}/stories/{story_id}
DELETE /api/v1/projects/{project_id}/specs/{spec_id}/stories/{story_id}
POST /api/v1/projects/{project_id}/specs/{spec_id}/requirements
POST /api/v1/projects/{project_id}/specs/{spec_id}/clarifications
POST /api/v1/projects/{project_id}/specs/{spec_id}/clarifications/{item_id}/resolve
"""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from specify_cli.spec import (
    AcceptanceScenario,
    ClarificationItem,
    FunctionalRequirement,
    Priority,
    Spec,
    UserStory,
)
from specforge_api.config import Settings, settings as default_settings
from specforge_api.schemas.spec import (
    AcceptanceScenarioSchema,
    AddClarificationRequest,
    AddRequirementRequest,
    AddUserStoryRequest,
    ClarificationItemSchema,
    CreateSpecRequest,
    FunctionalRequirementSchema,
    ResolveClarificationRequest,
    SpecListResponse,
    SpecResponse,
    SpecSummary,
    UpdateStoryPriorityRequest,
    UserStorySchema,
)

router = APIRouter()


def _get_settings() -> Settings:
    """Dependency that returns the application settings."""
    return default_settings


def _spec_path(project_id: str, spec_id: str, projects_root: Path) -> Path:
    """Resolve the path to a spec's Markdown file."""
    return projects_root / project_id / "specs" / spec_id / "spec.md"


def _specs_dir(project_id: str, projects_root: Path) -> Path:
    """Resolve the specs directory for a project."""
    return projects_root / project_id / "specs"


# ---------------------------------------------------------------------------
# Conversion helpers
# ---------------------------------------------------------------------------


def _scenario_to_schema(scenario: AcceptanceScenario) -> AcceptanceScenarioSchema:
    return AcceptanceScenarioSchema(
        title=scenario.title,
        given=scenario.given,
        when=scenario.when,
        then=scenario.then,
    )


def _story_to_schema(story: UserStory) -> UserStorySchema:
    return UserStorySchema(
        id=story.id,
        title=story.title,
        as_a=story.as_a,
        i_want=story.i_want,
        so_that=story.so_that,
        priority=story.priority.value,
        scenarios=[_scenario_to_schema(s) for s in story.scenarios],
    )


def _req_to_schema(req: FunctionalRequirement) -> FunctionalRequirementSchema:
    return FunctionalRequirementSchema(
        id=req.id,
        description=req.description,
        story_id=req.story_id,
    )


def _cl_to_schema(item: ClarificationItem) -> ClarificationItemSchema:
    return ClarificationItemSchema(
        id=item.id,
        description=item.description,
        status=item.status.value,
        resolution=item.resolution,
    )


def _to_response(spec: Spec) -> SpecResponse:
    """Convert a domain Spec to a SpecResponse schema."""
    return SpecResponse(
        spec_id=spec.spec_id,
        title=spec.title,
        description=spec.description,
        version=spec.version,
        created_date=spec.created_date.isoformat() if spec.created_date else None,
        user_stories=[_story_to_schema(s) for s in spec.user_stories],
        requirements=[_req_to_schema(r) for r in spec.requirements],
        clarifications=[_cl_to_schema(c) for c in spec.clarifications],
    )


def _to_summary(spec: Spec) -> SpecSummary:
    return SpecSummary(
        spec_id=spec.spec_id,
        title=spec.title,
        version=spec.version,
        created_date=spec.created_date.isoformat() if spec.created_date else None,
        story_count=len(spec.user_stories),
        requirement_count=len(spec.requirements),
        open_clarification_count=len(spec.open_clarifications()),
    )


def _load_spec_or_404(project_id: str, spec_id: str, projects_root: Path) -> Spec:
    """Load a spec from disk or raise 404."""
    path = _spec_path(project_id, spec_id, projects_root)
    try:
        return Spec.load(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Spec '{spec_id}' not found for project '{project_id}'",
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/specs",
    response_model=SpecListResponse,
    summary="List all specs for a project",
)
def list_specs(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> SpecListResponse:
    """Return summary information for every spec in *project_id*."""
    specs_dir = _specs_dir(project_id, cfg.projects_root)
    summaries: list[SpecSummary] = []
    if specs_dir.exists():
        for spec_file in sorted(specs_dir.glob("*/spec.md")):
            try:
                spec = Spec.load(spec_file)
                summaries.append(_to_summary(spec))
            except Exception:
                continue  # Skip malformed files
    return SpecListResponse(project_id=project_id, specs=summaries)


@router.post(
    "/projects/{project_id}/specs/{spec_id}",
    response_model=SpecResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a spec",
)
def create_spec(
    project_id: str,
    spec_id: str,
    body: CreateSpecRequest,
    cfg: Settings = Depends(_get_settings),
) -> SpecResponse:
    """Create and persist a new spec for *project_id*."""
    from datetime import date

    spec = Spec(
        spec_id=spec_id,
        title=body.title,
        description=body.description,
        created_date=date.today(),
    )

    for story_req in body.user_stories:
        story = UserStory(
            id=story_req.id or spec._next_story_id(),
            title=story_req.title,
            as_a=story_req.as_a,
            i_want=story_req.i_want,
            so_that=story_req.so_that,
            priority=story_req.priority,
        )
        for sc in story_req.scenarios:
            story.add_scenario(AcceptanceScenario(
                title=sc.title,
                given=sc.given,
                when=sc.when,
                then=sc.then,
            ))
        spec.add_story(story)

    for req_req in body.requirements:
        spec.add_requirement(req_req.description, story_id=req_req.story_id)

    for cl_req in body.clarifications:
        spec.add_clarification(cl_req.description)

    path = _spec_path(project_id, spec_id, cfg.projects_root)
    spec.save(path)
    return _to_response(spec)


@router.get(
    "/projects/{project_id}/specs/{spec_id}",
    response_model=SpecResponse,
    summary="Get a spec",
)
def get_spec(
    project_id: str,
    spec_id: str,
    cfg: Settings = Depends(_get_settings),
) -> SpecResponse:
    """Return the spec identified by *spec_id* within *project_id*, or 404."""
    spec = _load_spec_or_404(project_id, spec_id, cfg.projects_root)
    return _to_response(spec)


@router.post(
    "/projects/{project_id}/specs/{spec_id}/stories",
    response_model=SpecResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a user story to a spec",
)
def add_story(
    project_id: str,
    spec_id: str,
    body: AddUserStoryRequest,
    cfg: Settings = Depends(_get_settings),
) -> SpecResponse:
    """Append a new user story to the spec and persist."""
    spec = _load_spec_or_404(project_id, spec_id, cfg.projects_root)
    story = UserStory(
        id=body.id or spec._next_story_id(),
        title=body.title,
        as_a=body.as_a,
        i_want=body.i_want,
        so_that=body.so_that,
        priority=body.priority,
    )
    for sc in body.scenarios:
        story.add_scenario(AcceptanceScenario(
            title=sc.title,
            given=sc.given,
            when=sc.when,
            then=sc.then,
        ))
    spec.add_story(story)
    spec.save(_spec_path(project_id, spec_id, cfg.projects_root))
    return _to_response(spec)


@router.patch(
    "/projects/{project_id}/specs/{spec_id}/stories/{story_id}",
    response_model=SpecResponse,
    summary="Update a user story's priority",
)
def update_story_priority(
    project_id: str,
    spec_id: str,
    story_id: str,
    body: UpdateStoryPriorityRequest,
    cfg: Settings = Depends(_get_settings),
) -> SpecResponse:
    """Update the priority of an existing user story and persist."""
    spec = _load_spec_or_404(project_id, spec_id, cfg.projects_root)
    story = spec.get_story(story_id)
    if story is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Story '{story_id}' not found in spec '{spec_id}'",
        )
    try:
        story.priority = Priority(body.priority.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Invalid priority '{body.priority}'. Must be P1, P2, or P3.",
        )
    spec.save(_spec_path(project_id, spec_id, cfg.projects_root))
    return _to_response(spec)


@router.delete(
    "/projects/{project_id}/specs/{spec_id}/stories/{story_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a user story from a spec",
)
def remove_story(
    project_id: str,
    spec_id: str,
    story_id: str,
    cfg: Settings = Depends(_get_settings),
) -> None:
    """Remove a user story by ID from the spec and persist."""
    spec = _load_spec_or_404(project_id, spec_id, cfg.projects_root)
    removed = spec.remove_story(story_id)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Story '{story_id}' not found in spec '{spec_id}'",
        )
    spec.save(_spec_path(project_id, spec_id, cfg.projects_root))


@router.post(
    "/projects/{project_id}/specs/{spec_id}/requirements",
    response_model=SpecResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a functional requirement to a spec",
)
def add_requirement(
    project_id: str,
    spec_id: str,
    body: AddRequirementRequest,
    cfg: Settings = Depends(_get_settings),
) -> SpecResponse:
    """Append a new functional requirement to the spec and persist."""
    spec = _load_spec_or_404(project_id, spec_id, cfg.projects_root)
    spec.add_requirement(body.description, story_id=body.story_id)
    spec.save(_spec_path(project_id, spec_id, cfg.projects_root))
    return _to_response(spec)


@router.post(
    "/projects/{project_id}/specs/{spec_id}/clarifications",
    response_model=SpecResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a clarification item to a spec",
)
def add_clarification(
    project_id: str,
    spec_id: str,
    body: AddClarificationRequest,
    cfg: Settings = Depends(_get_settings),
) -> SpecResponse:
    """Append a new open clarification item to the spec and persist."""
    spec = _load_spec_or_404(project_id, spec_id, cfg.projects_root)
    spec.add_clarification(body.description)
    spec.save(_spec_path(project_id, spec_id, cfg.projects_root))
    return _to_response(spec)


@router.post(
    "/projects/{project_id}/specs/{spec_id}/clarifications/{item_id}/resolve",
    response_model=SpecResponse,
    summary="Resolve a clarification item",
)
def resolve_clarification(
    project_id: str,
    spec_id: str,
    item_id: str,
    body: ResolveClarificationRequest,
    cfg: Settings = Depends(_get_settings),
) -> SpecResponse:
    """Mark a clarification item as resolved with the provided resolution text."""
    spec = _load_spec_or_404(project_id, spec_id, cfg.projects_root)
    resolved = spec.resolve_clarification(item_id, body.resolution)
    if not resolved:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Clarification '{item_id}' not found in spec '{spec_id}'",
        )
    spec.save(_spec_path(project_id, spec_id, cfg.projects_root))
    return _to_response(spec)
