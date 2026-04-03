"""FastAPI router for the Architecture Planner (Module 3).

Endpoints
---------
GET  /api/v1/projects/{project_id}/plan
POST /api/v1/projects/{project_id}/plan
GET  /api/v1/projects/{project_id}/plan/research-reports
POST /api/v1/projects/{project_id}/plan/research-reports
GET  /api/v1/projects/{project_id}/plan/data-model
PUT  /api/v1/projects/{project_id}/plan/data-model
GET  /api/v1/projects/{project_id}/plan/api-contract
PUT  /api/v1/projects/{project_id}/plan/api-contract
GET  /api/v1/projects/{project_id}/plan/project-structure
PUT  /api/v1/projects/{project_id}/plan/project-structure
"""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from specify_cli.plan import (
    APIContract,
    APIEndpoint,
    DataModel,
    DataModelEntity,
    EntityField,
    Plan,
    ProjectStructure,
    ResearchReport,
    TechStack,
)
from specforge_api.config import Settings, settings as default_settings
from specforge_api.schemas.plan import (
    APIContractCreateRequest,
    APIContractSchema,
    APIEndpointSchema,
    DataModelCreateRequest,
    DataModelEntitySchema,
    DataModelSchema,
    EntityFieldSchema,
    PlanCreateRequest,
    PlanResponse,
    ProjectStructureCreateRequest,
    ProjectStructureSchema,
    ResearchReportCreateRequest,
    ResearchReportSchema,
    TechStackSchema,
)

router = APIRouter()


def _get_settings() -> Settings:
    """Dependency that returns the application settings."""
    return default_settings


def _plan_path(project_id: str, projects_root: Path) -> Path:
    """Resolve the path to a project's plan file."""
    return projects_root / project_id / "plan.yaml"


def _load_plan_or_404(project_id: str, cfg: Settings) -> Plan:
    """Load a Plan from disk or raise HTTP 404."""
    path = _plan_path(project_id, cfg.projects_root)
    try:
        return Plan.load(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan not found for project '{project_id}'",
        )


# ---------------------------------------------------------------------------
# Conversion helpers: domain → schema
# ---------------------------------------------------------------------------


def _tech_stack_schema(ts: TechStack) -> TechStackSchema:
    return TechStackSchema(
        layer=ts.layer,
        choice=ts.choice,
        rationale=ts.rationale,
        alternatives=ts.alternatives,
        pros=ts.pros,
        cons=ts.cons,
    )


def _research_report_schema(r: ResearchReport) -> ResearchReportSchema:
    return ResearchReportSchema(
        topic=r.topic,
        summary=r.summary,
        tech_stacks=[_tech_stack_schema(ts) for ts in r.tech_stacks],
        status=r.status.value,
        citations=r.citations,
    )


def _entity_field_schema(f: EntityField) -> EntityFieldSchema:
    return EntityFieldSchema(
        name=f.name,
        field_type=f.field_type.value,
        required=f.required,
        primary_key=f.primary_key,
        description=f.description,
    )


def _data_model_entity_schema(e: DataModelEntity) -> DataModelEntitySchema:
    return DataModelEntitySchema(
        name=e.name,
        description=e.description,
        fields=[_entity_field_schema(f) for f in e.fields],
        relationships=e.relationships,
    )


def _data_model_schema(dm: DataModel) -> DataModelSchema:
    return DataModelSchema(
        name=dm.name,
        entities=[_data_model_entity_schema(e) for e in dm.entities],
        notes=dm.notes,
    )


def _api_endpoint_schema(ep: APIEndpoint) -> APIEndpointSchema:
    return APIEndpointSchema(
        path=ep.path,
        method=ep.method.value,
        summary=ep.summary,
        description=ep.description,
        tags=ep.tags,
    )


def _api_contract_schema(ac: APIContract) -> APIContractSchema:
    return APIContractSchema(
        title=ac.title,
        version=ac.version,
        description=ac.description,
        format=ac.format.value,
        base_url=ac.base_url,
        endpoints=[_api_endpoint_schema(ep) for ep in ac.endpoints],
        schema_raw=ac.schema_raw,
    )


def _project_structure_schema(ps: ProjectStructure) -> ProjectStructureSchema:
    return ProjectStructureSchema(
        root=ps.root,
        description=ps.description,
        tree=ps.tree,
        annotations=ps.annotations,
    )


def _to_plan_response(plan: Plan) -> PlanResponse:
    return PlanResponse(
        project_name=plan.project_name,
        spec_id=plan.spec_id,
        summary=plan.summary,
        version=plan.version,
        notes=plan.notes,
        tech_stacks=[_tech_stack_schema(ts) for ts in plan.tech_stacks],
        research_reports=[_research_report_schema(r) for r in plan.research_reports],
        data_model=_data_model_schema(plan.data_model) if plan.data_model else None,
        api_contract=_api_contract_schema(plan.api_contract) if plan.api_contract else None,
        project_structure=(
            _project_structure_schema(plan.project_structure)
            if plan.project_structure
            else None
        ),
    )


# ---------------------------------------------------------------------------
# Conversion helpers: schema → domain
# ---------------------------------------------------------------------------


def _tech_stack_from_schema(s: TechStackSchema) -> TechStack:
    return TechStack(
        layer=s.layer,
        choice=s.choice,
        rationale=s.rationale,
        alternatives=s.alternatives,
        pros=s.pros,
        cons=s.cons,
    )


def _research_report_from_schema(s: ResearchReportSchema | ResearchReportCreateRequest) -> ResearchReport:
    report = ResearchReport(topic=s.topic, summary=s.summary, status=s.status, citations=s.citations)
    for ts in s.tech_stacks:
        report.add_tech_stack(_tech_stack_from_schema(ts))
    return report


def _data_model_from_schema(s: DataModelCreateRequest) -> DataModel:
    dm = DataModel(name=s.name, notes=s.notes)
    for e in s.entities:
        entity = DataModelEntity(
            name=e.name,
            description=e.description,
            relationships=e.relationships,
        )
        for f in e.fields:
            entity.add_field(
                EntityField(
                    name=f.name,
                    field_type=f.field_type,
                    required=f.required,
                    primary_key=f.primary_key,
                    description=f.description,
                )
            )
        dm.add_entity(entity)
    return dm


def _api_contract_from_schema(s: APIContractCreateRequest) -> APIContract:
    ac = APIContract(
        title=s.title,
        version=s.version,
        description=s.description,
        format=s.format,
        base_url=s.base_url,
        schema_raw=s.schema_raw,
    )
    for ep in s.endpoints:
        ac.add_endpoint(
            APIEndpoint(
                path=ep.path,
                method=ep.method,
                summary=ep.summary,
                description=ep.description,
                tags=ep.tags,
            )
        )
    return ac


def _project_structure_from_schema(s: ProjectStructureCreateRequest) -> ProjectStructure:
    return ProjectStructure(
        root=s.root,
        description=s.description,
        tree=s.tree,
        annotations=s.annotations,
    )


# ---------------------------------------------------------------------------
# Plan endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/plan",
    response_model=PlanResponse,
    summary="Get a project's architecture plan",
)
def get_plan(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> PlanResponse:
    """Return the current plan for *project_id*, or 404 if absent."""
    plan = _load_plan_or_404(project_id, cfg)
    return _to_plan_response(plan)


@router.post(
    "/projects/{project_id}/plan",
    response_model=PlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project architecture plan",
)
def create_plan(
    project_id: str,
    body: PlanCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> PlanResponse:
    """Create and persist a new architecture plan for *project_id*."""
    plan = Plan(
        project_name=body.project_name,
        spec_id=body.spec_id,
        summary=body.summary,
        notes=body.notes,
    )
    for ts in body.tech_stacks:
        plan.add_tech_stack(_tech_stack_from_schema(ts))
    for r in body.research_reports:
        plan.add_research_report(_research_report_from_schema(r))
    if body.data_model:
        plan.set_data_model(_data_model_from_schema(body.data_model))
    if body.api_contract:
        plan.set_api_contract(_api_contract_from_schema(body.api_contract))
    if body.project_structure:
        plan.set_project_structure(_project_structure_from_schema(body.project_structure))
    path = _plan_path(project_id, cfg.projects_root)
    plan.save(path)
    return _to_plan_response(plan)


# ---------------------------------------------------------------------------
# Research Report sub-resource
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/plan/research-reports",
    response_model=list[ResearchReportSchema],
    summary="List all research reports for a plan",
)
def list_research_reports(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> list[ResearchReportSchema]:
    """Return all research reports attached to *project_id*'s plan."""
    plan = _load_plan_or_404(project_id, cfg)
    return [_research_report_schema(r) for r in plan.research_reports]


@router.post(
    "/projects/{project_id}/plan/research-reports",
    response_model=ResearchReportSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Add a research report to a plan",
)
def add_research_report(
    project_id: str,
    body: ResearchReportCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> ResearchReportSchema:
    """Append a research report to *project_id*'s plan and persist."""
    plan = _load_plan_or_404(project_id, cfg)
    report = _research_report_from_schema(body)
    plan.add_research_report(report)
    path = _plan_path(project_id, cfg.projects_root)
    plan.save(path)
    return _research_report_schema(report)


# ---------------------------------------------------------------------------
# Data Model sub-resource
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/plan/data-model",
    response_model=DataModelSchema,
    summary="Get the data model of a plan",
)
def get_data_model(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> DataModelSchema:
    """Return the data model for *project_id*'s plan."""
    plan = _load_plan_or_404(project_id, cfg)
    if plan.data_model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Data model not found for project '{project_id}'",
        )
    return _data_model_schema(plan.data_model)


@router.put(
    "/projects/{project_id}/plan/data-model",
    response_model=DataModelSchema,
    summary="Set or replace the data model of a plan",
)
def set_data_model(
    project_id: str,
    body: DataModelCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> DataModelSchema:
    """Set or replace the data model in *project_id*'s plan."""
    plan = _load_plan_or_404(project_id, cfg)
    dm = _data_model_from_schema(body)
    plan.set_data_model(dm)
    path = _plan_path(project_id, cfg.projects_root)
    plan.save(path)
    return _data_model_schema(dm)


# ---------------------------------------------------------------------------
# API Contract sub-resource
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/plan/api-contract",
    response_model=APIContractSchema,
    summary="Get the API contract of a plan",
)
def get_api_contract(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> APIContractSchema:
    """Return the API contract for *project_id*'s plan."""
    plan = _load_plan_or_404(project_id, cfg)
    if plan.api_contract is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"API contract not found for project '{project_id}'",
        )
    return _api_contract_schema(plan.api_contract)


@router.put(
    "/projects/{project_id}/plan/api-contract",
    response_model=APIContractSchema,
    summary="Set or replace the API contract of a plan",
)
def set_api_contract(
    project_id: str,
    body: APIContractCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> APIContractSchema:
    """Set or replace the API contract in *project_id*'s plan."""
    plan = _load_plan_or_404(project_id, cfg)
    ac = _api_contract_from_schema(body)
    plan.set_api_contract(ac)
    path = _plan_path(project_id, cfg.projects_root)
    plan.save(path)
    return _api_contract_schema(ac)


# ---------------------------------------------------------------------------
# Project Structure sub-resource
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/plan/project-structure",
    response_model=ProjectStructureSchema,
    summary="Get the project structure of a plan",
)
def get_project_structure(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> ProjectStructureSchema:
    """Return the project structure for *project_id*'s plan."""
    plan = _load_plan_or_404(project_id, cfg)
    if plan.project_structure is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project structure not found for project '{project_id}'",
        )
    return _project_structure_schema(plan.project_structure)


@router.put(
    "/projects/{project_id}/plan/project-structure",
    response_model=ProjectStructureSchema,
    summary="Set or replace the project structure of a plan",
)
def set_project_structure(
    project_id: str,
    body: ProjectStructureCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> ProjectStructureSchema:
    """Set or replace the project structure in *project_id*'s plan."""
    plan = _load_plan_or_404(project_id, cfg)
    ps = _project_structure_from_schema(body)
    plan.set_project_structure(ps)
    path = _plan_path(project_id, cfg.projects_root)
    plan.save(path)
    return _project_structure_schema(ps)
