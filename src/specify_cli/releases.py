"""
Release Manager — Module 5 of SpecForge

Implements the data structures and logic for the Release Manager module,
which tracks versioned releases, changelog entries, and release lifecycle
status for a software project.

Key Entities:
- ChangeType     — enum: feat | fix | docs | refactor | test | chore | breaking
- ReleaseStatus  — enum: draft | published | yanked
- ChangeEntry    — a single changelog item linked to a task/story
- Release        — a versioned release with status and change entries
- ReleaseLog     — root aggregate; persisted as releases.yaml
"""

from __future__ import annotations

import uuid
from enum import Enum
from pathlib import Path
from typing import Optional

import yaml


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------


class ChangeType(str, Enum):
    FEAT = "feat"
    FIX = "fix"
    DOCS = "docs"
    REFACTOR = "refactor"
    TEST = "test"
    CHORE = "chore"
    BREAKING = "breaking"


class ReleaseStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    YANKED = "yanked"


# Canonical change type display order (breaking first, then feat, etc.)
CHANGE_TYPE_ORDER: list[ChangeType] = [
    ChangeType.BREAKING,
    ChangeType.FEAT,
    ChangeType.FIX,
    ChangeType.REFACTOR,
    ChangeType.DOCS,
    ChangeType.TEST,
    ChangeType.CHORE,
]

CHANGE_TYPE_LABEL: dict[ChangeType, str] = {
    ChangeType.BREAKING: "Breaking Changes",
    ChangeType.FEAT: "Features",
    ChangeType.FIX: "Bug Fixes",
    ChangeType.REFACTOR: "Refactoring",
    ChangeType.DOCS: "Documentation",
    ChangeType.TEST: "Tests",
    ChangeType.CHORE: "Chores",
}


# ---------------------------------------------------------------------------
# ChangeEntry — value object
# ---------------------------------------------------------------------------


class ChangeEntry:
    """A single changelog item.

    Attributes
    ----------
    change_id:   Unique identifier (UUID)
    change_type: Category of change (ChangeType)
    description: Human-readable description of the change
    task_id:     Optional reference to the Task that produced this change
    story_id:    Optional reference to the User Story driving this change
    """

    def __init__(
        self,
        change_type: ChangeType | str,
        description: str,
        *,
        change_id: Optional[str] = None,
        task_id: Optional[str] = None,
        story_id: Optional[str] = None,
    ) -> None:
        self.change_id = change_id or str(uuid.uuid4())
        self.change_type = ChangeType(change_type) if isinstance(change_type, str) else change_type
        self.description = description
        self.task_id = task_id
        self.story_id = story_id

    def to_dict(self) -> dict:
        return {
            "change_id": self.change_id,
            "change_type": self.change_type.value,
            "description": self.description,
            "task_id": self.task_id,
            "story_id": self.story_id,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "ChangeEntry":
        return cls(
            change_id=d["change_id"],
            change_type=d["change_type"],
            description=d["description"],
            task_id=d.get("task_id"),
            story_id=d.get("story_id"),
        )


# ---------------------------------------------------------------------------
# Release entity
# ---------------------------------------------------------------------------


class Release:
    """A versioned software release.

    Attributes
    ----------
    version:       SemVer string, e.g. "1.2.0"
    title:         Optional human-readable title
    date:          ISO-8601 date string, e.g. "2026-04-03"
    status:        ReleaseStatus (draft | published | yanked)
    task_list_id:  Optional reference to a Module 4 TaskList
    spec_id:       Optional reference to a Module 2 Spec
    plan_id:       Optional reference to a Module 3 Plan
    notes:         Free-form release notes
    changes:       Ordered list of ChangeEntry items
    """

    def __init__(
        self,
        version: str,
        *,
        title: str = "",
        date: str = "",
        status: ReleaseStatus | str = ReleaseStatus.DRAFT,
        task_list_id: Optional[str] = None,
        spec_id: Optional[str] = None,
        plan_id: Optional[str] = None,
        notes: str = "",
    ) -> None:
        self.version = version
        self.title = title
        self.date = date
        self.status = ReleaseStatus(status) if isinstance(status, str) else status
        self.task_list_id = task_list_id
        self.spec_id = spec_id
        self.plan_id = plan_id
        self.notes = notes
        self._changes: list[ChangeEntry] = []

    # ------------------------------------------------------------------
    # Change management
    # ------------------------------------------------------------------

    def add_change(self, entry: ChangeEntry) -> None:
        """Append a change entry to this release."""
        self._changes.append(entry)

    def remove_change(self, change_id: str) -> bool:
        """Remove a change entry by ID; returns True if found and removed."""
        for i, entry in enumerate(self._changes):
            if entry.change_id == change_id:
                del self._changes[i]
                return True
        return False

    def get_change(self, change_id: str) -> Optional[ChangeEntry]:
        """Return the change entry with *change_id*, or None."""
        for entry in self._changes:
            if entry.change_id == change_id:
                return entry
        return None

    @property
    def changes(self) -> list[ChangeEntry]:
        return list(self._changes)

    # ------------------------------------------------------------------
    # Status transitions
    # ------------------------------------------------------------------

    def publish(self) -> None:
        """Transition status to published."""
        self.status = ReleaseStatus.PUBLISHED

    def yank(self) -> None:
        """Transition status to yanked."""
        self.status = ReleaseStatus.YANKED

    def revert_to_draft(self) -> None:
        """Transition status back to draft."""
        self.status = ReleaseStatus.DRAFT

    def update_status(self, new_status: ReleaseStatus | str) -> None:
        self.status = ReleaseStatus(new_status) if isinstance(new_status, str) else new_status

    # ------------------------------------------------------------------
    # Changelog rendering
    # ------------------------------------------------------------------

    def changelog_markdown(self) -> str:
        """Render this release as a Markdown changelog section."""
        heading = f"## [{self.version}]"
        if self.date:
            heading += f" — {self.date}"
        if self.title:
            heading += f" *{self.title}*"
        lines = [heading, ""]
        if self.notes:
            lines += [self.notes, ""]
        by_type: dict[ChangeType, list[ChangeEntry]] = {ct: [] for ct in CHANGE_TYPE_ORDER}
        for entry in self._changes:
            by_type[entry.change_type].append(entry)
        for ct in CHANGE_TYPE_ORDER:
            entries = by_type[ct]
            if entries:
                lines.append(f"### {CHANGE_TYPE_LABEL[ct]}")
                lines.append("")
                for e in entries:
                    lines.append(f"- {e.description}")
                lines.append("")
        return "\n".join(lines).rstrip() + "\n"

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "title": self.title,
            "date": self.date,
            "status": self.status.value,
            "task_list_id": self.task_list_id,
            "spec_id": self.spec_id,
            "plan_id": self.plan_id,
            "notes": self.notes,
            "changes": [c.to_dict() for c in self._changes],
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Release":
        release = cls(
            version=d["version"],
            title=d.get("title", ""),
            date=d.get("date", ""),
            status=d.get("status", ReleaseStatus.DRAFT),
            task_list_id=d.get("task_list_id"),
            spec_id=d.get("spec_id"),
            plan_id=d.get("plan_id"),
            notes=d.get("notes", ""),
        )
        for c in d.get("changes", []):
            release._changes.append(ChangeEntry.from_dict(c))
        return release


# ---------------------------------------------------------------------------
# ReleaseLog — root aggregate
# ---------------------------------------------------------------------------


class ReleaseLog:
    """Root aggregate for Module 5.

    Manages all releases for a project and exposes changelog generation
    and summary statistics.
    Persisted as ``releases.yaml`` inside the project directory.

    Attributes
    ----------
    project_name: Human-readable project name
    notes:        Free-form notes about the release log
    """

    def __init__(
        self,
        project_name: str,
        *,
        notes: str = "",
    ) -> None:
        self.project_name = project_name
        self.notes = notes
        self._releases: list[Release] = []

    # ------------------------------------------------------------------
    # Release management
    # ------------------------------------------------------------------

    def add_release(self, release: Release) -> None:
        """Add a new release; raises ValueError if version already exists."""
        if any(r.version == release.version for r in self._releases):
            raise ValueError(f"Release version '{release.version}' already exists")
        self._releases.append(release)

    def get_release(self, version: str) -> Optional[Release]:
        """Return the release with *version*, or None."""
        for r in self._releases:
            if r.version == version:
                return r
        return None

    def remove_release(self, version: str) -> bool:
        """Remove a release by version; returns True if found and removed."""
        for i, r in enumerate(self._releases):
            if r.version == version:
                del self._releases[i]
                return True
        return False

    @property
    def releases(self) -> list[Release]:
        """Releases in the order they were added (newest first by convention)."""
        return list(self._releases)

    # ------------------------------------------------------------------
    # Changelog
    # ------------------------------------------------------------------

    def changelog_markdown(self) -> str:
        """Render the full changelog for all releases as Markdown."""
        lines = [f"# Changelog — {self.project_name}", ""]
        if self.notes:
            lines += [self.notes, ""]
        for release in self._releases:
            lines.append(release.changelog_markdown())
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    def summary(self) -> dict:
        """Return counts of releases by status and total change counts."""
        by_status: dict[str, int] = {s.value: 0 for s in ReleaseStatus}
        by_change_type: dict[str, int] = {ct.value: 0 for ct in ChangeType}
        total_changes = 0
        for release in self._releases:
            by_status[release.status.value] += 1
            for entry in release.changes:
                by_change_type[entry.change_type.value] += 1
                total_changes += 1
        return {
            "total_releases": len(self._releases),
            "by_status": by_status,
            "total_changes": total_changes,
            "by_change_type": by_change_type,
        }

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, path: Path) -> None:
        """Persist this release log to *path* (YAML)."""
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "project_name": self.project_name,
            "notes": self.notes,
            "releases": [r.to_dict() for r in self._releases],
        }
        with path.open("w", encoding="utf-8") as fh:
            yaml.safe_dump(data, fh, allow_unicode=True, sort_keys=False)

    @classmethod
    def load(cls, path: Path) -> "ReleaseLog":
        """Load a ReleaseLog from a YAML file; raises FileNotFoundError if absent."""
        with path.open(encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        log = cls(
            project_name=data["project_name"],
            notes=data.get("notes", ""),
        )
        for release_data in data.get("releases", []):
            log._releases.append(Release.from_dict(release_data))
        return log
