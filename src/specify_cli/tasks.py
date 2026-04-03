"""
Task Forge — Module 4 of SpecForge

Implements the data structures and logic for the Task Forge module,
which converts implementation plans into structured, phased, parallelized
task lists with full user-story traceability.

Key Entities:
- TaskStatus        — enum: pending | in_progress | blocked | complete
- PhaseType         — enum: setup | foundational | us1 | us2 | us3 | polish
- DependencyEdge    — directed link between two tasks
- Task              — atomic unit of work with phase, parallel flag, and story link
- Phase             — named group of tasks sharing a PhaseType
- TaskList          — root aggregate; persisted as tasks.yaml
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


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETE = "complete"


class PhaseType(str, Enum):
    SETUP = "setup"
    FOUNDATIONAL = "foundational"
    US1 = "us1"
    US2 = "us2"
    US3 = "us3"
    POLISH = "polish"


# Canonical phase display order
PHASE_ORDER: list[PhaseType] = [
    PhaseType.SETUP,
    PhaseType.FOUNDATIONAL,
    PhaseType.US1,
    PhaseType.US2,
    PhaseType.US3,
    PhaseType.POLISH,
]


# ---------------------------------------------------------------------------
# Value Objects
# ---------------------------------------------------------------------------


class DependencyEdge:
    """A directed edge in the task dependency DAG.

    source_id must be completed before target_id can start.
    """

    def __init__(self, source_id: str, target_id: str, label: str = "") -> None:
        self.source_id = source_id
        self.target_id = target_id
        self.label = label

    def to_dict(self) -> dict:
        return {"source_id": self.source_id, "target_id": self.target_id, "label": self.label}

    @classmethod
    def from_dict(cls, d: dict) -> "DependencyEdge":
        return cls(
            source_id=d["source_id"],
            target_id=d["target_id"],
            label=d.get("label", ""),
        )


# ---------------------------------------------------------------------------
# Task entity
# ---------------------------------------------------------------------------


class Task:
    """Atomic unit of implementation work.

    Attributes
    ----------
    task_id:      Unique identifier, e.g. "setup-001"
    title:        Short imperative description of the work
    description:  Longer explanation (optional)
    phase:        PhaseType this task belongs to
    parallel:     True if this task can run concurrently with other [P] tasks
    story_id:     Optional reference to the user story driving this task
    dependencies: IDs of tasks that must complete before this one starts
    status:       Current execution status
    tags:         Free-form labels (e.g. ["backend", "test-first"])
    """

    def __init__(
        self,
        title: str,
        phase: PhaseType | str,
        *,
        task_id: Optional[str] = None,
        description: str = "",
        parallel: bool = False,
        story_id: Optional[str] = None,
        dependencies: Optional[list[str]] = None,
        status: TaskStatus | str = TaskStatus.PENDING,
        tags: Optional[list[str]] = None,
    ) -> None:
        self.task_id = task_id or str(uuid.uuid4())
        self.title = title
        self.description = description
        self.phase = PhaseType(phase) if isinstance(phase, str) else phase
        self.parallel = parallel
        self.story_id = story_id
        self.dependencies: list[str] = dependencies or []
        self.status = TaskStatus(status) if isinstance(status, str) else status
        self.tags: list[str] = tags or []

    # ------------------------------------------------------------------
    # Mutation
    # ------------------------------------------------------------------

    def update_status(self, new_status: TaskStatus | str) -> None:
        self.status = TaskStatus(new_status) if isinstance(new_status, str) else new_status

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "title": self.title,
            "description": self.description,
            "phase": self.phase.value,
            "parallel": self.parallel,
            "story_id": self.story_id,
            "dependencies": self.dependencies,
            "status": self.status.value,
            "tags": self.tags,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Task":
        return cls(
            task_id=d["task_id"],
            title=d["title"],
            description=d.get("description", ""),
            phase=d["phase"],
            parallel=d.get("parallel", False),
            story_id=d.get("story_id"),
            dependencies=d.get("dependencies", []),
            status=d.get("status", TaskStatus.PENDING),
            tags=d.get("tags", []),
        )


# ---------------------------------------------------------------------------
# Phase entity
# ---------------------------------------------------------------------------


class Phase:
    """Named collection of tasks sharing a common PhaseType."""

    def __init__(self, phase_type: PhaseType | str) -> None:
        self.phase_type = PhaseType(phase_type) if isinstance(phase_type, str) else phase_type
        self._tasks: list[Task] = []

    # ------------------------------------------------------------------
    # Task management
    # ------------------------------------------------------------------

    def add_task(self, task: Task) -> None:
        """Add a task to this phase (task.phase must match)."""
        if task.phase != self.phase_type:
            raise ValueError(
                f"Task phase '{task.phase.value}' does not match phase '{self.phase_type.value}'"
            )
        self._tasks.append(task)

    @property
    def tasks(self) -> list[Task]:
        return list(self._tasks)

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "phase_type": self.phase_type.value,
            "tasks": [t.to_dict() for t in self._tasks],
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Phase":
        phase = cls(phase_type=d["phase_type"])
        for t in d.get("tasks", []):
            phase._tasks.append(Task.from_dict(t))
        return phase


# ---------------------------------------------------------------------------
# TaskList — root aggregate
# ---------------------------------------------------------------------------


class TaskList:
    """Root aggregate for Module 4.

    Owns all phases and their tasks, plus the dependency graph.
    Persisted as ``tasks.yaml`` inside the project directory.

    Attributes
    ----------
    project_name:  Human-readable project name
    plan_id:       Optional reference to the Architecture Plan (Module 3)
    spec_id:       Optional reference to the Specification (Module 2)
    version:       Auto-incremented version string
    notes:         Free-form notes
    """

    def __init__(
        self,
        project_name: str,
        *,
        plan_id: Optional[str] = None,
        spec_id: Optional[str] = None,
        notes: str = "",
        version: str = "1.0.0",
    ) -> None:
        self.project_name = project_name
        self.plan_id = plan_id
        self.spec_id = spec_id
        self.notes = notes
        self.version = version
        self._phases: dict[PhaseType, Phase] = {pt: Phase(pt) for pt in PHASE_ORDER}
        self._dependency_edges: list[DependencyEdge] = []

    # ------------------------------------------------------------------
    # Task access helpers
    # ------------------------------------------------------------------

    def _all_tasks(self) -> list[Task]:
        tasks: list[Task] = []
        for pt in PHASE_ORDER:
            tasks.extend(self._phases[pt].tasks)
        return tasks

    def _task_ids(self) -> set[str]:
        return {t.task_id for t in self._all_tasks()}

    # ------------------------------------------------------------------
    # Task management
    # ------------------------------------------------------------------

    def add_task(self, task: Task) -> None:
        """Add a task to its phase; raises ValueError if phase is unknown."""
        self._phases[task.phase].add_task(task)

    def get_task(self, task_id: str) -> Optional[Task]:
        """Return the task with *task_id*, or None if not found."""
        for t in self._all_tasks():
            if t.task_id == task_id:
                return t
        return None

    def get_phase(self, phase_type: PhaseType | str) -> Phase:
        pt = PhaseType(phase_type) if isinstance(phase_type, str) else phase_type
        return self._phases[pt]

    @property
    def phases(self) -> list[Phase]:
        return [self._phases[pt] for pt in PHASE_ORDER]

    # ------------------------------------------------------------------
    # Dependency graph
    # ------------------------------------------------------------------

    @property
    def dependency_edges(self) -> list[DependencyEdge]:
        return list(self._dependency_edges)

    def set_dependency_edges(self, edges: list[DependencyEdge]) -> None:
        """Replace the full dependency graph; raises ValueError on cycles."""
        # Build adjacency list for cycle detection
        adj: dict[str, list[str]] = {}
        for edge in edges:
            adj.setdefault(edge.source_id, []).append(edge.target_id)
        # DFS cycle detection
        WHITE, GRAY, BLACK = 0, 1, 2
        color: dict[str, int] = {}

        def dfs(node: str) -> bool:
            color[node] = GRAY
            for neighbor in adj.get(node, []):
                if color.get(neighbor) == GRAY:
                    return True  # cycle
                if color.get(neighbor, WHITE) == WHITE and dfs(neighbor):
                    return True
            color[node] = BLACK
            return False

        all_nodes = {e.source_id for e in edges} | {e.target_id for e in edges}
        for node in all_nodes:
            if color.get(node, WHITE) == WHITE:
                if dfs(node):
                    raise ValueError("Dependency graph contains a cycle")
        self._dependency_edges = list(edges)

    # ------------------------------------------------------------------
    # Progress summary
    # ------------------------------------------------------------------

    def progress_summary(self) -> dict:
        """Return counts of tasks by status and by phase."""
        all_tasks = self._all_tasks()
        by_status: dict[str, int] = {s.value: 0 for s in TaskStatus}
        by_phase: dict[str, dict[str, int]] = {}
        for pt in PHASE_ORDER:
            by_phase[pt.value] = {s.value: 0 for s in TaskStatus}
        for task in all_tasks:
            by_status[task.status.value] += 1
            by_phase[task.phase.value][task.status.value] += 1
        return {
            "total": len(all_tasks),
            "by_status": by_status,
            "by_phase": by_phase,
        }

    # ------------------------------------------------------------------
    # GitHub Issues export
    # ------------------------------------------------------------------

    def github_export(self) -> list[dict]:
        """Return a list of IssuePreview dicts (one per task)."""
        previews = []
        for task in self._all_tasks():
            labels = [f"phase:{task.phase.value}"] + [f"tag:{t}" for t in task.tags]
            if task.parallel:
                labels.append("parallel")
            body_lines = [
                f"**Phase**: {task.phase.value}",
                f"**Status**: {task.status.value}",
            ]
            if task.story_id:
                body_lines.append(f"**Story**: {task.story_id}")
            if task.dependencies:
                body_lines.append(f"**Depends on**: {', '.join(task.dependencies)}")
            if task.description:
                body_lines.append("")
                body_lines.append(task.description)
            previews.append(
                {
                    "task_id": task.task_id,
                    "title": task.title,
                    "body": "\n".join(body_lines),
                    "labels": labels,
                    "milestone": task.phase.value,
                }
            )
        return previews

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, path: Path) -> None:
        """Persist this task list to *path* (YAML)."""
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "project_name": self.project_name,
            "plan_id": self.plan_id,
            "spec_id": self.spec_id,
            "notes": self.notes,
            "version": self.version,
            "phases": [p.to_dict() for p in self.phases],
            "dependency_edges": [e.to_dict() for e in self._dependency_edges],
        }
        with path.open("w", encoding="utf-8") as fh:
            yaml.safe_dump(data, fh, allow_unicode=True, sort_keys=False)

    @classmethod
    def load(cls, path: Path) -> "TaskList":
        """Load a TaskList from a YAML file; raises FileNotFoundError if absent."""
        with path.open(encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        task_list = cls(
            project_name=data["project_name"],
            plan_id=data.get("plan_id"),
            spec_id=data.get("spec_id"),
            notes=data.get("notes", ""),
            version=data.get("version", "1.0.0"),
        )
        for phase_data in data.get("phases", []):
            phase = Phase.from_dict(phase_data)
            for task in phase.tasks:
                task_list._phases[task.phase]._tasks.append(task)
        for edge_data in data.get("dependency_edges", []):
            task_list._dependency_edges.append(DependencyEdge.from_dict(edge_data))
        return task_list
