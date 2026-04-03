"""
Quality Guardian — Module 7 of SpecForge

Validates implemented features against the original specification through
AI-powered analysis, acceptance test generation, and custom quality checklists.

Key Entities:
- ChecklistItemStatus — enum: pending | pass | fail | skip
- SeverityLevel       — enum: critical | high | medium | low | info
- TestCaseType        — enum: unit | integration | contract | e2e
- ChecklistItem       — individual verification step with status, category, description
- Checklist           — custom quality verification list; aggregate with item management
- TestCase            — generated test case derived from an acceptance scenario
- TestSuite           — collection of test cases for a feature/spec
- AnalysisFinding     — one issue found during artifact consistency analysis
- AnalysisReport      — AI consistency check result across all artifacts
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


class ChecklistItemStatus(str, Enum):
    PENDING = "pending"
    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"


class SeverityLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class TestCaseType(str, Enum):
    UNIT = "unit"
    INTEGRATION = "integration"
    CONTRACT = "contract"
    E2E = "e2e"


# ---------------------------------------------------------------------------
# ChecklistItem — entity
# ---------------------------------------------------------------------------


class ChecklistItem:
    """Individual verification step within a quality checklist.

    Attributes
    ----------
    item_id:      Unique identifier (UUID)
    checklist_id: Reference to the parent Checklist
    category:     Grouping label (e.g. "Functionality", "Security")
    description:  What to verify
    status:       Current verification status (ChecklistItemStatus)
    notes:        Free-form reviewer notes
    """

    def __init__(
        self,
        checklist_id: str,
        category: str,
        description: str,
        *,
        item_id: Optional[str] = None,
        status: ChecklistItemStatus | str = ChecklistItemStatus.PENDING,
        notes: str = "",
    ) -> None:
        self.item_id = item_id or str(uuid.uuid4())
        self.checklist_id = checklist_id
        self.category = category
        self.description = description
        self.status = ChecklistItemStatus(status) if isinstance(status, str) else status
        self.notes = notes

    def to_dict(self) -> dict:
        return {
            "item_id": self.item_id,
            "checklist_id": self.checklist_id,
            "category": self.category,
            "description": self.description,
            "status": self.status.value,
            "notes": self.notes,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "ChecklistItem":
        return cls(
            item_id=d["item_id"],
            checklist_id=d["checklist_id"],
            category=d["category"],
            description=d["description"],
            status=d.get("status", ChecklistItemStatus.PENDING),
            notes=d.get("notes", ""),
        )


# ---------------------------------------------------------------------------
# Checklist — root aggregate
# ---------------------------------------------------------------------------


class Checklist:
    """Custom quality verification list.

    Persisted as ``quality/checklists/{checklist_id}.yaml`` inside the project
    directory.

    Attributes
    ----------
    checklist_id: Unique identifier (UUID)
    project_id:   Reference to the project
    name:         Human-readable display name
    spec_id:      Optional reference to a Module 2 Spec being verified
    created_at:   ISO-8601 timestamp
    """

    def __init__(
        self,
        project_id: str,
        name: str,
        created_at: str,
        *,
        checklist_id: Optional[str] = None,
        spec_id: Optional[str] = None,
    ) -> None:
        self.checklist_id = checklist_id or str(uuid.uuid4())
        self.project_id = project_id
        self.name = name
        self.spec_id = spec_id
        self.created_at = created_at
        self._items: list[ChecklistItem] = []

    # ------------------------------------------------------------------
    # Item management
    # ------------------------------------------------------------------

    def add_item(self, item: ChecklistItem) -> None:
        """Append an item; raises ValueError if item_id already exists."""
        if any(i.item_id == item.item_id for i in self._items):
            raise ValueError(f"ChecklistItem '{item.item_id}' already exists in checklist")
        self._items.append(item)

    def get_item(self, item_id: str) -> Optional[ChecklistItem]:
        """Return the item with *item_id*, or None."""
        for i in self._items:
            if i.item_id == item_id:
                return i
        return None

    def update_item(
        self,
        item_id: str,
        *,
        status: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Optional[ChecklistItem]:
        """Update mutable fields of *item_id*; return the item, or None if absent."""
        item = self.get_item(item_id)
        if item is None:
            return None
        if status is not None:
            item.status = ChecklistItemStatus(status)
        if notes is not None:
            item.notes = notes
        return item

    @property
    def items(self) -> list[ChecklistItem]:
        return list(self._items)

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    def summary(self) -> dict:
        """Return counts of items by status."""
        by_status: dict[str, int] = {s.value: 0 for s in ChecklistItemStatus}
        for item in self._items:
            by_status[item.status.value] += 1
        return {
            "total_items": len(self._items),
            "by_status": by_status,
        }

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "checklist_id": self.checklist_id,
            "project_id": self.project_id,
            "name": self.name,
            "spec_id": self.spec_id,
            "created_at": self.created_at,
            "items": [i.to_dict() for i in self._items],
        }

    def save(self, path: Path) -> None:
        """Persist this checklist to *path* (YAML)."""
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as fh:
            yaml.safe_dump(self.to_dict(), fh, allow_unicode=True, sort_keys=False)

    @classmethod
    def load(cls, path: Path) -> "Checklist":
        """Load a Checklist from a YAML file; raises FileNotFoundError if absent."""
        with path.open(encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        checklist = cls(
            checklist_id=data["checklist_id"],
            project_id=data["project_id"],
            name=data["name"],
            created_at=data["created_at"],
            spec_id=data.get("spec_id"),
        )
        for i in data.get("items", []):
            checklist._items.append(ChecklistItem.from_dict(i))
        return checklist


# ---------------------------------------------------------------------------
# TestCase — entity
# ---------------------------------------------------------------------------


class TestCase:
    """Generated test case derived from an acceptance scenario.

    Attributes
    ----------
    case_id:   Unique identifier (UUID)
    suite_id:  Reference to the parent TestSuite
    title:     Short test title
    case_type: Classification (TestCaseType)
    scenario:  Scenario description / given-when-then narrative
    expected:  Expected outcome
    tags:      Optional list of string tags
    """

    def __init__(
        self,
        suite_id: str,
        title: str,
        case_type: TestCaseType | str,
        scenario: str,
        expected: str,
        *,
        case_id: Optional[str] = None,
        tags: Optional[list[str]] = None,
    ) -> None:
        self.case_id = case_id or str(uuid.uuid4())
        self.suite_id = suite_id
        self.title = title
        self.case_type = TestCaseType(case_type) if isinstance(case_type, str) else case_type
        self.scenario = scenario
        self.expected = expected
        self.tags: list[str] = tags or []

    def to_dict(self) -> dict:
        return {
            "case_id": self.case_id,
            "suite_id": self.suite_id,
            "title": self.title,
            "case_type": self.case_type.value,
            "scenario": self.scenario,
            "expected": self.expected,
            "tags": self.tags,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "TestCase":
        return cls(
            case_id=d["case_id"],
            suite_id=d["suite_id"],
            title=d["title"],
            case_type=d["case_type"],
            scenario=d["scenario"],
            expected=d["expected"],
            tags=d.get("tags", []),
        )


# ---------------------------------------------------------------------------
# TestSuite — root aggregate
# ---------------------------------------------------------------------------


class TestSuite:
    """Collection of generated test cases for a feature or spec.

    Persisted as ``quality/test-suites/{suite_id}.yaml`` inside the project
    directory.

    Attributes
    ----------
    suite_id:     Unique identifier (UUID)
    project_id:   Reference to the project
    feature:      Feature or user-story name being tested
    spec_id:      Optional reference to a Module 2 Spec
    generated_at: ISO-8601 timestamp
    """

    def __init__(
        self,
        project_id: str,
        feature: str,
        generated_at: str,
        *,
        suite_id: Optional[str] = None,
        spec_id: Optional[str] = None,
    ) -> None:
        self.suite_id = suite_id or str(uuid.uuid4())
        self.project_id = project_id
        self.feature = feature
        self.spec_id = spec_id
        self.generated_at = generated_at
        self._cases: list[TestCase] = []

    def add_case(self, case: TestCase) -> None:
        """Append a test case; raises ValueError if case_id already exists."""
        if any(c.case_id == case.case_id for c in self._cases):
            raise ValueError(f"TestCase '{case.case_id}' already exists in suite")
        self._cases.append(case)

    @property
    def cases(self) -> list[TestCase]:
        return list(self._cases)

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "suite_id": self.suite_id,
            "project_id": self.project_id,
            "feature": self.feature,
            "spec_id": self.spec_id,
            "generated_at": self.generated_at,
            "cases": [c.to_dict() for c in self._cases],
        }

    def save(self, path: Path) -> None:
        """Persist this test suite to *path* (YAML)."""
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as fh:
            yaml.safe_dump(self.to_dict(), fh, allow_unicode=True, sort_keys=False)

    @classmethod
    def load(cls, path: Path) -> "TestSuite":
        """Load a TestSuite from a YAML file; raises FileNotFoundError if absent."""
        with path.open(encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        suite = cls(
            suite_id=data["suite_id"],
            project_id=data["project_id"],
            feature=data["feature"],
            generated_at=data["generated_at"],
            spec_id=data.get("spec_id"),
        )
        for c in data.get("cases", []):
            suite._cases.append(TestCase.from_dict(c))
        return suite


# ---------------------------------------------------------------------------
# AnalysisFinding — value object
# ---------------------------------------------------------------------------


class AnalysisFinding:
    """One issue found during artifact consistency analysis.

    Attributes
    ----------
    finding_id:     Unique identifier (UUID)
    report_id:      Reference to the parent AnalysisReport
    severity:       Impact level (SeverityLevel)
    category:       Artifact pair being compared (e.g. "spec-vs-plan")
    description:    What the inconsistency is
    recommendation: Suggested remediation
    """

    def __init__(
        self,
        report_id: str,
        severity: SeverityLevel | str,
        category: str,
        description: str,
        *,
        finding_id: Optional[str] = None,
        recommendation: str = "",
    ) -> None:
        self.finding_id = finding_id or str(uuid.uuid4())
        self.report_id = report_id
        self.severity = SeverityLevel(severity) if isinstance(severity, str) else severity
        self.category = category
        self.description = description
        self.recommendation = recommendation

    def to_dict(self) -> dict:
        return {
            "finding_id": self.finding_id,
            "report_id": self.report_id,
            "severity": self.severity.value,
            "category": self.category,
            "description": self.description,
            "recommendation": self.recommendation,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "AnalysisFinding":
        return cls(
            finding_id=d["finding_id"],
            report_id=d["report_id"],
            severity=d["severity"],
            category=d["category"],
            description=d["description"],
            recommendation=d.get("recommendation", ""),
        )


# ---------------------------------------------------------------------------
# AnalysisReport — root aggregate
# ---------------------------------------------------------------------------


class AnalysisReport:
    """AI consistency check result across all artifacts (spec ↔ plan ↔ tasks ↔ code).

    Persisted as ``quality/reports/{report_id}.yaml`` inside the project
    directory.

    Attributes
    ----------
    report_id:   Unique identifier (UUID)
    project_id:  Reference to the project
    spec_id:     Optional reference to the Module 2 Spec being analysed
    plan_id:     Optional reference to the Module 3 Plan being analysed
    analyzed_at: ISO-8601 timestamp
    """

    def __init__(
        self,
        project_id: str,
        analyzed_at: str,
        *,
        report_id: Optional[str] = None,
        spec_id: Optional[str] = None,
        plan_id: Optional[str] = None,
    ) -> None:
        self.report_id = report_id or str(uuid.uuid4())
        self.project_id = project_id
        self.spec_id = spec_id
        self.plan_id = plan_id
        self.analyzed_at = analyzed_at
        self._findings: list[AnalysisFinding] = []

    def add_finding(self, finding: AnalysisFinding) -> None:
        """Append a finding; raises ValueError if finding_id already exists."""
        if any(f.finding_id == finding.finding_id for f in self._findings):
            raise ValueError(f"AnalysisFinding '{finding.finding_id}' already exists in report")
        self._findings.append(finding)

    @property
    def findings(self) -> list[AnalysisFinding]:
        return list(self._findings)

    def summary(self) -> dict:
        """Return counts of findings by severity."""
        by_severity: dict[str, int] = {s.value: 0 for s in SeverityLevel}
        for f in self._findings:
            by_severity[f.severity.value] += 1
        return {
            "total_findings": len(self._findings),
            "by_severity": by_severity,
        }

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "report_id": self.report_id,
            "project_id": self.project_id,
            "spec_id": self.spec_id,
            "plan_id": self.plan_id,
            "analyzed_at": self.analyzed_at,
            "findings": [f.to_dict() for f in self._findings],
        }

    def save(self, path: Path) -> None:
        """Persist this report to *path* (YAML)."""
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as fh:
            yaml.safe_dump(self.to_dict(), fh, allow_unicode=True, sort_keys=False)

    @classmethod
    def load(cls, path: Path) -> "AnalysisReport":
        """Load an AnalysisReport from a YAML file; raises FileNotFoundError if absent."""
        with path.open(encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        report = cls(
            report_id=data["report_id"],
            project_id=data["project_id"],
            analyzed_at=data["analyzed_at"],
            spec_id=data.get("spec_id"),
            plan_id=data.get("plan_id"),
        )
        for f in data.get("findings", []):
            report._findings.append(AnalysisFinding.from_dict(f))
        return report
