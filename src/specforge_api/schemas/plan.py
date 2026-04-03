"""Pydantic request/response schemas for the Architecture Planner API (Module 3)."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Tech Stack
# ---------------------------------------------------------------------------


class TechStackSchema(BaseModel):
    """Mirrors :class:`~specify_cli.plan.TechStack`."""

    layer: str
    choice: str
    rationale: str
    alternatives: list[str] = []
    pros: list[str] = []
    cons: list[str] = []


# ---------------------------------------------------------------------------
# Research Report
# ---------------------------------------------------------------------------


class ResearchReportSchema(BaseModel):
    """Mirrors :class:`~specify_cli.plan.ResearchReport`."""

    topic: str
    summary: str
    tech_stacks: list[TechStackSchema] = []
    status: str = "pending"
    citations: list[str] = []


class ResearchReportCreateRequest(BaseModel):
    """Request body for adding a research report to a plan."""

    topic: str
    summary: str
    tech_stacks: list[TechStackSchema] = []
    status: str = "pending"
    citations: list[str] = []


# ---------------------------------------------------------------------------
# Data Model
# ---------------------------------------------------------------------------


class EntityFieldSchema(BaseModel):
    """Mirrors :class:`~specify_cli.plan.EntityField`."""

    name: str
    field_type: str = "string"
    required: bool = True
    primary_key: bool = False
    description: str = ""


class DataModelEntitySchema(BaseModel):
    """Mirrors :class:`~specify_cli.plan.DataModelEntity`."""

    name: str
    description: str = ""
    fields: list[EntityFieldSchema] = []
    relationships: list[str] = []


class DataModelSchema(BaseModel):
    """Mirrors :class:`~specify_cli.plan.DataModel`."""

    name: str
    entities: list[DataModelEntitySchema] = []
    notes: str = ""


class DataModelCreateRequest(BaseModel):
    """Request body for setting the data model of a plan."""

    name: str
    entities: list[DataModelEntitySchema] = []
    notes: str = ""


# ---------------------------------------------------------------------------
# API Contract
# ---------------------------------------------------------------------------


class APIEndpointSchema(BaseModel):
    """Mirrors :class:`~specify_cli.plan.APIEndpoint`."""

    path: str
    method: str = "GET"
    summary: str = ""
    description: str = ""
    tags: list[str] = []


class APIContractSchema(BaseModel):
    """Mirrors :class:`~specify_cli.plan.APIContract`."""

    title: str
    version: str = "1.0.0"
    description: str = ""
    format: str = "openapi"
    base_url: str = "/api/v1"
    endpoints: list[APIEndpointSchema] = []
    schema_raw: str = ""


class APIContractCreateRequest(BaseModel):
    """Request body for setting the API contract of a plan."""

    title: str
    version: str = "1.0.0"
    description: str = ""
    format: str = "openapi"
    base_url: str = "/api/v1"
    endpoints: list[APIEndpointSchema] = []
    schema_raw: str = ""


# ---------------------------------------------------------------------------
# Project Structure
# ---------------------------------------------------------------------------


class ProjectStructureSchema(BaseModel):
    """Mirrors :class:`~specify_cli.plan.ProjectStructure`."""

    root: str
    description: str = ""
    tree: dict[str, Any] = {}
    annotations: dict[str, str] = {}


class ProjectStructureCreateRequest(BaseModel):
    """Request body for setting the project structure of a plan."""

    root: str
    description: str = ""
    tree: dict[str, Any] = {}
    annotations: dict[str, str] = {}


# ---------------------------------------------------------------------------
# Plan
# ---------------------------------------------------------------------------


class PlanResponse(BaseModel):
    """Full plan payload returned by the API."""

    project_name: str
    spec_id: Optional[str] = None
    summary: str = ""
    version: str
    notes: str = ""
    tech_stacks: list[TechStackSchema] = []
    research_reports: list[ResearchReportSchema] = []
    data_model: Optional[DataModelSchema] = None
    api_contract: Optional[APIContractSchema] = None
    project_structure: Optional[ProjectStructureSchema] = None


class PlanCreateRequest(BaseModel):
    """Request body for creating a new plan."""

    project_name: str
    spec_id: Optional[str] = None
    summary: str = ""
    notes: str = ""
    tech_stacks: list[TechStackSchema] = []
    research_reports: list[ResearchReportSchema] = []
    data_model: Optional[DataModelSchema] = None
    api_contract: Optional[APIContractSchema] = None
    project_structure: Optional[ProjectStructureSchema] = None
