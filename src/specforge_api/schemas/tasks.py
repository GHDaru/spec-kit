"""Pydantic request/response schemas for the Task Forge API (Module 4)."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Task
# ---------------------------------------------------------------------------


class TaskSchema(BaseModel):
    """Mirrors :class:`~specify_cli.tasks.Task`."""

    task_id: str
    title: str
    description: str = ""
    phase: str
    parallel: bool = False
    story_id: Optional[str] = None
    dependencies: list[str] = []
    status: str = "pending"
    tags: list[str] = []


class TaskCreateRequest(BaseModel):
    """Request body for adding a task to a phase."""

    title: str
    description: str = ""
    parallel: bool = False
    story_id: Optional[str] = None
    dependencies: list[str] = []
    status: str = "pending"
    tags: list[str] = []


class TaskStatusUpdateRequest(BaseModel):
    """Request body for updating a task's status."""

    status: str


# ---------------------------------------------------------------------------
# Phase
# ---------------------------------------------------------------------------


class PhaseSchema(BaseModel):
    """Mirrors :class:`~specify_cli.tasks.Phase`."""

    phase_type: str
    tasks: list[TaskSchema] = []


# ---------------------------------------------------------------------------
# Dependency Graph
# ---------------------------------------------------------------------------


class DependencyEdgeSchema(BaseModel):
    """Mirrors :class:`~specify_cli.tasks.DependencyEdge`."""

    source_id: str
    target_id: str
    label: str = ""


class DependencyGraphRequest(BaseModel):
    """Request body for setting the full dependency graph."""

    edges: list[DependencyEdgeSchema] = []


class DependencyGraphSchema(BaseModel):
    """Full dependency graph response."""

    edges: list[DependencyEdgeSchema] = []


# ---------------------------------------------------------------------------
# GitHub Export
# ---------------------------------------------------------------------------


class IssuePreviewSchema(BaseModel):
    """A single GitHub Issues export preview for one task."""

    task_id: str
    title: str
    body: str
    labels: list[str] = []
    milestone: str = ""


class GitHubExportSchema(BaseModel):
    """Full GitHub Issues export preview."""

    issues: list[IssuePreviewSchema] = []


# ---------------------------------------------------------------------------
# Progress
# ---------------------------------------------------------------------------


class ProgressSummarySchema(BaseModel):
    """Progress summary returned by the progress endpoint."""

    total: int
    by_status: dict[str, int]
    by_phase: dict[str, Any]


# ---------------------------------------------------------------------------
# TaskList
# ---------------------------------------------------------------------------


class TaskListResponse(BaseModel):
    """Full task list payload returned by the API."""

    project_name: str
    plan_id: Optional[str] = None
    spec_id: Optional[str] = None
    version: str
    notes: str = ""
    phases: list[PhaseSchema] = []
    dependency_edges: list[DependencyEdgeSchema] = []


class TaskListCreateRequest(BaseModel):
    """Request body for creating a new task list."""

    project_name: str
    plan_id: Optional[str] = None
    spec_id: Optional[str] = None
    notes: str = ""
    phases: list[PhaseSchema] = []
    dependency_edges: list[DependencyEdgeSchema] = []
