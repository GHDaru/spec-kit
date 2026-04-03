"""
Architecture Planner — Module 3 of SpecForge

Implements the data structures and logic for the Architecture Planner,
which converts specifications into detailed technical implementation plans
including technology choices, project structure, and data models.

Key Entities:
- TechStack         — a technology choice with documented rationale
- ResearchReport    — AI-generated investigation of technical options
- EntityField       — a single field definition within a data-model entity
- DataModelEntity   — a named entity with fields (e.g. a database table)
- DataModel         — full entity-relationship model for the project
- APIEndpoint       — a single endpoint/operation in an API contract
- APIContract       — complete service interface definition (OpenAPI-style)
- ProjectStructure  — directory layout for the implementation
- Plan              — complete technical implementation plan aggregating
                      all of the above
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Optional

import yaml


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class ResearchStatus(str, Enum):
    """Lifecycle status of an AI research report."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class FieldType(str, Enum):
    """Primitive types supported in a data-model field."""

    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    DATE = "date"
    DATETIME = "datetime"
    UUID = "uuid"
    JSON = "json"
    TEXT = "text"


class HTTPMethod(str, Enum):
    """HTTP methods for API endpoints."""

    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    PATCH = "PATCH"
    DELETE = "DELETE"


class ContractFormat(str, Enum):
    """Supported API contract formats."""

    OPENAPI = "openapi"
    GRAPHQL = "graphql"
    GRPC = "grpc"


# ---------------------------------------------------------------------------
# Research Report
# ---------------------------------------------------------------------------


@dataclass
class TechStack:
    """A technology choice with AI-researched rationale.

    Attributes:
        layer:       The architectural layer (e.g. "frontend", "database").
        choice:      The chosen technology (e.g. "PostgreSQL").
        rationale:   Why this option was chosen.
        alternatives: Other options that were considered.
        pros:        Advantages of the chosen technology.
        cons:        Known drawbacks or trade-offs.
    """

    layer: str
    choice: str
    rationale: str
    alternatives: list[str] = field(default_factory=list)
    pros: list[str] = field(default_factory=list)
    cons: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.layer or not self.layer.strip():
            raise ValueError("TechStack layer must not be empty")
        if not self.choice or not self.choice.strip():
            raise ValueError("TechStack choice must not be empty")
        if not self.rationale or not self.rationale.strip():
            raise ValueError("TechStack rationale must not be empty")


@dataclass
class ResearchReport:
    """AI-generated research report for a set of technology decisions.

    Attributes:
        topic:       The research topic (e.g. "Database selection").
        summary:     Executive summary of the investigation.
        tech_stacks: Evaluated technology choices per architectural layer.
        status:      Lifecycle status of the research.
        citations:   Source references used in the investigation.
    """

    topic: str
    summary: str
    tech_stacks: list[TechStack] = field(default_factory=list)
    status: ResearchStatus = ResearchStatus.PENDING
    citations: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.topic or not self.topic.strip():
            raise ValueError("ResearchReport topic must not be empty")
        if isinstance(self.status, str):
            self.status = ResearchStatus(self.status)

    def add_tech_stack(self, tech_stack: TechStack) -> None:
        """Append a technology stack entry to the report."""
        self.tech_stacks.append(tech_stack)

    def choices_for_layer(self, layer: str) -> list[TechStack]:
        """Return all tech stacks evaluated for a given architectural layer."""
        return [ts for ts in self.tech_stacks if ts.layer == layer]

    def to_dict(self) -> dict[str, Any]:
        return {
            "topic": self.topic,
            "summary": self.summary,
            "status": self.status.value,
            "tech_stacks": [
                {
                    "layer": ts.layer,
                    "choice": ts.choice,
                    "rationale": ts.rationale,
                    "alternatives": ts.alternatives,
                    "pros": ts.pros,
                    "cons": ts.cons,
                }
                for ts in self.tech_stacks
            ],
            "citations": self.citations,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ResearchReport:
        tech_stacks = [
            TechStack(
                layer=ts["layer"],
                choice=ts["choice"],
                rationale=ts["rationale"],
                alternatives=ts.get("alternatives", []),
                pros=ts.get("pros", []),
                cons=ts.get("cons", []),
            )
            for ts in data.get("tech_stacks", [])
        ]
        return cls(
            topic=data["topic"],
            summary=data["summary"],
            tech_stacks=tech_stacks,
            status=ResearchStatus(data.get("status", ResearchStatus.PENDING.value)),
            citations=data.get("citations", []),
        )


# ---------------------------------------------------------------------------
# Data Model
# ---------------------------------------------------------------------------


@dataclass
class EntityField:
    """A single field definition within a data-model entity.

    Attributes:
        name:        Field name (e.g. "user_id").
        field_type:  The data type for this field.
        required:    Whether the field must be present.
        primary_key: Whether this field is the primary key.
        description: Optional human-readable description.
    """

    name: str
    field_type: FieldType = FieldType.STRING
    required: bool = True
    primary_key: bool = False
    description: str = ""

    def __post_init__(self) -> None:
        if not self.name or not self.name.strip():
            raise ValueError("EntityField name must not be empty")
        if isinstance(self.field_type, str):
            self.field_type = FieldType(self.field_type)


@dataclass
class DataModelEntity:
    """A named entity within the data model (e.g. a database table).

    Attributes:
        name:        Entity name (e.g. "User").
        description: Description of the entity's purpose.
        fields:      Ordered list of field definitions.
        relationships: References to other entity names this entity relates to.
    """

    name: str
    description: str = ""
    fields: list[EntityField] = field(default_factory=list)
    relationships: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.name or not self.name.strip():
            raise ValueError("DataModelEntity name must not be empty")

    def add_field(self, entity_field: EntityField) -> None:
        """Append a field to the entity."""
        self.fields.append(entity_field)

    def primary_key(self) -> Optional[EntityField]:
        """Return the primary key field, or None if none is defined."""
        for f in self.fields:
            if f.primary_key:
                return f
        return None


@dataclass
class DataModel:
    """Full entity-relationship model for a project.

    Attributes:
        name:     A short label for the data model (e.g. "Core Domain").
        entities: List of entity definitions.
        notes:    Free-form notes on design decisions.
    """

    name: str
    entities: list[DataModelEntity] = field(default_factory=list)
    notes: str = ""

    def __post_init__(self) -> None:
        if not self.name or not self.name.strip():
            raise ValueError("DataModel name must not be empty")

    def add_entity(self, entity: DataModelEntity) -> None:
        """Append an entity definition to the data model."""
        self.entities.append(entity)

    def get_entity(self, name: str) -> Optional[DataModelEntity]:
        """Return an entity by name, or None if not found."""
        for e in self.entities:
            if e.name == name:
                return e
        return None

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "notes": self.notes,
            "entities": [
                {
                    "name": e.name,
                    "description": e.description,
                    "relationships": e.relationships,
                    "fields": [
                        {
                            "name": f.name,
                            "field_type": f.field_type.value,
                            "required": f.required,
                            "primary_key": f.primary_key,
                            "description": f.description,
                        }
                        for f in e.fields
                    ],
                }
                for e in self.entities
            ],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> DataModel:
        entities = []
        for e in data.get("entities", []):
            fields = [
                EntityField(
                    name=f["name"],
                    field_type=FieldType(f.get("field_type", FieldType.STRING.value)),
                    required=f.get("required", True),
                    primary_key=f.get("primary_key", False),
                    description=f.get("description", ""),
                )
                for f in e.get("fields", [])
            ]
            entities.append(
                DataModelEntity(
                    name=e["name"],
                    description=e.get("description", ""),
                    fields=fields,
                    relationships=e.get("relationships", []),
                )
            )
        return cls(
            name=data["name"],
            entities=entities,
            notes=data.get("notes", ""),
        )


# ---------------------------------------------------------------------------
# API Contract
# ---------------------------------------------------------------------------


@dataclass
class APIEndpoint:
    """A single endpoint or operation in an API contract.

    Attributes:
        path:        URL path (e.g. "/users/{id}").
        method:      HTTP method.
        summary:     Short description of the operation.
        description: Detailed explanation of the operation.
        tags:        Grouping tags for the endpoint.
    """

    path: str
    method: HTTPMethod = HTTPMethod.GET
    summary: str = ""
    description: str = ""
    tags: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.path or not self.path.strip():
            raise ValueError("APIEndpoint path must not be empty")
        if isinstance(self.method, str):
            self.method = HTTPMethod(self.method.upper())


@dataclass
class APIContract:
    """Complete service interface definition.

    Attributes:
        title:       API title (e.g. "User Service API").
        version:     API version string (e.g. "1.0.0").
        description: Overview of the API.
        format:      The contract format (OpenAPI, GraphQL, gRPC).
        base_url:    Base URL for the API (e.g. "/api/v1").
        endpoints:   List of endpoint/operation definitions.
        schema_raw:  Optional raw schema string (YAML/JSON/SDL).
    """

    title: str
    version: str = "1.0.0"
    description: str = ""
    format: ContractFormat = ContractFormat.OPENAPI
    base_url: str = "/api/v1"
    endpoints: list[APIEndpoint] = field(default_factory=list)
    schema_raw: str = ""

    def __post_init__(self) -> None:
        if not self.title or not self.title.strip():
            raise ValueError("APIContract title must not be empty")
        if isinstance(self.format, str):
            self.format = ContractFormat(self.format.lower())

    def add_endpoint(self, endpoint: APIEndpoint) -> None:
        """Append an endpoint to the contract."""
        self.endpoints.append(endpoint)

    def endpoints_by_tag(self, tag: str) -> list[APIEndpoint]:
        """Return all endpoints that have the given tag."""
        return [ep for ep in self.endpoints if tag in ep.tags]

    def to_dict(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "version": self.version,
            "description": self.description,
            "format": self.format.value,
            "base_url": self.base_url,
            "schema_raw": self.schema_raw,
            "endpoints": [
                {
                    "path": ep.path,
                    "method": ep.method.value,
                    "summary": ep.summary,
                    "description": ep.description,
                    "tags": ep.tags,
                }
                for ep in self.endpoints
            ],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> APIContract:
        endpoints = [
            APIEndpoint(
                path=ep["path"],
                method=HTTPMethod(ep.get("method", HTTPMethod.GET.value).upper()),
                summary=ep.get("summary", ""),
                description=ep.get("description", ""),
                tags=ep.get("tags", []),
            )
            for ep in data.get("endpoints", [])
        ]
        return cls(
            title=data["title"],
            version=data.get("version", "1.0.0"),
            description=data.get("description", ""),
            format=ContractFormat(data.get("format", ContractFormat.OPENAPI.value)),
            base_url=data.get("base_url", "/api/v1"),
            endpoints=endpoints,
            schema_raw=data.get("schema_raw", ""),
        )


# ---------------------------------------------------------------------------
# Project Structure
# ---------------------------------------------------------------------------


@dataclass
class ProjectStructure:
    """Directory layout for the implementation.

    Attributes:
        root:         Root directory name (e.g. "my-project").
        description:  Overview of the project structure.
        tree:         Nested dict representation of the directory tree.
                      Values are either nested dicts (subdirectories) or
                      strings (file annotations).
        annotations:  Key-value map of path → annotation for key directories.
    """

    root: str
    description: str = ""
    tree: dict[str, Any] = field(default_factory=dict)
    annotations: dict[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.root or not self.root.strip():
            raise ValueError("ProjectStructure root must not be empty")

    def to_dict(self) -> dict[str, Any]:
        return {
            "root": self.root,
            "description": self.description,
            "tree": self.tree,
            "annotations": self.annotations,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ProjectStructure:
        return cls(
            root=data["root"],
            description=data.get("description", ""),
            tree=data.get("tree", {}),
            annotations=data.get("annotations", {}),
        )


# ---------------------------------------------------------------------------
# Plan (aggregate root)
# ---------------------------------------------------------------------------


@dataclass
class Plan:
    """Complete technical implementation plan for a feature.

    Aggregates all Module 3 artifacts: research reports, data model,
    API contract, and project structure.

    Attributes:
        project_name:      Name of the project this plan belongs to.
        spec_id:           Optional reference to the source Spec (Module 2).
        summary:           Executive summary of the plan.
        version:           Semantic version of the plan (e.g. "1.0.0").
        research_reports:  AI research investigations conducted for this plan.
        data_model:        Entity-relationship model for the implementation.
        api_contract:      Service interface definitions.
        project_structure: Proposed directory layout.
        tech_stacks:       Top-level technology choices (shorthand view).
        notes:             Free-form notes or open questions.
    """

    project_name: str
    spec_id: Optional[str] = None
    summary: str = ""
    version: str = "1.0.0"
    research_reports: list[ResearchReport] = field(default_factory=list)
    data_model: Optional[DataModel] = None
    api_contract: Optional[APIContract] = None
    project_structure: Optional[ProjectStructure] = None
    tech_stacks: list[TechStack] = field(default_factory=list)
    notes: str = ""

    def __post_init__(self) -> None:
        if not self.project_name or not self.project_name.strip():
            raise ValueError("Plan project_name must not be empty")
        _validate_semver(self.version)

    # ------------------------------------------------------------------
    # Mutators
    # ------------------------------------------------------------------

    def add_research_report(self, report: ResearchReport) -> None:
        """Append a research report to the plan."""
        self.research_reports.append(report)

    def add_tech_stack(self, tech_stack: TechStack) -> None:
        """Append a top-level technology stack choice."""
        self.tech_stacks.append(tech_stack)

    def set_data_model(self, data_model: DataModel) -> None:
        """Set or replace the data model."""
        self.data_model = data_model

    def set_api_contract(self, api_contract: APIContract) -> None:
        """Set or replace the API contract."""
        self.api_contract = api_contract

    def set_project_structure(self, project_structure: ProjectStructure) -> None:
        """Set or replace the project structure."""
        self.project_structure = project_structure

    def bump_version(self, bump: str = "patch") -> None:
        """Increment the semantic version.

        Args:
            bump: One of "major", "minor", or "patch".

        Raises:
            ValueError: If *bump* is not a valid bump type.
        """
        if bump not in {"major", "minor", "patch"}:
            raise ValueError(f"Invalid bump type '{bump}'. Use 'major', 'minor', or 'patch'.")
        major, minor, patch = _parse_semver(self.version)
        if bump == "major":
            self.version = f"{major + 1}.0.0"
        elif bump == "minor":
            self.version = f"{major}.{minor + 1}.0"
        else:
            self.version = f"{major}.{minor}.{patch + 1}"

    # ------------------------------------------------------------------
    # Serialisation
    # ------------------------------------------------------------------

    def to_dict(self) -> dict[str, Any]:
        return {
            "project_name": self.project_name,
            "spec_id": self.spec_id,
            "summary": self.summary,
            "version": self.version,
            "notes": self.notes,
            "tech_stacks": [
                {
                    "layer": ts.layer,
                    "choice": ts.choice,
                    "rationale": ts.rationale,
                    "alternatives": ts.alternatives,
                    "pros": ts.pros,
                    "cons": ts.cons,
                }
                for ts in self.tech_stacks
            ],
            "research_reports": [r.to_dict() for r in self.research_reports],
            "data_model": self.data_model.to_dict() if self.data_model else None,
            "api_contract": self.api_contract.to_dict() if self.api_contract else None,
            "project_structure": (
                self.project_structure.to_dict() if self.project_structure else None
            ),
        }

    def save(self, path: Path) -> None:
        """Persist the plan to *path* as a YAML file."""
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as fh:
            yaml.dump(self.to_dict(), fh, allow_unicode=True, default_flow_style=False)

    @classmethod
    def load(cls, path: Path) -> Plan:
        """Load a :class:`Plan` from a YAML file at *path*.

        Raises:
            FileNotFoundError: If *path* does not exist.
        """
        with path.open("r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        return cls._from_dict(data)

    @classmethod
    def _from_dict(cls, data: dict[str, Any]) -> Plan:
        research_reports = [
            ResearchReport.from_dict(r) for r in data.get("research_reports", [])
        ]
        data_model = (
            DataModel.from_dict(data["data_model"]) if data.get("data_model") else None
        )
        api_contract = (
            APIContract.from_dict(data["api_contract"]) if data.get("api_contract") else None
        )
        project_structure = (
            ProjectStructure.from_dict(data["project_structure"])
            if data.get("project_structure")
            else None
        )
        tech_stacks = [
            TechStack(
                layer=ts["layer"],
                choice=ts["choice"],
                rationale=ts["rationale"],
                alternatives=ts.get("alternatives", []),
                pros=ts.get("pros", []),
                cons=ts.get("cons", []),
            )
            for ts in data.get("tech_stacks", [])
        ]
        return cls(
            project_name=data["project_name"],
            spec_id=data.get("spec_id"),
            summary=data.get("summary", ""),
            version=data.get("version", "1.0.0"),
            notes=data.get("notes", ""),
            research_reports=research_reports,
            data_model=data_model,
            api_contract=api_contract,
            project_structure=project_structure,
            tech_stacks=tech_stacks,
        )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _validate_semver(version: str) -> None:
    """Raise ValueError if *version* is not a valid semantic version string."""
    if not re.match(r"^\d+\.\d+\.\d+$", version):
        raise ValueError(
            f"Invalid semantic version '{version}'. Expected format: MAJOR.MINOR.PATCH"
        )


def _parse_semver(version: str) -> tuple[int, int, int]:
    """Parse a semantic version string into (major, minor, patch) integers."""
    _validate_semver(version)
    major, minor, patch = version.split(".")
    return int(major), int(minor), int(patch)
