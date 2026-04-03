"""Pydantic request/response schemas for the Quality Guardian API (Module 7)."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# ChecklistItem
# ---------------------------------------------------------------------------


class ChecklistItemSchema(BaseModel):
    """Mirrors :class:`~specify_cli.quality.ChecklistItem`."""

    item_id: str
    checklist_id: str
    category: str
    description: str
    status: str = "pending"
    notes: str = ""


class ChecklistItemCreateRequest(BaseModel):
    """Inline item definition supplied when creating a Checklist."""

    category: str
    description: str
    notes: str = ""


class ChecklistItemUpdateRequest(BaseModel):
    """Request body for updating a checklist item's status and notes."""

    status: str
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Checklist
# ---------------------------------------------------------------------------


class ChecklistSchema(BaseModel):
    """Mirrors :class:`~specify_cli.quality.Checklist`."""

    checklist_id: str
    project_id: str
    name: str
    spec_id: Optional[str] = None
    created_at: str
    items: list[ChecklistItemSchema] = []


class ChecklistCreateRequest(BaseModel):
    """Request body for creating a new quality checklist."""

    name: str
    created_at: str
    spec_id: Optional[str] = None
    items: list[ChecklistItemCreateRequest] = []


class ChecklistListResponse(BaseModel):
    """List of checklists for a project."""

    project_id: str
    checklists: list[ChecklistSchema] = []


# ---------------------------------------------------------------------------
# TestCase
# ---------------------------------------------------------------------------


class TestCaseSchema(BaseModel):
    """Mirrors :class:`~specify_cli.quality.TestCase`."""

    case_id: str
    suite_id: str
    title: str
    case_type: str
    scenario: str
    expected: str
    tags: list[str] = []


class TestCaseCreateRequest(BaseModel):
    """Inline test-case definition supplied when creating a TestSuite."""

    title: str
    case_type: str
    scenario: str
    expected: str
    tags: list[str] = []


# ---------------------------------------------------------------------------
# TestSuite
# ---------------------------------------------------------------------------


class TestSuiteSchema(BaseModel):
    """Mirrors :class:`~specify_cli.quality.TestSuite`."""

    suite_id: str
    project_id: str
    feature: str
    spec_id: Optional[str] = None
    generated_at: str
    cases: list[TestCaseSchema] = []


class TestSuiteCreateRequest(BaseModel):
    """Request body for creating a new test suite."""

    feature: str
    generated_at: str
    spec_id: Optional[str] = None
    cases: list[TestCaseCreateRequest] = []


class TestSuiteListResponse(BaseModel):
    """List of test suites for a project."""

    project_id: str
    suites: list[TestSuiteSchema] = []


# ---------------------------------------------------------------------------
# AnalysisFinding
# ---------------------------------------------------------------------------


class AnalysisFindingSchema(BaseModel):
    """Mirrors :class:`~specify_cli.quality.AnalysisFinding`."""

    finding_id: str
    report_id: str
    severity: str
    category: str
    description: str
    recommendation: str = ""


class AnalysisFindingCreateRequest(BaseModel):
    """Inline finding definition supplied when creating an AnalysisReport."""

    severity: str
    category: str
    description: str
    recommendation: str = ""


# ---------------------------------------------------------------------------
# AnalysisReport
# ---------------------------------------------------------------------------


class AnalysisReportSchema(BaseModel):
    """Mirrors :class:`~specify_cli.quality.AnalysisReport`."""

    report_id: str
    project_id: str
    spec_id: Optional[str] = None
    plan_id: Optional[str] = None
    analyzed_at: str
    findings: list[AnalysisFindingSchema] = []


class AnalysisReportCreateRequest(BaseModel):
    """Request body for creating a new analysis report."""

    analyzed_at: str
    spec_id: Optional[str] = None
    plan_id: Optional[str] = None
    findings: list[AnalysisFindingCreateRequest] = []


class AnalysisReportListResponse(BaseModel):
    """List of analysis reports for a project."""

    project_id: str
    reports: list[AnalysisReportSchema] = []
