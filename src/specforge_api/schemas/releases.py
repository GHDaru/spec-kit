"""Pydantic request/response schemas for the Release Manager API (Module 5)."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# ChangeEntry
# ---------------------------------------------------------------------------


class ChangeEntrySchema(BaseModel):
    """Mirrors :class:`~specify_cli.releases.ChangeEntry`."""

    change_id: str
    change_type: str
    description: str
    task_id: Optional[str] = None
    story_id: Optional[str] = None


class ChangeEntryCreateRequest(BaseModel):
    """Request body for adding a change entry to a release."""

    change_type: str
    description: str
    task_id: Optional[str] = None
    story_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Release
# ---------------------------------------------------------------------------


class ReleaseSchema(BaseModel):
    """Mirrors :class:`~specify_cli.releases.Release`."""

    version: str
    title: str = ""
    date: str = ""
    status: str = "draft"
    task_list_id: Optional[str] = None
    spec_id: Optional[str] = None
    plan_id: Optional[str] = None
    notes: str = ""
    changes: list[ChangeEntrySchema] = []


class ReleaseCreateRequest(BaseModel):
    """Request body for creating a new release."""

    version: str
    title: str = ""
    date: str = ""
    status: str = "draft"
    task_list_id: Optional[str] = None
    spec_id: Optional[str] = None
    plan_id: Optional[str] = None
    notes: str = ""
    changes: list[ChangeEntrySchema] = []


class ReleaseUpdateRequest(BaseModel):
    """Request body for updating a release's metadata (not its changes)."""

    title: Optional[str] = None
    date: Optional[str] = None
    task_list_id: Optional[str] = None
    spec_id: Optional[str] = None
    plan_id: Optional[str] = None
    notes: Optional[str] = None


class ReleaseStatusUpdateRequest(BaseModel):
    """Request body for updating a release's status."""

    status: str


# ---------------------------------------------------------------------------
# Changelog
# ---------------------------------------------------------------------------


class ChangelogSchema(BaseModel):
    """Full changelog returned as Markdown text."""

    markdown: str


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------


class ReleaseLogSummarySchema(BaseModel):
    """Summary statistics for the release log."""

    total_releases: int
    by_status: dict[str, int]
    total_changes: int
    by_change_type: dict[str, Any]


# ---------------------------------------------------------------------------
# ReleaseLog
# ---------------------------------------------------------------------------


class ReleaseLogResponse(BaseModel):
    """Full release log payload returned by the API."""

    project_name: str
    notes: str = ""
    releases: list[ReleaseSchema] = []


class ReleaseLogCreateRequest(BaseModel):
    """Request body for creating a new release log."""

    project_name: str
    notes: str = ""
    releases: list[ReleaseSchema] = []
