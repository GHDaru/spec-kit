"""Pydantic request/response schemas for the Constitution Engine API."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class PrincipleSchema(BaseModel):
    """Mirrors the :class:`~specify_cli.constitution.Principle` domain entity."""

    name: str
    description: str
    enforcement_level: str = "MUST"
    category: str = "general"


class ConstitutionResponse(BaseModel):
    """Full constitution payload returned by the API."""

    project_name: str
    version: str
    ratification_date: Optional[str] = None
    last_amended_date: Optional[str] = None
    principles: list[PrincipleSchema] = []


class ConstitutionCreateRequest(BaseModel):
    """Request body for creating a new constitution."""

    project_name: str
    principles: list[PrincipleSchema] = []


class ComplianceCheckRequest(BaseModel):
    """Request body for a compliance check."""

    artifact_path: str


class ComplianceViolationSchema(BaseModel):
    """Mirrors the :class:`~specify_cli.constitution.ComplianceViolation` value object."""

    principle_name: str
    enforcement_level: str
    message: str
    line_number: Optional[int] = None
    is_blocking: bool


class ComplianceReportResponse(BaseModel):
    """Compliance check result."""

    passed: bool
    blocking_violations: list[ComplianceViolationSchema] = []
    warning_violations: list[ComplianceViolationSchema] = []
    summary: str


class AmendmentRecord(BaseModel):
    """A single entry in the constitution amendment history."""

    version: str
    amended_date: Optional[str] = None


class ConstitutionHistoryResponse(BaseModel):
    """Amendment history for a project's constitution."""

    project_name: str
    amendments: list[AmendmentRecord] = []
