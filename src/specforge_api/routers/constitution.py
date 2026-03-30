"""FastAPI router for the Constitution Engine (Module 1).

Endpoints
---------
GET  /api/v1/projects/{project_id}/constitution
POST /api/v1/projects/{project_id}/constitution
POST /api/v1/projects/{project_id}/constitution/check
GET  /api/v1/projects/{project_id}/constitution/history
"""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from specify_cli.constitution import (
    ComplianceGate,
    Constitution,
    Principle,
)
from specforge_api.config import Settings, settings as default_settings
from specforge_api.schemas.constitution import (
    AmendmentRecord,
    ComplianceCheckRequest,
    ComplianceReportResponse,
    ComplianceViolationSchema,
    ConstitutionCreateRequest,
    ConstitutionHistoryResponse,
    ConstitutionResponse,
    PrincipleSchema,
)

router = APIRouter()


def _get_settings() -> Settings:
    """Dependency that returns the application settings."""
    return default_settings


def _constitution_path(project_id: str, projects_root: Path) -> Path:
    """Resolve the path to a project's constitution file."""
    return projects_root / project_id / "constitution.md"


def _to_response(constitution: Constitution) -> ConstitutionResponse:
    """Convert a domain Constitution to a ConstitutionResponse schema."""
    return ConstitutionResponse(
        project_name=constitution.project_name,
        version=constitution.version,
        ratification_date=(
            constitution.ratification_date.isoformat()
            if constitution.ratification_date
            else None
        ),
        last_amended_date=(
            constitution.last_amended_date.isoformat()
            if constitution.last_amended_date
            else None
        ),
        principles=[
            PrincipleSchema(
                name=p.name,
                description=p.description,
                enforcement_level=p.enforcement_level.value,
                category=p.category.value,
            )
            for p in constitution.principles
        ],
    )


@router.get(
    "/projects/{project_id}/constitution",
    response_model=ConstitutionResponse,
    summary="Get a project's constitution",
)
def get_constitution(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> ConstitutionResponse:
    """Return the current constitution for *project_id*, or 404 if absent."""
    path = _constitution_path(project_id, cfg.projects_root)
    try:
        constitution = Constitution.load(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Constitution not found for project '{project_id}'",
        )
    return _to_response(constitution)


@router.post(
    "/projects/{project_id}/constitution",
    response_model=ConstitutionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project constitution",
)
def create_constitution(
    project_id: str,
    body: ConstitutionCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> ConstitutionResponse:
    """Create and persist a new constitution for *project_id*."""
    constitution = Constitution(project_name=body.project_name)
    for p in body.principles:
        constitution.add_principle(
            Principle(
                name=p.name,
                description=p.description,
                enforcement_level=p.enforcement_level,
                category=p.category,
            )
        )
    path = _constitution_path(project_id, cfg.projects_root)
    constitution.save(path)
    return _to_response(constitution)


@router.post(
    "/projects/{project_id}/constitution/check",
    response_model=ComplianceReportResponse,
    summary="Run a compliance check against the constitution",
)
def check_compliance(
    project_id: str,
    body: ComplianceCheckRequest,
    cfg: Settings = Depends(_get_settings),
) -> ComplianceReportResponse:
    """Validate *artifact_path* against the project's constitution."""
    path = _constitution_path(project_id, cfg.projects_root)
    try:
        constitution = Constitution.load(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Constitution not found for project '{project_id}'",
        )
    gate = ComplianceGate(constitution)
    report = gate.check(Path(body.artifact_path))

    def _violation_schema(violation) -> ComplianceViolationSchema:
        return ComplianceViolationSchema(
            principle_name=violation.principle_name,
            enforcement_level=violation.enforcement_level.value,
            message=violation.message,
            line_number=violation.line_number,
            is_blocking=violation.is_blocking,
        )

    return ComplianceReportResponse(
        passed=report.passed,
        blocking_violations=[_violation_schema(violation) for violation in report.blocking_violations],
        warning_violations=[_violation_schema(violation) for violation in report.warning_violations],
        summary=report.summary(),
    )


@router.get(
    "/projects/{project_id}/constitution/history",
    response_model=ConstitutionHistoryResponse,
    summary="Get constitution amendment history",
)
def get_history(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> ConstitutionHistoryResponse:
    """Return the amendment history for *project_id*'s constitution.

    MVP: returns a single record reflecting the current version/date.
    """
    path = _constitution_path(project_id, cfg.projects_root)
    try:
        constitution = Constitution.load(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Constitution not found for project '{project_id}'",
        )
    amended = (
        constitution.last_amended_date.isoformat()
        if constitution.last_amended_date
        else None
    )
    return ConstitutionHistoryResponse(
        project_name=constitution.project_name,
        amendments=[
            AmendmentRecord(version=constitution.version, amended_date=amended)
        ],
    )
