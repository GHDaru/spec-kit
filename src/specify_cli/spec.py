"""
Specification Studio — Module 2 of SpecForge

Implements the data structures and logic for the Specification Studio,
which transforms vague ideas into structured, prioritized feature
specifications.

Key Entities:
- AcceptanceScenario  — Given/When/Then test condition
- FunctionalRequirement — numbered, traceable requirement (FR-001, ...)
- ClarificationItem   — identified ambiguity with resolution status
- UserStory           — prioritized user journey with acceptance scenarios
- Spec                — aggregate root: complete feature specification document

The Spec is persisted as a Markdown file and can be loaded back into the
domain model, following the same pattern as the Constitution Engine (Module 1).
"""

import re
from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from pathlib import Path
from typing import Optional


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class Priority(str, Enum):
    """Priority level for a user story.

    P1 — Must-have; MVP functionality.
    P2 — Should-have; important but not blocking MVP.
    P3 — Nice-to-have; can be deferred.
    """

    P1 = "P1"
    P2 = "P2"
    P3 = "P3"


class ClarificationStatus(str, Enum):
    """Resolution status of a clarification item."""

    OPEN = "open"
    RESOLVED = "resolved"


# ---------------------------------------------------------------------------
# Value objects
# ---------------------------------------------------------------------------


@dataclass
class AcceptanceScenario:
    """A Given/When/Then acceptance test condition for a user story.

    Attributes:
        title: Short label for the scenario (e.g. "Happy path").
        given: Pre-condition context.
        when:  Action or event being performed.
        then:  Expected observable outcome.
    """

    title: str
    given: str
    when: str
    then: str

    def __post_init__(self) -> None:
        for attr in ("title", "given", "when", "then"):
            value = getattr(self, attr)
            if not value or not value.strip():
                raise ValueError(f"AcceptanceScenario.{attr} must not be empty")

    def to_markdown(self) -> str:
        """Render the scenario as a Markdown subsection."""
        lines = [
            f"##### Scenario: {self.title}",
            "",
            f"**Given**: {self.given}  ",
            f"**When**: {self.when}  ",
            f"**Then**: {self.then}",
        ]
        return "\n".join(lines)


@dataclass
class FunctionalRequirement:
    """A numbered, traceable functional requirement.

    Attributes:
        id:          Auto-assigned identifier (e.g. "FR-001").
        description: Full description of the requirement.
        story_id:    Optional reference to the originating UserStory ID.
    """

    id: str
    description: str
    story_id: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.id or not self.id.strip():
            raise ValueError("FunctionalRequirement.id must not be empty")
        if not self.description or not self.description.strip():
            raise ValueError("FunctionalRequirement.description must not be empty")

    def to_markdown(self) -> str:
        """Render the requirement as a Markdown section."""
        story_line = f"**Story**: {self.story_id}  \n" if self.story_id else ""
        lines = [
            f"### {self.id}",
            "",
            f"{story_line}{self.description}",
        ]
        return "\n".join(lines)


@dataclass
class ClarificationItem:
    """An identified ambiguity or under-specified area in the spec.

    Attributes:
        id:          Auto-assigned identifier (e.g. "CL-001").
        description: Description of the ambiguity or open question.
        status:      Whether the item is open or resolved.
        resolution:  Explanation of how the ambiguity was resolved (if resolved).
    """

    id: str
    description: str
    status: ClarificationStatus = ClarificationStatus.OPEN
    resolution: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.id or not self.id.strip():
            raise ValueError("ClarificationItem.id must not be empty")
        if not self.description or not self.description.strip():
            raise ValueError("ClarificationItem.description must not be empty")
        if isinstance(self.status, str):
            self.status = ClarificationStatus(self.status.lower())

    def to_markdown(self) -> str:
        """Render the clarification item as a Markdown section."""
        lines = [f"### {self.id}", "", f"**Status**: {self.status.value}  "]
        if self.resolution:
            lines.append(f"**Resolution**: {self.resolution}  ")
        lines.append("")
        lines.append(self.description)
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Aggregate sub-entity
# ---------------------------------------------------------------------------


@dataclass
class UserStory:
    """A prioritized user journey with acceptance scenarios.

    Attributes:
        id:        Auto-assigned identifier (e.g. "US-001").
        title:     Short descriptive title.
        as_a:      Role of the user who benefits.
        i_want:    The capability the user desires.
        so_that:   The business goal or benefit achieved.
        priority:  P1 / P2 / P3 classification.
        scenarios: Ordered list of Given/When/Then acceptance scenarios.
    """

    id: str
    title: str
    as_a: str
    i_want: str
    so_that: str
    priority: Priority = Priority.P2
    scenarios: list[AcceptanceScenario] = field(default_factory=list)

    def __post_init__(self) -> None:
        for attr in ("id", "title", "as_a", "i_want", "so_that"):
            value = getattr(self, attr)
            if not value or not value.strip():
                raise ValueError(f"UserStory.{attr} must not be empty")
        if isinstance(self.priority, str):
            self.priority = Priority(self.priority.upper())

    def add_scenario(self, scenario: AcceptanceScenario) -> None:
        """Append an acceptance scenario to this story."""
        self.scenarios.append(scenario)

    def to_markdown(self) -> str:
        """Render the user story as a Markdown section."""
        # All metadata fields are intentionally on a single line, separated by
        # double trailing spaces (Markdown line-break), so the parser can find
        # all four fields in one pass with a single regex scan.
        meta = (
            f"**Priority**: {self.priority.value}  "
            f"**As a**: {self.as_a}  "
            f"**I want**: {self.i_want}  "
            f"**So that**: {self.so_that}"
        )
        lines = [
            f"### {self.id}: {self.title}",
            "",
            meta,
        ]
        if self.scenarios:
            lines += ["", "#### Acceptance Scenarios", ""]
            for scenario in self.scenarios:
                lines += [scenario.to_markdown(), ""]
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Aggregate root
# ---------------------------------------------------------------------------


@dataclass
class Spec:
    """A complete feature specification document.

    The Spec is the source of truth that all other SpecForge artifacts
    derive from. It aggregates user stories, functional requirements, and
    clarification items.

    Attributes:
        spec_id:        Unique identifier for the spec (e.g. "001-user-auth").
        title:          Human-readable feature title.
        description:    Overview of the feature being specified.
        user_stories:   Ordered list of user stories.
        requirements:   Ordered list of functional requirements.
        clarifications: Ordered list of clarification items.
        version:        Semantic version string.
        created_date:   Date the spec was first created.
    """

    spec_id: str
    title: str
    description: str = ""
    user_stories: list[UserStory] = field(default_factory=list)
    requirements: list[FunctionalRequirement] = field(default_factory=list)
    clarifications: list[ClarificationItem] = field(default_factory=list)
    version: str = "1.0.0"
    created_date: Optional[date] = None

    def __post_init__(self) -> None:
        for attr in ("spec_id", "title"):
            value = getattr(self, attr)
            if not value or not value.strip():
                raise ValueError(f"Spec.{attr} must not be empty")

    # ------------------------------------------------------------------
    # User story management
    # ------------------------------------------------------------------

    def _next_story_id(self) -> str:
        n = len(self.user_stories) + 1
        return f"US-{n:03d}"

    def add_story(self, story: UserStory) -> None:
        """Append a user story; reassigns the ID to maintain sequence."""
        self.user_stories.append(story)

    def remove_story(self, story_id: str) -> bool:
        """Remove a user story by ID. Returns True if found and removed."""
        original = len(self.user_stories)
        self.user_stories = [s for s in self.user_stories if s.id != story_id]
        return len(self.user_stories) < original

    def get_story(self, story_id: str) -> Optional[UserStory]:
        """Return a user story by ID, or None if not found."""
        for s in self.user_stories:
            if s.id == story_id:
                return s
        return None

    def stories_by_priority(self, priority: Priority) -> list[UserStory]:
        """Return all stories with the given priority."""
        return [s for s in self.user_stories if s.priority == priority]

    # ------------------------------------------------------------------
    # Functional requirement management
    # ------------------------------------------------------------------

    def _next_req_id(self) -> str:
        n = len(self.requirements) + 1
        return f"FR-{n:03d}"

    def add_requirement(self, description: str, story_id: Optional[str] = None) -> FunctionalRequirement:
        """Create and append a new functional requirement.

        Returns:
            The newly created :class:`FunctionalRequirement`.
        """
        req = FunctionalRequirement(
            id=self._next_req_id(),
            description=description,
            story_id=story_id,
        )
        self.requirements.append(req)
        return req

    # ------------------------------------------------------------------
    # Clarification management
    # ------------------------------------------------------------------

    def _next_clarification_id(self) -> str:
        n = len(self.clarifications) + 1
        return f"CL-{n:03d}"

    def add_clarification(self, description: str) -> ClarificationItem:
        """Create and append a new open clarification item.

        Returns:
            The newly created :class:`ClarificationItem`.
        """
        item = ClarificationItem(
            id=self._next_clarification_id(),
            description=description,
            status=ClarificationStatus.OPEN,
        )
        self.clarifications.append(item)
        return item

    def resolve_clarification(self, item_id: str, resolution: str) -> bool:
        """Mark a clarification item as resolved.

        Returns:
            True if the item was found and updated, False otherwise.
        """
        for item in self.clarifications:
            if item.id == item_id:
                item.status = ClarificationStatus.RESOLVED
                item.resolution = resolution
                return True
        return False

    def open_clarifications(self) -> list[ClarificationItem]:
        """Return all clarification items that are still open."""
        return [c for c in self.clarifications if c.status == ClarificationStatus.OPEN]

    # ------------------------------------------------------------------
    # Serialisation
    # ------------------------------------------------------------------

    def to_markdown(self) -> str:
        """Render the full spec as a Markdown document."""
        created = self.created_date.isoformat() if self.created_date else date.today().isoformat()
        lines: list[str] = [
            f"# Spec: {self.title}",
            "",
            f"**ID**: {self.spec_id}  **Version**: {self.version}  **Created**: {created}",
            "",
            self.description,
            "",
            "---",
            "",
        ]

        # User stories
        lines += ["## User Stories", ""]
        if self.user_stories:
            for story in self.user_stories:
                lines += [story.to_markdown(), ""]
        else:
            lines += ["_No user stories defined yet._", ""]

        lines += ["---", ""]

        # Functional requirements
        lines += ["## Functional Requirements", ""]
        if self.requirements:
            for req in self.requirements:
                lines += [req.to_markdown(), ""]
        else:
            lines += ["_No functional requirements defined yet._", ""]

        lines += ["---", ""]

        # Clarifications
        lines += ["## Clarifications", ""]
        if self.clarifications:
            for item in self.clarifications:
                lines += [item.to_markdown(), ""]
        else:
            lines += ["_No clarifications recorded._", ""]

        return "\n".join(lines)

    def save(self, path: Path) -> None:
        """Write the spec as Markdown to *path*, creating parent dirs as needed."""
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(self.to_markdown(), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> "Spec":
        """Parse a Markdown spec file written by :meth:`save`.

        Raises:
            FileNotFoundError: If *path* does not exist.
        """
        if not path.exists():
            raise FileNotFoundError(f"Spec file not found: {path}")
        text = path.read_text(encoding="utf-8")
        return _parse_spec_markdown(text)


# ---------------------------------------------------------------------------
# Markdown parser
# ---------------------------------------------------------------------------


def _parse_spec_markdown(text: str) -> Spec:
    """Extract a :class:`Spec` from Markdown text produced by :meth:`Spec.to_markdown`."""
    lines = text.splitlines()

    # --- title: first H1 starting with "# Spec:" ---
    title = "Untitled Spec"
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# Spec:"):
            title = stripped[len("# Spec:"):].strip()
            break

    # --- metadata line: **ID**: ...  **Version**: ...  **Created**: ... ---
    spec_id = "unknown"
    version = "1.0.0"
    created_date: Optional[date] = None

    meta_pattern = re.compile(
        r"\*\*ID\*\*:\s*([^\s*]+)"
        r".*?\*\*Version\*\*:\s*([\d.]+)"
        r".*?\*\*Created\*\*:\s*([\d-]+)",
        re.IGNORECASE,
    )
    for line in lines:
        m = meta_pattern.search(line)
        if m:
            spec_id = m.group(1).strip()
            version = m.group(2).strip()
            try:
                created_date = date.fromisoformat(m.group(3))
            except ValueError:
                pass
            break

    # --- description: text between metadata line and first --- or ## ---
    description_lines: list[str] = []
    in_description = False
    for line in lines:
        stripped = line.strip()
        if meta_pattern.search(line):
            in_description = True
            continue
        if in_description:
            if stripped == "---" or stripped.startswith("## "):
                break
            description_lines.append(line)
    description = "\n".join(description_lines).strip()

    # --- parse sections ---
    user_stories = _parse_user_stories(lines)
    requirements = _parse_requirements(lines)
    clarifications = _parse_clarifications(lines)

    return Spec(
        spec_id=spec_id,
        title=title,
        description=description,
        user_stories=user_stories,
        requirements=requirements,
        clarifications=clarifications,
        version=version,
        created_date=created_date,
    )


def _parse_user_stories(lines: list[str]) -> list[UserStory]:
    """Extract user stories from the parsed lines."""
    stories: list[UserStory] = []
    in_section = False
    # Per-story state
    current_id: Optional[str] = None
    current_title: Optional[str] = None
    current_priority = Priority.P2
    current_as_a = ""
    current_i_want = ""
    current_so_that = ""
    current_scenarios: list[AcceptanceScenario] = []
    # Per-scenario state
    in_scenarios_subsection = False
    current_scenario_title: Optional[str] = None
    current_given = ""
    current_when = ""
    current_then = ""

    story_id_re = re.compile(r"^###\s+(US-\d+):\s+(.+)$")
    scenario_re = re.compile(r"^#####\s+Scenario:\s+(.+)$")

    def flush_scenario() -> None:
        nonlocal current_scenario_title, current_given, current_when, current_then
        if current_scenario_title and current_given and current_when and current_then:
            current_scenarios.append(AcceptanceScenario(
                title=current_scenario_title,
                given=current_given,
                when=current_when,
                then=current_then,
            ))
        current_scenario_title = None
        current_given = ""
        current_when = ""
        current_then = ""

    def flush_story() -> None:
        nonlocal current_id, current_title, current_scenarios, in_scenarios_subsection
        flush_scenario()
        if current_id and current_title and current_as_a and current_i_want and current_so_that:
            stories.append(UserStory(
                id=current_id,
                title=current_title,
                as_a=current_as_a,
                i_want=current_i_want,
                so_that=current_so_that,
                priority=current_priority,
                scenarios=list(current_scenarios),
            ))
        current_id = None
        current_title = None
        current_scenarios = []
        in_scenarios_subsection = False

    for line in lines:
        stripped = line.strip()

        # Section boundary detection
        if stripped == "## User Stories":
            in_section = True
            continue
        if in_section and stripped.startswith("## ") and stripped != "## User Stories":
            flush_story()
            in_section = False
            continue
        if stripped == "---" and in_section and current_id is None:
            # horizontal rule before section ends
            continue

        if not in_section:
            continue

        # New story heading
        m_story = story_id_re.match(stripped)
        if m_story:
            flush_story()
            current_id = m_story.group(1)
            current_title = m_story.group(2)
            current_priority = Priority.P2
            current_as_a = ""
            current_i_want = ""
            current_so_that = ""
            continue

        if current_id is None:
            continue

        # Story metadata line (all on one line)
        if "**Priority**:" in stripped:
            p_m = re.search(r"\*\*Priority\*\*:\s*(P[123])", stripped)
            a_m = re.search(r"\*\*As a\*\*:\s*([^*]+?)(?:\s{2,}|\*\*|$)", stripped)
            w_m = re.search(r"\*\*I want\*\*:\s*([^*]+?)(?:\s{2,}|\*\*|$)", stripped)
            s_m = re.search(r"\*\*So that\*\*:\s*([^*]+?)(?:\s{2,}|\*\*|$)", stripped)
            if p_m:
                try:
                    current_priority = Priority(p_m.group(1))
                except ValueError:
                    pass
            if a_m:
                current_as_a = a_m.group(1).strip()
            if w_m:
                current_i_want = w_m.group(1).strip()
            if s_m:
                current_so_that = s_m.group(1).strip()
            continue

        # "#### Acceptance Scenarios" subsection header
        if stripped == "#### Acceptance Scenarios":
            in_scenarios_subsection = True
            continue

        if not in_scenarios_subsection:
            continue

        # New scenario
        m_sc = scenario_re.match(stripped)
        if m_sc:
            flush_scenario()
            current_scenario_title = m_sc.group(1).strip()
            continue

        if current_scenario_title is None:
            continue

        # Scenario fields
        if stripped.startswith("**Given**:"):
            current_given = stripped[len("**Given**:"):].strip().rstrip("  ").strip()
        elif stripped.startswith("**When**:"):
            current_when = stripped[len("**When**:"):].strip().rstrip("  ").strip()
        elif stripped.startswith("**Then**:"):
            current_then = stripped[len("**Then**:"):].strip().rstrip("  ").strip()

    flush_story()
    return stories


def _parse_requirements(lines: list[str]) -> list[FunctionalRequirement]:
    """Extract functional requirements from the parsed lines."""
    requirements: list[FunctionalRequirement] = []
    in_section = False
    current_id: Optional[str] = None
    current_story_id: Optional[str] = None
    current_desc_lines: list[str] = []

    req_id_re = re.compile(r"^###\s+(FR-\d+)$")

    def flush_req() -> None:
        nonlocal current_id, current_story_id, current_desc_lines
        if current_id:
            desc = "\n".join(current_desc_lines).strip()
            if desc:
                requirements.append(FunctionalRequirement(
                    id=current_id,
                    description=desc,
                    story_id=current_story_id,
                ))
        current_id = None
        current_story_id = None
        current_desc_lines = []

    for line in lines:
        stripped = line.strip()

        if stripped == "## Functional Requirements":
            in_section = True
            continue
        if in_section and stripped.startswith("## ") and stripped != "## Functional Requirements":
            flush_req()
            in_section = False
            continue

        if not in_section:
            continue

        m_req = req_id_re.match(stripped)
        if m_req:
            flush_req()
            current_id = m_req.group(1)
            continue

        if current_id is None:
            continue

        if stripped.startswith("**Story**:"):
            s_m = re.search(r"\*\*Story\*\*:\s*(US-\d+)", stripped)
            if s_m:
                current_story_id = s_m.group(1)
        elif stripped and stripped != "---":
            current_desc_lines.append(line)

    flush_req()
    return requirements


def _parse_clarifications(lines: list[str]) -> list[ClarificationItem]:
    """Extract clarification items from the parsed lines."""
    clarifications: list[ClarificationItem] = []
    in_section = False
    current_id: Optional[str] = None
    current_status = ClarificationStatus.OPEN
    current_resolution: Optional[str] = None
    current_desc_lines: list[str] = []

    cl_id_re = re.compile(r"^###\s+(CL-\d+)$")

    def flush_cl() -> None:
        nonlocal current_id, current_status, current_resolution, current_desc_lines
        if current_id:
            desc = "\n".join(current_desc_lines).strip()
            if desc:
                clarifications.append(ClarificationItem(
                    id=current_id,
                    description=desc,
                    status=current_status,
                    resolution=current_resolution,
                ))
        current_id = None
        current_status = ClarificationStatus.OPEN
        current_resolution = None
        current_desc_lines = []

    for line in lines:
        stripped = line.strip()

        if stripped == "## Clarifications":
            in_section = True
            continue
        if in_section and stripped.startswith("## ") and stripped != "## Clarifications":
            flush_cl()
            in_section = False
            continue

        if not in_section:
            continue

        m_cl = cl_id_re.match(stripped)
        if m_cl:
            flush_cl()
            current_id = m_cl.group(1)
            continue

        if current_id is None:
            continue

        if stripped.startswith("**Status**:"):
            s_m = re.search(r"\*\*Status\*\*:\s*(\w+)", stripped)
            if s_m:
                try:
                    current_status = ClarificationStatus(s_m.group(1).lower())
                except ValueError:
                    pass
        elif stripped.startswith("**Resolution**:"):
            r_m = re.search(r"\*\*Resolution\*\*:\s*(.+)", stripped)
            if r_m:
                current_resolution = r_m.group(1).strip().rstrip("  ").strip()
        elif stripped and stripped != "---":
            current_desc_lines.append(line)

    flush_cl()
    return clarifications
