"""FastAPI router for the Specification Studio (Module 2).

Endpoints
---------
GET    /api/v1/projects/{project_id}/specs
POST   /api/v1/projects/{project_id}/specs
GET    /api/v1/projects/{project_id}/specs/{spec_id}
PUT    /api/v1/projects/{project_id}/specs/{spec_id}
DELETE /api/v1/projects/{project_id}/specs/{spec_id}
POST   /api/v1/projects/{project_id}/specs/{spec_id}/clarifications
PATCH  /api/v1/projects/{project_id}/specs/{spec_id}/clarifications/{item_id}/resolve
PATCH  /api/v1/projects/{project_id}/specs/{spec_id}/clarifications/{item_id}/reject
"""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from specify_cli.spec import (
    AcceptanceScenario,
    ClarificationItem,
    FunctionalRequirement,
    Spec,
    UserStory,
)
from specforge_api.config import Settings, settings as default_settings
from specforge_api.schemas.spec import (
    AddClarificationRequest,
    ClarificationItemSchema,
    FunctionalRequirementSchema,
    ResolveClarificationRequest,
    SpecCreateRequest,
    SpecResponse,
    SpecSummaryResponse,
    SpecUpdateRequest,
    UserStorySchema,
    AcceptanceScenarioSchema,
)

router = APIRouter()


def _get_settings() -> Settings:
    return default_settings


def _specs_dir(project_id: str, projects_root: Path) -> Path:
    return projects_root / project_id / "specs"


def _spec_path(project_id: str, spec_id: str, projects_root: Path) -> Path:
    return _specs_dir(project_id, projects_root) / f"{spec_id}.json"


def _to_user_story_schema(story: UserStory) -> UserStorySchema:
    return UserStorySchema(
        id=story.id,
        title=story.title,
        description=story.description,
        priority=story.priority,
        acceptance_scenarios=[
            AcceptanceScenarioSchema(id=s.id, given=s.given, when=s.when, then=s.then)
            for s in story.acceptance_scenarios
        ],
    )


def _to_response(spec: Spec) -> SpecResponse:
    return SpecResponse(
        id=spec.id,
        feature_name=spec.feature_name,
        description=spec.description,
        version=spec.version,
        user_stories=[_to_user_story_schema(s) for s in spec.user_stories],
        functional_requirements=[
            FunctionalRequirementSchema(
                id=r.id,
                description=r.description,
                story_id=r.story_id,
            )
            for r in spec.functional_requirements
        ],
        clarification_items=[
            ClarificationItemSchema(
                id=c.id,
                marker=c.marker,
                suggestion=c.suggestion,
                resolved=c.resolved,
                resolution=c.resolution,
            )
            for c in spec.clarification_items
        ],
        created_at=spec.created_at,
        updated_at=spec.updated_at,
    )


def _to_summary(spec: Spec) -> SpecSummaryResponse:
    return SpecSummaryResponse(
        id=spec.id,
        feature_name=spec.feature_name,
        description=spec.description,
        version=spec.version,
        created_at=spec.created_at,
        updated_at=spec.updated_at,
        story_count=len(spec.user_stories),
        requirement_count=len(spec.functional_requirements),
    )


def _load_spec_or_404(project_id: str, spec_id: str, projects_root: Path) -> Spec:
    path = _spec_path(project_id, spec_id, projects_root)
    try:
        return Spec.load(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Spec '{spec_id}' not found for project '{project_id}'",
        )


def _build_spec_from_request(body: SpecCreateRequest) -> Spec:
    spec = Spec.create(
        feature_name=body.feature_name,
        description=body.description,
        version=body.version,
    )
    for us_req in body.user_stories:
        story = UserStory.create(
            title=us_req.title,
            description=us_req.description,
            priority=us_req.priority,
        )
        for sc_req in us_req.acceptance_scenarios:
            story.add_scenario(
                given=sc_req.given,
                when=sc_req.when,
                then=sc_req.then,
            )
        spec.user_stories.append(story)
    for i, fr_req in enumerate(body.functional_requirements, start=1):
        req = FunctionalRequirement.create(
            number=i,
            description=fr_req.description,
            story_id=fr_req.story_id,
        )
        spec.functional_requirements.append(req)
    return spec


# ──────────────────────────────────────────────────────────────────────────────
# List specs
# ──────────────────────────────────────────────────────────────────────────────

@router.get(
    "/projects/{project_id}/specs",
    response_model=list[SpecSummaryResponse],
    summary="List all specs for a project",
)
def list_specs(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> list[SpecSummaryResponse]:
    specs_dir = _specs_dir(project_id, cfg.projects_root)
    if not specs_dir.exists():
        return []
    summaries = []
    for spec_file in sorted(specs_dir.glob("*.json")):
        try:
            spec = Spec.load(spec_file)
            summaries.append(_to_summary(spec))
        except Exception:
            continue
    return summaries


# ──────────────────────────────────────────────────────────────────────────────
# Create spec
# ──────────────────────────────────────────────────────────────────────────────

@router.post(
    "/projects/{project_id}/specs",
    response_model=SpecResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new spec",
)
def create_spec(
    project_id: str,
    body: SpecCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> SpecResponse:
    try:
        spec = _build_spec_from_request(body)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    path = _spec_path(project_id, spec.id, cfg.projects_root)
    spec.save(path)
    return _to_response(spec)


# ──────────────────────────────────────────────────────────────────────────────
# Get spec
# ──────────────────────────────────────────────────────────────────────────────

@router.get(
    "/projects/{project_id}/specs/{spec_id}",
    response_model=SpecResponse,
    summary="Get a specific spec",
)
def get_spec(
    project_id: str,
    spec_id: str,
    cfg: Settings = Depends(_get_settings),
) -> SpecResponse:
    spec = _load_spec_or_404(project_id, spec_id, cfg.projects_root)
    return _to_response(spec)


# ──────────────────────────────────────────────────────────────────────────────
# Update spec
# ──────────────────────────────────────────────────────────────────────────────

@router.put(
    "/projects/{project_id}/specs/{spec_id}",
    response_model=SpecResponse,
    summary="Update a spec (full replacement of metadata + stories + requirements)",
)
def update_spec(
    project_id: str,
    spec_id: str,
    body: SpecUpdateRequest,
    cfg: Settings = Depends(_get_settings),
) -> SpecResponse:
    spec = _load_spec_or_404(project_id, spec_id, cfg.projects_root)

    if body.feature_name is not None:
        spec.feature_name = body.feature_name
    if body.description is not None:
        spec.description = body.description
    if body.version is not None:
        spec.version = body.version

    if body.user_stories is not None:
        new_stories = []
        for us_req in body.user_stories:
            try:
                story = UserStory.create(
                    title=us_req.title,
                    description=us_req.description,
                    priority=us_req.priority,
                )
            except ValueError as exc:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
            for sc_req in us_req.acceptance_scenarios:
                story.add_scenario(
                    given=sc_req.given,
                    when=sc_req.when,
                    then=sc_req.then,
                )
            new_stories.append(story)
        spec.user_stories = new_stories

    if body.functional_requirements is not None:
        new_reqs = []
        for i, fr_req in enumerate(body.functional_requirements, start=1):
            req = FunctionalRequirement.create(
                number=i,
                description=fr_req.description,
                story_id=fr_req.story_id,
            )
            new_reqs.append(req)
        spec.functional_requirements = new_reqs

    spec._touch()
    path = _spec_path(project_id, spec_id, cfg.projects_root)
    spec.save(path)
    return _to_response(spec)


# ──────────────────────────────────────────────────────────────────────────────
# Delete spec
# ──────────────────────────────────────────────────────────────────────────────

@router.delete(
    "/projects/{project_id}/specs/{spec_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a spec",
)
def delete_spec(
    project_id: str,
    spec_id: str,
    cfg: Settings = Depends(_get_settings),
) -> None:
    path = _spec_path(project_id, spec_id, cfg.projects_root)
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Spec '{spec_id}' not found for project '{project_id}'",
        )
    path.unlink()


# ──────────────────────────────────────────────────────────────────────────────
# Clarification endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post(
    "/projects/{project_id}/specs/{spec_id}/clarifications",
    response_model=ClarificationItemSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Add a clarification item to a spec",
)
def add_clarification(
    project_id: str,
    spec_id: str,
    body: AddClarificationRequest,
    cfg: Settings = Depends(_get_settings),
) -> ClarificationItemSchema:
    spec = _load_spec_or_404(project_id, spec_id, cfg.projects_root)
    item = spec.add_clarification(marker=body.marker, suggestion=body.suggestion)
    path = _spec_path(project_id, spec_id, cfg.projects_root)
    spec.save(path)
    return ClarificationItemSchema(
        id=item.id,
        marker=item.marker,
        suggestion=item.suggestion,
        resolved=item.resolved,
        resolution=item.resolution,
    )


@router.patch(
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
    spec = _load_spec_or_404(project_id, spec_id, cfg.projects_root)
    spec.resolve_clarification(item_id, body.resolution)
    path = _spec_path(project_id, spec_id, cfg.projects_root)
    spec.save(path)
    return _to_response(spec)


@router.patch(
    "/projects/{project_id}/specs/{spec_id}/clarifications/{item_id}/reject",
    response_model=SpecResponse,
    summary="Reject a clarification item",
)
def reject_clarification(
    project_id: str,
    spec_id: str,
    item_id: str,
    cfg: Settings = Depends(_get_settings),
) -> SpecResponse:
    spec = _load_spec_or_404(project_id, spec_id, cfg.projects_root)
    spec.reject_clarification(item_id)
    path = _spec_path(project_id, spec_id, cfg.projects_root)
    spec.save(path)
    return _to_response(spec)
