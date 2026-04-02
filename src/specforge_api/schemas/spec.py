"""Pydantic request/response schemas for the Specification Studio API (Module 2)."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Acceptance Scenario
# ---------------------------------------------------------------------------


class AcceptanceScenarioSchema(BaseModel):
    """Mirrors the :class:`~specify_cli.spec.AcceptanceScenario` value object."""

    title: str
    given: str
    when: str
    then: str


# ---------------------------------------------------------------------------
# User Story
# ---------------------------------------------------------------------------


class UserStorySchema(BaseModel):
    """Mirrors the :class:`~specify_cli.spec.UserStory` entity."""

    id: str
    title: str
    as_a: str
    i_want: str
    so_that: str
    priority: str = "P2"
    scenarios: list[AcceptanceScenarioSchema] = []


class AddUserStoryRequest(BaseModel):
    """Request body for adding a user story to a spec."""

    id: Optional[str] = None
    title: str
    as_a: str
    i_want: str
    so_that: str
    priority: str = "P2"
    scenarios: list[AcceptanceScenarioSchema] = []


class UpdateStoryPriorityRequest(BaseModel):
    """Request body for updating a user story's priority."""

    priority: str


# ---------------------------------------------------------------------------
# Functional Requirement
# ---------------------------------------------------------------------------


class FunctionalRequirementSchema(BaseModel):
    """Mirrors the :class:`~specify_cli.spec.FunctionalRequirement` value object."""

    id: str
    description: str
    story_id: Optional[str] = None


class AddRequirementRequest(BaseModel):
    """Request body for adding a functional requirement."""

    description: str
    story_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Clarification
# ---------------------------------------------------------------------------


class ClarificationItemSchema(BaseModel):
    """Mirrors the :class:`~specify_cli.spec.ClarificationItem` value object."""

    id: str
    description: str
    status: str
    resolution: Optional[str] = None


class AddClarificationRequest(BaseModel):
    """Request body for adding a clarification item."""

    description: str


class ResolveClarificationRequest(BaseModel):
    """Request body for resolving a clarification item."""

    resolution: str


# ---------------------------------------------------------------------------
# Spec (aggregate)
# ---------------------------------------------------------------------------


class SpecResponse(BaseModel):
    """Full spec payload returned by the API."""

    spec_id: str
    title: str
    description: str
    version: str
    created_date: Optional[str] = None
    user_stories: list[UserStorySchema] = []
    requirements: list[FunctionalRequirementSchema] = []
    clarifications: list[ClarificationItemSchema] = []


class CreateSpecRequest(BaseModel):
    """Request body for creating a new spec."""

    title: str
    description: str = ""
    user_stories: list[AddUserStoryRequest] = []
    requirements: list[AddRequirementRequest] = []
    clarifications: list[AddClarificationRequest] = []


class SpecSummary(BaseModel):
    """Lightweight spec summary used in list responses."""

    spec_id: str
    title: str
    version: str
    created_date: Optional[str] = None
    story_count: int
    requirement_count: int
    open_clarification_count: int


class SpecListResponse(BaseModel):
    """List of spec summaries for a project."""

    project_id: str
    specs: list[SpecSummary] = []
