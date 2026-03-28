"""
Tests for Module 1 — Constitution Engine (src/specify_cli/constitution.py).

Covers:
  - Principle creation and validation
  - Constitution creation, principle management, and versioning
  - Markdown serialisation / deserialisation round-trip
  - ComplianceGate compliance checking
  - ComplianceReport summary output
  - Constitution.from_template() factory
  - Constitution.save() / Constitution.load() file I/O
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
# Principle tests
# ---------------------------------------------------------------------------


class TestPrinciple:
    def test_basic_creation(self):
        p = Principle(
            name="Test-First",
            description="Write tests before implementation.",
        )
        assert p.name == "Test-First"
        assert p.description == "Write tests before implementation."
        assert p.enforcement_level == EnforcementLevel.MUST
        assert p.category == PrincipleCategory.GENERAL

    def test_explicit_enforcement_and_category(self):
        p = Principle(
            name="Perf",
            description="Latency under 100ms.",
            enforcement_level=EnforcementLevel.SHOULD,
            category=PrincipleCategory.PERFORMANCE,
        )
        assert p.enforcement_level == EnforcementLevel.SHOULD
        assert p.category == PrincipleCategory.PERFORMANCE

    def test_string_coercion_enforcement_level(self):
        p = Principle(name="A", description="B", enforcement_level="should")
        assert p.enforcement_level == EnforcementLevel.SHOULD

    def test_string_coercion_category(self):
        p = Principle(name="A", description="B", category="security")
        assert p.category == PrincipleCategory.SECURITY

    def test_unknown_category_falls_back_to_general(self):
        p = Principle(name="A", description="B", category="nonexistent")
        assert p.category == PrincipleCategory.GENERAL

    def test_empty_name_raises(self):
        with pytest.raises(ValueError, match="name"):
            Principle(name="", description="Some description")

    def test_empty_description_raises(self):
        with pytest.raises(ValueError, match="description"):
            Principle(name="Test", description="")

    def test_to_markdown_contains_name(self):
        p = Principle(name="MyRule", description="Desc.")
        md = p.to_markdown()
        assert "### MyRule" in md
        assert "Desc." in md
        assert "MUST" in md


# ---------------------------------------------------------------------------
# Constitution tests
# ---------------------------------------------------------------------------


class TestConstitution:
    def _make(self, name: str = "MyProject") -> Constitution:
        return Constitution(project_name=name)

    def test_basic_creation(self):
        c = self._make()
        assert c.project_name == "MyProject"
        assert c.version == "1.0.0"
        assert c.principles == []

    def test_empty_project_name_raises(self):
        with pytest.raises(ValueError, match="project_name"):
            Constitution(project_name="")

    def test_invalid_semver_raises(self):
        with pytest.raises(ValueError):
            Constitution(project_name="X", version="not-semver")

    def test_add_principle(self):
        c = self._make()
        p = Principle(name="Rule1", description="Desc")
        c.add_principle(p)
        assert len(c.principles) == 1
        assert c.principles[0].name == "Rule1"

    def test_remove_principle_existing(self):
        c = self._make()
        c.add_principle(Principle(name="Rule1", description="D"))
        removed = c.remove_principle("Rule1")
        assert removed is True
        assert len(c.principles) == 0

    def test_remove_principle_nonexistent(self):
        c = self._make()
        removed = c.remove_principle("Nonexistent")
        assert removed is False

    def test_get_principle_found(self):
        c = self._make()
        c.add_principle(Principle(name="Rule1", description="D"))
        found = c.get_principle("Rule1")
        assert found is not None
        assert found.name == "Rule1"

    def test_get_principle_not_found(self):
        c = self._make()
        assert c.get_principle("Missing") is None

    def test_principles_by_category(self):
        c = self._make()
        c.add_principle(Principle(name="T1", description="D", category=PrincipleCategory.TESTING))
        c.add_principle(Principle(name="S1", description="D", category=PrincipleCategory.SECURITY))
        testing = c.principles_by_category(PrincipleCategory.TESTING)
        assert len(testing) == 1
        assert testing[0].name == "T1"

    def test_must_principles_filtered(self):
        c = self._make()
        c.add_principle(Principle(name="M1", description="D", enforcement_level=EnforcementLevel.MUST))
        c.add_principle(Principle(name="S1", description="D", enforcement_level=EnforcementLevel.SHOULD))
        musts = c.must_principles()
        assert len(musts) == 1
        assert musts[0].name == "M1"

    # ------------------------------------------------------------------
    # Versioning
    # ------------------------------------------------------------------

    def test_bump_patch(self):
        c = self._make()
        c.bump_version("patch")
        assert c.version == "1.0.1"
        assert c.last_amended_date == date.today()

    def test_bump_minor(self):
        c = self._make()
        c.bump_version("minor")
        assert c.version == "1.1.0"

    def test_bump_major(self):
        c = self._make()
        c.bump_version("major")
        assert c.version == "2.0.0"

    def test_bump_invalid_raises(self):
        c = self._make()
        with pytest.raises(ValueError, match="Invalid bump type"):
            c.bump_version("hotfix")

    # ------------------------------------------------------------------
    # Markdown serialisation
    # ------------------------------------------------------------------

    def test_to_markdown_contains_project_name(self):
        c = self._make("AwesomeApp")
        md = c.to_markdown()
        assert "# AwesomeApp Constitution" in md

    def test_to_markdown_contains_version(self):
        c = self._make()
        md = c.to_markdown()
        assert "**Version**: 1.0.0" in md

    def test_to_markdown_contains_principles(self):
        c = self._make()
        c.add_principle(Principle(name="Principle X", description="Desc X."))
        md = c.to_markdown()
        assert "### Principle X" in md
        assert "Desc X." in md

    # ------------------------------------------------------------------
    # Round-trip load/save
    # ------------------------------------------------------------------

    def test_round_trip(self, tmp_path):
        c = Constitution(
            project_name="RoundTrip",
            version="2.3.4",
            ratification_date=date(2026, 1, 1),
            last_amended_date=date(2026, 3, 27),
        )
        c.add_principle(
            Principle(
                name="Library-First",
                description="Every feature starts as a library.",
                enforcement_level=EnforcementLevel.MUST,
                category=PrincipleCategory.ARCHITECTURE,
            )
        )
        path = tmp_path / "constitution.md"
        c.save(path)

        loaded = Constitution.load(path)
        assert loaded.project_name == "RoundTrip"
        assert loaded.version == "2.3.4"
        assert loaded.ratification_date == date(2026, 1, 1)
        assert loaded.last_amended_date == date(2026, 3, 27)
        assert len(loaded.principles) == 1
        assert loaded.principles[0].name == "Library-First"
        assert loaded.principles[0].enforcement_level == EnforcementLevel.MUST
        assert loaded.principles[0].category == PrincipleCategory.ARCHITECTURE

    def test_load_missing_file_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            Constitution.load(tmp_path / "nonexistent.md")

    # ------------------------------------------------------------------
    # from_template factory
    # ------------------------------------------------------------------

    def test_from_template_has_principles(self):
        c = Constitution.from_template("Demo")
        assert len(c.principles) > 0

    def test_from_template_categories_covered(self):
        c = Constitution.from_template("Demo")
        categories = {p.category for p in c.principles}
        # Template should cover at least architecture, testing, security
        assert PrincipleCategory.ARCHITECTURE in categories
        assert PrincipleCategory.TESTING in categories
        assert PrincipleCategory.SECURITY in categories


# ---------------------------------------------------------------------------
# ComplianceGate tests
# ---------------------------------------------------------------------------


class TestComplianceGate:
    def _make_gate(self, category: PrincipleCategory = PrincipleCategory.TESTING) -> ComplianceGate:
        constitution = Constitution(project_name="TestProject")
        constitution.add_principle(
            Principle(
                name="Test-First",
                description="TDD mandatory.",
                enforcement_level=EnforcementLevel.MUST,
                category=category,
            )
        )
        return ComplianceGate(constitution)

    def test_passes_when_artifact_mentions_test_keyword(self, tmp_path):
        artifact = tmp_path / "spec.md"
        artifact.write_text("This spec includes test coverage requirements.\n")
        gate = self._make_gate(PrincipleCategory.TESTING)
        report = gate.check(artifact)
        assert report.passed

    def test_fails_when_testing_artifact_has_no_test_keywords(self, tmp_path):
        artifact = tmp_path / "no_tests.md"
        artifact.write_text("This document only discusses deployment pipelines and CI/CD.\n")
        gate = self._make_gate(PrincipleCategory.TESTING)
        report = gate.check(artifact)
        # A MUST violation means blocking and report.passed == False
        assert not report.passed
        assert len(report.blocking_violations) == 1

    def test_missing_file_produces_blocking_violation(self, tmp_path):
        gate = self._make_gate()
        report = gate.check(tmp_path / "does_not_exist.md")
        assert not report.passed
        assert report.blocking_violations[0].principle_name == "(file-exists)"

    def test_should_violation_is_non_blocking(self, tmp_path):
        artifact = tmp_path / "plan.md"
        artifact.write_text("A plan focused on authentication and authorization flows.\n")
        constitution = Constitution(project_name="P")
        constitution.add_principle(
            Principle(
                name="Perf",
                description="Performance matters.",
                enforcement_level=EnforcementLevel.SHOULD,
                category=PrincipleCategory.PERFORMANCE,
            )
        )
        gate = ComplianceGate(constitution)
        report = gate.check(artifact)
        assert report.passed  # SHOULD violation is non-blocking
        assert len(report.warning_violations) == 1

    def test_general_category_has_no_heuristic(self, tmp_path):
        artifact = tmp_path / "spec.md"
        artifact.write_text("Some content.\n")
        constitution = Constitution(project_name="G")
        constitution.add_principle(
            Principle(
                name="General Rule",
                description="Be good.",
                enforcement_level=EnforcementLevel.MUST,
                category=PrincipleCategory.GENERAL,
            )
        )
        gate = ComplianceGate(constitution)
        report = gate.check(artifact)
        # General category has no signal keywords — should not produce violations
        assert report.passed
        assert report.violations == []

    def test_security_keywords_detected(self, tmp_path):
        artifact = tmp_path / "plan.md"
        artifact.write_text("All endpoints require auth and input validation.\n")
        constitution = Constitution(project_name="Sec")
        constitution.add_principle(
            Principle(
                name="Security Gate",
                description="Security first.",
                enforcement_level=EnforcementLevel.MUST,
                category=PrincipleCategory.SECURITY,
            )
        )
        gate = ComplianceGate(constitution)
        report = gate.check(artifact)
        assert report.passed


# ---------------------------------------------------------------------------
# ComplianceReport tests
# ---------------------------------------------------------------------------


class TestComplianceReport:
    def test_summary_compliant(self, tmp_path):
        artifact = tmp_path / "spec.md"
        artifact.write_text("content")
        report = ComplianceReport(artifact_path=artifact)
        assert "compliant" in report.summary()

    def test_summary_blocking_violation(self, tmp_path):
        artifact = tmp_path / "spec.md"
        report = ComplianceReport(artifact_path=artifact)
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

    def test_summary_warnings_only(self, tmp_path):
        artifact = tmp_path / "spec.md"
        report = ComplianceReport(artifact_path=artifact)
        report.violations.append(
            ComplianceViolation(
                principle_name="Perf",
                enforcement_level=EnforcementLevel.SHOULD,
                message="No performance mention.",
            )
        )
        summary = report.summary()
        assert "⚠️" in summary
        assert "warning" in summary

    def test_is_blocking_property(self):
        must_v = ComplianceViolation("P", EnforcementLevel.MUST, "msg")
        should_v = ComplianceViolation("P", EnforcementLevel.SHOULD, "msg")
        assert must_v.is_blocking is True
        assert should_v.is_blocking is False
