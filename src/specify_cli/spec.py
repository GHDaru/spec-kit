"""Domain model for the Specification Studio (Module 2).

Entities
--------
AcceptanceScenario  — Given/When/Then test condition
FunctionalRequirement — numbered, traceable requirement
ClarificationItem  — identified ambiguity with resolution status
UserStory          — prioritized user journey with acceptance scenarios
Spec               — complete feature specification document

Persistence
-----------
Each Spec is stored as a JSON file:
  {projects_root}/{project_id}/specs/{spec_id}.json
"""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


# ──────────────────────────────────────────────────────────────────────────────
# Value objects
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class AcceptanceScenario:
    """A Given/When/Then acceptance test condition."""

    id: str
    given: str
    when: str
    then: str

    @classmethod
    def create(cls, given: str, when: str, then: str) -> "AcceptanceScenario":
        return cls(id=str(uuid.uuid4()), given=given, when=when, then=then)


@dataclass
class FunctionalRequirement:
    """A numbered, traceable functional requirement."""

    id: str          # e.g. FR-001
    description: str
    story_id: Optional[str] = None  # traceability link to UserStory

    @classmethod
    def create(cls, number: int, description: str, story_id: Optional[str] = None) -> "FunctionalRequirement":
        req_id = f"FR-{number:03d}"
        return cls(id=req_id, description=description, story_id=story_id)


@dataclass
class ClarificationItem:
    """An identified ambiguity with optional AI-suggested resolution."""

    id: str
    marker: str           # the [NEEDS CLARIFICATION] text/context
    suggestion: str       # AI-suggested resolution
    resolved: bool = False
    resolution: Optional[str] = None  # accepted resolution text

    @classmethod
    def create(cls, marker: str, suggestion: str = "") -> "ClarificationItem":
        return cls(id=str(uuid.uuid4()), marker=marker, suggestion=suggestion)

    def resolve(self, resolution: str) -> None:
        self.resolved = True
        self.resolution = resolution

    def reject(self) -> None:
        self.resolved = True
        self.resolution = None


# ──────────────────────────────────────────────────────────────────────────────
# Aggregate
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class UserStory:
    """A prioritized user journey with acceptance scenarios."""

    id: str
    title: str
    description: str
    priority: str  # P1, P2, P3
    acceptance_scenarios: list[AcceptanceScenario] = field(default_factory=list)

    @classmethod
    def create(cls, title: str, description: str, priority: str = "P1") -> "UserStory":
        if priority not in ("P1", "P2", "P3"):
            raise ValueError(f"Invalid priority '{priority}'. Must be P1, P2, or P3.")
        return cls(
            id=str(uuid.uuid4()),
            title=title,
            description=description,
            priority=priority,
        )

    def add_scenario(self, given: str, when: str, then: str) -> AcceptanceScenario:
        scenario = AcceptanceScenario.create(given=given, when=when, then=then)
        self.acceptance_scenarios.append(scenario)
        return scenario

    def remove_scenario(self, scenario_id: str) -> None:
        self.acceptance_scenarios = [
            s for s in self.acceptance_scenarios if s.id != scenario_id
        ]


@dataclass
class Spec:
    """A complete feature specification document."""

    id: str
    feature_name: str
    description: str
    version: str
    user_stories: list[UserStory] = field(default_factory=list)
    functional_requirements: list[FunctionalRequirement] = field(default_factory=list)
    clarification_items: list[ClarificationItem] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @classmethod
    def create(cls, feature_name: str, description: str = "", version: str = "1.0.0") -> "Spec":
        return cls(
            id=str(uuid.uuid4()),
            feature_name=feature_name,
            description=description,
            version=version,
        )

    # ── User stories ──────────────────────────────────────────────────────────

    def add_user_story(self, title: str, description: str, priority: str = "P1") -> UserStory:
        story = UserStory.create(title=title, description=description, priority=priority)
        self.user_stories.append(story)
        self._touch()
        return story

    def remove_user_story(self, story_id: str) -> None:
        self.user_stories = [s for s in self.user_stories if s.id != story_id]
        # Remove requirements linked to this story
        for req in self.functional_requirements:
            if req.story_id == story_id:
                req.story_id = None
        self._touch()

    def get_user_story(self, story_id: str) -> Optional[UserStory]:
        return next((s for s in self.user_stories if s.id == story_id), None)

    # ── Functional requirements ───────────────────────────────────────────────

    def add_requirement(self, description: str, story_id: Optional[str] = None) -> FunctionalRequirement:
        number = len(self.functional_requirements) + 1
        req = FunctionalRequirement.create(number=number, description=description, story_id=story_id)
        self.functional_requirements.append(req)
        self._touch()
        return req

    def remove_requirement(self, req_id: str) -> None:
        self.functional_requirements = [r for r in self.functional_requirements if r.id != req_id]
        self._touch()

    # ── Clarification items ───────────────────────────────────────────────────

    def add_clarification(self, marker: str, suggestion: str = "") -> ClarificationItem:
        item = ClarificationItem.create(marker=marker, suggestion=suggestion)
        self.clarification_items.append(item)
        self._touch()
        return item

    def resolve_clarification(self, item_id: str, resolution: str) -> None:
        item = self._get_clarification(item_id)
        if item:
            item.resolve(resolution)
            self._touch()

    def reject_clarification(self, item_id: str) -> None:
        item = self._get_clarification(item_id)
        if item:
            item.reject()
            self._touch()

    def _get_clarification(self, item_id: str) -> Optional[ClarificationItem]:
        return next((c for c in self.clarification_items if c.id == item_id), None)

    # ── Persistence ───────────────────────────────────────────────────────────

    def _touch(self) -> None:
        self.updated_at = datetime.now(timezone.utc).isoformat()

    def save(self, path: Path) -> None:
        """Persist this spec as a JSON file at *path*."""
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(asdict(self), indent=2, ensure_ascii=False), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> "Spec":
        """Load a Spec from a JSON file at *path*.

        Raises FileNotFoundError if the file does not exist.
        """
        if not path.exists():
            raise FileNotFoundError(f"Spec file not found: {path}")
        data = json.loads(path.read_text(encoding="utf-8"))
        return cls._from_dict(data)

    @classmethod
    def _from_dict(cls, data: dict) -> "Spec":
        user_stories = [
            UserStory(
                id=s["id"],
                title=s["title"],
                description=s["description"],
                priority=s["priority"],
                acceptance_scenarios=[
                    AcceptanceScenario(**sc) for sc in s.get("acceptance_scenarios", [])
                ],
            )
            for s in data.get("user_stories", [])
        ]
        functional_requirements = [
            FunctionalRequirement(
                id=r["id"],
                description=r["description"],
                story_id=r.get("story_id"),
            )
            for r in data.get("functional_requirements", [])
        ]
        clarification_items = [
            ClarificationItem(
                id=c["id"],
                marker=c["marker"],
                suggestion=c.get("suggestion", ""),
                resolved=c.get("resolved", False),
                resolution=c.get("resolution"),
            )
            for c in data.get("clarification_items", [])
        ]
        return cls(
            id=data["id"],
            feature_name=data["feature_name"],
            description=data.get("description", ""),
            version=data.get("version", "1.0.0"),
            user_stories=user_stories,
            functional_requirements=functional_requirements,
            clarification_items=clarification_items,
            created_at=data.get("created_at", ""),
            updated_at=data.get("updated_at", ""),
        )
