"""Pydantic request/response schemas for the Project Dashboard API (Module 8)."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# TeamMember
# ---------------------------------------------------------------------------


class TeamMemberSchema(BaseModel):
    """Mirrors :class:`~specify_cli.dashboard.TeamMember`."""

    member_id: str
    project_id: str
    name: str
    email: str
    role: str = "viewer"
    joined_at: str


# ---------------------------------------------------------------------------
# FeatureStatus
# ---------------------------------------------------------------------------


class FeatureStatusSchema(BaseModel):
    """Mirrors :class:`~specify_cli.dashboard.FeatureStatus`."""

    feature_id: str
    title: str
    description: str = ""
    sdd_phases: dict[str, str] = {}
    created_at: str
    updated_at: str


class FeatureCreateRequest(BaseModel):
    """Request body for adding a feature to a project."""

    title: str
    description: str = ""
    created_at: str
    updated_at: str
    sdd_phases: dict[str, str] = {}


class PhaseUpdateRequest(BaseModel):
    """Request body for updating a phase status on a feature."""

    phase: str
    phase_status: str


# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------


class ProjectSchema(BaseModel):
    """Mirrors :class:`~specify_cli.dashboard.Project`."""

    project_id: str
    name: str
    description: str = ""
    created_at: str
    updated_at: str
    team_members: list[TeamMemberSchema] = []
    features: list[FeatureStatusSchema] = []


class ProjectCreateRequest(BaseModel):
    """Request body for creating a new project."""

    name: str
    description: str = ""
    created_at: str
    updated_at: str


class ProjectListResponse(BaseModel):
    """List of projects."""

    projects: list[ProjectSchema] = []


# ---------------------------------------------------------------------------
# ReviewThread
# ---------------------------------------------------------------------------


class ReviewThreadSchema(BaseModel):
    """Mirrors :class:`~specify_cli.dashboard.ReviewThread`."""

    thread_id: str
    project_id: str
    artifact_id: str
    artifact_type: str
    title: str
    status: str = "open"
    author: str
    comments: list[dict[str, Any]] = []
    created_at: str
    updated_at: str


class ReviewThreadCreateRequest(BaseModel):
    """Request body for creating a new review thread."""

    artifact_id: str
    artifact_type: str
    title: str
    author: str
    created_at: str
    updated_at: str
    status: str = "open"
    comments: list[dict[str, Any]] = []


class ReviewListResponse(BaseModel):
    """List of review threads for a project."""

    project_id: str
    reviews: list[ReviewThreadSchema] = []


# ---------------------------------------------------------------------------
# FeatureList
# ---------------------------------------------------------------------------


class FeatureListResponse(BaseModel):
    """List of features for a project."""

    project_id: str
    features: list[FeatureStatusSchema] = []


# ---------------------------------------------------------------------------
# ProjectMetrics
# ---------------------------------------------------------------------------


class ProjectMetricsSchema(BaseModel):
    """Mirrors :class:`~specify_cli.dashboard.ProjectMetrics`."""

    project_id: str
    computed_at: str
    total_features: int
    features_by_phase: dict[str, int]
    spec_quality_avg: float
    compliance_rate: float
    velocity_per_week: float
