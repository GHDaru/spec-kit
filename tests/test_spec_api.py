"""Integration tests for the SpecForge API — Module 2 (Specification Studio).

These tests exercise the nine REST endpoints via an in-process FastAPI
test client, using a temporary directory as the projects root.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from specify_cli.spec import (
    AcceptanceScenario,
    ClarificationStatus,
    Priority,
    Spec,
    UserStory,
)
from specforge_api.main import create_app


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


def _make_spec(projects_root: Path, project_id: str, spec_id: str) -> Spec:
    """Create and save a minimal spec; return the spec object."""
    spec = Spec(spec_id=spec_id, title="My Feature", description="A test feature.")
    story = UserStory(
        id="US-001",
        title="Log in",
        as_a="user",
        i_want="to authenticate",
        so_that="I can access my data",
        priority=Priority.P1,
    )
    story.add_scenario(AcceptanceScenario(
        title="Happy path",
        given="the user has valid credentials",
        when="they submit the login form",
        then="they are redirected to the dashboard",
    ))
    spec.add_story(story)
    spec.add_requirement("The system must validate credentials against the database.")
    spec.add_clarification("What happens when the password is expired?")
    path = projects_root / project_id / "specs" / spec_id / "spec.md"
    spec.save(path)
    return spec


@pytest.fixture()
def seeded_spec(projects_root: Path) -> tuple[str, str]:
    """Seed a spec and return (project_id, spec_id)."""
    _make_spec(projects_root, "proj-a", "001-my-feature")
    return "proj-a", "001-my-feature"


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/specs
# ---------------------------------------------------------------------------


class TestListSpecs:
    """GET /api/v1/projects/{project_id}/specs"""

    def test_returns_empty_list_for_new_project(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/new-project/specs")
        assert response.status_code == 200
        data = response.json()
        assert data["project_id"] == "new-project"
        assert data["specs"] == []

    def test_returns_summaries_for_existing_specs(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.get(f"/api/v1/projects/{project_id}/specs")
        assert response.status_code == 200
        data = response.json()
        assert len(data["specs"]) == 1
        summary = data["specs"][0]
        assert summary["spec_id"] == spec_id
        assert summary["title"] == "My Feature"
        assert summary["story_count"] == 1
        assert summary["requirement_count"] == 1
        assert summary["open_clarification_count"] == 1


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/specs/{spec_id}
# ---------------------------------------------------------------------------


class TestCreateSpec:
    """POST /api/v1/projects/{project_id}/specs/{spec_id}"""

    def _minimal_payload(self) -> dict:
        return {"title": "New Feature", "description": "A brand new feature."}

    def _full_payload(self) -> dict:
        return {
            "title": "Full Feature",
            "description": "Feature with all sub-resources.",
            "user_stories": [
                {
                    "title": "Story one",
                    "as_a": "developer",
                    "i_want": "a clean API",
                    "so_that": "I can integrate easily",
                    "priority": "P1",
                    "scenarios": [
                        {
                            "title": "Success case",
                            "given": "a valid request",
                            "when": "I call the endpoint",
                            "then": "I receive 200 OK",
                        }
                    ],
                }
            ],
            "requirements": [{"description": "Must respond in under 200ms."}],
            "clarifications": [{"description": "What is the rate limit?"}],
        }

    def test_returns_201_and_creates_file(
        self, client: TestClient, projects_root: Path
    ) -> None:
        response = client.post(
            "/api/v1/projects/proj-b/specs/001-new", json=self._minimal_payload()
        )
        assert response.status_code == 201
        assert (projects_root / "proj-b" / "specs" / "001-new" / "spec.md").exists()

    def test_response_body_reflects_saved_data(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/projects/proj-c/specs/002-test", json=self._minimal_payload()
        )
        data = response.json()
        assert data["spec_id"] == "002-test"
        assert data["title"] == "New Feature"
        assert data["description"] == "A brand new feature."

    def test_created_spec_can_be_retrieved(self, client: TestClient) -> None:
        client.post(
            "/api/v1/projects/proj-d/specs/003-feat", json=self._minimal_payload()
        )
        response = client.get("/api/v1/projects/proj-d/specs/003-feat")
        assert response.status_code == 200
        assert response.json()["title"] == "New Feature"

    def test_create_with_full_payload(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/projects/proj-e/specs/004-full", json=self._full_payload()
        )
        assert response.status_code == 201
        data = response.json()
        assert len(data["user_stories"]) == 1
        assert len(data["requirements"]) == 1
        assert len(data["clarifications"]) == 1

    def test_create_with_empty_sub_resources(self, client: TestClient) -> None:
        payload = {"title": "Empty Spec", "description": "", "user_stories": [], "requirements": [], "clarifications": []}
        response = client.post(
            "/api/v1/projects/proj-f/specs/005-empty", json=payload
        )
        assert response.status_code == 201
        data = response.json()
        assert data["user_stories"] == []
        assert data["requirements"] == []
        assert data["clarifications"] == []


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/specs/{spec_id}
# ---------------------------------------------------------------------------


class TestGetSpec:
    """GET /api/v1/projects/{project_id}/specs/{spec_id}"""

    def test_returns_200_with_existing_spec(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.get(f"/api/v1/projects/{project_id}/specs/{spec_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["spec_id"] == spec_id
        assert data["title"] == "My Feature"

    def test_returns_404_when_spec_missing(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/proj-x/specs/nonexistent")
        assert response.status_code == 404

    def test_response_includes_user_stories(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.get(f"/api/v1/projects/{project_id}/specs/{spec_id}")
        stories = response.json()["user_stories"]
        assert len(stories) == 1
        story = stories[0]
        assert story["id"] == "US-001"
        assert story["title"] == "Log in"
        assert story["priority"] == "P1"
        assert len(story["scenarios"]) == 1

    def test_response_includes_requirements(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.get(f"/api/v1/projects/{project_id}/specs/{spec_id}")
        reqs = response.json()["requirements"]
        assert len(reqs) == 1
        assert reqs[0]["id"] == "FR-001"

    def test_response_includes_clarifications(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.get(f"/api/v1/projects/{project_id}/specs/{spec_id}")
        cls = response.json()["clarifications"]
        assert len(cls) == 1
        assert cls[0]["id"] == "CL-001"
        assert cls[0]["status"] == "open"


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/specs/{spec_id}/stories
# ---------------------------------------------------------------------------


class TestAddStory:
    """POST /api/v1/projects/{project_id}/specs/{spec_id}/stories"""

    def _story_payload(self) -> dict:
        return {
            "title": "Register",
            "as_a": "new user",
            "i_want": "to create an account",
            "so_that": "I can use the service",
            "priority": "P2",
        }

    def test_returns_201_and_story_is_in_response(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.post(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/stories",
            json=self._story_payload(),
        )
        assert response.status_code == 201
        stories = response.json()["user_stories"]
        assert len(stories) == 2
        titles = [s["title"] for s in stories]
        assert "Register" in titles

    def test_story_persisted_after_add(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        client.post(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/stories",
            json=self._story_payload(),
        )
        response = client.get(f"/api/v1/projects/{project_id}/specs/{spec_id}")
        assert len(response.json()["user_stories"]) == 2

    def test_returns_404_for_missing_spec(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/projects/proj-z/specs/ghost/stories",
            json=self._story_payload(),
        )
        assert response.status_code == 404

    def test_story_with_scenarios(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        payload = {
            **self._story_payload(),
            "scenarios": [
                {
                    "title": "Valid email",
                    "given": "a new visitor",
                    "when": "they fill out the registration form",
                    "then": "their account is created",
                }
            ],
        }
        response = client.post(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/stories",
            json=payload,
        )
        assert response.status_code == 201
        new_story = next(
            s for s in response.json()["user_stories"] if s["title"] == "Register"
        )
        assert len(new_story["scenarios"]) == 1
        assert new_story["scenarios"][0]["title"] == "Valid email"


# ---------------------------------------------------------------------------
# PATCH /api/v1/projects/{project_id}/specs/{spec_id}/stories/{story_id}
# ---------------------------------------------------------------------------


class TestUpdateStoryPriority:
    """PATCH /api/v1/projects/{project_id}/specs/{spec_id}/stories/{story_id}"""

    def test_returns_200_and_updates_priority(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.patch(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/stories/US-001",
            json={"priority": "P3"},
        )
        assert response.status_code == 200
        story = next(
            s for s in response.json()["user_stories"] if s["id"] == "US-001"
        )
        assert story["priority"] == "P3"

    def test_priority_persisted_after_update(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        client.patch(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/stories/US-001",
            json={"priority": "P2"},
        )
        response = client.get(f"/api/v1/projects/{project_id}/specs/{spec_id}")
        story = response.json()["user_stories"][0]
        assert story["priority"] == "P2"

    def test_returns_404_for_missing_story(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.patch(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/stories/US-999",
            json={"priority": "P1"},
        )
        assert response.status_code == 404

    def test_returns_422_for_invalid_priority(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.patch(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/stories/US-001",
            json={"priority": "INVALID"},
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# DELETE /api/v1/projects/{project_id}/specs/{spec_id}/stories/{story_id}
# ---------------------------------------------------------------------------


class TestRemoveStory:
    """DELETE /api/v1/projects/{project_id}/specs/{spec_id}/stories/{story_id}"""

    def test_returns_204_and_story_is_removed(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.delete(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/stories/US-001"
        )
        assert response.status_code == 204

    def test_story_no_longer_present_after_delete(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        client.delete(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/stories/US-001"
        )
        response = client.get(f"/api/v1/projects/{project_id}/specs/{spec_id}")
        assert response.json()["user_stories"] == []

    def test_returns_404_for_missing_story(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.delete(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/stories/US-999"
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/specs/{spec_id}/requirements
# ---------------------------------------------------------------------------


class TestAddRequirement:
    """POST /api/v1/projects/{project_id}/specs/{spec_id}/requirements"""

    def test_returns_201_and_requirement_in_response(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.post(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/requirements",
            json={"description": "Must support OAuth2."},
        )
        assert response.status_code == 201
        reqs = response.json()["requirements"]
        assert len(reqs) == 2
        descs = [r["description"] for r in reqs]
        assert "Must support OAuth2." in descs

    def test_requirement_auto_numbered(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.post(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/requirements",
            json={"description": "Second requirement."},
        )
        ids = [r["id"] for r in response.json()["requirements"]]
        assert "FR-001" in ids
        assert "FR-002" in ids

    def test_requirement_with_story_id(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.post(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/requirements",
            json={"description": "Linked requirement.", "story_id": "US-001"},
        )
        new_req = response.json()["requirements"][-1]
        assert new_req["story_id"] == "US-001"

    def test_returns_404_for_missing_spec(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/projects/proj-z/specs/ghost/requirements",
            json={"description": "Does not matter."},
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/specs/{spec_id}/clarifications
# ---------------------------------------------------------------------------


class TestAddClarification:
    """POST /api/v1/projects/{project_id}/specs/{spec_id}/clarifications"""

    def test_returns_201_and_clarification_in_response(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.post(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/clarifications",
            json={"description": "What are the session timeout rules?"},
        )
        assert response.status_code == 201
        cls = response.json()["clarifications"]
        assert len(cls) == 2
        descs = [c["description"] for c in cls]
        assert "What are the session timeout rules?" in descs

    def test_clarification_status_is_open(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.post(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/clarifications",
            json={"description": "New open question."},
        )
        new_cl = response.json()["clarifications"][-1]
        assert new_cl["status"] == "open"
        assert new_cl["resolution"] is None

    def test_returns_404_for_missing_spec(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/projects/proj-z/specs/ghost/clarifications",
            json={"description": "n/a"},
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/specs/{spec_id}/clarifications/{item_id}/resolve
# ---------------------------------------------------------------------------


class TestResolveClarification:
    """POST /api/v1/projects/{project_id}/specs/{spec_id}/clarifications/{item_id}/resolve"""

    def test_returns_200_and_status_changes_to_resolved(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.post(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/clarifications/CL-001/resolve",
            json={"resolution": "Use a 30-day expiry policy."},
        )
        assert response.status_code == 200
        cl = next(
            c for c in response.json()["clarifications"] if c["id"] == "CL-001"
        )
        assert cl["status"] == "resolved"
        assert cl["resolution"] == "Use a 30-day expiry policy."

    def test_resolution_persisted(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        client.post(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/clarifications/CL-001/resolve",
            json={"resolution": "Permanent answer."},
        )
        response = client.get(f"/api/v1/projects/{project_id}/specs/{spec_id}")
        cl = response.json()["clarifications"][0]
        assert cl["status"] == "resolved"
        assert cl["resolution"] == "Permanent answer."

    def test_returns_404_for_missing_clarification(
        self, client: TestClient, seeded_spec: tuple[str, str]
    ) -> None:
        project_id, spec_id = seeded_spec
        response = client.post(
            f"/api/v1/projects/{project_id}/specs/{spec_id}/clarifications/CL-999/resolve",
            json={"resolution": "Irrelevant."},
        )
        assert response.status_code == 404

    def test_returns_404_for_missing_spec(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/projects/proj-z/specs/ghost/clarifications/CL-001/resolve",
            json={"resolution": "n/a"},
        )
        assert response.status_code == 404
