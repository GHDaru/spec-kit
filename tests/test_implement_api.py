"""Integration tests for the SpecForge API — Module 6 (Implement & Execute).

These tests exercise all ten REST endpoints via an in-process FastAPI test
client, using a temporary directory as the projects root.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from specify_cli.implement import (
    Checkpoint,
    ComplianceReport,
    ComplianceVerdict,
    ExecutionSession,
    SessionStatus,
    TaskResult,
    TaskResultStatus,
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
def seeded_session(projects_root: Path) -> tuple[str, str]:
    """Create a project with a saved session; return (project_id, session_id)."""
    project_id = "proj-alpha"
    session = ExecutionSession(
        project_id=project_id,
        agent="claude",
        started_at="2026-04-03T10:00:00Z",
        task_list_id="tasks-1",
        spec_id="spec-1",
        plan_id="plan-1",
        status=SessionStatus.RUNNING,
        notes="First implementation session.",
    )

    result1 = TaskResult(
        task_id="task-001",
        task_title="Scaffold project structure",
        started_at="2026-04-03T10:01:00Z",
        status=TaskResultStatus.SUCCESS,
        output="Done.",
        completed_at="2026-04-03T10:02:00Z",
    )
    result2 = TaskResult(
        task_id="task-002",
        task_title="Implement domain model",
        started_at="2026-04-03T10:03:00Z",
        status=TaskResultStatus.RUNNING,
    )
    session.add_task_result(result1)
    session.add_task_result(result2)

    report = ComplianceReport(
        result_id=result1.result_id,
        verdict=ComplianceVerdict.PASS,
        summary="All requirements met.",
        spec_id="spec-1",
        findings=[{"requirement": "FR-1", "verdict": "pass", "note": ""}],
    )
    session.add_compliance_report(report)

    cp = Checkpoint(
        label="US-1 complete",
        created_at="2026-04-03T10:02:30Z",
        story_id="US-1",
        notes="First user story done.",
    )
    session.add_checkpoint(cp)

    path = projects_root / project_id / "sessions" / f"{session.session_id}.yaml"
    session.save(path)
    return project_id, session.session_id


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/sessions
# ---------------------------------------------------------------------------


class TestListSessions:
    def test_returns_empty_list_for_new_project(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/brand-new/sessions")
        assert resp.status_code == 200
        data = resp.json()
        assert data["project_id"] == "brand-new"
        assert data["sessions"] == []

    def test_returns_existing_sessions(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, _ = seeded_session
        resp = client.get(f"/api/v1/projects/{project_id}/sessions")
        assert resp.status_code == 200
        assert len(resp.json()["sessions"]) == 1

    def test_response_includes_agent_and_status(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, _ = seeded_session
        resp = client.get(f"/api/v1/projects/{project_id}/sessions")
        s = resp.json()["sessions"][0]
        assert s["agent"] == "claude"
        assert s["status"] == "running"


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/sessions
# ---------------------------------------------------------------------------


class TestCreateSession:
    def test_creates_session_returns_201(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-new/sessions",
            json={
                "agent": "copilot",
                "started_at": "2026-04-03T12:00:00Z",
                "status": "idle",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["agent"] == "copilot"
        assert data["status"] == "idle"
        assert "session_id" in data

    def test_created_session_has_empty_results(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-new/sessions",
            json={"agent": "gemini", "started_at": "2026-04-03T12:00:00Z"},
        )
        assert resp.status_code == 201
        assert resp.json()["task_results"] == []

    def test_created_session_persisted_on_disk(
        self, client: TestClient, projects_root: Path
    ) -> None:
        resp = client.post(
            "/api/v1/projects/proj-persist/sessions",
            json={"agent": "claude", "started_at": "2026-04-03T12:00:00Z"},
        )
        session_id = resp.json()["session_id"]
        path = projects_root / "proj-persist" / "sessions" / f"{session_id}.yaml"
        assert path.exists()

    def test_create_with_optional_links(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-links/sessions",
            json={
                "agent": "cursor-agent",
                "started_at": "2026-04-03T12:00:00Z",
                "task_list_id": "tl-1",
                "spec_id": "spec-1",
                "plan_id": "plan-1",
                "notes": "linked session",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["task_list_id"] == "tl-1"
        assert data["spec_id"] == "spec-1"
        assert data["plan_id"] == "plan-1"


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/sessions/{session_id}
# ---------------------------------------------------------------------------


class TestGetSession:
    def test_returns_session_by_id(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.get(f"/api/v1/projects/{project_id}/sessions/{session_id}")
        assert resp.status_code == 200
        assert resp.json()["session_id"] == session_id

    def test_returns_404_for_missing_session(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/proj-x/sessions/no-such-session")
        assert resp.status_code == 404

    def test_response_includes_task_results(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.get(f"/api/v1/projects/{project_id}/sessions/{session_id}")
        assert len(resp.json()["task_results"]) == 2

    def test_response_includes_checkpoints(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.get(f"/api/v1/projects/{project_id}/sessions/{session_id}")
        assert len(resp.json()["checkpoints"]) == 1

    def test_response_includes_compliance_reports(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.get(f"/api/v1/projects/{project_id}/sessions/{session_id}")
        assert len(resp.json()["compliance_reports"]) == 1


# ---------------------------------------------------------------------------
# PUT /api/v1/projects/{project_id}/sessions/{session_id}/status
# ---------------------------------------------------------------------------


class TestUpdateSessionStatus:
    def test_updates_status_to_completed(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.put(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/status",
            json={"status": "completed"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    def test_updates_status_to_paused(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.put(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/status",
            json={"status": "paused"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "paused"

    def test_returns_422_for_invalid_status(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.put(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/status",
            json={"status": "bad-status"},
        )
        assert resp.status_code == 422

    def test_returns_404_for_missing_session(self, client: TestClient) -> None:
        resp = client.put(
            "/api/v1/projects/proj-x/sessions/no-such/status",
            json={"status": "completed"},
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/v1/projects/{project_id}/sessions/{session_id}
# ---------------------------------------------------------------------------


class TestDeleteSession:
    def test_delete_returns_204(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.delete(f"/api/v1/projects/{project_id}/sessions/{session_id}")
        assert resp.status_code == 204

    def test_deleted_session_returns_404(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        client.delete(f"/api/v1/projects/{project_id}/sessions/{session_id}")
        resp = client.get(f"/api/v1/projects/{project_id}/sessions/{session_id}")
        assert resp.status_code == 404

    def test_delete_missing_returns_404(self, client: TestClient) -> None:
        resp = client.delete("/api/v1/projects/proj-x/sessions/no-such")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/sessions/{session_id}/results
# ---------------------------------------------------------------------------


class TestAddTaskResult:
    def test_adds_task_result_returns_201(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.post(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/results",
            json={
                "task_id": "task-003",
                "task_title": "Write tests",
                "started_at": "2026-04-03T11:00:00Z",
                "status": "pending",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["task_id"] == "task-003"
        assert "result_id" in resp.json()

    def test_task_result_persisted_in_session(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        client.post(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/results",
            json={
                "task_id": "task-004",
                "task_title": "Deploy to staging",
                "started_at": "2026-04-03T11:00:00Z",
            },
        )
        resp = client.get(f"/api/v1/projects/{project_id}/sessions/{session_id}")
        task_ids = [r["task_id"] for r in resp.json()["task_results"]]
        assert "task-004" in task_ids

    def test_returns_422_for_invalid_status(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.post(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/results",
            json={
                "task_id": "task-005",
                "task_title": "Bad status",
                "started_at": "2026-04-03T11:00:00Z",
                "status": "unknown-status",
            },
        )
        assert resp.status_code == 422

    def test_returns_404_for_missing_session(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-x/sessions/no-such/results",
            json={
                "task_id": "t",
                "task_title": "t",
                "started_at": "2026-04-03T11:00:00Z",
            },
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/v1/projects/{project_id}/sessions/{session_id}/results/{result_id}
# ---------------------------------------------------------------------------


class TestUpdateTaskResult:
    def test_updates_status_and_output(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        # Get result_id of the running task
        session_data = client.get(
            f"/api/v1/projects/{project_id}/sessions/{session_id}"
        ).json()
        result_id = next(
            r["result_id"]
            for r in session_data["task_results"]
            if r["status"] == "running"
        )
        resp = client.put(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/results/{result_id}",
            json={"status": "success", "output": "All done.", "completed_at": "2026-04-03T10:10:00Z"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "success"
        assert resp.json()["output"] == "All done."

    def test_returns_404_for_missing_result(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.put(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/results/no-such",
            json={"status": "success"},
        )
        assert resp.status_code == 404

    def test_returns_422_for_invalid_status(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        session_data = client.get(
            f"/api/v1/projects/{project_id}/sessions/{session_id}"
        ).json()
        result_id = session_data["task_results"][0]["result_id"]
        resp = client.put(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/results/{result_id}",
            json={"status": "bogus"},
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/sessions/{session_id}/results/{result_id}/compliance
# ---------------------------------------------------------------------------


class TestAddComplianceReport:
    def test_adds_compliance_report_returns_201(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        session_data = client.get(
            f"/api/v1/projects/{project_id}/sessions/{session_id}"
        ).json()
        result_id = session_data["task_results"][1]["result_id"]
        resp = client.post(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/results/{result_id}/compliance",
            json={
                "verdict": "warning",
                "summary": "Minor gap detected.",
                "findings": [{"requirement": "FR-2", "verdict": "warning", "note": "Needs review"}],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["verdict"] == "warning"
        assert data["result_id"] == result_id
        assert len(data["findings"]) == 1

    def test_compliance_report_links_to_task_result(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        session_data = client.get(
            f"/api/v1/projects/{project_id}/sessions/{session_id}"
        ).json()
        result_id = session_data["task_results"][1]["result_id"]
        client.post(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/results/{result_id}/compliance",
            json={"verdict": "pass", "summary": "OK"},
        )
        updated = client.get(f"/api/v1/projects/{project_id}/sessions/{session_id}").json()
        result = next(r for r in updated["task_results"] if r["result_id"] == result_id)
        assert result["compliance_report_id"] is not None

    def test_returns_422_for_invalid_verdict(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        session_data = client.get(
            f"/api/v1/projects/{project_id}/sessions/{session_id}"
        ).json()
        result_id = session_data["task_results"][0]["result_id"]
        resp = client.post(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/results/{result_id}/compliance",
            json={"verdict": "bad-verdict", "summary": "x"},
        )
        assert resp.status_code == 422

    def test_returns_404_for_missing_result(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.post(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/results/no-such/compliance",
            json={"verdict": "pass", "summary": "x"},
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/sessions/{session_id}/checkpoints
# ---------------------------------------------------------------------------


class TestAddCheckpoint:
    def test_adds_checkpoint_returns_201(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.post(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/checkpoints",
            json={
                "label": "US-2 complete",
                "created_at": "2026-04-03T11:00:00Z",
                "story_id": "US-2",
                "notes": "Second user story done.",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["label"] == "US-2 complete"
        assert data["story_id"] == "US-2"
        assert "checkpoint_id" in data

    def test_checkpoint_persisted_in_session(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        client.post(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/checkpoints",
            json={"label": "US-3 complete", "created_at": "2026-04-03T12:00:00Z"},
        )
        resp = client.get(f"/api/v1/projects/{project_id}/sessions/{session_id}")
        labels = [cp["label"] for cp in resp.json()["checkpoints"]]
        assert "US-3 complete" in labels

    def test_returns_404_for_missing_session(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/projects/proj-x/sessions/no-such/checkpoints",
            json={"label": "CP-1", "created_at": "2026-04-03T10:00:00Z"},
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/sessions/{session_id}/summary
# ---------------------------------------------------------------------------


class TestGetSessionSummary:
    def test_returns_summary_with_counts(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.get(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/summary"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_tasks"] == 2
        assert data["total_checkpoints"] == 1
        assert data["total_compliance_reports"] == 1

    def test_summary_by_status_counts(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.get(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/summary"
        )
        by_status = resp.json()["by_status"]
        assert by_status["success"] == 1
        assert by_status["running"] == 1
        assert by_status["pending"] == 0

    def test_summary_by_verdict_counts(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.get(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/summary"
        )
        by_verdict = resp.json()["by_verdict"]
        assert by_verdict["pass"] == 1
        assert by_verdict["fail"] == 0

    def test_returns_404_for_missing_session(self, client: TestClient) -> None:
        resp = client.get("/api/v1/projects/proj-x/sessions/no-such/summary")
        assert resp.status_code == 404

    def test_summary_contains_all_status_keys(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.get(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/summary"
        )
        by_status = resp.json()["by_status"]
        for s in ("pending", "running", "success", "failure", "skipped"):
            assert s in by_status

    def test_summary_contains_all_verdict_keys(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        project_id, session_id = seeded_session
        resp = client.get(
            f"/api/v1/projects/{project_id}/sessions/{session_id}/summary"
        )
        by_verdict = resp.json()["by_verdict"]
        for v in ("pass", "fail", "warning"):
            assert v in by_verdict


# ---------------------------------------------------------------------------
# Cross-cutting: session persists all sub-resources across reload
# ---------------------------------------------------------------------------


class TestPersistenceRoundTrip:
    def test_session_round_trips_all_entities(
        self, client: TestClient, seeded_session: tuple[str, str]
    ) -> None:
        """Session loaded from disk contains results, compliance reports, checkpoints."""
        project_id, session_id = seeded_session
        resp = client.get(f"/api/v1/projects/{project_id}/sessions/{session_id}")
        data = resp.json()
        assert len(data["task_results"]) == 2
        assert len(data["compliance_reports"]) == 1
        assert len(data["checkpoints"]) == 1
        assert data["compliance_reports"][0]["verdict"] == "pass"
        assert data["checkpoints"][0]["label"] == "US-1 complete"
