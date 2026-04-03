"""Integration tests for the SpecForge API — Module 7 (Quality Guardian).

These tests exercise all ten REST endpoints via an in-process FastAPI test
client, using a temporary directory as the projects root.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from specify_cli.quality import (
    AnalysisFinding,
    AnalysisReport,
    Checklist,
    ChecklistItem,
    ChecklistItemStatus,
    SeverityLevel,
    TestCase,
    TestCaseType,
    TestSuite,
)
from specforge_api.routers import quality as quality_router


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def projects_root(tmp_path: Path) -> Path:
    return tmp_path / "projects"


@pytest.fixture()
def client(projects_root: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("SPECFORGE_PROJECTS_ROOT", str(projects_root))
    app = FastAPI()
    app.include_router(quality_router.router, prefix="/api/v1")
    return TestClient(app)


@pytest.fixture()
def seeded_checklist(projects_root: Path) -> tuple[str, str, str]:
    """Create a project with a saved checklist; return (project_id, checklist_id, pending_item_id)."""
    project_id = "proj-alpha"
    checklist = Checklist(
        project_id=project_id,
        name="Acceptance Quality Checklist",
        created_at="2026-04-01T09:00:00Z",
        spec_id="spec-1",
    )
    item1 = ChecklistItem(
        checklist_id=checklist.checklist_id,
        category="Functionality",
        description="All acceptance scenarios pass",
        status=ChecklistItemStatus.PENDING,
    )
    item2 = ChecklistItem(
        checklist_id=checklist.checklist_id,
        category="Performance",
        description="Response time under 200ms",
        status=ChecklistItemStatus.PASS,
    )
    item3 = ChecklistItem(
        checklist_id=checklist.checklist_id,
        category="Security",
        description="No sensitive data in logs",
        status=ChecklistItemStatus.PENDING,
    )
    checklist.add_item(item1)
    checklist.add_item(item2)
    checklist.add_item(item3)

    path = (
        projects_root / project_id / "quality" / "checklists" / f"{checklist.checklist_id}.yaml"
    )
    checklist.save(path)
    return project_id, checklist.checklist_id, item1.item_id


@pytest.fixture()
def seeded_suite(projects_root: Path) -> tuple[str, str]:
    """Create a project with a saved test suite; return (project_id, suite_id)."""
    project_id = "proj-alpha"
    suite = TestSuite(
        project_id=project_id,
        feature="User Authentication",
        generated_at="2026-04-01T10:00:00Z",
        spec_id="spec-1",
    )
    case1 = TestCase(
        suite_id=suite.suite_id,
        title="Login with valid credentials",
        case_type=TestCaseType.E2E,
        scenario="Given a registered user, when they submit valid credentials",
        expected="User is redirected to the dashboard",
        tags=["auth", "happy-path"],
    )
    case2 = TestCase(
        suite_id=suite.suite_id,
        title="Login with invalid password",
        case_type=TestCaseType.INTEGRATION,
        scenario="Given a registered user, when they submit a wrong password",
        expected="An error message is displayed",
        tags=["auth", "negative"],
    )
    suite.add_case(case1)
    suite.add_case(case2)

    path = (
        projects_root / project_id / "quality" / "test-suites" / f"{suite.suite_id}.yaml"
    )
    suite.save(path)
    return project_id, suite.suite_id


@pytest.fixture()
def seeded_report(projects_root: Path) -> tuple[str, str]:
    """Create a project with a saved analysis report; return (project_id, report_id)."""
    project_id = "proj-alpha"
    report = AnalysisReport(
        project_id=project_id,
        analyzed_at="2026-04-01T11:00:00Z",
        spec_id="spec-1",
        plan_id="plan-1",
    )
    finding1 = AnalysisFinding(
        report_id=report.report_id,
        severity=SeverityLevel.HIGH,
        category="spec-vs-plan",
        description="Feature X described in spec has no corresponding plan component.",
        recommendation="Add a plan component for Feature X.",
    )
    finding2 = AnalysisFinding(
        report_id=report.report_id,
        severity=SeverityLevel.LOW,
        category="plan-vs-tasks",
        description="Minor naming inconsistency between plan and task list.",
        recommendation="Align naming conventions.",
    )
    report.add_finding(finding1)
    report.add_finding(finding2)

    path = projects_root / project_id / "quality" / "reports" / f"{report.report_id}.yaml"
    report.save(path)
    return project_id, report.report_id


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/quality/checklists
# ---------------------------------------------------------------------------


class TestListChecklists:
    def test_returns_empty_list_for_new_project(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/brand-new/quality/checklists")
        assert resp.status_code == 200
        data = resp.json()
        assert data["project_id"] == "brand-new"
        assert data["checklists"] == []

    def test_returns_existing_checklists(
        self, client: TestClient, seeded_checklist: tuple[str, str, str]
    ) -> None:
        project_id, _, _ = seeded_checklist
        resp = client.get(f"/api/v1/projects/{project_id}/quality/checklists")
        assert resp.status_code == 200
        assert len(resp.json()["checklists"]) == 1

    def test_response_has_project_id_and_checklists_key(
        self, client: TestClient, seeded_checklist: tuple[str, str, str]
    ) -> None:
        project_id, _, _ = seeded_checklist
        resp = client.get(f"/api/v1/projects/{project_id}/quality/checklists")
        data = resp.json()
        assert data["project_id"] == project_id
        assert data["checklists"][0]["name"] == "Acceptance Quality Checklist"


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/quality/checklists
# ---------------------------------------------------------------------------


class TestCreateChecklist:
    def test_creates_checklist_returns_201(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-new/quality/checklists",
            json={
                "name": "Security Checklist",
                "created_at": "2026-04-03T12:00:00Z",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Security Checklist"
        assert "checklist_id" in data

    def test_created_checklist_has_empty_items_by_default(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-new/quality/checklists",
            json={"name": "Empty Checklist", "created_at": "2026-04-03T12:00:00Z"},
        )
        assert resp.status_code == 201
        assert resp.json()["items"] == []

    def test_created_checklist_persisted_on_disk(
        self, client: TestClient, projects_root: Path
    ) -> None:
        resp = client.post(
            "/api/v1/projects/proj-persist/quality/checklists",
            json={"name": "Persistence Test", "created_at": "2026-04-03T12:00:00Z"},
        )
        checklist_id = resp.json()["checklist_id"]
        path = (
            projects_root
            / "proj-persist"
            / "quality"
            / "checklists"
            / f"{checklist_id}.yaml"
        )
        assert path.exists()

    def test_create_with_optional_spec_id_and_inline_items(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-linked/quality/checklists",
            json={
                "name": "Linked Checklist",
                "created_at": "2026-04-03T12:00:00Z",
                "spec_id": "spec-42",
                "items": [
                    {"category": "Functionality", "description": "All tests pass"},
                    {"category": "Security", "description": "No XSS vulnerabilities"},
                ],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["spec_id"] == "spec-42"
        assert len(data["items"]) == 2
        assert data["items"][0]["status"] == "pending"


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/quality/checklists/{checklist_id}
# ---------------------------------------------------------------------------


class TestGetChecklist:
    def test_returns_checklist_by_id(
        self, client: TestClient, seeded_checklist: tuple[str, str, str]
    ) -> None:
        project_id, checklist_id, _ = seeded_checklist
        resp = client.get(f"/api/v1/projects/{project_id}/quality/checklists/{checklist_id}")
        assert resp.status_code == 200
        assert resp.json()["checklist_id"] == checklist_id

    def test_returns_404_for_missing_checklist(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/proj-x/quality/checklists/no-such")
        assert resp.status_code == 404

    def test_response_includes_items(
        self, client: TestClient, seeded_checklist: tuple[str, str, str]
    ) -> None:
        project_id, checklist_id, _ = seeded_checklist
        resp = client.get(f"/api/v1/projects/{project_id}/quality/checklists/{checklist_id}")
        assert len(resp.json()["items"]) == 3

    def test_response_includes_name_and_project_id(
        self, client: TestClient, seeded_checklist: tuple[str, str, str]
    ) -> None:
        project_id, checklist_id, _ = seeded_checklist
        resp = client.get(f"/api/v1/projects/{project_id}/quality/checklists/{checklist_id}")
        data = resp.json()
        assert data["name"] == "Acceptance Quality Checklist"
        assert data["project_id"] == project_id


# ---------------------------------------------------------------------------
# PUT /api/v1/projects/{project_id}/quality/checklists/{checklist_id}/items/{item_id}
# ---------------------------------------------------------------------------


class TestUpdateChecklistItem:
    def test_updates_item_status_to_pass(
        self, client: TestClient, seeded_checklist: tuple[str, str, str]
    ) -> None:
        project_id, checklist_id, item_id = seeded_checklist
        resp = client.put(
            f"/api/v1/projects/{project_id}/quality/checklists/{checklist_id}/items/{item_id}",
            json={"status": "pass"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "pass"

    def test_updates_item_status_to_fail(
        self, client: TestClient, seeded_checklist: tuple[str, str, str]
    ) -> None:
        project_id, checklist_id, item_id = seeded_checklist
        resp = client.put(
            f"/api/v1/projects/{project_id}/quality/checklists/{checklist_id}/items/{item_id}",
            json={"status": "fail", "notes": "Feature broken in edge case."},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "fail"
        assert data["notes"] == "Feature broken in edge case."

    def test_updates_item_status_to_skip(
        self, client: TestClient, seeded_checklist: tuple[str, str, str]
    ) -> None:
        project_id, checklist_id, item_id = seeded_checklist
        resp = client.put(
            f"/api/v1/projects/{project_id}/quality/checklists/{checklist_id}/items/{item_id}",
            json={"status": "skip"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "skip"

    def test_returns_422_for_invalid_status(
        self, client: TestClient, seeded_checklist: tuple[str, str, str]
    ) -> None:
        project_id, checklist_id, item_id = seeded_checklist
        resp = client.put(
            f"/api/v1/projects/{project_id}/quality/checklists/{checklist_id}/items/{item_id}",
            json={"status": "bad-status"},
        )
        assert resp.status_code == 422

    def test_returns_404_for_missing_item(
        self, client: TestClient, seeded_checklist: tuple[str, str, str]
    ) -> None:
        project_id, checklist_id, _ = seeded_checklist
        resp = client.put(
            f"/api/v1/projects/{project_id}/quality/checklists/{checklist_id}/items/no-such",
            json={"status": "pass"},
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/v1/projects/{project_id}/quality/checklists/{checklist_id}
# ---------------------------------------------------------------------------


class TestDeleteChecklist:
    def test_delete_returns_204(
        self, client: TestClient, seeded_checklist: tuple[str, str, str]
    ) -> None:
        project_id, checklist_id, _ = seeded_checklist
        resp = client.delete(
            f"/api/v1/projects/{project_id}/quality/checklists/{checklist_id}"
        )
        assert resp.status_code == 204

    def test_deleted_checklist_returns_404(
        self, client: TestClient, seeded_checklist: tuple[str, str, str]
    ) -> None:
        project_id, checklist_id, _ = seeded_checklist
        client.delete(f"/api/v1/projects/{project_id}/quality/checklists/{checklist_id}")
        resp = client.get(f"/api/v1/projects/{project_id}/quality/checklists/{checklist_id}")
        assert resp.status_code == 404

    def test_delete_missing_returns_404(self, client: TestClient) -> None:
        resp = client.delete("/api/v1/projects/proj-x/quality/checklists/no-such")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/quality/test-suites
# ---------------------------------------------------------------------------


class TestListTestSuites:
    def test_returns_empty_list_for_new_project(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/brand-new/quality/test-suites")
        assert resp.status_code == 200
        data = resp.json()
        assert data["project_id"] == "brand-new"
        assert data["suites"] == []

    def test_returns_existing_suites(
        self, client: TestClient, seeded_suite: tuple[str, str]
    ) -> None:
        project_id, _ = seeded_suite
        resp = client.get(f"/api/v1/projects/{project_id}/quality/test-suites")
        assert resp.status_code == 200
        assert len(resp.json()["suites"]) == 1

    def test_response_has_project_id_and_suites_key(
        self, client: TestClient, seeded_suite: tuple[str, str]
    ) -> None:
        project_id, _ = seeded_suite
        resp = client.get(f"/api/v1/projects/{project_id}/quality/test-suites")
        data = resp.json()
        assert data["project_id"] == project_id
        assert data["suites"][0]["feature"] == "User Authentication"


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/quality/test-suites
# ---------------------------------------------------------------------------


class TestCreateTestSuite:
    def test_creates_suite_returns_201(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-new/quality/test-suites",
            json={
                "feature": "Payment Processing",
                "generated_at": "2026-04-03T12:00:00Z",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["feature"] == "Payment Processing"
        assert "suite_id" in data

    def test_created_suite_persisted_on_disk(
        self, client: TestClient, projects_root: Path
    ) -> None:
        resp = client.post(
            "/api/v1/projects/proj-persist/quality/test-suites",
            json={"feature": "Search", "generated_at": "2026-04-03T12:00:00Z"},
        )
        suite_id = resp.json()["suite_id"]
        path = (
            projects_root
            / "proj-persist"
            / "quality"
            / "test-suites"
            / f"{suite_id}.yaml"
        )
        assert path.exists()

    def test_create_with_optional_spec_id(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-linked/quality/test-suites",
            json={
                "feature": "Notifications",
                "generated_at": "2026-04-03T12:00:00Z",
                "spec_id": "spec-99",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["spec_id"] == "spec-99"

    def test_response_includes_cases(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-cases/quality/test-suites",
            json={
                "feature": "Login",
                "generated_at": "2026-04-03T12:00:00Z",
                "cases": [
                    {
                        "title": "Successful login",
                        "case_type": "e2e",
                        "scenario": "Given valid credentials",
                        "expected": "Dashboard shown",
                        "tags": ["auth"],
                    }
                ],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["cases"]) == 1
        assert data["cases"][0]["case_type"] == "e2e"
        assert data["cases"][0]["tags"] == ["auth"]


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/quality/test-suites/{suite_id}
# ---------------------------------------------------------------------------


class TestGetTestSuite:
    def test_returns_suite_by_id(
        self, client: TestClient, seeded_suite: tuple[str, str]
    ) -> None:
        project_id, suite_id = seeded_suite
        resp = client.get(f"/api/v1/projects/{project_id}/quality/test-suites/{suite_id}")
        assert resp.status_code == 200
        assert resp.json()["suite_id"] == suite_id

    def test_returns_404_for_missing_suite(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/proj-x/quality/test-suites/no-such")
        assert resp.status_code == 404

    def test_response_includes_cases(
        self, client: TestClient, seeded_suite: tuple[str, str]
    ) -> None:
        project_id, suite_id = seeded_suite
        resp = client.get(f"/api/v1/projects/{project_id}/quality/test-suites/{suite_id}")
        assert len(resp.json()["cases"]) == 2

    def test_response_includes_feature(
        self, client: TestClient, seeded_suite: tuple[str, str]
    ) -> None:
        project_id, suite_id = seeded_suite
        resp = client.get(f"/api/v1/projects/{project_id}/quality/test-suites/{suite_id}")
        assert resp.json()["feature"] == "User Authentication"


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/quality/reports
# ---------------------------------------------------------------------------


class TestListReports:
    def test_returns_empty_list_for_new_project(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/brand-new/quality/reports")
        assert resp.status_code == 200
        data = resp.json()
        assert data["project_id"] == "brand-new"
        assert data["reports"] == []

    def test_returns_existing_reports(
        self, client: TestClient, seeded_report: tuple[str, str]
    ) -> None:
        project_id, _ = seeded_report
        resp = client.get(f"/api/v1/projects/{project_id}/quality/reports")
        assert resp.status_code == 200
        assert len(resp.json()["reports"]) == 1

    def test_response_has_project_id_and_reports_key(
        self, client: TestClient, seeded_report: tuple[str, str]
    ) -> None:
        project_id, _ = seeded_report
        resp = client.get(f"/api/v1/projects/{project_id}/quality/reports")
        data = resp.json()
        assert data["project_id"] == project_id
        assert data["reports"][0]["analyzed_at"] == "2026-04-01T11:00:00Z"


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/quality/reports
# ---------------------------------------------------------------------------


class TestCreateReport:
    def test_creates_report_returns_201(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-new/quality/reports",
            json={"analyzed_at": "2026-04-03T12:00:00Z"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["analyzed_at"] == "2026-04-03T12:00:00Z"
        assert "report_id" in data

    def test_created_report_has_findings(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-findings/quality/reports",
            json={
                "analyzed_at": "2026-04-03T12:00:00Z",
                "findings": [
                    {
                        "severity": "critical",
                        "category": "spec-vs-code",
                        "description": "Endpoint missing from implementation.",
                        "recommendation": "Implement the missing endpoint.",
                    },
                    {
                        "severity": "info",
                        "category": "plan-vs-tasks",
                        "description": "Minor label difference.",
                    },
                ],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["findings"]) == 2
        assert data["findings"][0]["severity"] == "critical"
        assert data["findings"][1]["severity"] == "info"

    def test_created_report_persisted_on_disk(
        self, client: TestClient, projects_root: Path
    ) -> None:
        resp = client.post(
            "/api/v1/projects/proj-persist/quality/reports",
            json={"analyzed_at": "2026-04-03T12:00:00Z"},
        )
        report_id = resp.json()["report_id"]
        path = projects_root / "proj-persist" / "quality" / "reports" / f"{report_id}.yaml"
        assert path.exists()

    def test_create_with_optional_spec_and_plan_ids(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-linked/quality/reports",
            json={
                "analyzed_at": "2026-04-03T12:00:00Z",
                "spec_id": "spec-7",
                "plan_id": "plan-3",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["spec_id"] == "spec-7"
        assert data["plan_id"] == "plan-3"

    def test_returns_422_for_invalid_finding_severity(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-bad/quality/reports",
            json={
                "analyzed_at": "2026-04-03T12:00:00Z",
                "findings": [
                    {
                        "severity": "ultra-critical",
                        "category": "spec-vs-plan",
                        "description": "Something bad.",
                    }
                ],
            },
        )
        assert resp.status_code == 422

    def test_report_findings_have_finding_id_and_report_id(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-ids/quality/reports",
            json={
                "analyzed_at": "2026-04-03T12:00:00Z",
                "findings": [
                    {
                        "severity": "medium",
                        "category": "spec-vs-plan",
                        "description": "Gap detected.",
                    }
                ],
            },
        )
        assert resp.status_code == 201
        finding = resp.json()["findings"][0]
        assert "finding_id" in finding
        assert finding["report_id"] == resp.json()["report_id"]

    def test_created_report_finding_persisted_via_reload(
        self, client: TestClient, seeded_report: tuple[str, str]
    ) -> None:
        project_id, _ = seeded_report
        resp = client.get(f"/api/v1/projects/{project_id}/quality/reports")
        report = resp.json()["reports"][0]
        assert len(report["findings"]) == 2
        severities = {f["severity"] for f in report["findings"]}
        assert "high" in severities
        assert "low" in severities
