"""
Implement & Execute — Module 6 of SpecForge

Orchestrates the execution of development tasks through AI coding agents,
providing real-time progress tracking, checkpoint validation, spec compliance
reporting, and rollback support.

Key Entities:
- TaskResultStatus — enum: pending | running | success | failure | skipped
- SessionStatus    — enum: idle | running | paused | completed | failed
- ComplianceVerdict — enum: pass | fail | warning
- TaskResult        — outcome of executing a single task
- ComplianceReport  — spec-vs-code validation result
- Checkpoint        — validated snapshot after a user-story phase
- ExecutionSession  — root aggregate; persisted as sessions/{session_id}.yaml
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


class TaskResultStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILURE = "failure"
    SKIPPED = "skipped"


class SessionStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class ComplianceVerdict(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"


# ---------------------------------------------------------------------------
# ComplianceReport — value object
# ---------------------------------------------------------------------------


class ComplianceReport:
    """Spec-vs-code validation result attached to a TaskResult.

    Attributes
    ----------
    report_id:  Unique identifier (UUID)
    result_id:  Associated TaskResult ID
    spec_id:    Optional reference to the Module 2 Spec being checked
    verdict:    Overall compliance verdict (pass | fail | warning)
    summary:    Short human-readable summary
    findings:   List of dicts with keys: requirement, verdict, note
    """

    def __init__(
        self,
        result_id: str,
        verdict: ComplianceVerdict | str,
        summary: str,
        *,
        report_id: Optional[str] = None,
        spec_id: Optional[str] = None,
        findings: Optional[list[dict[str, Any]]] = None,
    ) -> None:
        self.report_id = report_id or str(uuid.uuid4())
        self.result_id = result_id
        self.spec_id = spec_id
        self.verdict = ComplianceVerdict(verdict) if isinstance(verdict, str) else verdict
        self.summary = summary
        self.findings: list[dict[str, Any]] = findings or []

    def to_dict(self) -> dict:
        return {
            "report_id": self.report_id,
            "result_id": self.result_id,
            "spec_id": self.spec_id,
            "verdict": self.verdict.value,
            "summary": self.summary,
            "findings": self.findings,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "ComplianceReport":
        return cls(
            report_id=d["report_id"],
            result_id=d["result_id"],
            spec_id=d.get("spec_id"),
            verdict=d["verdict"],
            summary=d["summary"],
            findings=d.get("findings", []),
        )


# ---------------------------------------------------------------------------
# TaskResult — entity
# ---------------------------------------------------------------------------


class TaskResult:
    """Outcome of executing one task through an AI coding agent.

    Attributes
    ----------
    result_id:            Unique identifier (UUID)
    task_id:              Reference to the task executed
    task_title:           Human-readable task title
    status:               Execution outcome (TaskResultStatus)
    output:               Console / AI agent output
    error_message:        Failure reason when status is ``failure``
    started_at:           ISO-8601 timestamp
    completed_at:         ISO-8601 timestamp when done (or None)
    compliance_report_id: ID of the linked ComplianceReport (or None)
    """

    def __init__(
        self,
        task_id: str,
        task_title: str,
        started_at: str,
        *,
        result_id: Optional[str] = None,
        status: TaskResultStatus | str = TaskResultStatus.PENDING,
        output: str = "",
        error_message: Optional[str] = None,
        completed_at: Optional[str] = None,
        compliance_report_id: Optional[str] = None,
    ) -> None:
        self.result_id = result_id or str(uuid.uuid4())
        self.task_id = task_id
        self.task_title = task_title
        self.status = TaskResultStatus(status) if isinstance(status, str) else status
        self.output = output
        self.error_message = error_message
        self.started_at = started_at
        self.completed_at = completed_at
        self.compliance_report_id = compliance_report_id

    def update(
        self,
        *,
        status: Optional[TaskResultStatus | str] = None,
        output: Optional[str] = None,
        error_message: Optional[str] = None,
        completed_at: Optional[str] = None,
        compliance_report_id: Optional[str] = None,
    ) -> None:
        """Update mutable fields of this task result."""
        if status is not None:
            self.status = TaskResultStatus(status) if isinstance(status, str) else status
        if output is not None:
            self.output = output
        if error_message is not None:
            self.error_message = error_message
        if completed_at is not None:
            self.completed_at = completed_at
        if compliance_report_id is not None:
            self.compliance_report_id = compliance_report_id

    def to_dict(self) -> dict:
        return {
            "result_id": self.result_id,
            "task_id": self.task_id,
            "task_title": self.task_title,
            "status": self.status.value,
            "output": self.output,
            "error_message": self.error_message,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "compliance_report_id": self.compliance_report_id,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "TaskResult":
        return cls(
            result_id=d["result_id"],
            task_id=d["task_id"],
            task_title=d["task_title"],
            status=d.get("status", TaskResultStatus.PENDING),
            output=d.get("output", ""),
            error_message=d.get("error_message"),
            started_at=d["started_at"],
            completed_at=d.get("completed_at"),
            compliance_report_id=d.get("compliance_report_id"),
        )


# ---------------------------------------------------------------------------
# Checkpoint — value object
# ---------------------------------------------------------------------------


class Checkpoint:
    """Validated snapshot after a user-story phase completes.

    Attributes
    ----------
    checkpoint_id: Unique identifier (UUID)
    label:         Human-readable label, e.g. "US-1 complete"
    story_id:      Optional reference to the user story
    created_at:    ISO-8601 timestamp
    notes:         Free-form notes
    """

    def __init__(
        self,
        label: str,
        created_at: str,
        *,
        checkpoint_id: Optional[str] = None,
        story_id: Optional[str] = None,
        notes: str = "",
    ) -> None:
        self.checkpoint_id = checkpoint_id or str(uuid.uuid4())
        self.label = label
        self.story_id = story_id
        self.created_at = created_at
        self.notes = notes

    def to_dict(self) -> dict:
        return {
            "checkpoint_id": self.checkpoint_id,
            "label": self.label,
            "story_id": self.story_id,
            "created_at": self.created_at,
            "notes": self.notes,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Checkpoint":
        return cls(
            checkpoint_id=d["checkpoint_id"],
            label=d["label"],
            story_id=d.get("story_id"),
            created_at=d["created_at"],
            notes=d.get("notes", ""),
        )


# ---------------------------------------------------------------------------
# ExecutionSession — root aggregate
# ---------------------------------------------------------------------------


class ExecutionSession:
    """Root aggregate for Module 6.

    Represents one active implementation run.
    Persisted as ``sessions/{session_id}.yaml`` inside the project directory.

    Attributes
    ----------
    session_id:    Unique identifier (UUID)
    project_id:    Reference to the project
    task_list_id:  Optional reference to a Module 4 TaskList
    spec_id:       Optional reference to a Module 2 Spec
    plan_id:       Optional reference to a Module 3 Plan
    agent:         AI coding agent name (e.g. ``claude``, ``copilot``)
    status:        Session lifecycle status (SessionStatus)
    started_at:    ISO-8601 timestamp
    completed_at:  ISO-8601 timestamp when done (or None)
    notes:         Free-form session notes
    """

    def __init__(
        self,
        project_id: str,
        agent: str,
        started_at: str,
        *,
        session_id: Optional[str] = None,
        task_list_id: Optional[str] = None,
        spec_id: Optional[str] = None,
        plan_id: Optional[str] = None,
        status: SessionStatus | str = SessionStatus.IDLE,
        completed_at: Optional[str] = None,
        notes: str = "",
    ) -> None:
        self.session_id = session_id or str(uuid.uuid4())
        self.project_id = project_id
        self.task_list_id = task_list_id
        self.spec_id = spec_id
        self.plan_id = plan_id
        self.agent = agent
        self.status = SessionStatus(status) if isinstance(status, str) else status
        self.started_at = started_at
        self.completed_at = completed_at
        self.notes = notes
        self._task_results: list[TaskResult] = []
        self._checkpoints: list[Checkpoint] = []
        # compliance reports are indexed by report_id for O(1) lookup when
        # linking a report to its task result; task_results and checkpoints
        # are ordered lists because insertion order matters for display.
        self._compliance_reports: dict[str, ComplianceReport] = {}

    # ------------------------------------------------------------------
    # Task result management
    # ------------------------------------------------------------------

    def add_task_result(self, result: TaskResult) -> None:
        """Append a task result; raises ValueError if result_id already exists."""
        if any(r.result_id == result.result_id for r in self._task_results):
            raise ValueError(f"TaskResult '{result.result_id}' already exists in session")
        self._task_results.append(result)

    def get_task_result(self, result_id: str) -> Optional[TaskResult]:
        """Return the task result with *result_id*, or None."""
        for r in self._task_results:
            if r.result_id == result_id:
                return r
        return None

    @property
    def task_results(self) -> list[TaskResult]:
        return list(self._task_results)

    # ------------------------------------------------------------------
    # Compliance report management
    # ------------------------------------------------------------------

    def add_compliance_report(self, report: ComplianceReport) -> None:
        """Attach a compliance report and link it to its task result."""
        result = self.get_task_result(report.result_id)
        if result is None:
            raise ValueError(
                f"TaskResult '{report.result_id}' not found in session"
            )
        self._compliance_reports[report.report_id] = report
        result.update(compliance_report_id=report.report_id)

    def get_compliance_report(self, report_id: str) -> Optional[ComplianceReport]:
        """Return the compliance report with *report_id*, or None."""
        return self._compliance_reports.get(report_id)

    @property
    def compliance_reports(self) -> list[ComplianceReport]:
        return list(self._compliance_reports.values())

    # ------------------------------------------------------------------
    # Checkpoint management
    # ------------------------------------------------------------------

    def add_checkpoint(self, checkpoint: Checkpoint) -> None:
        """Append a checkpoint; raises ValueError if checkpoint_id already exists."""
        if any(c.checkpoint_id == checkpoint.checkpoint_id for c in self._checkpoints):
            raise ValueError(
                f"Checkpoint '{checkpoint.checkpoint_id}' already exists in session"
            )
        self._checkpoints.append(checkpoint)

    @property
    def checkpoints(self) -> list[Checkpoint]:
        return list(self._checkpoints)

    # ------------------------------------------------------------------
    # Status management
    # ------------------------------------------------------------------

    def update_status(self, new_status: SessionStatus | str) -> None:
        self.status = SessionStatus(new_status) if isinstance(new_status, str) else new_status

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    def summary(self) -> dict:
        """Return counts of task results by status and compliance verdicts."""
        by_status: dict[str, int] = {s.value: 0 for s in TaskResultStatus}
        for r in self._task_results:
            by_status[r.status.value] += 1

        by_verdict: dict[str, int] = {v.value: 0 for v in ComplianceVerdict}
        for rpt in self._compliance_reports.values():
            by_verdict[rpt.verdict.value] += 1

        return {
            "total_tasks": len(self._task_results),
            "by_status": by_status,
            "total_compliance_reports": len(self._compliance_reports),
            "by_verdict": by_verdict,
            "total_checkpoints": len(self._checkpoints),
        }

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "project_id": self.project_id,
            "task_list_id": self.task_list_id,
            "spec_id": self.spec_id,
            "plan_id": self.plan_id,
            "agent": self.agent,
            "status": self.status.value,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "notes": self.notes,
            "task_results": [r.to_dict() for r in self._task_results],
            "compliance_reports": [r.to_dict() for r in self._compliance_reports.values()],
            "checkpoints": [c.to_dict() for c in self._checkpoints],
        }

    def save(self, path: Path) -> None:
        """Persist this session to *path* (YAML)."""
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as fh:
            yaml.safe_dump(self.to_dict(), fh, allow_unicode=True, sort_keys=False)

    @classmethod
    def load(cls, path: Path) -> "ExecutionSession":
        """Load an ExecutionSession from a YAML file; raises FileNotFoundError if absent."""
        with path.open(encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        session = cls(
            session_id=data["session_id"],
            project_id=data["project_id"],
            agent=data["agent"],
            started_at=data["started_at"],
            task_list_id=data.get("task_list_id"),
            spec_id=data.get("spec_id"),
            plan_id=data.get("plan_id"),
            status=data.get("status", SessionStatus.IDLE),
            completed_at=data.get("completed_at"),
            notes=data.get("notes", ""),
        )
        for r in data.get("task_results", []):
            session._task_results.append(TaskResult.from_dict(r))
        for rpt in data.get("compliance_reports", []):
            report = ComplianceReport.from_dict(rpt)
            session._compliance_reports[report.report_id] = report
        for c in data.get("checkpoints", []):
            session._checkpoints.append(Checkpoint.from_dict(c))
        return session
