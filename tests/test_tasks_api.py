"""Integration tests for the SpecForge API — Module 4 (Task Forge).

These tests exercise all ten REST endpoints via an in-process FastAPI test
client, using a temporary directory as the projects root.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from specify_cli.tasks import (
    DependencyEdge,
    Phase,
    PhaseType,
    Task,
    TaskList,
    TaskStatus,
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
    """Create a project with a saved task list; return the project_id."""
    project_id = "alpha"
    tl = TaskList(project_name="Alpha Project", plan_id="plan-1", spec_id="spec-1")

    setup_task = Task(
        task_id="setup-001",
        title="Bootstrap repository",
        phase=PhaseType.SETUP,
        parallel=False,
        tags=["infra"],
    )
    foundational_task = Task(
        task_id="foundational-001",
        title="Implement domain model",
        phase=PhaseType.FOUNDATIONAL,
        parallel=True,
        story_id="US-1",
        dependencies=["setup-001"],
    )
    us1_task = Task(
        task_id="us1-001",
        title="Implement user registration endpoint",
        phase=PhaseType.US1,
        parallel=True,
        story_id="US-1",
        status=TaskStatus.IN_PROGRESS,
        tags=["backend"],
    )
    polish_task = Task(
        task_id="polish-001",
        title="Write release notes",
        phase=PhaseType.POLISH,
    )

    tl.add_task(setup_task)
    tl.add_task(foundational_task)
    tl.add_task(us1_task)
    tl.add_task(polish_task)

    tl.set_dependency_edges([
        DependencyEdge(source_id="setup-001", target_id="foundational-001", label="depends"),
        DependencyEdge(source_id="foundational-001", target_id="us1-001"),
    ])

    path = projects_root / project_id / "tasks.yaml"
    tl.save(path)
    return project_id


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/tasks
# ---------------------------------------------------------------------------


class TestGetTaskList:
    def test_returns_200_with_existing_task_list(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks")
        assert response.status_code == 200
        data = response.json()
        assert data["project_name"] == "Alpha Project"
        assert data["plan_id"] == "plan-1"
        assert data["spec_id"] == "spec-1"

    def test_returns_six_phases(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks")
        assert response.status_code == 200
        phase_types = [p["phase_type"] for p in response.json()["phases"]]
        assert phase_types == ["setup", "foundational", "us1", "us2", "us3", "polish"]

    def test_returns_tasks_in_phases(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks")
        phases = response.json()["phases"]
        setup_phase = next(p for p in phases if p["phase_type"] == "setup")
        assert len(setup_phase["tasks"]) == 1
        assert setup_phase["tasks"][0]["task_id"] == "setup-001"

    def test_returns_dependency_edges(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks")
        edges = response.json()["dependency_edges"]
        assert len(edges) == 2
        assert edges[0]["source_id"] == "setup-001"
        assert edges[0]["target_id"] == "foundational-001"

    def test_returns_404_when_no_task_list(
        self, client: TestClient
    ) -> None:
        response = client.get("/api/v1/projects/nonexistent/tasks")
        assert response.status_code == 404

    def test_task_has_parallel_flag(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks")
        phases = response.json()["phases"]
        foundational = next(p for p in phases if p["phase_type"] == "foundational")
        assert foundational["tasks"][0]["parallel"] is True


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/tasks
# ---------------------------------------------------------------------------


class TestCreateTaskList:
    def test_creates_empty_task_list(self, client: TestClient) -> None:
        payload = {"project_name": "New Project"}
        response = client.post("/api/v1/projects/new-proj/tasks", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["project_name"] == "New Project"
        assert len(data["phases"]) == 6

    def test_creates_task_list_with_tasks(self, client: TestClient) -> None:
        payload = {
            "project_name": "Full Project",
            "plan_id": "plan-x",
            "phases": [
                {
                    "phase_type": "setup",
                    "tasks": [
                        {
                            "task_id": "setup-001",
                            "title": "Init repo",
                            "phase": "setup",
                            "parallel": False,
                        }
                    ],
                }
            ],
        }
        response = client.post("/api/v1/projects/full-proj/tasks", json=payload)
        assert response.status_code == 201
        phases = response.json()["phases"]
        setup = next(p for p in phases if p["phase_type"] == "setup")
        assert len(setup["tasks"]) == 1

    def test_creates_task_list_with_dependency_edges(
        self, client: TestClient
    ) -> None:
        payload = {
            "project_name": "Dep Project",
            "phases": [
                {
                    "phase_type": "setup",
                    "tasks": [{"task_id": "setup-001", "title": "T1", "phase": "setup"}],
                },
                {
                    "phase_type": "foundational",
                    "tasks": [
                        {"task_id": "foundational-001", "title": "T2", "phase": "foundational"}
                    ],
                },
            ],
            "dependency_edges": [
                {"source_id": "setup-001", "target_id": "foundational-001", "label": ""}
            ],
        }
        response = client.post("/api/v1/projects/dep-proj/tasks", json=payload)
        assert response.status_code == 201
        assert len(response.json()["dependency_edges"]) == 1

    def test_returns_409_or_overwrites_on_duplicate(
        self, client: TestClient, seeded_project: str
    ) -> None:
        # POST to an existing project overwrites (no uniqueness constraint at REST level)
        payload = {"project_name": "Overwrite"}
        response = client.post(f"/api/v1/projects/{seeded_project}/tasks", json=payload)
        assert response.status_code == 201


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/tasks/phases
# ---------------------------------------------------------------------------


class TestListPhases:
    def test_returns_six_phases_in_order(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks/phases")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 6
        assert data[0]["phase_type"] == "setup"
        assert data[-1]["phase_type"] == "polish"

    def test_returns_404_when_no_task_list(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/ghost/tasks/phases")
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/tasks/phases/{phase_type}
# ---------------------------------------------------------------------------


class TestAddTaskToPhase:
    def test_adds_task_to_existing_phase(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {"title": "New setup task", "parallel": True, "tags": ["test"]}
        response = client.post(
            f"/api/v1/projects/{seeded_project}/tasks/phases/setup", json=payload
        )
        assert response.status_code == 201
        data = response.json()
        assert data["phase"] == "setup"
        assert data["title"] == "New setup task"
        assert data["parallel"] is True

    def test_auto_generates_task_id(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {"title": "Another task"}
        response = client.post(
            f"/api/v1/projects/{seeded_project}/tasks/phases/us2", json=payload
        )
        assert response.status_code == 201
        assert response.json()["task_id"].startswith("us2-")

    def test_returns_422_for_invalid_phase(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {"title": "Bad phase task"}
        response = client.post(
            f"/api/v1/projects/{seeded_project}/tasks/phases/invalid", json=payload
        )
        assert response.status_code == 422

    def test_persists_added_task(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {"title": "Persisted task", "story_id": "US-2"}
        client.post(
            f"/api/v1/projects/{seeded_project}/tasks/phases/us1", json=payload
        )
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks/phases")
        us1 = next(p for p in response.json() if p["phase_type"] == "us1")
        assert any(t["story_id"] == "US-2" for t in us1["tasks"])


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/tasks/{task_id}
# ---------------------------------------------------------------------------


class TestGetTask:
    def test_returns_existing_task(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks/setup-001")
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "setup-001"
        assert data["title"] == "Bootstrap repository"

    def test_returns_task_with_story_id(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks/foundational-001")
        assert response.status_code == 200
        assert response.json()["story_id"] == "US-1"

    def test_returns_404_for_unknown_task(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks/no-such-task")
        assert response.status_code == 404

    def test_returns_404_when_no_task_list(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/ghost/tasks/setup-001")
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/v1/projects/{project_id}/tasks/{task_id}/status
# ---------------------------------------------------------------------------


class TestUpdateTaskStatus:
    def test_updates_status_to_complete(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.put(
            f"/api/v1/projects/{seeded_project}/tasks/setup-001/status",
            json={"status": "complete"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "complete"

    def test_persists_status_update(
        self, client: TestClient, seeded_project: str
    ) -> None:
        client.put(
            f"/api/v1/projects/{seeded_project}/tasks/setup-001/status",
            json={"status": "blocked"},
        )
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks/setup-001")
        assert response.json()["status"] == "blocked"

    def test_returns_422_for_invalid_status(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.put(
            f"/api/v1/projects/{seeded_project}/tasks/setup-001/status",
            json={"status": "flying"},
        )
        assert response.status_code == 422

    def test_returns_404_for_unknown_task(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.put(
            f"/api/v1/projects/{seeded_project}/tasks/no-such/status",
            json={"status": "complete"},
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/tasks/dependency-graph
# ---------------------------------------------------------------------------


class TestGetDependencyGraph:
    def test_returns_edges(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(
            f"/api/v1/projects/{seeded_project}/tasks/dependency-graph"
        )
        assert response.status_code == 200
        edges = response.json()["edges"]
        assert len(edges) == 2

    def test_edge_has_source_and_target(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(
            f"/api/v1/projects/{seeded_project}/tasks/dependency-graph"
        )
        edge = response.json()["edges"][0]
        assert "source_id" in edge
        assert "target_id" in edge

    def test_returns_404_when_no_task_list(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/ghost/tasks/dependency-graph")
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/v1/projects/{project_id}/tasks/dependency-graph
# ---------------------------------------------------------------------------


class TestSetDependencyGraph:
    def test_replaces_edges(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {
            "edges": [
                {"source_id": "setup-001", "target_id": "polish-001", "label": "new"}
            ]
        }
        response = client.put(
            f"/api/v1/projects/{seeded_project}/tasks/dependency-graph", json=payload
        )
        assert response.status_code == 200
        edges = response.json()["edges"]
        assert len(edges) == 1
        assert edges[0]["label"] == "new"

    def test_rejects_cyclic_graph(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {
            "edges": [
                {"source_id": "setup-001", "target_id": "foundational-001"},
                {"source_id": "foundational-001", "target_id": "setup-001"},
            ]
        }
        response = client.put(
            f"/api/v1/projects/{seeded_project}/tasks/dependency-graph", json=payload
        )
        assert response.status_code == 422

    def test_persists_new_graph(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {"edges": [{"source_id": "setup-001", "target_id": "us1-001"}]}
        client.put(
            f"/api/v1/projects/{seeded_project}/tasks/dependency-graph", json=payload
        )
        response = client.get(
            f"/api/v1/projects/{seeded_project}/tasks/dependency-graph"
        )
        assert response.json()["edges"][0]["target_id"] == "us1-001"


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/tasks/github-export
# ---------------------------------------------------------------------------


class TestGetGitHubExport:
    def test_returns_issues_for_all_tasks(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks/github-export")
        assert response.status_code == 200
        issues = response.json()["issues"]
        assert len(issues) == 4  # setup, foundational, us1, polish

    def test_issue_has_required_fields(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks/github-export")
        issue = response.json()["issues"][0]
        assert "task_id" in issue
        assert "title" in issue
        assert "body" in issue
        assert "labels" in issue
        assert "milestone" in issue

    def test_phase_label_present(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks/github-export")
        issues = response.json()["issues"]
        setup_issue = next(i for i in issues if i["task_id"] == "setup-001")
        assert "phase:setup" in setup_issue["labels"]

    def test_parallel_label_present(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks/github-export")
        issues = response.json()["issues"]
        parallel_issue = next(i for i in issues if i["task_id"] == "foundational-001")
        assert "parallel" in parallel_issue["labels"]

    def test_returns_404_when_no_task_list(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/ghost/tasks/github-export")
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/tasks/progress
# ---------------------------------------------------------------------------


class TestGetProgress:
    def test_returns_total_count(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks/progress")
        assert response.status_code == 200
        assert response.json()["total"] == 4

    def test_counts_by_status(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks/progress")
        by_status = response.json()["by_status"]
        assert by_status["in_progress"] == 1
        assert by_status["pending"] == 3

    def test_counts_by_phase(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks/progress")
        by_phase = response.json()["by_phase"]
        assert by_phase["setup"]["pending"] == 1
        assert by_phase["us1"]["in_progress"] == 1

    def test_all_six_phases_present_in_by_phase(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/tasks/progress")
        by_phase = response.json()["by_phase"]
        expected = {"setup", "foundational", "us1", "us2", "us3", "polish"}
        assert set(by_phase.keys()) == expected

    def test_returns_404_when_no_task_list(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/ghost/tasks/progress")
        assert response.status_code == 404
