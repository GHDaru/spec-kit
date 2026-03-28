"""
Constitution Engine — Module 1 of SpecForge

Implements the data structures and logic for the Constitution Engine,
which allows teams to define, store, version, and enforce the governing
principles that every AI-generated artifact must comply with.

Key Entities:
- Principle   — individual rule with name, description, and enforcement level
- Constitution — versioned set of governing principles
- ComplianceGate — automated check that validates artifacts against the constitution

This module serves as the foundation for all subsequent SpecForge modules:
the Constitution is the DNA of the project and every generated artifact
must comply with its principles.
"""

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from pathlib import Path
from typing import Optional

import yaml


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class EnforcementLevel(str, Enum):
    """Enforcement level for a constitutional principle.

    MUST   — non-negotiable; violations block plan/task generation.
    SHOULD — strongly recommended; violations trigger warnings.
    MAY    — advisory; recorded but non-blocking.
    """

    MUST = "MUST"
    SHOULD = "SHOULD"
    MAY = "MAY"


class PrincipleCategory(str, Enum):
    """Broad classification of a constitutional principle."""

    ARCHITECTURE = "architecture"
    TESTING = "testing"
    SECURITY = "security"
    PERFORMANCE = "performance"
    WORKFLOW = "workflow"
    GENERAL = "general"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class Principle:
    """An individual governing rule in the project constitution.

    Attributes:
        name:              Short, unique title (e.g. "Library-First").
        description:       Full explanation of the rule and its rationale.
        enforcement_level: How strictly the rule is enforced (MUST/SHOULD/MAY).
        category:          Topical area of the principle.
    """

    name: str
    description: str
    enforcement_level: EnforcementLevel = EnforcementLevel.MUST
    category: PrincipleCategory = PrincipleCategory.GENERAL

    def __post_init__(self) -> None:
        if not self.name or not self.name.strip():
            raise ValueError("Principle name must not be empty")
        if not self.description or not self.description.strip():
            raise ValueError("Principle description must not be empty")
        # Coerce str values to enum types for callers that pass plain strings
        if isinstance(self.enforcement_level, str):
            self.enforcement_level = EnforcementLevel(self.enforcement_level.upper())
        if isinstance(self.category, str):
            try:
                self.category = PrincipleCategory(self.category.lower())
            except ValueError:
                self.category = PrincipleCategory.GENERAL

    def to_markdown(self) -> str:
        """Render the principle as a Markdown section."""
        lines = [
            f"### {self.name}",
            f"**Enforcement**: {self.enforcement_level.value}  "
            f"**Category**: {self.category.value}",
            "",
            self.description,
        ]
        return "\n".join(lines)


@dataclass
class Constitution:
    """A versioned set of governing principles for a project.

    The Constitution is the DNA of the project.  Every AI-generated artifact
    (spec, plan, task list) must be validated against it before use.

    Attributes:
        project_name:      Human-readable name of the project.
        principles:        Ordered list of governing principles.
        version:           Semantic version string (e.g. "1.0.0").
        ratification_date: Date the constitution was originally ratified.
        last_amended_date: Date of the most-recent amendment.
    """

    project_name: str
    principles: list[Principle] = field(default_factory=list)
    version: str = "1.0.0"
    ratification_date: Optional[date] = None
    last_amended_date: Optional[date] = None

    def __post_init__(self) -> None:
        if not self.project_name or not self.project_name.strip():
            raise ValueError("Constitution project_name must not be empty")
        _validate_semver(self.version)

    # ------------------------------------------------------------------
    # Principle management
    # ------------------------------------------------------------------

    def add_principle(self, principle: Principle) -> None:
        """Append a principle to the constitution."""
        self.principles.append(principle)

    def remove_principle(self, name: str) -> bool:
        """Remove a principle by name.  Returns True if found and removed."""
        original_count = len(self.principles)
        self.principles = [p for p in self.principles if p.name != name]
        return len(self.principles) < original_count

    def get_principle(self, name: str) -> Optional[Principle]:
        """Return a principle by name, or None if not found."""
        for p in self.principles:
            if p.name == name:
                return p
        return None

    def principles_by_category(self, category: PrincipleCategory) -> list[Principle]:
        """Return all principles belonging to *category*."""
        return [p for p in self.principles if p.category == category]

    def must_principles(self) -> list[Principle]:
        """Return only non-negotiable (MUST) principles."""
        return [p for p in self.principles if p.enforcement_level == EnforcementLevel.MUST]

    # ------------------------------------------------------------------
    # Versioning
    # ------------------------------------------------------------------

    def bump_version(self, bump: str = "patch") -> None:
        """Increment the semantic version.

        Args:
            bump: One of "major", "minor", or "patch".

        Raises:
            ValueError: If *bump* is not a valid bump type.
        """
        if bump not in {"major", "minor", "patch"}:
            raise ValueError(f"Invalid bump type '{bump}'. Use 'major', 'minor', or 'patch'.")
        major, minor, patch = _parse_semver(self.version)
        if bump == "major":
            self.version = f"{major + 1}.0.0"
        elif bump == "minor":
            self.version = f"{major}.{minor + 1}.0"
        else:
            self.version = f"{major}.{minor}.{patch + 1}"
        self.last_amended_date = date.today()

    # ------------------------------------------------------------------
    # Serialisation helpers
    # ------------------------------------------------------------------

    def to_markdown(self) -> str:
        """Render the full constitution as a Markdown document."""
        lines: list[str] = [f"# {self.project_name} Constitution", ""]

        lines.append("## Core Principles")
        lines.append("")

        for principle in self.principles:
            lines.append(principle.to_markdown())
            lines.append("")

        lines.append("## Governance")
        lines.append("")
        lines.append(
            "All pull requests and reviews MUST verify compliance with the principles "
            "above. Amendments require documentation, a version bump, and an approved "
            "migration plan."
        )
        lines.append("")

        ratified = self.ratification_date.isoformat() if self.ratification_date else "TODO"
        amended = self.last_amended_date.isoformat() if self.last_amended_date else ratified
        lines.append(
            f"**Version**: {self.version} | "
            f"**Ratified**: {ratified} | "
            f"**Last Amended**: {amended}"
        )
        return "\n".join(lines)

    def save(self, path: Path) -> None:
        """Write the constitution as Markdown to *path*."""
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(self.to_markdown(), encoding="utf-8")

    # ------------------------------------------------------------------
    # Class-method constructors
    # ------------------------------------------------------------------

    @classmethod
    def load(cls, path: Path) -> "Constitution":
        """Parse a Markdown constitution file written by :meth:`save`.

        Only the project name, version line, and principle headings are
        parsed.  The full description text is preserved.

        Raises:
            FileNotFoundError: If *path* does not exist.
            ValueError: If required sections cannot be found.
        """
        if not path.exists():
            raise FileNotFoundError(f"Constitution file not found: {path}")

        text = path.read_text(encoding="utf-8")
        return _parse_constitution_markdown(text)

    @classmethod
    def from_template(cls, project_name: str) -> "Constitution":
        """Return a new Constitution pre-populated with sensible defaults.

        The returned constitution includes one principle per standard
        category so teams have a starting point for each concern.
        """
        today = date.today()
        constitution = cls(
            project_name=project_name,
            version="1.0.0",
            ratification_date=today,
            last_amended_date=today,
        )
        _populate_defaults(constitution)
        return constitution


# ---------------------------------------------------------------------------
# ComplianceGate
# ---------------------------------------------------------------------------

@dataclass
class ComplianceViolation:
    """A single finding produced by the :class:`ComplianceGate`.

    Attributes:
        principle_name:    Name of the violated principle.
        enforcement_level: Severity of the violation.
        message:           Human-readable description of the violation.
        line_number:       Optional line number in the artifact where the violation was detected.
    """

    principle_name: str
    enforcement_level: EnforcementLevel
    message: str
    line_number: Optional[int] = None

    @property
    def is_blocking(self) -> bool:
        """True when the violation should block downstream processing."""
        return self.enforcement_level == EnforcementLevel.MUST


@dataclass
class ComplianceReport:
    """Outcome of a :class:`ComplianceGate` check.

    Attributes:
        artifact_path: Path to the artifact that was checked.
        violations:    List of detected violations.
        passed:        True when there are no blocking violations.
    """

    artifact_path: Path
    violations: list[ComplianceViolation] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        """True when there are no MUST-level violations."""
        return not any(v.is_blocking for v in self.violations)

    @property
    def blocking_violations(self) -> list[ComplianceViolation]:
        return [v for v in self.violations if v.is_blocking]

    @property
    def warning_violations(self) -> list[ComplianceViolation]:
        return [v for v in self.violations if not v.is_blocking]

    def summary(self) -> str:
        """Return a one-line human-readable summary of the report."""
        if self.passed and not self.violations:
            return f"✅ {self.artifact_path.name}: compliant"
        if self.passed:
            return (
                f"⚠️  {self.artifact_path.name}: "
                f"{len(self.warning_violations)} warning(s), no blocking violations"
            )
        return (
            f"❌ {self.artifact_path.name}: "
            f"{len(self.blocking_violations)} blocking violation(s)"
        )


class ComplianceGate:
    """Validates artifact documents against a :class:`Constitution`.

    The gate checks Markdown artifact files for signs that constitutional
    principles are being violated or ignored.  It is intentionally
    heuristic-based and lightweight — definitive semantic analysis is
    delegated to the AI agent.

    Usage::

        gate = ComplianceGate(constitution)
        report = gate.check(Path(".specify/memory/spec.md"))
        if not report.passed:
            for v in report.blocking_violations:
                print(v.message)
    """

    # Keywords whose absence in a plan/spec may indicate a principle is ignored
    _CATEGORY_SIGNALS: dict[PrincipleCategory, list[str]] = {
        PrincipleCategory.TESTING: ["test", "spec", "coverage", "assert", "tdd", "bdd"],
        PrincipleCategory.SECURITY: ["auth", "security", "encrypt", "sanitize", "validate"],
        PrincipleCategory.PERFORMANCE: ["performance", "latency", "throughput", "cache", "benchmark"],
        PrincipleCategory.ARCHITECTURE: ["architecture", "layer", "module", "service", "interface"],
        PrincipleCategory.WORKFLOW: ["branch", "review", "merge", "pull request", "ci", "deploy"],
    }

    def __init__(self, constitution: Constitution) -> None:
        self.constitution = constitution

    def check(self, artifact_path: Path) -> ComplianceReport:
        """Run all configured checks against *artifact_path*.

        Args:
            artifact_path: Markdown file to validate (spec, plan, tasks, etc.).

        Returns:
            A :class:`ComplianceReport` with any detected violations.
        """
        report = ComplianceReport(artifact_path=artifact_path)

        if not artifact_path.exists():
            report.violations.append(
                ComplianceViolation(
                    principle_name="(file-exists)",
                    enforcement_level=EnforcementLevel.MUST,
                    message=f"Artifact file not found: {artifact_path}",
                )
            )
            return report

        content = artifact_path.read_text(encoding="utf-8")
        content_lower = content.lower()
        lines = content.splitlines()

        for principle in self.constitution.principles:
            violation = self._check_principle(principle, content_lower, lines)
            if violation:
                report.violations.append(violation)

        return report

    def _check_principle(
        self,
        principle: Principle,
        content_lower: str,
        lines: list[str],
    ) -> Optional[ComplianceViolation]:
        """Return a violation if the principle appears to be ignored, else None."""
        category_keywords = self._CATEGORY_SIGNALS.get(principle.category, [])
        if not category_keywords:
            return None  # No heuristic defined for this category

        # If any signal keyword appears in the document the principle is
        # considered addressed at a surface level.
        if any(keyword in content_lower for keyword in category_keywords):
            return None

        # Determine line number for first reference to the principle name
        principle_ref_line: Optional[int] = None
        for i, line in enumerate(lines, start=1):
            if principle.name.lower() in line.lower():
                principle_ref_line = i
                break

        return ComplianceViolation(
            principle_name=principle.name,
            enforcement_level=principle.enforcement_level,
            message=(
                f"Principle '{principle.name}' ({principle.category.value}) "
                f"has no apparent coverage in this artifact. "
                f"Expected at least one of: {', '.join(category_keywords[:3])}."
            ),
            line_number=principle_ref_line,
        )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


def _validate_semver(version: str) -> None:
    if not _SEMVER_RE.match(version):
        raise ValueError(
            f"Invalid semantic version '{version}'. Expected MAJOR.MINOR.PATCH format."
        )


def _parse_semver(version: str) -> tuple[int, int, int]:
    m = _SEMVER_RE.match(version)
    if not m:
        raise ValueError(f"Cannot parse semantic version: '{version}'")
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def _parse_constitution_markdown(text: str) -> Constitution:
    """Extract a :class:`Constitution` from Markdown text produced by :meth:`Constitution.to_markdown`."""
    lines = text.splitlines()

    # --- project name: first H1 ---
    project_name = "Unnamed Project"
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# ") and "Constitution" in stripped:
            project_name = stripped[2:].replace("Constitution", "").strip()
            break

    # --- version / dates: last bold Version line ---
    version = "1.0.0"
    ratification_date: Optional[date] = None
    last_amended_date: Optional[date] = None

    version_pattern = re.compile(
        r"\*\*Version\*\*:\s*([\d.]+)"
        r".*?\*\*Ratified\*\*:\s*([\d-]+)"
        r".*?\*\*Last Amended\*\*:\s*([\d-]+)",
        re.IGNORECASE,
    )
    for line in lines:
        m = version_pattern.search(line)
        if m:
            version = m.group(1)
            try:
                ratification_date = date.fromisoformat(m.group(2))
                last_amended_date = date.fromisoformat(m.group(3))
            except ValueError:
                pass
            break

    # --- principles: ### headings beneath "## Core Principles" ---
    principles: list[Principle] = []
    in_principles_section = False
    current_heading: Optional[str] = None
    current_lines: list[str] = []
    enforcement = EnforcementLevel.MUST
    category = PrincipleCategory.GENERAL

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("## "):
            # Flush any pending principle
            if current_heading:
                principles.append(
                    Principle(
                        name=current_heading,
                        description="\n".join(current_lines).strip() or "No description.",
                        enforcement_level=enforcement,
                        category=category,
                    )
                )
                current_heading = None
                current_lines = []

            in_principles_section = "Core Principles" in stripped
            continue

        if not in_principles_section:
            continue

        if stripped.startswith("### "):
            # Flush previous principle
            if current_heading:
                principles.append(
                    Principle(
                        name=current_heading,
                        description="\n".join(current_lines).strip() or "No description.",
                        enforcement_level=enforcement,
                        category=category,
                    )
                )
                current_lines = []
            current_heading = stripped[4:].strip()
            enforcement = EnforcementLevel.MUST
            category = PrincipleCategory.GENERAL
            continue

        if current_heading:
            # Parse inline enforcement / category metadata line
            if stripped.startswith("**Enforcement**:"):
                enf_m = re.search(r"\*\*Enforcement\*\*:\s*(\w+)", stripped)
                cat_m = re.search(r"\*\*Category\*\*:\s*(\w+)", stripped)
                if enf_m:
                    try:
                        enforcement = EnforcementLevel(enf_m.group(1).upper())
                    except ValueError:
                        pass
                if cat_m:
                    try:
                        category = PrincipleCategory(cat_m.group(1).lower())
                    except ValueError:
                        pass
            else:
                current_lines.append(line)

    # Flush final principle
    if current_heading:
        principles.append(
            Principle(
                name=current_heading,
                description="\n".join(current_lines).strip() or "No description.",
                enforcement_level=enforcement,
                category=category,
            )
        )

    return Constitution(
        project_name=project_name,
        principles=principles,
        version=version,
        ratification_date=ratification_date,
        last_amended_date=last_amended_date,
    )


def _populate_defaults(constitution: Constitution) -> None:
    """Add one sensible default principle per standard category."""
    defaults = [
        Principle(
            name="Architecture Consistency",
            description=(
                "All components MUST follow the documented architectural patterns. "
                "New patterns require explicit approval and documentation."
            ),
            enforcement_level=EnforcementLevel.MUST,
            category=PrincipleCategory.ARCHITECTURE,
        ),
        Principle(
            name="Test-First Development",
            description=(
                "Tests MUST be written before implementation code (TDD). "
                "The red-green-refactor cycle is strictly enforced."
            ),
            enforcement_level=EnforcementLevel.MUST,
            category=PrincipleCategory.TESTING,
        ),
        Principle(
            name="Security by Design",
            description=(
                "Security requirements MUST be specified in the constitution and "
                "validated during plan generation. No dependency with known critical "
                "vulnerabilities may be introduced."
            ),
            enforcement_level=EnforcementLevel.MUST,
            category=PrincipleCategory.SECURITY,
        ),
        Principle(
            name="Performance Targets",
            description=(
                "Every feature SHOULD document its performance targets in the plan. "
                "Benchmarks defined in the constitution set the acceptance threshold."
            ),
            enforcement_level=EnforcementLevel.SHOULD,
            category=PrincipleCategory.PERFORMANCE,
        ),
        Principle(
            name="Spec-Driven Workflow",
            description=(
                "All changes MUST originate from a spec. No implementation without "
                "an approved spec and a linked plan."
            ),
            enforcement_level=EnforcementLevel.MUST,
            category=PrincipleCategory.WORKFLOW,
        ),
    ]
    for principle in defaults:
        constitution.add_principle(principle)
