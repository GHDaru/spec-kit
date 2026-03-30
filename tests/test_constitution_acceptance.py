"""
Acceptance tests for Module 1 — Constitution Engine.

Each test class maps directly to a User Story from
specs/001-module-1-constitution-engine/spec.md.

These tests exercise realistic, end-to-end scenarios against the domain model
rather than isolated unit behaviour, complementing the unit tests in
tests/test_constitution.py.
"""

import pytest
from datetime import date
from pathlib import Path

from specify_cli.constitution import (
    ComplianceGate,
    ComplianceReport,
    ComplianceViolation,
    Constitution,
    EnforcementLevel,
    Principle,
    PrincipleCategory,
)


# ---------------------------------------------------------------------------
# US-1 — Bootstrap a Constitution from a Template
# ---------------------------------------------------------------------------


class TestUS1_BootstrapFromTemplate:
    """US-1: As a team lead, I want to generate a pre-populated Constitution
    from a template so that I have a solid, category-complete starting point.
    """

    def test_template_covers_required_categories(self):
        """Scenario 1: template returns principles in arch/testing/security."""
        c = Constitution.from_template("Acme API")
        categories = {p.category for p in c.principles}
        assert PrincipleCategory.ARCHITECTURE in categories
        assert PrincipleCategory.TESTING in categories
        assert PrincipleCategory.SECURITY in categories

    def test_template_round_trip_preserves_all_data(self, tmp_path):
        """Scenario 2: saved template can be reloaded with no data loss."""
        original = Constitution.from_template("Acme API")
        path = tmp_path / "constitution.md"
        original.save(path)

        loaded = Constitution.load(path)
        assert loaded.project_name == original.project_name
        assert loaded.version == original.version
        assert len(loaded.principles) == len(original.principles)
        for orig_p, loaded_p in zip(original.principles, loaded.principles):
            assert loaded_p.name == orig_p.name
            assert loaded_p.enforcement_level == orig_p.enforcement_level
            assert loaded_p.category == orig_p.category

    def test_to_markdown_starts_with_project_name_heading(self):
        """Scenario 3: to_markdown() begins with # <ProjectName> Constitution."""
        c = Constitution.from_template("Acme API")
        md = c.to_markdown()
        assert md.startswith("# Acme API Constitution")

    def test_to_markdown_contains_all_principle_sections(self):
        """to_markdown() has a section heading for every principle."""
        c = Constitution.from_template("Demo")
        md = c.to_markdown()
        for p in c.principles:
            assert f"### {p.name}" in md

    def test_template_has_at_least_five_principles(self):
        """Template must cover at least 5 distinct principles for a useful baseline."""
        c = Constitution.from_template("SomeProject")
        assert len(c.principles) >= 5


# ---------------------------------------------------------------------------
# US-2 — Add and Manage Individual Principles
# ---------------------------------------------------------------------------


class TestUS2_ManagePrinciples:
    """US-2: As a developer, I want to add, edit, and remove principles."""

    def _constitution(self) -> Constitution:
        return Constitution(project_name="TestProject")

    def test_add_principle_appends_and_is_retrievable(self):
        """Scenario 1: add_principle appends; get_principle returns it."""
        c = self._constitution()
        c.add_principle(Principle(name="TDD", description="Test-first always."))
        assert len(c.principles) == 1
        found = c.get_principle("TDD")
        assert found is not None
        assert found.name == "TDD"

    def test_remove_principle_returns_true_and_deletes(self):
        """Scenario 2: remove_principle returns True and principle is gone."""
        c = self._constitution()
        c.add_principle(Principle(name="Library-First", description="Lib."))
        result = c.remove_principle("Library-First")
        assert result is True
        assert c.get_principle("Library-First") is None

    def test_remove_nonexistent_principle_returns_false(self):
        """Scenario 3: remove_principle("Unknown") returns False without error."""
        c = self._constitution()
        result = c.remove_principle("Unknown")
        assert result is False

    def test_principles_by_category_returns_correct_subset(self):
        """Scenario 4: principles_by_category returns only matching principles."""
        c = self._constitution()
        c.add_principle(Principle(name="T1", description="D", category=PrincipleCategory.TESTING))
        c.add_principle(Principle(name="S1", description="D", category=PrincipleCategory.SECURITY))
        c.add_principle(Principle(name="T2", description="D", category=PrincipleCategory.TESTING))
        result = c.principles_by_category(PrincipleCategory.TESTING)
        assert len(result) == 2
        assert all(p.category == PrincipleCategory.TESTING for p in result)

    def test_must_principles_filters_correctly(self):
        """Scenario 5: must_principles() returns only MUST-level principles."""
        c = self._constitution()
        c.add_principle(Principle(name="M1", description="D", enforcement_level=EnforcementLevel.MUST))
        c.add_principle(Principle(name="S1", description="D", enforcement_level=EnforcementLevel.SHOULD))
        c.add_principle(Principle(name="M2", description="D", enforcement_level=EnforcementLevel.MUST))
        musts = c.must_principles()
        assert len(musts) == 2
        assert all(p.enforcement_level == EnforcementLevel.MUST for p in musts)

    def test_replace_principle_updates_enforcement_level(self):
        """Scenario 6: remove + re-add replaces the principle with new level."""
        c = self._constitution()
        c.add_principle(Principle(name="Rule", description="D", enforcement_level=EnforcementLevel.SHOULD))
        c.remove_principle("Rule")
        c.add_principle(Principle(name="Rule", description="D", enforcement_level=EnforcementLevel.MUST))
        assert len(c.principles) == 1
        assert c.get_principle("Rule").enforcement_level == EnforcementLevel.MUST

    def test_string_coercion_for_enforcement_and_category(self):
        """Principle accepts plain strings for enforcement_level and category."""
        p = Principle(name="X", description="Y", enforcement_level="should", category="security")
        assert p.enforcement_level == EnforcementLevel.SHOULD
        assert p.category == PrincipleCategory.SECURITY

    def test_unknown_category_string_falls_back_to_general(self):
        """Unknown category string coerces to GENERAL without raising."""
        p = Principle(name="X", description="Y", category="unknown_xyz")
        assert p.category == PrincipleCategory.GENERAL


# ---------------------------------------------------------------------------
# US-3 — Validate an Artifact Against the Constitution
# ---------------------------------------------------------------------------


class TestUS3_ComplianceGate:
    """US-3: As a developer, I want to run the Compliance Gate against my artifact."""

    def _gate_with(self, category: PrincipleCategory, level: EnforcementLevel) -> ComplianceGate:
        c = Constitution(project_name="GateProject")
        c.add_principle(Principle(name="Rule", description="D", enforcement_level=level, category=category))
        return ComplianceGate(c)

    def test_artifact_with_test_keyword_passes_must_testing(self, tmp_path):
        """Scenario 1: file with test keyword passes MUST testing principle."""
        f = tmp_path / "spec.md"
        f.write_text("This spec requires full test coverage.\n")
        report = self._gate_with(PrincipleCategory.TESTING, EnforcementLevel.MUST).check(f)
        assert report.passed
        assert report.violations == []

    def test_artifact_without_test_keyword_fails_must_testing(self, tmp_path):
        """Scenario 2: file without test keywords fails MUST testing principle."""
        f = tmp_path / "plan.md"
        f.write_text("Deployment pipeline using containers and orchestration.\n")
        report = self._gate_with(PrincipleCategory.TESTING, EnforcementLevel.MUST).check(f)
        assert not report.passed
        assert len(report.blocking_violations) == 1

    def test_should_violation_is_non_blocking(self, tmp_path):
        """Scenario 3: SHOULD performance violation — passed=True, warning recorded."""
        f = tmp_path / "plan.md"
        f.write_text("Authentication flow with OAuth2 and refresh tokens.\n")
        report = self._gate_with(PrincipleCategory.PERFORMANCE, EnforcementLevel.SHOULD).check(f)
        assert report.passed
        assert len(report.warning_violations) == 1

    def test_missing_file_produces_blocking_violation(self, tmp_path):
        """Scenario 4: non-existent artifact produces file-exists blocking violation."""
        report = self._gate_with(PrincipleCategory.TESTING, EnforcementLevel.MUST).check(
            tmp_path / "ghost.md"
        )
        assert not report.passed
        assert report.blocking_violations[0].principle_name == "(file-exists)"

    def test_report_summary_contains_error_symbol_for_blocking(self, tmp_path):
        """Scenario 5: summary with blocking violation contains ❌ and 'blocking'."""
        f = tmp_path / "plan.md"
        # Deliberately contains no test/coverage/spec keywords so TESTING MUST principle is violated
        f.write_text("Deployment pipeline using containers and orchestration only.\n")
        report = self._gate_with(PrincipleCategory.TESTING, EnforcementLevel.MUST).check(f)
        summary = report.summary()
        assert "❌" in summary
        assert "blocking" in summary

    def test_report_summary_contains_warning_symbol_for_should(self, tmp_path):
        """Scenario 6: summary with warning violation contains ⚠️ and 'warning', passed=True."""
        f = tmp_path / "plan.md"
        f.write_text("Authentication flow with OAuth2.\n")
        report = self._gate_with(PrincipleCategory.PERFORMANCE, EnforcementLevel.SHOULD).check(f)
        assert report.passed
        summary = report.summary()
        assert "⚠️" in summary
        assert "warning" in summary

    def test_security_keywords_are_detected(self, tmp_path):
        """Security keywords ('auth', 'validation') satisfy a MUST security principle."""
        f = tmp_path / "plan.md"
        f.write_text("All endpoints require auth and input validation.\n")
        report = self._gate_with(PrincipleCategory.SECURITY, EnforcementLevel.MUST).check(f)
        assert report.passed

    def test_general_category_produces_no_violations(self, tmp_path):
        """GENERAL category principles have no keyword heuristic → no violations."""
        f = tmp_path / "spec.md"
        f.write_text("Generic content with no special keywords.\n")
        report = self._gate_with(PrincipleCategory.GENERAL, EnforcementLevel.MUST).check(f)
        assert report.passed
        assert report.violations == []

    def test_multiple_principles_all_satisfied(self, tmp_path):
        """All MUST principles satisfied → passed=True, no violations."""
        f = tmp_path / "spec.md"
        f.write_text("We need test coverage, auth validation, and architecture consistency.\n")
        c = Constitution(project_name="Multi")
        c.add_principle(Principle(name="T", description="D", enforcement_level=EnforcementLevel.MUST, category=PrincipleCategory.TESTING))
        c.add_principle(Principle(name="S", description="D", enforcement_level=EnforcementLevel.MUST, category=PrincipleCategory.SECURITY))
        report = ComplianceGate(c).check(f)
        assert report.passed

    def test_may_violation_does_not_appear_in_blocking_or_warnings(self, tmp_path):
        """MAY-level principle violation is non-blocking and not a warning."""
        f = tmp_path / "spec.md"
        f.write_text("No performance keywords at all.\n")
        c = Constitution(project_name="MayTest")
        c.add_principle(Principle(
            name="Perf-Opt",
            description="Optional perf note.",
            enforcement_level=EnforcementLevel.MAY,
            category=PrincipleCategory.PERFORMANCE,
        ))
        report = ComplianceGate(c).check(f)
        # MAY violations should not appear in blocking or warning lists
        assert len(report.blocking_violations) == 0


# ---------------------------------------------------------------------------
# US-4 — Semantic Versioning
# ---------------------------------------------------------------------------


class TestUS4_SemanticVersioning:
    """US-4: As a team lead, I want to bump the Constitution's semantic version."""

    def _constitution(self, version: str = "1.0.0") -> Constitution:
        return Constitution(project_name="VersionProject", version=version)

    def test_bump_patch(self):
        """Scenario 1: 1.0.0 → patch → 1.0.1."""
        c = self._constitution()
        c.bump_version("patch")
        assert c.version == "1.0.1"
        assert c.last_amended_date == date.today()

    def test_bump_minor_resets_patch(self):
        """Scenario 2: 1.0.0 → minor → 1.1.0."""
        c = self._constitution()
        c.bump_version("minor")
        assert c.version == "1.1.0"

    def test_bump_major_resets_minor_and_patch(self):
        """Scenario 3: 1.2.3 → major → 2.0.0."""
        c = self._constitution("1.2.3")
        c.bump_version("major")
        assert c.version == "2.0.0"

    def test_invalid_bump_type_raises_value_error(self):
        """Scenario 4: unknown bump type raises ValueError."""
        c = self._constitution()
        with pytest.raises(ValueError, match="Invalid bump type"):
            c.bump_version("hotfix")

    def test_amended_date_not_before_ratification_date(self):
        """Scenario 5: last_amended_date after bump is >= ratification_date."""
        c = Constitution(
            project_name="V",
            version="1.0.0",
            ratification_date=date(2026, 1, 1),
        )
        c.bump_version("patch")
        assert c.last_amended_date is not None
        assert c.last_amended_date >= c.ratification_date

    def test_invalid_semver_on_creation_raises(self):
        """Constitution rejects invalid semver strings on creation."""
        with pytest.raises(ValueError):
            Constitution(project_name="X", version="not-a-version")

    def test_consecutive_bumps_accumulate(self):
        """Two patch bumps on 1.0.0 → 1.0.2."""
        c = self._constitution()
        c.bump_version("patch")
        c.bump_version("patch")
        assert c.version == "1.0.2"


# ---------------------------------------------------------------------------
# US-5 — Save and Load from Disk
# ---------------------------------------------------------------------------


class TestUS5_SaveAndLoad:
    """US-5: As a team, we want to persist the Constitution as a Markdown file."""

    def _full_constitution(self) -> Constitution:
        c = Constitution(
            project_name="PersistProject",
            version="2.3.4",
            ratification_date=date(2026, 1, 15),
            last_amended_date=date(2026, 3, 30),
        )
        c.add_principle(Principle(
            name="Library-First",
            description="Every feature starts as a library.",
            enforcement_level=EnforcementLevel.MUST,
            category=PrincipleCategory.ARCHITECTURE,
        ))
        c.add_principle(Principle(
            name="Test-First",
            description="Write tests before code.",
            enforcement_level=EnforcementLevel.MUST,
            category=PrincipleCategory.TESTING,
        ))
        c.add_principle(Principle(
            name="Perf Targets",
            description="Document latency targets.",
            enforcement_level=EnforcementLevel.SHOULD,
            category=PrincipleCategory.PERFORMANCE,
        ))
        return c

    def test_save_creates_file_with_markdown(self, tmp_path):
        """Scenario 1: save() creates a file containing Markdown."""
        c = self._full_constitution()
        path = tmp_path / "constitution.md"
        c.save(path)
        assert path.exists()
        content = path.read_text()
        assert "# PersistProject Constitution" in content

    def test_load_round_trip_preserves_project_name_and_version(self, tmp_path):
        """Scenario 2: load() preserves project_name and version."""
        c = self._full_constitution()
        path = tmp_path / "constitution.md"
        c.save(path)
        loaded = Constitution.load(path)
        assert loaded.project_name == "PersistProject"
        assert loaded.version == "2.3.4"

    def test_load_round_trip_preserves_all_principles(self, tmp_path):
        """Scenario 2 (extended): load() preserves all principles with full fidelity."""
        c = self._full_constitution()
        path = tmp_path / "constitution.md"
        c.save(path)
        loaded = Constitution.load(path)
        assert len(loaded.principles) == len(c.principles)
        names_loaded = [p.name for p in loaded.principles]
        for orig_p in c.principles:
            assert orig_p.name in names_loaded

    def test_load_nonexistent_file_raises_file_not_found(self, tmp_path):
        """Scenario 3: load() raises FileNotFoundError for missing file."""
        with pytest.raises(FileNotFoundError):
            Constitution.load(tmp_path / "ghost.md")

    def test_load_preserves_dates(self, tmp_path):
        """Scenario 4: ratification_date and last_amended_date survive round-trip."""
        c = self._full_constitution()
        path = tmp_path / "constitution.md"
        c.save(path)
        loaded = Constitution.load(path)
        assert loaded.ratification_date == date(2026, 1, 15)
        assert loaded.last_amended_date == date(2026, 3, 30)

    def test_load_preserves_enforcement_levels_and_categories(self, tmp_path):
        """Principle enforcement levels and categories survive round-trip."""
        c = self._full_constitution()
        path = tmp_path / "constitution.md"
        c.save(path)
        loaded = Constitution.load(path)
        arch = next((p for p in loaded.principles if p.name == "Library-First"), None)
        assert arch is not None
        assert arch.enforcement_level == EnforcementLevel.MUST
        assert arch.category == PrincipleCategory.ARCHITECTURE

        perf = next((p for p in loaded.principles if p.name == "Perf Targets"), None)
        assert perf is not None
        assert perf.enforcement_level == EnforcementLevel.SHOULD
        assert perf.category == PrincipleCategory.PERFORMANCE


# ---------------------------------------------------------------------------
# US-7 — Filter Principles by Category
# ---------------------------------------------------------------------------


class TestUS7_FilterByCategory:
    """US-7: As a team lead, I want to filter principles by category."""

    def _populated_constitution(self) -> Constitution:
        c = Constitution(project_name="FilterProject")
        for name, cat in [
            ("T1", PrincipleCategory.TESTING),
            ("S1", PrincipleCategory.SECURITY),
            ("S2", PrincipleCategory.SECURITY),
            ("A1", PrincipleCategory.ARCHITECTURE),
            ("G1", PrincipleCategory.GENERAL),
            ("P1", PrincipleCategory.PERFORMANCE),
        ]:
            c.add_principle(Principle(name=name, description="D", category=cat))
        return c

    def test_filter_security_returns_exactly_two(self):
        """Scenario 1: security filter returns only security principles."""
        c = self._populated_constitution()
        result = c.principles_by_category(PrincipleCategory.SECURITY)
        assert len(result) == 2
        assert all(p.category == PrincipleCategory.SECURITY for p in result)

    def test_filter_empty_category_returns_empty_list(self):
        """Scenario 2: category with no principles returns empty list."""
        c = self._populated_constitution()
        result = c.principles_by_category(PrincipleCategory.WORKFLOW)
        assert result == []

    def test_filter_testing_returns_only_testing(self):
        """Filter testing returns exactly the testing principles."""
        c = self._populated_constitution()
        result = c.principles_by_category(PrincipleCategory.TESTING)
        assert len(result) == 1
        assert result[0].name == "T1"

    def test_filter_preserves_principle_order(self):
        """Principles returned by category maintain insertion order."""
        c = Constitution(project_name="OrderTest")
        c.add_principle(Principle(name="S1", description="D", category=PrincipleCategory.SECURITY))
        c.add_principle(Principle(name="T1", description="D", category=PrincipleCategory.TESTING))
        c.add_principle(Principle(name="S2", description="D", category=PrincipleCategory.SECURITY))
        result = c.principles_by_category(PrincipleCategory.SECURITY)
        assert [p.name for p in result] == ["S1", "S2"]


# ---------------------------------------------------------------------------
# US-8 — Rich Compliance Report
# ---------------------------------------------------------------------------


class TestUS8_ComplianceReport:
    """US-8: As a developer, I want a clear compliance report showing violations."""

    def test_compliant_report_summary_says_compliant(self, tmp_path):
        """Scenario 1: zero violations → summary contains 'compliant'."""
        report = ComplianceReport(artifact_path=tmp_path / "spec.md")
        assert "compliant" in report.summary().lower()

    def test_blocking_violation_summary_has_error_symbol_and_principle_name(self, tmp_path):
        """Scenario 2: MUST violation → summary has ❌ and 'blocking'."""
        report = ComplianceReport(artifact_path=tmp_path / "spec.md")
        report.violations.append(
            ComplianceViolation(
                principle_name="Test-First",
                enforcement_level=EnforcementLevel.MUST,
                message="No test coverage found.",
            )
        )
        summary = report.summary()
        assert "❌" in summary
        assert "blocking" in summary

    def test_warning_violation_summary_has_warning_symbol_and_principle_name(self, tmp_path):
        """Scenario 3: SHOULD violation → summary has ⚠️ and 'warning'; passed=True."""
        report = ComplianceReport(artifact_path=tmp_path / "spec.md")
        report.violations.append(
            ComplianceViolation(
                principle_name="Perf",
                enforcement_level=EnforcementLevel.SHOULD,
                message="No performance mention.",
            )
        )
        assert report.passed
        summary = report.summary()
        assert "⚠️" in summary
        assert "warning" in summary

    def test_is_blocking_property_on_violations(self):
        """ComplianceViolation.is_blocking is True for MUST, False for SHOULD."""
        must_v = ComplianceViolation("P", EnforcementLevel.MUST, "msg")
        should_v = ComplianceViolation("P", EnforcementLevel.SHOULD, "msg")
        may_v = ComplianceViolation("P", EnforcementLevel.MAY, "msg")
        assert must_v.is_blocking is True
        assert should_v.is_blocking is False
        assert may_v.is_blocking is False

    def test_mixed_violations_blocking_takes_precedence(self, tmp_path):
        """Both blocking and warning violations → passed=False."""
        report = ComplianceReport(artifact_path=tmp_path / "spec.md")
        report.violations.append(
            ComplianceViolation("Test-First", EnforcementLevel.MUST, "No tests.")
        )
        report.violations.append(
            ComplianceViolation("Perf", EnforcementLevel.SHOULD, "No perf.")
        )
        assert not report.passed
        assert len(report.blocking_violations) == 1
        assert len(report.warning_violations) == 1
