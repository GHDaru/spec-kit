"""Integration tests for the SpecForge API — Module 3 (Architecture Planner).

These tests exercise all ten REST endpoints via an in-process FastAPI test
client, using a temporary directory as the projects root.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from specify_cli.plan import (
    APIContract,
    APIEndpoint,
    DataModel,
    DataModelEntity,
    EntityField,
    FieldType,
    Plan,
    ProjectStructure,
    ResearchReport,
    ResearchStatus,
    TechStack,
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
    """Create a project with a saved plan; return the project_id."""
    project_id = "beta"
    plan = Plan(project_name="Beta Project", summary="A beta plan.")
    plan.add_tech_stack(
        TechStack(layer="backend", choice="FastAPI", rationale="Async support")
    )
    report = ResearchReport(topic="Database selection", summary="Postgres is recommended")
    report.add_tech_stack(
        TechStack(
            layer="database",
            choice="PostgreSQL",
            rationale="ACID compliance",
            pros=["Reliable"],
            cons=["Complex ops"],
        )
    )
    plan.add_research_report(report)

    dm = DataModel(name="Core Domain")
    entity = DataModelEntity(name="User", description="Application user")
    entity.add_field(EntityField(name="id", field_type=FieldType.UUID, primary_key=True))
    entity.add_field(EntityField(name="email", field_type=FieldType.STRING))
    dm.add_entity(entity)
    plan.set_data_model(dm)

    ac = APIContract(title="Beta API", version="1.0.0")
    ac.add_endpoint(APIEndpoint(path="/users", method="GET", summary="List users", tags=["users"]))
    plan.set_api_contract(ac)

    ps = ProjectStructure(
        root="beta-project",
        description="Monorepo layout",
        tree={"src": {}, "tests": {}},
        annotations={"src": "Source code"},
    )
    plan.set_project_structure(ps)

    path = projects_root / project_id / "plan.yaml"
    plan.save(path)
    return project_id


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/plan
# ---------------------------------------------------------------------------


class TestGetPlan:
    def test_returns_200_with_existing_plan(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/plan")
        assert response.status_code == 200
        data = response.json()
        assert data["project_name"] == "Beta Project"
        assert data["summary"] == "A beta plan."
        assert data["version"] == "1.0.0"

    def test_returns_404_when_plan_missing(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/nonexistent/plan")
        assert response.status_code == 404

    def test_response_includes_tech_stacks(
        self, client: TestClient, seeded_project: str
    ) -> None:
        data = client.get(f"/api/v1/projects/{seeded_project}/plan").json()
        assert len(data["tech_stacks"]) == 1
        ts = data["tech_stacks"][0]
        assert ts["layer"] == "backend"
        assert ts["choice"] == "FastAPI"

    def test_response_includes_research_reports(
        self, client: TestClient, seeded_project: str
    ) -> None:
        data = client.get(f"/api/v1/projects/{seeded_project}/plan").json()
        assert len(data["research_reports"]) == 1
        assert data["research_reports"][0]["topic"] == "Database selection"

    def test_response_includes_data_model(
        self, client: TestClient, seeded_project: str
    ) -> None:
        data = client.get(f"/api/v1/projects/{seeded_project}/plan").json()
        assert data["data_model"] is not None
        assert data["data_model"]["name"] == "Core Domain"

    def test_response_includes_api_contract(
        self, client: TestClient, seeded_project: str
    ) -> None:
        data = client.get(f"/api/v1/projects/{seeded_project}/plan").json()
        assert data["api_contract"] is not None
        assert data["api_contract"]["title"] == "Beta API"

    def test_response_includes_project_structure(
        self, client: TestClient, seeded_project: str
    ) -> None:
        data = client.get(f"/api/v1/projects/{seeded_project}/plan").json()
        assert data["project_structure"] is not None
        assert data["project_structure"]["root"] == "beta-project"


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/plan
# ---------------------------------------------------------------------------


class TestCreatePlan:
    def _payload(self) -> dict:
        return {
            "project_name": "NewProject",
            "summary": "Initial plan",
            "tech_stacks": [
                {
                    "layer": "frontend",
                    "choice": "React",
                    "rationale": "Component-based UI",
                    "alternatives": ["Vue"],
                    "pros": ["Large ecosystem"],
                    "cons": ["Learning curve"],
                }
            ],
        }

    def test_returns_201_and_persists(self, client: TestClient, projects_root: Path) -> None:
        response = client.post("/api/v1/projects/new/plan", json=self._payload())
        assert response.status_code == 201
        assert (projects_root / "new" / "plan.yaml").exists()

    def test_response_body_reflects_data(self, client: TestClient) -> None:
        response = client.post("/api/v1/projects/new/plan", json=self._payload())
        data = response.json()
        assert data["project_name"] == "NewProject"
        assert data["summary"] == "Initial plan"
        assert data["version"] == "1.0.0"
        assert data["tech_stacks"][0]["choice"] == "React"

    def test_created_plan_can_be_retrieved(self, client: TestClient) -> None:
        client.post("/api/v1/projects/ret/plan", json=self._payload())
        response = client.get("/api/v1/projects/ret/plan")
        assert response.status_code == 200
        assert response.json()["project_name"] == "NewProject"

    def test_create_plan_with_full_data(self, client: TestClient) -> None:
        payload = {
            "project_name": "Full",
            "research_reports": [
                {"topic": "Cache layer", "summary": "Redis chosen", "status": "completed"}
            ],
            "data_model": {
                "name": "Domain",
                "entities": [
                    {
                        "name": "Order",
                        "description": "A purchase order",
                        "fields": [
                            {"name": "id", "field_type": "uuid", "primary_key": True}
                        ],
                    }
                ],
            },
            "api_contract": {
                "title": "Full API",
                "endpoints": [
                    {"path": "/orders", "method": "GET", "summary": "List orders"}
                ],
            },
            "project_structure": {
                "root": "full-project",
                "tree": {"src": {}, "docs": {}},
            },
        }
        response = client.post("/api/v1/projects/full/plan", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["research_reports"][0]["topic"] == "Cache layer"
        assert data["data_model"]["entities"][0]["name"] == "Order"
        assert data["api_contract"]["endpoints"][0]["path"] == "/orders"
        assert data["project_structure"]["root"] == "full-project"

    def test_create_plan_with_no_optional_fields(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/projects/bare/plan", json={"project_name": "Bare"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["tech_stacks"] == []
        assert data["research_reports"] == []
        assert data["data_model"] is None
        assert data["api_contract"] is None
        assert data["project_structure"] is None


# ---------------------------------------------------------------------------
# GET/POST /api/v1/projects/{project_id}/plan/research-reports
# ---------------------------------------------------------------------------


class TestResearchReports:
    def test_list_returns_all_reports(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/plan/research-reports")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["topic"] == "Database selection"

    def test_list_returns_404_when_plan_missing(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/ghost/plan/research-reports")
        assert response.status_code == 404

    def test_add_report_returns_201(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {
            "topic": "Message queue",
            "summary": "RabbitMQ vs Kafka evaluation",
            "status": "in_progress",
            "citations": ["https://rabbitmq.com"],
        }
        response = client.post(
            f"/api/v1/projects/{seeded_project}/plan/research-reports", json=payload
        )
        assert response.status_code == 201
        data = response.json()
        assert data["topic"] == "Message queue"
        assert data["status"] == "in_progress"

    def test_add_report_persists(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {"topic": "Auth strategy", "summary": "JWT chosen"}
        client.post(
            f"/api/v1/projects/{seeded_project}/plan/research-reports", json=payload
        )
        reports = client.get(
            f"/api/v1/projects/{seeded_project}/plan/research-reports"
        ).json()
        assert len(reports) == 2
        topics = [r["topic"] for r in reports]
        assert "Auth strategy" in topics

    def test_add_report_returns_404_when_plan_missing(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/projects/ghost/plan/research-reports",
            json={"topic": "T", "summary": "S"},
        )
        assert response.status_code == 404

    def test_add_report_includes_tech_stacks(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {
            "topic": "Storage",
            "summary": "S3 chosen",
            "tech_stacks": [
                {
                    "layer": "storage",
                    "choice": "S3",
                    "rationale": "Managed service",
                }
            ],
        }
        response = client.post(
            f"/api/v1/projects/{seeded_project}/plan/research-reports", json=payload
        )
        assert response.status_code == 201
        assert response.json()["tech_stacks"][0]["choice"] == "S3"


# ---------------------------------------------------------------------------
# GET/PUT /api/v1/projects/{project_id}/plan/data-model
# ---------------------------------------------------------------------------


class TestDataModel:
    def test_get_returns_data_model(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/plan/data-model")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Core Domain"
        assert len(data["entities"]) == 1
        assert data["entities"][0]["name"] == "User"

    def test_get_returns_404_when_plan_missing(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/ghost/plan/data-model")
        assert response.status_code == 404

    def test_get_returns_404_when_data_model_absent(
        self, client: TestClient, projects_root: Path
    ) -> None:
        plan = Plan(project_name="No DM")
        plan.save(projects_root / "nodm" / "plan.yaml")
        response = client.get("/api/v1/projects/nodm/plan/data-model")
        assert response.status_code == 404

    def test_set_data_model_returns_200(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {
            "name": "Updated Model",
            "entities": [
                {
                    "name": "Product",
                    "fields": [
                        {"name": "sku", "field_type": "string", "primary_key": True}
                    ],
                }
            ],
        }
        response = client.put(
            f"/api/v1/projects/{seeded_project}/plan/data-model", json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Model"
        assert data["entities"][0]["name"] == "Product"

    def test_set_data_model_persists(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {"name": "Persisted DM", "entities": []}
        client.put(
            f"/api/v1/projects/{seeded_project}/plan/data-model", json=payload
        )
        response = client.get(f"/api/v1/projects/{seeded_project}/plan/data-model")
        assert response.json()["name"] == "Persisted DM"

    def test_entity_field_attributes_are_preserved(
        self, client: TestClient, seeded_project: str
    ) -> None:
        data = client.get(f"/api/v1/projects/{seeded_project}/plan/data-model").json()
        fields = data["entities"][0]["fields"]
        pk_field = next(f for f in fields if f["primary_key"])
        assert pk_field["name"] == "id"
        assert pk_field["field_type"] == "uuid"


# ---------------------------------------------------------------------------
# GET/PUT /api/v1/projects/{project_id}/plan/api-contract
# ---------------------------------------------------------------------------


class TestAPIContract:
    def test_get_returns_api_contract(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(f"/api/v1/projects/{seeded_project}/plan/api-contract")
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Beta API"
        assert len(data["endpoints"]) == 1

    def test_get_returns_404_when_plan_missing(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/ghost/plan/api-contract")
        assert response.status_code == 404

    def test_get_returns_404_when_api_contract_absent(
        self, client: TestClient, projects_root: Path
    ) -> None:
        plan = Plan(project_name="No AC")
        plan.save(projects_root / "noac" / "plan.yaml")
        response = client.get("/api/v1/projects/noac/plan/api-contract")
        assert response.status_code == 404

    def test_set_api_contract_returns_200(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {
            "title": "Updated API",
            "version": "2.0.0",
            "endpoints": [
                {
                    "path": "/products",
                    "method": "POST",
                    "summary": "Create product",
                    "tags": ["products"],
                }
            ],
        }
        response = client.put(
            f"/api/v1/projects/{seeded_project}/plan/api-contract", json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated API"
        assert data["version"] == "2.0.0"
        assert data["endpoints"][0]["method"] == "POST"

    def test_set_api_contract_persists(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {"title": "Persisted API"}
        client.put(f"/api/v1/projects/{seeded_project}/plan/api-contract", json=payload)
        response = client.get(f"/api/v1/projects/{seeded_project}/plan/api-contract")
        assert response.json()["title"] == "Persisted API"

    def test_endpoint_tags_are_preserved(
        self, client: TestClient, seeded_project: str
    ) -> None:
        data = client.get(f"/api/v1/projects/{seeded_project}/plan/api-contract").json()
        assert "users" in data["endpoints"][0]["tags"]


# ---------------------------------------------------------------------------
# GET/PUT /api/v1/projects/{project_id}/plan/project-structure
# ---------------------------------------------------------------------------


class TestProjectStructure:
    def test_get_returns_project_structure(
        self, client: TestClient, seeded_project: str
    ) -> None:
        response = client.get(
            f"/api/v1/projects/{seeded_project}/plan/project-structure"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["root"] == "beta-project"
        assert data["description"] == "Monorepo layout"
        assert "src" in data["tree"]

    def test_get_returns_404_when_plan_missing(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/ghost/plan/project-structure")
        assert response.status_code == 404

    def test_get_returns_404_when_structure_absent(
        self, client: TestClient, projects_root: Path
    ) -> None:
        plan = Plan(project_name="No PS")
        plan.save(projects_root / "nops" / "plan.yaml")
        response = client.get("/api/v1/projects/nops/plan/project-structure")
        assert response.status_code == 404

    def test_set_project_structure_returns_200(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {
            "root": "updated-project",
            "description": "Updated layout",
            "tree": {"app": {}, "lib": {}, "bin": {}},
            "annotations": {"app": "Main application code"},
        }
        response = client.put(
            f"/api/v1/projects/{seeded_project}/plan/project-structure", json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["root"] == "updated-project"
        assert "app" in data["tree"]
        assert data["annotations"]["app"] == "Main application code"

    def test_set_project_structure_persists(
        self, client: TestClient, seeded_project: str
    ) -> None:
        payload = {"root": "persisted-project"}
        client.put(
            f"/api/v1/projects/{seeded_project}/plan/project-structure", json=payload
        )
        response = client.get(
            f"/api/v1/projects/{seeded_project}/plan/project-structure"
        )
        assert response.json()["root"] == "persisted-project"

    def test_annotations_are_preserved(
        self, client: TestClient, seeded_project: str
    ) -> None:
        data = client.get(
            f"/api/v1/projects/{seeded_project}/plan/project-structure"
        ).json()
        assert data["annotations"]["src"] == "Source code"
