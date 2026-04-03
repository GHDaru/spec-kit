"""
Project Dashboard — Module 8 of SpecForge

Serves as the main application shell and entry point. Provides a unified view
of all specs, plans, tasks, and implementation progress across all features.
Enables teams to collaborate, review, and evolve the product roadmap.

Key Entities:
- SDDPhase        — enum: constitution | spec | plan | tasks | implement | done
- PhaseStatus     — enum: pending | in_progress | complete | blocked
- ReviewStatus    — enum: open | resolved | dismissed
- TeamRole        — enum: owner | editor | reviewer | viewer
- FeatureStatus   — lifecycle state of a feature across SDD phases
- ReviewThread    — collaborative discussion on an artifact
- TeamMember      — project collaborator
- ProjectMetrics  — aggregated metrics computed from a Project
- Project         — root aggregate; persisted as projects/{project_id}/project.yaml
"""

from __future__ import annotations

import uuid
from enum import Enum
from pathlib import Path
from typing import Any, Optional

import yaml


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------


class SDDPhase(str, Enum):
    CONSTITUTION = "constitution"
    SPEC = "spec"
    PLAN = "plan"
    TASKS = "tasks"
    IMPLEMENT = "implement"
    DONE = "done"


class PhaseStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETE = "complete"
    BLOCKED = "blocked"


class ReviewStatus(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class TeamRole(str, Enum):
    OWNER = "owner"
    EDITOR = "editor"
    REVIEWER = "reviewer"
    VIEWER = "viewer"


# ---------------------------------------------------------------------------
# FeatureStatus — entity
# ---------------------------------------------------------------------------

# Ordered list of all SDD phases for iteration purposes
_ALL_PHASES: list[SDDPhase] = [
    SDDPhase.CONSTITUTION,
    SDDPhase.SPEC,
    SDDPhase.PLAN,
    SDDPhase.TASKS,
    SDDPhase.IMPLEMENT,
    SDDPhase.DONE,
]


class FeatureStatus:
    """Lifecycle state of a feature across all SDD phases.

    Attributes
    ----------
    feature_id:  Unique identifier (UUID)
    title:       Short feature title
    description: Longer description (optional)
    sdd_phases:  Mapping from SDDPhase to PhaseStatus
    created_at:  ISO-8601 timestamp
    updated_at:  ISO-8601 timestamp
    """

    def __init__(
        self,
        title: str,
        created_at: str,
        updated_at: str,
        *,
        feature_id: Optional[str] = None,
        description: str = "",
        sdd_phases: Optional[dict[SDDPhase | str, PhaseStatus | str]] = None,
    ) -> None:
        self.feature_id = feature_id or str(uuid.uuid4())
        self.title = title
        self.description = description
        self.created_at = created_at
        self.updated_at = updated_at
        # Normalise keys/values to enum members; default every phase to pending
        normalised: dict[SDDPhase, PhaseStatus] = {
            phase: PhaseStatus.PENDING for phase in _ALL_PHASES
        }
        if sdd_phases:
            for k, v in sdd_phases.items():
                phase = SDDPhase(k) if isinstance(k, str) else k
                ps = PhaseStatus(v) if isinstance(v, str) else v
                normalised[phase] = ps
        self.sdd_phases: dict[SDDPhase, PhaseStatus] = normalised

    def update_phase(self, phase: SDDPhase | str, phase_status: PhaseStatus | str) -> None:
        """Update the status of a single SDD phase."""
        p = SDDPhase(phase) if isinstance(phase, str) else phase
        ps = PhaseStatus(phase_status) if isinstance(phase_status, str) else phase_status
        self.sdd_phases[p] = ps

    def to_dict(self) -> dict:
        return {
            "feature_id": self.feature_id,
            "title": self.title,
            "description": self.description,
            "sdd_phases": {k.value: v.value for k, v in self.sdd_phases.items()},
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "FeatureStatus":
        return cls(
            feature_id=d["feature_id"],
            title=d["title"],
            description=d.get("description", ""),
            sdd_phases=d.get("sdd_phases", {}),
            created_at=d["created_at"],
            updated_at=d["updated_at"],
        )


# ---------------------------------------------------------------------------
# ReviewThread — entity
# ---------------------------------------------------------------------------


class ReviewThread:
    """Collaborative discussion thread attached to a project artifact.

    Persisted as ``projects/{project_id}/reviews/{thread_id}.yaml``.

    Attributes
    ----------
    thread_id:     Unique identifier (UUID)
    project_id:    Reference to the owning project
    artifact_id:   ID of the artifact being reviewed (e.g. a spec or feature)
    artifact_type: Free-form type label (e.g. "spec", "feature")
    title:         Short description of the review thread
    status:        Thread lifecycle status (ReviewStatus)
    author:        Name/ID of the thread creator
    comments:      Ordered list of comment dicts (text, author, created_at)
    created_at:    ISO-8601 timestamp
    updated_at:    ISO-8601 timestamp
    """

    def __init__(
        self,
        project_id: str,
        artifact_id: str,
        artifact_type: str,
        title: str,
        author: str,
        created_at: str,
        updated_at: str,
        *,
        thread_id: Optional[str] = None,
        status: ReviewStatus | str = ReviewStatus.OPEN,
        comments: Optional[list[dict[str, Any]]] = None,
    ) -> None:
        self.thread_id = thread_id or str(uuid.uuid4())
        self.project_id = project_id
        self.artifact_id = artifact_id
        self.artifact_type = artifact_type
        self.title = title
        self.author = author
        self.status = ReviewStatus(status) if isinstance(status, str) else status
        self.comments: list[dict[str, Any]] = comments or []
        self.created_at = created_at
        self.updated_at = updated_at

    def to_dict(self) -> dict:
        return {
            "thread_id": self.thread_id,
            "project_id": self.project_id,
            "artifact_id": self.artifact_id,
            "artifact_type": self.artifact_type,
            "title": self.title,
            "status": self.status.value,
            "author": self.author,
            "comments": self.comments,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    def save(self, path: Path) -> None:
        """Persist this review thread to *path* (YAML)."""
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as fh:
            yaml.safe_dump(self.to_dict(), fh, allow_unicode=True, sort_keys=False)

    @classmethod
    def from_dict(cls, d: dict) -> "ReviewThread":
        return cls(
            thread_id=d["thread_id"],
            project_id=d["project_id"],
            artifact_id=d["artifact_id"],
            artifact_type=d["artifact_type"],
            title=d["title"],
            author=d["author"],
            status=d.get("status", ReviewStatus.OPEN),
            comments=d.get("comments", []),
            created_at=d["created_at"],
            updated_at=d["updated_at"],
        )

    @classmethod
    def load(cls, path: Path) -> "ReviewThread":
        """Load a ReviewThread from a YAML file; raises FileNotFoundError if absent."""
        with path.open(encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        return cls.from_dict(data)


# ---------------------------------------------------------------------------
# TeamMember — value object
# ---------------------------------------------------------------------------


class TeamMember:
    """A collaborator on a project.

    Attributes
    ----------
    member_id:  Unique identifier (UUID)
    project_id: Reference to the owning project
    name:       Display name
    email:      Contact email address
    role:       Collaboration role (TeamRole)
    joined_at:  ISO-8601 timestamp
    """

    def __init__(
        self,
        project_id: str,
        name: str,
        email: str,
        joined_at: str,
        *,
        member_id: Optional[str] = None,
        role: TeamRole | str = TeamRole.VIEWER,
    ) -> None:
        self.member_id = member_id or str(uuid.uuid4())
        self.project_id = project_id
        self.name = name
        self.email = email
        self.role = TeamRole(role) if isinstance(role, str) else role
        self.joined_at = joined_at

    def to_dict(self) -> dict:
        return {
            "member_id": self.member_id,
            "project_id": self.project_id,
            "name": self.name,
            "email": self.email,
            "role": self.role.value,
            "joined_at": self.joined_at,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "TeamMember":
        return cls(
            member_id=d["member_id"],
            project_id=d["project_id"],
            name=d["name"],
            email=d["email"],
            role=d.get("role", TeamRole.VIEWER),
            joined_at=d["joined_at"],
        )


# ---------------------------------------------------------------------------
# ProjectMetrics — computed value object
# ---------------------------------------------------------------------------


class ProjectMetrics:
    """Aggregated metrics computed from a Project snapshot.

    Attributes
    ----------
    project_id:        Reference to the project
    computed_at:       ISO-8601 timestamp when metrics were computed
    total_features:    Total number of features
    features_by_phase: For each SDDPhase, count of features currently
                       in_progress for that phase
    spec_quality_avg:  Average fraction of phases that are complete per
                       feature (0.0–1.0)
    compliance_rate:   Fraction of features where the ``spec`` phase is
                       complete (0.0–1.0)
    velocity_per_week: Placeholder; computed as number of ``done`` features
    """

    def __init__(
        self,
        project_id: str,
        computed_at: str,
        total_features: int,
        features_by_phase: dict[str, int],
        spec_quality_avg: float,
        compliance_rate: float,
        velocity_per_week: float,
    ) -> None:
        self.project_id = project_id
        self.computed_at = computed_at
        self.total_features = total_features
        self.features_by_phase = features_by_phase
        self.spec_quality_avg = spec_quality_avg
        self.compliance_rate = compliance_rate
        self.velocity_per_week = velocity_per_week

    def to_dict(self) -> dict:
        return {
            "project_id": self.project_id,
            "computed_at": self.computed_at,
            "total_features": self.total_features,
            "features_by_phase": self.features_by_phase,
            "spec_quality_avg": self.spec_quality_avg,
            "compliance_rate": self.compliance_rate,
            "velocity_per_week": self.velocity_per_week,
        }

    @classmethod
    def from_project(cls, project: "Project", computed_at: str) -> "ProjectMetrics":
        """Compute metrics from the current state of *project*."""
        features = project.features
        total = len(features)

        # Count features currently in_progress for each phase
        by_phase: dict[str, int] = {phase.value: 0 for phase in _ALL_PHASES}
        spec_complete_count = 0
        total_phase_completion = 0.0

        for feature in features:
            phases = feature.sdd_phases
            # Count in-progress features per phase
            for phase in _ALL_PHASES:
                if phases.get(phase) == PhaseStatus.IN_PROGRESS:
                    by_phase[phase.value] += 1

            # Spec quality: fraction of phases that are complete
            complete_count = sum(
                1 for ps in phases.values() if ps == PhaseStatus.COMPLETE
            )
            total_phase_completion += complete_count / len(_ALL_PHASES) if _ALL_PHASES else 0.0

            # Compliance rate: spec phase is complete
            if phases.get(SDDPhase.SPEC) == PhaseStatus.COMPLETE:
                spec_complete_count += 1

        spec_quality_avg = total_phase_completion / total if total > 0 else 0.0
        compliance_rate = spec_complete_count / total if total > 0 else 0.0

        # Velocity: number of features where the "done" phase is complete
        done_count = sum(
            1
            for f in features
            if f.sdd_phases.get(SDDPhase.DONE) == PhaseStatus.COMPLETE
        )

        return cls(
            project_id=project.project_id,
            computed_at=computed_at,
            total_features=total,
            features_by_phase=by_phase,
            spec_quality_avg=spec_quality_avg,
            compliance_rate=compliance_rate,
            velocity_per_week=float(done_count),
        )


# ---------------------------------------------------------------------------
# Project — root aggregate
# ---------------------------------------------------------------------------


class Project:
    """Root aggregate for Module 8.

    Represents one SpecForge project containing features and team members.
    Persisted as ``projects/{project_id}/project.yaml``.

    Attributes
    ----------
    project_id:   Unique identifier (UUID)
    name:         Project display name
    description:  Optional longer description
    created_at:   ISO-8601 timestamp
    updated_at:   ISO-8601 timestamp
    """

    def __init__(
        self,
        name: str,
        created_at: str,
        updated_at: str,
        *,
        project_id: Optional[str] = None,
        description: str = "",
    ) -> None:
        self.project_id = project_id or str(uuid.uuid4())
        self.name = name
        self.description = description
        self.created_at = created_at
        self.updated_at = updated_at
        self._features: list[FeatureStatus] = []
        self._team_members: list[TeamMember] = []

    # ------------------------------------------------------------------
    # Feature management
    # ------------------------------------------------------------------

    def add_feature(self, feature: FeatureStatus) -> None:
        """Append a feature; raises ValueError if feature_id already exists."""
        if any(f.feature_id == feature.feature_id for f in self._features):
            raise ValueError(f"Feature '{feature.feature_id}' already exists in project")
        self._features.append(feature)

    def get_feature(self, feature_id: str) -> Optional[FeatureStatus]:
        """Return the feature with *feature_id*, or None."""
        for f in self._features:
            if f.feature_id == feature_id:
                return f
        return None

    def update_feature_phase(
        self,
        feature_id: str,
        phase: SDDPhase | str,
        phase_status: PhaseStatus | str,
    ) -> Optional[FeatureStatus]:
        """Update a phase status on the named feature; return it, or None if not found."""
        feature = self.get_feature(feature_id)
        if feature is None:
            return None
        feature.update_phase(phase, phase_status)
        return feature

    @property
    def features(self) -> list[FeatureStatus]:
        return list(self._features)

    # ------------------------------------------------------------------
    # Team member management
    # ------------------------------------------------------------------

    def add_member(self, member: TeamMember) -> None:
        """Append a team member; raises ValueError if member_id already exists."""
        if any(m.member_id == member.member_id for m in self._team_members):
            raise ValueError(f"TeamMember '{member.member_id}' already exists in project")
        self._team_members.append(member)

    def get_member(self, member_id: str) -> Optional[TeamMember]:
        """Return the team member with *member_id*, or None."""
        for m in self._team_members:
            if m.member_id == member_id:
                return m
        return None

    @property
    def team_members(self) -> list[TeamMember]:
        return list(self._team_members)

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "project_id": self.project_id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "team_members": [m.to_dict() for m in self._team_members],
            "features": [f.to_dict() for f in self._features],
        }

    def save(self, path: Path) -> None:
        """Persist this project to *path* (YAML)."""
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as fh:
            yaml.safe_dump(self.to_dict(), fh, allow_unicode=True, sort_keys=False)

    @classmethod
    def load(cls, path: Path) -> "Project":
        """Load a Project from a YAML file; raises FileNotFoundError if absent."""
        with path.open(encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        project = cls(
            project_id=data["project_id"],
            name=data["name"],
            description=data.get("description", ""),
            created_at=data["created_at"],
            updated_at=data["updated_at"],
        )
        for m in data.get("team_members", []):
            project._team_members.append(TeamMember.from_dict(m))
        for f in data.get("features", []):
            project._features.append(FeatureStatus.from_dict(f))
        return project
