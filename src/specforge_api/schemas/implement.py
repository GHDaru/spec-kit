"""Pydantic request/response schemas for the Implement & Execute API (Module 6)."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# ComplianceReport
# ---------------------------------------------------------------------------


class FindingSchema(BaseModel):
    """A single compliance finding."""

    requirement: str
    verdict: str
    note: str = ""


class ComplianceReportSchema(BaseModel):
    """Mirrors :class:`~specify_cli.implement.ComplianceReport`."""

    report_id: str
    result_id: str
    spec_id: Optional[str] = None
    verdict: str
    summary: str
    findings: list[dict[str, Any]] = []


class ComplianceReportCreateRequest(BaseModel):
    """Request body for attaching a compliance report to a task result."""

    spec_id: Optional[str] = None
    verdict: str
    summary: str
    findings: list[dict[str, Any]] = []


# ---------------------------------------------------------------------------
# TaskResult
# ---------------------------------------------------------------------------


class TaskResultSchema(BaseModel):
    """Mirrors :class:`~specify_cli.implement.TaskResult`."""

    result_id: str
    task_id: str
    task_title: str
    status: str = "pending"
    output: str = ""
    error_message: Optional[str] = None
    started_at: str
    completed_at: Optional[str] = None
    compliance_report_id: Optional[str] = None


class TaskResultCreateRequest(BaseModel):
    """Request body for adding a task result to a session."""

    task_id: str
    task_title: str
    started_at: str
    status: str = "pending"
    output: str = ""
    error_message: Optional[str] = None
    completed_at: Optional[str] = None


class TaskResultUpdateRequest(BaseModel):
    """Request body for updating a task result's status and output."""

    status: Optional[str] = None
    output: Optional[str] = None
    error_message: Optional[str] = None
    completed_at: Optional[str] = None


# ---------------------------------------------------------------------------
# Checkpoint
# ---------------------------------------------------------------------------


class CheckpointSchema(BaseModel):
    """Mirrors :class:`~specify_cli.implement.Checkpoint`."""

    checkpoint_id: str
    label: str
    story_id: Optional[str] = None
    created_at: str
    notes: str = ""


class CheckpointCreateRequest(BaseModel):
    """Request body for adding a checkpoint to a session."""

    label: str
    created_at: str
    story_id: Optional[str] = None
    notes: str = ""


# ---------------------------------------------------------------------------
# ExecutionSession
# ---------------------------------------------------------------------------


class ExecutionSessionSchema(BaseModel):
    """Mirrors :class:`~specify_cli.implement.ExecutionSession`."""

    session_id: str
    project_id: str
    task_list_id: Optional[str] = None
    spec_id: Optional[str] = None
    plan_id: Optional[str] = None
    agent: str
    status: str = "idle"
    started_at: str
    completed_at: Optional[str] = None
    notes: str = ""
    task_results: list[TaskResultSchema] = []
    compliance_reports: list[ComplianceReportSchema] = []
    checkpoints: list[CheckpointSchema] = []


class ExecutionSessionCreateRequest(BaseModel):
    """Request body for creating a new execution session."""

    agent: str
    started_at: str
    task_list_id: Optional[str] = None
    spec_id: Optional[str] = None
    plan_id: Optional[str] = None
    status: str = "idle"
    notes: str = ""


class SessionStatusUpdateRequest(BaseModel):
    """Request body for updating a session's status."""

    status: str


# ---------------------------------------------------------------------------
# Session list
# ---------------------------------------------------------------------------


class SessionListResponse(BaseModel):
    """List of sessions for a project."""

    project_id: str
    sessions: list[ExecutionSessionSchema] = []


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------


class SessionSummarySchema(BaseModel):
    """Summary statistics for an execution session."""

    total_tasks: int
    by_status: dict[str, int]
    total_compliance_reports: int
    by_verdict: dict[str, int]
    total_checkpoints: int
