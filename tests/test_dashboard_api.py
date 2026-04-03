"""Integration tests for the SpecForge API — Module 8 (Project Dashboard).

These tests exercise all ten REST endpoints via an in-process FastAPI test
client, using a temporary directory as the projects root.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from specify_cli.dashboard import (
    FeatureStatus,
    PhaseStatus,
    Project,
    ReviewThread,
    ReviewStatus,
    SDDPhase,
    TeamMember,
    TeamRole,
)
from specforge_api.routers import dashboard as dashboard_router


def _create_test_app() -> FastAPI:
    """Minimal FastAPI app containing only the dashboard router."""
    app = FastAPI(title="SpecForge Dashboard Test App")
    app.include_router(dashboard_router.router, prefix="/api/v1")
    return app


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def projects_root(tmp_path: Path) -> Path:
    return tmp_path / "projects"


@pytest.fixture()
def client(projects_root: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("SPECFORGE_PROJECTS_ROOT", str(projects_root))
    app = _create_test_app()
    return TestClient(app)


@pytest.fixture()
def seeded_project(projects_root: Path) -> str:
    """Create a project with features, members, and a review thread on disk."""
    project = Project(
        name="Alpha Project",
        description="Integration test project.",
        created_at="2026-05-01T09:00:00Z",
        updated_at="2026-05-01T09:00:00Z",
        project_id="proj-alpha",
    )

    member = TeamMember(
        project_id="proj-alpha",
        name="Alice",
        email="alice@example.com",
        joined_at="2026-05-01T09:00:00Z",
        role=TeamRole.OWNER,
    )
    project.add_member(member)

    feature1 = FeatureStatus(
        title="User Authentication",
        description="Login and signup flows.",
        created_at="2026-05-01T10:00:00Z",
        updated_at="2026-05-01T10:00:00Z",
        sdd_phases={
            SDDPhase.CONSTITUTION: PhaseStatus.COMPLETE,
            SDDPhase.SPEC: PhaseStatus.COMPLETE,
            SDDPhase.PLAN: PhaseStatus.IN_PROGRESS,
        },
    )
    feature2 = FeatureStatus(
        title="Dashboard UI",
        description="Main dashboard view.",
        created_at="2026-05-01T11:00:00Z",
        updated_at="2026-05-01T11:00:00Z",
    )
    project.add_feature(feature1)
    project.add_feature(feature2)

    project_path = projects_root / "proj-alpha" / "project.yaml"
    project.save(project_path)

    thread = ReviewThread(
        project_id="proj-alpha",
        artifact_id=feature1.feature_id,
        artifact_type="feature",
        title="Review auth spec",
        author="bob@example.com",
        created_at="2026-05-02T08:00:00Z",
        updated_at="2026-05-02T08:00:00Z",
        status=ReviewStatus.OPEN,
        comments=[{"text": "Looks good so far.", "author": "alice", "created_at": "2026-05-02T08:05:00Z"}],
    )
    review_path = projects_root / "proj-alpha" / "reviews" / f"{thread.thread_id}.yaml"
    thread.save(review_path)

    return "proj-alpha"


# ---------------------------------------------------------------------------
# GET /api/v1/projects
# ---------------------------------------------------------------------------


class TestListProjects:
    def test_returns_empty_list_when_no_projects(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects")
        assert resp.status_code == 200
        assert resp.json()["projects"] == []

    def test_returns_seeded_project(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get("/api/v1/projects")
        assert resp.status_code == 200
        projects = resp.json()["projects"]
        assert len(projects) == 1
        assert projects[0]["project_id"] == seeded_project

    def test_response_includes_name_and_description(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get("/api/v1/projects")
        p = resp.json()["projects"][0]
        assert p["name"] == "Alpha Project"
        assert p["description"] == "Integration test project."

    def test_response_includes_features_and_members(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get("/api/v1/projects")
        p = resp.json()["projects"][0]
        assert len(p["features"]) == 2
        assert len(p["team_members"]) == 1


# ---------------------------------------------------------------------------
# POST /api/v1/projects
# ---------------------------------------------------------------------------


class TestCreateProject:
    def test_creates_project_returns_201(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects",
            json={
                "name": "Beta Project",
                "description": "Second project.",
                "created_at": "2026-06-01T00:00:00Z",
                "updated_at": "2026-06-01T00:00:00Z",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Beta Project"
        assert "project_id" in data

    def test_created_project_has_empty_features_and_members(
        self, client: TestClient
    ) -> None:
        resp = client.post(
            "/api/v1/projects",
            json={
                "name": "Empty Project",
                "created_at": "2026-06-01T00:00:00Z",
                "updated_at": "2026-06-01T00:00:00Z",
            },
        )
        data = resp.json()
        assert data["features"] == []
        assert data["team_members"] == []

    def test_created_project_persisted_on_disk(
        self, client: TestClient, projects_root: Path
    ) -> None:
        resp = client.post(
            "/api/v1/projects",
            json={
                "name": "Persisted Project",
                "created_at": "2026-06-01T00:00:00Z",
                "updated_at": "2026-06-01T00:00:00Z",
            },
        )
        project_id = resp.json()["project_id"]
        assert (projects_root / project_id / "project.yaml").exists()

    def test_created_project_appears_in_list(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects",
            json={
                "name": "Listed Project",
                "created_at": "2026-06-01T00:00:00Z",
                "updated_at": "2026-06-01T00:00:00Z",
            },
        )
        project_id = resp.json()["project_id"]
        list_resp = client.get("/api/v1/projects")
        ids = [p["project_id"] for p in list_resp.json()["projects"]]
        assert project_id in ids


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}
# ---------------------------------------------------------------------------


class TestGetProject:
    def test_returns_project_with_all_fields(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["project_id"] == seeded_project
        assert data["name"] == "Alpha Project"

    def test_returns_404_for_missing_project(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/does-not-exist")
        assert resp.status_code == 404
        assert "does-not-exist" in resp.json()["detail"]

    def test_returns_features_embedded(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}")
        features = resp.json()["features"]
        assert len(features) == 2
        titles = {f["title"] for f in features}
        assert "User Authentication" in titles

    def test_returns_team_members_embedded(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}")
        members = resp.json()["team_members"]
        assert len(members) == 1
        assert members[0]["name"] == "Alice"
        assert members[0]["role"] == "owner"


# ---------------------------------------------------------------------------
# DELETE /api/v1/projects/{project_id}
# ---------------------------------------------------------------------------


class TestDeleteProject:
    def test_delete_returns_204(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.delete(f"/api/v1/projects/{seeded_project}")
        assert resp.status_code == 204

    def test_deleted_project_not_in_list(
        self, client: TestClient, seeded_project: str
    ) -> None:
        client.delete(f"/api/v1/projects/{seeded_project}")
        list_resp = client.get("/api/v1/projects")
        ids = [p["project_id"] for p in list_resp.json()["projects"]]
        assert seeded_project not in ids

    def test_delete_returns_404_for_missing(self, client: TestClient) -> None:
        resp = client.delete("/api/v1/projects/ghost-project")
        assert resp.status_code == 404

    def test_get_after_delete_returns_404(
        self, client: TestClient, seeded_project: str
    ) -> None:
        client.delete(f"/api/v1/projects/{seeded_project}")
        resp = client.get(f"/api/v1/projects/{seeded_project}")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/features
# ---------------------------------------------------------------------------


class TestListFeatures:
    def test_lists_features_for_project(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/features")
        assert resp.status_code == 200
        data = resp.json()
        assert data["project_id"] == seeded_project
        assert len(data["features"]) == 2

    def test_feature_has_sdd_phases(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/features")
        auth_feature = next(
            f for f in resp.json()["features"] if f["title"] == "User Authentication"
        )
        assert auth_feature["sdd_phases"]["constitution"] == "complete"
        assert auth_feature["sdd_phases"]["spec"] == "complete"
        assert auth_feature["sdd_phases"]["plan"] == "in_progress"

    def test_returns_404_for_missing_project(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/no-such/features")
        assert resp.status_code == 404

    def test_new_project_has_empty_features(self, client: TestClient) -> None:
        create_resp = client.post(
            "/api/v1/projects",
            json={
                "name": "Empty",
                "created_at": "2026-06-01T00:00:00Z",
                "updated_at": "2026-06-01T00:00:00Z",
            },
        )
        pid = create_resp.json()["project_id"]
        resp = client.get(f"/api/v1/projects/{pid}/features")
        assert resp.json()["features"] == []


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/features
# ---------------------------------------------------------------------------


class TestAddFeature:
    def test_adds_feature_returns_201(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.post(
            f"/api/v1/projects/{seeded_project}/features",
            json={
                "title": "Notifications",
                "description": "Push notifications.",
                "created_at": "2026-05-03T00:00:00Z",
                "updated_at": "2026-05-03T00:00:00Z",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Notifications"
        assert "feature_id" in data

    def test_added_feature_has_default_pending_phases(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.post(
            f"/api/v1/projects/{seeded_project}/features",
            json={
                "title": "Search",
                "created_at": "2026-05-03T00:00:00Z",
                "updated_at": "2026-05-03T00:00:00Z",
            },
        )
        phases = resp.json()["sdd_phases"]
        assert phases["constitution"] == "pending"
        assert phases["done"] == "pending"

    def test_feature_persisted_in_project(
        self, client: TestClient, seeded_project: str
    ) -> None:
        client.post(
            f"/api/v1/projects/{seeded_project}/features",
            json={
                "title": "Export PDF",
                "created_at": "2026-05-03T00:00:00Z",
                "updated_at": "2026-05-03T00:00:00Z",
            },
        )
        list_resp = client.get(f"/api/v1/projects/{seeded_project}/features")
        titles = [f["title"] for f in list_resp.json()["features"]]
        assert "Export PDF" in titles

    def test_returns_404_for_missing_project(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/ghost/features",
            json={
                "title": "Ghost Feature",
                "created_at": "2026-05-03T00:00:00Z",
                "updated_at": "2026-05-03T00:00:00Z",
            },
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/v1/projects/{project_id}/features/{feature_id}/phase
# ---------------------------------------------------------------------------


class TestUpdateFeaturePhase:
    def test_updates_phase_returns_200(
        self, client: TestClient, seeded_project: str
    ) -> None:
        features = client.get(f"/api/v1/projects/{seeded_project}/features").json()["features"]
        feature_id = next(f["feature_id"] for f in features if f["title"] == "Dashboard UI")
        resp = client.put(
            f"/api/v1/projects/{seeded_project}/features/{feature_id}/phase",
            json={"phase": "constitution", "phase_status": "in_progress"},
        )
        assert resp.status_code == 200
        assert resp.json()["sdd_phases"]["constitution"] == "in_progress"

    def test_updated_phase_persisted(
        self, client: TestClient, seeded_project: str
    ) -> None:
        features = client.get(f"/api/v1/projects/{seeded_project}/features").json()["features"]
        feature_id = features[0]["feature_id"]
        client.put(
            f"/api/v1/projects/{seeded_project}/features/{feature_id}/phase",
            json={"phase": "done", "phase_status": "complete"},
        )
        updated = client.get(f"/api/v1/projects/{seeded_project}/features").json()["features"]
        feature = next(f for f in updated if f["feature_id"] == feature_id)
        assert feature["sdd_phases"]["done"] == "complete"

    def test_returns_422_for_invalid_phase(
        self, client: TestClient, seeded_project: str
    ) -> None:
        features = client.get(f"/api/v1/projects/{seeded_project}/features").json()["features"]
        feature_id = features[0]["feature_id"]
        resp = client.put(
            f"/api/v1/projects/{seeded_project}/features/{feature_id}/phase",
            json={"phase": "nonexistent-phase", "phase_status": "complete"},
        )
        assert resp.status_code == 422

    def test_returns_422_for_invalid_phase_status(
        self, client: TestClient, seeded_project: str
    ) -> None:
        features = client.get(f"/api/v1/projects/{seeded_project}/features").json()["features"]
        feature_id = features[0]["feature_id"]
        resp = client.put(
            f"/api/v1/projects/{seeded_project}/features/{feature_id}/phase",
            json={"phase": "spec", "phase_status": "bad-status"},
        )
        assert resp.status_code == 422

    def test_returns_404_for_missing_feature(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.put(
            f"/api/v1/projects/{seeded_project}/features/no-such-feature/phase",
            json={"phase": "spec", "phase_status": "complete"},
        )
        assert resp.status_code == 404

    def test_returns_404_for_missing_project(self, client: TestClient) -> None:
        resp = client.put(
            "/api/v1/projects/ghost/features/any/phase",
            json={"phase": "spec", "phase_status": "complete"},
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/reviews
# ---------------------------------------------------------------------------


class TestListReviews:
    def test_returns_existing_review_threads(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/reviews")
        assert resp.status_code == 200
        data = resp.json()
        assert data["project_id"] == seeded_project
        assert len(data["reviews"]) == 1

    def test_review_has_expected_fields(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/reviews")
        thread = resp.json()["reviews"][0]
        assert thread["title"] == "Review auth spec"
        assert thread["author"] == "bob@example.com"
        assert thread["status"] == "open"
        assert len(thread["comments"]) == 1

    def test_returns_empty_list_for_project_without_reviews(
        self, client: TestClient
    ) -> None:
        resp = client.post(
            "/api/v1/projects",
            json={
                "name": "No Reviews",
                "created_at": "2026-06-01T00:00:00Z",
                "updated_at": "2026-06-01T00:00:00Z",
            },
        )
        pid = resp.json()["project_id"]
        list_resp = client.get(f"/api/v1/projects/{pid}/reviews")
        assert list_resp.json()["reviews"] == []

    def test_returns_404_for_missing_project(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/ghost/reviews")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/reviews
# ---------------------------------------------------------------------------


class TestCreateReview:
    def test_creates_review_returns_201(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.post(
            f"/api/v1/projects/{seeded_project}/reviews",
            json={
                "artifact_id": "feature-xyz",
                "artifact_type": "feature",
                "title": "Review feature XYZ",
                "author": "carol@example.com",
                "created_at": "2026-05-05T10:00:00Z",
                "updated_at": "2026-05-05T10:00:00Z",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Review feature XYZ"
        assert data["author"] == "carol@example.com"
        assert "thread_id" in data

    def test_created_review_has_open_status_by_default(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.post(
            f"/api/v1/projects/{seeded_project}/reviews",
            json={
                "artifact_id": "spec-1",
                "artifact_type": "spec",
                "title": "Spec review",
                "author": "dave@example.com",
                "created_at": "2026-05-05T10:00:00Z",
                "updated_at": "2026-05-05T10:00:00Z",
            },
        )
        assert resp.json()["status"] == "open"

    def test_created_review_appears_in_list(
        self, client: TestClient, seeded_project: str
    ) -> None:
        client.post(
            f"/api/v1/projects/{seeded_project}/reviews",
            json={
                "artifact_id": "plan-2",
                "artifact_type": "plan",
                "title": "Plan review",
                "author": "eve@example.com",
                "created_at": "2026-05-05T10:00:00Z",
                "updated_at": "2026-05-05T10:00:00Z",
            },
        )
        list_resp = client.get(f"/api/v1/projects/{seeded_project}/reviews")
        titles = [r["title"] for r in list_resp.json()["reviews"]]
        assert "Plan review" in titles

    def test_returns_404_for_missing_project(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/ghost/reviews",
            json={
                "artifact_id": "x",
                "artifact_type": "spec",
                "title": "Ghost review",
                "author": "nobody@example.com",
                "created_at": "2026-05-05T10:00:00Z",
                "updated_at": "2026-05-05T10:00:00Z",
            },
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/metrics
# ---------------------------------------------------------------------------


class TestGetMetrics:
    def test_returns_metrics_for_project(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert data["project_id"] == seeded_project
        assert data["total_features"] == 2

    def test_metrics_has_all_expected_fields(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/metrics")
        data = resp.json()
        for field in (
            "project_id",
            "computed_at",
            "total_features",
            "features_by_phase",
            "spec_quality_avg",
            "compliance_rate",
            "velocity_per_week",
        ):
            assert field in data

    def test_features_by_phase_covers_all_phases(
        self, client: TestClient, seeded_project: str
    ) -> None:
        resp = client.get(f"/api/v1/projects/{seeded_project}/metrics")
        by_phase = resp.json()["features_by_phase"]
        for phase in ("constitution", "spec", "plan", "tasks", "implement", "done"):
            assert phase in by_phase

    def test_metrics_reflect_feature_phases(
        self, client: TestClient, seeded_project: str
    ) -> None:
        # Seeded project has one feature with plan=in_progress
        resp = client.get(f"/api/v1/projects/{seeded_project}/metrics")
        by_phase = resp.json()["features_by_phase"]
        assert by_phase["plan"] == 1

    def test_returns_404_for_missing_project(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/ghost/metrics")
        assert resp.status_code == 404

    def test_compliance_rate_for_seeded_project(
        self, client: TestClient, seeded_project: str
    ) -> None:
        # One of two features has spec=complete → 0.5 compliance rate
        resp = client.get(f"/api/v1/projects/{seeded_project}/metrics")
        assert resp.json()["compliance_rate"] == pytest.approx(0.5)
