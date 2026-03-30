"""Integration tests for the SpecForge API — Module 1 (US-6).

These tests exercise the four REST endpoints via an in-process FastAPI
test client, using a temporary directory as the projects root.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from specify_cli.constitution import Constitution, EnforcementLevel, Principle, PrincipleCategory
from specforge_api.main import create_app
from specforge_api.config import Settings


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def projects_root(tmp_path: Path) -> Path:
    """Return a temporary directory used as the projects root."""
    return tmp_path / "projects"


@pytest.fixture()
def client(projects_root: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Return a TestClient backed by a temporary projects root."""
    monkeypatch.setenv("SPECFORGE_PROJECTS_ROOT", str(projects_root))
    app = create_app()
    return TestClient(app)


@pytest.fixture()
def seeded_project(projects_root: Path) -> str:
    """Create a project with a saved constitution; return the project_id."""
    project_id = "alpha"
    c = Constitution.from_template("Alpha Project")
    path = projects_root / project_id / "constitution.md"
    c.save(path)
    return project_id


# ---------------------------------------------------------------------------
# US-6 GET /api/v1/projects/{project_id}/constitution
# ---------------------------------------------------------------------------


class TestGetConstitution:
    """GET /api/v1/projects/{project_id}/constitution"""

    def test_returns_200_with_existing_constitution(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/constitution")
        assert response.status_code == 200
        data = response.json()
        assert data["project_name"] == "Alpha Project"
        assert data["version"] == "1.0.0"
        assert isinstance(data["principles"], list)
        assert len(data["principles"]) > 0

    def test_returns_404_when_constitution_missing(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/nonexistent/constitution")
        assert response.status_code == 404

    def test_response_includes_principle_fields(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/constitution")
        principle = response.json()["principles"][0]
        assert "name" in principle
        assert "description" in principle
        assert "enforcement_level" in principle
        assert "category" in principle


# ---------------------------------------------------------------------------
# US-6 POST /api/v1/projects/{project_id}/constitution
# ---------------------------------------------------------------------------


class TestCreateConstitution:
    """POST /api/v1/projects/{project_id}/constitution"""

    def _create_payload(self) -> dict:
        return {
            "project_name": "NewProject",
            "principles": [
                {
                    "name": "Test-First",
                    "description": "Write tests before code.",
                    "enforcement_level": "MUST",
                    "category": "testing",
                }
            ],
        }

    def test_returns_201_and_creates_file(
        self, client: TestClient, projects_root: Path
    ) -> None:
        response = client.post(
            "/api/v1/projects/beta/constitution", json=self._create_payload()
        )
        assert response.status_code == 201
        assert (projects_root / "beta" / "constitution.md").exists()

    def test_response_body_reflects_saved_data(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/projects/gamma/constitution", json=self._create_payload()
        )
        data = response.json()
        assert data["project_name"] == "NewProject"
        assert len(data["principles"]) == 1
        assert data["principles"][0]["name"] == "Test-First"

    def test_created_constitution_can_be_retrieved(
        self, client: TestClient
    ) -> None:
        client.post("/api/v1/projects/delta/constitution", json=self._create_payload())
        response = client.get("/api/v1/projects/delta/constitution")
        assert response.status_code == 200
        assert response.json()["project_name"] == "NewProject"

    def test_create_with_no_principles(self, client: TestClient) -> None:
        payload = {"project_name": "EmptyProject", "principles": []}
        response = client.post("/api/v1/projects/empty/constitution", json=payload)
        assert response.status_code == 201
        assert response.json()["principles"] == []


# ---------------------------------------------------------------------------
# US-6 POST /api/v1/projects/{project_id}/constitution/check
# ---------------------------------------------------------------------------


class TestComplianceCheck:
    """POST /api/v1/projects/{project_id}/constitution/check"""

    def _seed_constitution(
        self,
        projects_root: Path,
        project_id: str,
        *,
        category: PrincipleCategory = PrincipleCategory.TESTING,
        level: EnforcementLevel = EnforcementLevel.MUST,
    ) -> None:
        c = Constitution(project_name="CheckProject")
        c.add_principle(
            Principle(
                name="Rule",
                description="Rule description",
                enforcement_level=level,
                category=category,
            )
        )
        c.save(projects_root / project_id / "constitution.md")

    def test_returns_200_passing_artifact(
        self, client: TestClient, projects_root: Path, tmp_path: Path
    ) -> None:
        self._seed_constitution(projects_root, "check1")
        artifact = tmp_path / "spec.md"
        artifact.write_text("We need full test coverage and spec validation.\n")
        response = client.post(
            "/api/v1/projects/check1/constitution/check",
            json={"artifact_path": str(artifact)},
        )
        assert response.status_code == 200
        assert response.json()["passed"] is True

    def test_returns_200_failing_artifact_with_violations(
        self, client: TestClient, projects_root: Path, tmp_path: Path
    ) -> None:
        self._seed_constitution(projects_root, "check2")
        artifact = tmp_path / "plan.md"
        artifact.write_text("Deployment pipeline only.\n")
        response = client.post(
            "/api/v1/projects/check2/constitution/check",
            json={"artifact_path": str(artifact)},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["passed"] is False
        assert len(data["blocking_violations"]) == 1

    def test_returns_404_when_constitution_missing(
        self, client: TestClient, tmp_path: Path
    ) -> None:
        artifact = tmp_path / "spec.md"
        artifact.write_text("content")
        response = client.post(
            "/api/v1/projects/noexist/constitution/check",
            json={"artifact_path": str(artifact)},
        )
        assert response.status_code == 404

    def test_should_violation_is_non_blocking(
        self, client: TestClient, projects_root: Path, tmp_path: Path
    ) -> None:
        self._seed_constitution(
            projects_root,
            "check3",
            category=PrincipleCategory.PERFORMANCE,
            level=EnforcementLevel.SHOULD,
        )
        artifact = tmp_path / "spec.md"
        artifact.write_text("Authentication flow with OAuth2 and tokens.\n")
        response = client.post(
            "/api/v1/projects/check3/constitution/check",
            json={"artifact_path": str(artifact)},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["passed"] is True
        assert len(data["warning_violations"]) == 1

    def test_response_includes_summary(
        self, client: TestClient, projects_root: Path, tmp_path: Path
    ) -> None:
        self._seed_constitution(projects_root, "check4")
        artifact = tmp_path / "spec.md"
        artifact.write_text("Test coverage and spec validation.\n")
        response = client.post(
            "/api/v1/projects/check4/constitution/check",
            json={"artifact_path": str(artifact)},
        )
        assert "summary" in response.json()


# ---------------------------------------------------------------------------
# US-6 GET /api/v1/projects/{project_id}/constitution/history
# ---------------------------------------------------------------------------


class TestConstitutionHistory:
    """GET /api/v1/projects/{project_id}/constitution/history"""

    def test_returns_200_with_amendment_records(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(
            f"/api/v1/projects/{seeded_project}/constitution/history"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["project_name"] == "Alpha Project"
        assert isinstance(data["amendments"], list)
        assert len(data["amendments"]) >= 1

    def test_amendment_record_has_version_field(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(
            f"/api/v1/projects/{seeded_project}/constitution/history"
        )
        record = response.json()["amendments"][0]
        assert "version" in record
        assert record["version"] == "1.0.0"

    def test_returns_404_for_missing_constitution(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/ghost/constitution/history")
        assert response.status_code == 404
