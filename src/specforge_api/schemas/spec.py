"""Pydantic request/response schemas for the Specification Studio (Module 2)."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


# ──────────────────────────────────────────────────────────────────────────────
# Nested value-object schemas
# ──────────────────────────────────────────────────────────────────────────────

class AcceptanceScenarioSchema(BaseModel):
    id: str
    given: str
    when: str
    then: str


class FunctionalRequirementSchema(BaseModel):
    id: str
    description: str
    story_id: Optional[str] = None


class ClarificationItemSchema(BaseModel):
    id: str
    marker: str
    suggestion: str = ""
    resolved: bool = False
    resolution: Optional[str] = None


class UserStorySchema(BaseModel):
    id: str
    title: str
    description: str
    priority: str  # P1 | P2 | P3
    acceptance_scenarios: list[AcceptanceScenarioSchema] = []


# ──────────────────────────────────────────────────────────────────────────────
# Spec response / request schemas
# ──────────────────────────────────────────────────────────────────────────────

class SpecSummaryResponse(BaseModel):
    """Lightweight summary returned in list endpoints."""

    id: str
    feature_name: str
    description: str
    version: str
    created_at: str
    updated_at: str
    story_count: int
    requirement_count: int


class SpecResponse(BaseModel):
    """Full spec payload."""

    id: str
    feature_name: str
    description: str
    version: str
    user_stories: list[UserStorySchema] = []
    functional_requirements: list[FunctionalRequirementSchema] = []
    clarification_items: list[ClarificationItemSchema] = []
    created_at: str
    updated_at: str


# ──────────────────────────────────────────────────────────────────────────────
# Request bodies
# ──────────────────────────────────────────────────────────────────────────────

class AcceptanceScenarioCreateRequest(BaseModel):
    given: str
    when: str
    then: str


class UserStoryCreateRequest(BaseModel):
    title: str
    description: str
    priority: str = "P1"
    acceptance_scenarios: list[AcceptanceScenarioCreateRequest] = []


class FunctionalRequirementCreateRequest(BaseModel):
    description: str
    story_id: Optional[str] = None


class SpecCreateRequest(BaseModel):
    feature_name: str
    description: str = ""
    version: str = "1.0.0"
    user_stories: list[UserStoryCreateRequest] = []
    functional_requirements: list[FunctionalRequirementCreateRequest] = []


class SpecUpdateRequest(BaseModel):
    feature_name: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    user_stories: Optional[list[UserStoryCreateRequest]] = None
    functional_requirements: Optional[list[FunctionalRequirementCreateRequest]] = None


class ResolveClarificationRequest(BaseModel):
    resolution: str


class AddClarificationRequest(BaseModel):
    marker: str
    suggestion: str = ""
