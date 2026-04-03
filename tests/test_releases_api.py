"""Integration tests for the SpecForge API — Module 5 (Release Manager).

These tests exercise all ten REST endpoints via an in-process FastAPI test
client, using a temporary directory as the projects root.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from specify_cli.releases import (
    ChangeEntry,
    ChangeType,
    Release,
    ReleaseLog,
    ReleaseStatus,
)
from specforge_api.main import create_app


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def projects_root(tmp_path: Path) -> Path:
    return tmp_path / "projects"


@pytest.fixture()
def client(projects_root: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("SPECFORGE_PROJECTS_ROOT", str(projects_root))
    app = create_app()
    return TestClient(app)


@pytest.fixture()
def seeded_project(projects_root: Path) -> str:
    """Create a project with a saved release log; return the project_id."""
    project_id = "alpha"
    log = ReleaseLog(project_name="Alpha Project")

    v1 = Release(
        version="1.0.0",
        title="Initial Release",
        date="2026-01-01",
        status=ReleaseStatus.PUBLISHED,
        task_list_id="tasks-1",
        notes="First stable release.",
    )
    v1.add_change(ChangeEntry(ChangeType.FEAT, "Add Constitution Engine", story_id="US-1"))
    v1.add_change(ChangeEntry(ChangeType.FEAT, "Add Specification Studio", story_id="US-2"))
    v1.add_change(ChangeEntry(ChangeType.FIX, "Fix YAML persistence bug", task_id="fix-001"))

    v2 = Release(
        version="2.0.0",
        title="Architecture Planner",
        date="2026-03-01",
        status=ReleaseStatus.DRAFT,
    )
    v2.add_change(ChangeEntry(ChangeType.FEAT, "Add Architecture Planner module"))
    v2.add_change(ChangeEntry(ChangeType.BREAKING, "Rename spec endpoint"))

    log.add_release(v1)
    log.add_release(v2)

    path = projects_root / project_id / "releases.yaml"
    log.save(path)
    return project_id


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/releases
# ---------------------------------------------------------------------------


class TestGetReleaseLog:
    def test_returns_200_with_existing_log(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases")
        assert resp.status_code == 200
        data = resp.json()
        assert data["project_name"] == "Alpha Project"
        assert len(data["releases"]) == 2

    def test_returns_404_for_missing_project(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/nonexistent/releases")
        assert resp.status_code == 404

    def test_response_contains_release_versions(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases")
        versions = [r["version"] for r in resp.json()["releases"]]
        assert "1.0.0" in versions
        assert "2.0.0" in versions

    def test_response_includes_changes(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases")
        v1 = next(r for r in resp.json()["releases"] if r["version"] == "1.0.0")
        assert len(v1["changes"]) == 3


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/releases
# ---------------------------------------------------------------------------


class TestCreateReleaseLog:
    def test_creates_empty_log(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/beta/releases",
            json={"project_name": "Beta Project"},
        )
        assert resp.status_code == 201
        assert resp.json()["project_name"] == "Beta Project"
        assert resp.json()["releases"] == []

    def test_creates_log_with_releases(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/gamma/releases",
            json={
                "project_name": "Gamma",
                "releases": [
                    {
                        "version": "0.1.0",
                        "title": "Alpha",
                        "date": "2026-02-01",
                        "status": "draft",
                        "changes": [],
                    }
                ],
            },
        )
        assert resp.status_code == 201
        assert len(resp.json()["releases"]) == 1

    def test_rejects_duplicate_version(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/dup/releases",
            json={
                "project_name": "Dup",
                "releases": [
                    {"version": "1.0.0", "changes": []},
                    {"version": "1.0.0", "changes": []},
                ],
            },
        )
        assert resp.status_code == 422

    def test_creates_log_persistently(
        self, client: TestClient, projects_root: Path
    ) -> None:
        client.post(
            "/api/v1/projects/persist/releases",
            json={"project_name": "Persist"},
        )
        assert (projects_root / "persist" / "releases.yaml").exists()


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/releases/changelog
# ---------------------------------------------------------------------------


class TestGetChangelog:
    def test_returns_markdown(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases/changelog")
        assert resp.status_code == 200
        md = resp.json()["markdown"]
        assert "Alpha Project" in md
        assert "1.0.0" in md
        assert "2.0.0" in md

    def test_contains_change_types(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases/changelog")
        md = resp.json()["markdown"]
        assert "Features" in md
        assert "Breaking Changes" in md

    def test_returns_404_for_missing_project(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/nonexistent/releases/changelog")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/releases/summary
# ---------------------------------------------------------------------------


class TestGetSummary:
    def test_returns_summary(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_releases"] == 2
        assert data["total_changes"] == 5

    def test_by_status_counts(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases/summary")
        by_status = resp.json()["by_status"]
        assert by_status["published"] == 1
        assert by_status["draft"] == 1
        assert by_status["yanked"] == 0

    def test_by_change_type_counts(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases/summary")
        by_type = resp.json()["by_change_type"]
        assert by_type["feat"] == 3
        assert by_type["fix"] == 1
        assert by_type["breaking"] == 1

    def test_returns_404_for_missing_project(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/nonexistent/releases/summary")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/releases/{version}
# ---------------------------------------------------------------------------


class TestGetRelease:
    def test_returns_existing_release(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases/1.0.0")
        assert resp.status_code == 200
        data = resp.json()
        assert data["version"] == "1.0.0"
        assert data["status"] == "published"

    def test_returns_404_for_unknown_version(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases/99.0.0")
        assert resp.status_code == 404

    def test_returns_404_for_missing_project(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/nonexistent/releases/1.0.0")
        assert resp.status_code == 404

    def test_release_includes_changes(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases/1.0.0")
        changes = resp.json()["changes"]
        assert len(changes) == 3
        types = {c["change_type"] for c in changes}
        assert "feat" in types
        assert "fix" in types


# ---------------------------------------------------------------------------
# PUT /api/v1/projects/{project_id}/releases/{version}
# ---------------------------------------------------------------------------


class TestUpdateRelease:
    def test_updates_title(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.put(
            f"/api/v1/projects/{seeded_project}/releases/2.0.0",
            json={"title": "Updated Title"},
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"

    def test_updates_notes(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.put(
            f"/api/v1/projects/{seeded_project}/releases/1.0.0",
            json={"notes": "Updated release notes."},
        )
        assert resp.status_code == 200
        assert resp.json()["notes"] == "Updated release notes."

    def test_partial_update_preserves_other_fields(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.put(
            f"/api/v1/projects/{seeded_project}/releases/1.0.0",
            json={"title": "New Title"},
        )
        assert resp.json()["date"] == "2026-01-01"
        assert resp.json()["status"] == "published"

    def test_returns_404_for_unknown_version(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.put(
            f"/api/v1/projects/{seeded_project}/releases/99.0.0",
            json={"title": "X"},
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/v1/projects/{project_id}/releases/{version}
# ---------------------------------------------------------------------------


class TestDeleteRelease:
    def test_deletes_existing_release(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.delete(f"/api/v1/projects/{seeded_project}/releases/2.0.0")
        assert resp.status_code == 204

    def test_release_no_longer_returned(
        self, client: TestClient, seeded_project: str
    ) -> None:
        client.delete(f"/api/v1/projects/{seeded_project}/releases/2.0.0")
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases/2.0.0")
        assert resp.status_code == 404

    def test_returns_404_for_unknown_version(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.delete(f"/api/v1/projects/{seeded_project}/releases/99.0.0")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/v1/projects/{project_id}/releases/{version}/status
# ---------------------------------------------------------------------------


class TestUpdateReleaseStatus:
    def test_publishes_draft_release(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.put(
            f"/api/v1/projects/{seeded_project}/releases/2.0.0/status",
            json={"status": "published"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "published"

    def test_yanks_published_release(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.put(
            f"/api/v1/projects/{seeded_project}/releases/1.0.0/status",
            json={"status": "yanked"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "yanked"

    def test_rejects_invalid_status(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.put(
            f"/api/v1/projects/{seeded_project}/releases/1.0.0/status",
            json={"status": "invalid"},
        )
        assert resp.status_code == 422

    def test_returns_404_for_unknown_version(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.put(
            f"/api/v1/projects/{seeded_project}/releases/99.0.0/status",
            json={"status": "published"},
        )
        assert resp.status_code == 404

    def test_status_persists_after_reload(
        self, client: TestClient, seeded_project: str
    ) -> None:
        client.put(
            f"/api/v1/projects/{seeded_project}/releases/2.0.0/status",
            json={"status": "published"},
        )
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases/2.0.0")
        assert resp.json()["status"] == "published"


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/releases/{version}/changes
# ---------------------------------------------------------------------------


class TestAddChangeEntry:
    def test_adds_feat_change(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.post(
            f"/api/v1/projects/{seeded_project}/releases/2.0.0/changes",
            json={"change_type": "feat", "description": "Add new feature"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["change_type"] == "feat"
        assert data["description"] == "Add new feature"
        assert "change_id" in data

    def test_adds_change_with_task_and_story_links(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.post(
            f"/api/v1/projects/{seeded_project}/releases/2.0.0/changes",
            json={
                "change_type": "fix",
                "description": "Fix edge case",
                "task_id": "fix-002",
                "story_id": "US-3",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["task_id"] == "fix-002"
        assert data["story_id"] == "US-3"

    def test_rejects_invalid_change_type(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.post(
            f"/api/v1/projects/{seeded_project}/releases/2.0.0/changes",
            json={"change_type": "invalid", "description": "Bad"},
        )
        assert resp.status_code == 422

    def test_returns_404_for_unknown_version(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.post(
            f"/api/v1/projects/{seeded_project}/releases/99.0.0/changes",
            json={"change_type": "feat", "description": "X"},
        )
        assert resp.status_code == 404

    def test_change_persists(
        self, client: TestClient, seeded_project: str
    ) -> None:
        client.post(
            f"/api/v1/projects/{seeded_project}/releases/2.0.0/changes",
            json={"change_type": "docs", "description": "Update README"},
        )
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases/2.0.0")
        descriptions = [c["description"] for c in resp.json()["changes"]]
        assert "Update README" in descriptions


# ---------------------------------------------------------------------------
# DELETE /api/v1/projects/{project_id}/releases/{version}/changes/{change_id}
# ---------------------------------------------------------------------------


class TestRemoveChangeEntry:
    def test_removes_existing_change(
        self, client: TestClient, seeded_project: str
    ) -> None:
        # Get a change_id from the seeded project
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases/1.0.0")
        change_id = resp.json()["changes"][0]["change_id"]

        del_resp = client.delete(
            f"/api/v1/projects/{seeded_project}/releases/1.0.0/changes/{change_id}"
        )
        assert del_resp.status_code == 204

    def test_change_no_longer_present(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/releases/1.0.0")
        change_id = resp.json()["changes"][0]["change_id"]

        client.delete(
            f"/api/v1/projects/{seeded_project}/releases/1.0.0/changes/{change_id}"
        )
        resp2 = client.get(f"/api/v1/projects/{seeded_project}/releases/1.0.0")
        remaining_ids = [c["change_id"] for c in resp2.json()["changes"]]
        assert change_id not in remaining_ids

    def test_returns_404_for_unknown_change_id(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.delete(
            f"/api/v1/projects/{seeded_project}/releases/1.0.0/changes/no-such-id"
        )
        assert resp.status_code == 404

    def test_returns_404_for_unknown_version(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.delete(
            f"/api/v1/projects/{seeded_project}/releases/99.0.0/changes/any-id"
        )
        assert resp.status_code == 404
