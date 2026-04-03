"""FastAPI router for Quality Guardian (Module 7).

Endpoints
---------
GET    /api/v1/projects/{project_id}/quality/checklists
POST   /api/v1/projects/{project_id}/quality/checklists
GET    /api/v1/projects/{project_id}/quality/checklists/{checklist_id}
PUT    /api/v1/projects/{project_id}/quality/checklists/{checklist_id}/items/{item_id}
DELETE /api/v1/projects/{project_id}/quality/checklists/{checklist_id}
GET    /api/v1/projects/{project_id}/quality/test-suites
POST   /api/v1/projects/{project_id}/quality/test-suites
GET    /api/v1/projects/{project_id}/quality/test-suites/{suite_id}
GET    /api/v1/projects/{project_id}/quality/reports
POST   /api/v1/projects/{project_id}/quality/reports

NOTE: Static sub-paths (test-suites, reports) are registered BEFORE the
parameterised {checklist_id} / {suite_id} routes so FastAPI matches them
correctly.
"""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

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
from specforge_api.config import Settings, settings as default_settings
from specforge_api.schemas.quality import (
    AnalysisFindingSchema,
    AnalysisReportCreateRequest,
    AnalysisReportListResponse,
    AnalysisReportSchema,
    ChecklistCreateRequest,
    ChecklistItemSchema,
    ChecklistItemUpdateRequest,
    ChecklistListResponse,
    ChecklistSchema,
    TestCaseSchema,
    TestSuiteCreateRequest,
    TestSuiteListResponse,
    TestSuiteSchema,
)

router = APIRouter()


def _get_settings() -> Settings:
    return default_settings


# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------


def _checklists_dir(project_id: str, projects_root: Path) -> Path:
    return projects_root / project_id / "quality" / "checklists"


def _checklist_path(project_id: str, checklist_id: str, projects_root: Path) -> Path:
    return _checklists_dir(project_id, projects_root) / f"{checklist_id}.yaml"


def _suites_dir(project_id: str, projects_root: Path) -> Path:
    return projects_root / project_id / "quality" / "test-suites"


def _suite_path(project_id: str, suite_id: str, projects_root: Path) -> Path:
    return _suites_dir(project_id, projects_root) / f"{suite_id}.yaml"


def _reports_dir(project_id: str, projects_root: Path) -> Path:
    return projects_root / project_id / "quality" / "reports"


def _report_path(project_id: str, report_id: str, projects_root: Path) -> Path:
    return _reports_dir(project_id, projects_root) / f"{report_id}.yaml"


# ---------------------------------------------------------------------------
# Load-or-404 helpers
# ---------------------------------------------------------------------------


def _load_checklist_or_404(project_id: str, checklist_id: str, cfg: Settings) -> Checklist:
    path = _checklist_path(project_id, checklist_id, cfg.projects_root)
    try:
        return Checklist.load(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Checklist '{checklist_id}' not found in project '{project_id}'",
        )


def _load_suite_or_404(project_id: str, suite_id: str, cfg: Settings) -> TestSuite:
    path = _suite_path(project_id, suite_id, cfg.projects_root)
    try:
        return TestSuite.load(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"TestSuite '{suite_id}' not found in project '{project_id}'",
        )


def _load_report_or_404(project_id: str, report_id: str, cfg: Settings) -> AnalysisReport:
    path = _report_path(project_id, report_id, cfg.projects_root)
    try:
        return AnalysisReport.load(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AnalysisReport '{report_id}' not found in project '{project_id}'",
        )


# ---------------------------------------------------------------------------
# Conversion helpers: domain → schema
# ---------------------------------------------------------------------------


def _item_schema(item: ChecklistItem) -> ChecklistItemSchema:
    return ChecklistItemSchema(
        item_id=item.item_id,
        checklist_id=item.checklist_id,
        category=item.category,
        description=item.description,
        status=item.status.value,
        notes=item.notes,
    )


def _checklist_schema(checklist: Checklist) -> ChecklistSchema:
    return ChecklistSchema(
        checklist_id=checklist.checklist_id,
        project_id=checklist.project_id,
        name=checklist.name,
        spec_id=checklist.spec_id,
        created_at=checklist.created_at,
        items=[_item_schema(i) for i in checklist.items],
    )


def _case_schema(case: TestCase) -> TestCaseSchema:
    return TestCaseSchema(
        case_id=case.case_id,
        suite_id=case.suite_id,
        title=case.title,
        case_type=case.case_type.value,
        scenario=case.scenario,
        expected=case.expected,
        tags=case.tags,
    )


def _suite_schema(suite: TestSuite) -> TestSuiteSchema:
    return TestSuiteSchema(
        suite_id=suite.suite_id,
        project_id=suite.project_id,
        feature=suite.feature,
        spec_id=suite.spec_id,
        generated_at=suite.generated_at,
        cases=[_case_schema(c) for c in suite.cases],
    )


def _finding_schema(finding: AnalysisFinding) -> AnalysisFindingSchema:
    return AnalysisFindingSchema(
        finding_id=finding.finding_id,
        report_id=finding.report_id,
        severity=finding.severity.value,
        category=finding.category,
        description=finding.description,
        recommendation=finding.recommendation,
    )


def _report_schema(report: AnalysisReport) -> AnalysisReportSchema:
    return AnalysisReportSchema(
        report_id=report.report_id,
        project_id=report.project_id,
        spec_id=report.spec_id,
        plan_id=report.plan_id,
        analyzed_at=report.analyzed_at,
        findings=[_finding_schema(f) for f in report.findings],
    )


# ===========================================================================
# Checklist endpoints
# ===========================================================================

# ---------------------------------------------------------------------------
# List checklists  — static, must precede parameterised routes
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/quality/checklists",
    response_model=ChecklistListResponse,
    summary="List all quality checklists for a project",
)
def list_checklists(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> ChecklistListResponse:
    """Return all checklists for *project_id* (empty list if none exist yet)."""
    checklists_dir = _checklists_dir(project_id, cfg.projects_root)
    checklists: list[ChecklistSchema] = []
    if checklists_dir.exists():
        for yaml_file in sorted(checklists_dir.glob("*.yaml")):
            try:
                checklist = Checklist.load(yaml_file)
                checklists.append(_checklist_schema(checklist))
            except Exception:
                continue
    return ChecklistListResponse(project_id=project_id, checklists=checklists)


# ---------------------------------------------------------------------------
# Create checklist
# ---------------------------------------------------------------------------


@router.post(
    "/projects/{project_id}/quality/checklists",
    response_model=ChecklistSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new quality checklist",
)
def create_checklist(
    project_id: str,
    body: ChecklistCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> ChecklistSchema:
    """Create and persist a new Checklist for *project_id*."""
    checklist = Checklist(
        project_id=project_id,
        name=body.name,
        created_at=body.created_at,
        spec_id=body.spec_id,
    )
    for item_req in body.items:
        item = ChecklistItem(
            checklist_id=checklist.checklist_id,
            category=item_req.category,
            description=item_req.description,
            notes=item_req.notes,
        )
        checklist.add_item(item)
    path = _checklist_path(project_id, checklist.checklist_id, cfg.projects_root)
    checklist.save(path)
    return _checklist_schema(checklist)


# ---------------------------------------------------------------------------
# Get checklist
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/quality/checklists/{checklist_id}",
    response_model=ChecklistSchema,
    summary="Get a single quality checklist",
)
def get_checklist(
    project_id: str,
    checklist_id: str,
    cfg: Settings = Depends(_get_settings),
) -> ChecklistSchema:
    """Return a single checklist by *checklist_id*, or 404 if absent."""
    checklist = _load_checklist_or_404(project_id, checklist_id, cfg)
    return _checklist_schema(checklist)


# ---------------------------------------------------------------------------
# Update checklist item
# ---------------------------------------------------------------------------


@router.put(
    "/projects/{project_id}/quality/checklists/{checklist_id}/items/{item_id}",
    response_model=ChecklistItemSchema,
    summary="Update a checklist item's status and notes",
)
def update_checklist_item(
    project_id: str,
    checklist_id: str,
    item_id: str,
    body: ChecklistItemUpdateRequest,
    cfg: Settings = Depends(_get_settings),
) -> ChecklistItemSchema:
    """Set a new status (and optionally notes) on *item_id* within *checklist_id*."""
    try:
        ChecklistItemStatus(body.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid status '{body.status}'. "
                f"Must be one of: {[s.value for s in ChecklistItemStatus]}"
            ),
        )
    checklist = _load_checklist_or_404(project_id, checklist_id, cfg)
    item = checklist.update_item(item_id, status=body.status, notes=body.notes)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ChecklistItem '{item_id}' not found in project '{project_id}'",
        )
    path = _checklist_path(project_id, checklist_id, cfg.projects_root)
    checklist.save(path)
    return _item_schema(item)


# ---------------------------------------------------------------------------
# Delete checklist
# ---------------------------------------------------------------------------


@router.delete(
    "/projects/{project_id}/quality/checklists/{checklist_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a quality checklist",
)
def delete_checklist(
    project_id: str,
    checklist_id: str,
    cfg: Settings = Depends(_get_settings),
) -> None:
    """Remove the checklist file for *checklist_id* in *project_id*."""
    path = _checklist_path(project_id, checklist_id, cfg.projects_root)
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Checklist '{checklist_id}' not found in project '{project_id}'",
        )
    path.unlink()


# ===========================================================================
# Test-suite endpoints
# ===========================================================================

# ---------------------------------------------------------------------------
# List test suites  — static, must precede parameterised routes
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/quality/test-suites",
    response_model=TestSuiteListResponse,
    summary="List all test suites for a project",
)
def list_test_suites(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> TestSuiteListResponse:
    """Return all test suites for *project_id* (empty list if none exist yet)."""
    suites_dir = _suites_dir(project_id, cfg.projects_root)
    suites: list[TestSuiteSchema] = []
    if suites_dir.exists():
        for yaml_file in sorted(suites_dir.glob("*.yaml")):
            try:
                suite = TestSuite.load(yaml_file)
                suites.append(_suite_schema(suite))
            except Exception:
                continue
    return TestSuiteListResponse(project_id=project_id, suites=suites)


# ---------------------------------------------------------------------------
# Create test suite
# ---------------------------------------------------------------------------


@router.post(
    "/projects/{project_id}/quality/test-suites",
    response_model=TestSuiteSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new test suite",
)
def create_test_suite(
    project_id: str,
    body: TestSuiteCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> TestSuiteSchema:
    """Create and persist a new TestSuite for *project_id*."""
    for case_req in body.cases:
        try:
            TestCaseType(case_req.case_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Invalid case_type '{case_req.case_type}'. "
                    f"Must be one of: {[t.value for t in TestCaseType]}"
                ),
            )
    suite = TestSuite(
        project_id=project_id,
        feature=body.feature,
        generated_at=body.generated_at,
        spec_id=body.spec_id,
    )
    for case_req in body.cases:
        case = TestCase(
            suite_id=suite.suite_id,
            title=case_req.title,
            case_type=case_req.case_type,
            scenario=case_req.scenario,
            expected=case_req.expected,
            tags=case_req.tags,
        )
        suite.add_case(case)
    path = _suite_path(project_id, suite.suite_id, cfg.projects_root)
    suite.save(path)
    return _suite_schema(suite)


# ---------------------------------------------------------------------------
# Get test suite
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/quality/test-suites/{suite_id}",
    response_model=TestSuiteSchema,
    summary="Get a single test suite",
)
def get_test_suite(
    project_id: str,
    suite_id: str,
    cfg: Settings = Depends(_get_settings),
) -> TestSuiteSchema:
    """Return a single test suite by *suite_id*, or 404 if absent."""
    suite = _load_suite_or_404(project_id, suite_id, cfg)
    return _suite_schema(suite)


# ===========================================================================
# Analysis-report endpoints
# ===========================================================================

# ---------------------------------------------------------------------------
# List reports  — static collection endpoint
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/quality/reports",
    response_model=AnalysisReportListResponse,
    summary="List all analysis reports for a project",
)
def list_reports(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> AnalysisReportListResponse:
    """Return all analysis reports for *project_id* (empty list if none exist yet)."""
    reports_dir = _reports_dir(project_id, cfg.projects_root)
    reports: list[AnalysisReportSchema] = []
    if reports_dir.exists():
        for yaml_file in sorted(reports_dir.glob("*.yaml")):
            try:
                report = AnalysisReport.load(yaml_file)
                reports.append(_report_schema(report))
            except Exception:
                continue
    return AnalysisReportListResponse(project_id=project_id, reports=reports)


# ---------------------------------------------------------------------------
# Create analysis report
# ---------------------------------------------------------------------------


@router.post(
    "/projects/{project_id}/quality/reports",
    response_model=AnalysisReportSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new analysis report",
)
def create_report(
    project_id: str,
    body: AnalysisReportCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> AnalysisReportSchema:
    """Create and persist a new AnalysisReport for *project_id*."""
    for finding_req in body.findings:
        try:
            SeverityLevel(finding_req.severity)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Invalid severity '{finding_req.severity}'. "
                    f"Must be one of: {[s.value for s in SeverityLevel]}"
                ),
            )
    report = AnalysisReport(
        project_id=project_id,
        analyzed_at=body.analyzed_at,
        spec_id=body.spec_id,
        plan_id=body.plan_id,
    )
    for finding_req in body.findings:
        finding = AnalysisFinding(
            report_id=report.report_id,
            severity=finding_req.severity,
            category=finding_req.category,
            description=finding_req.description,
            recommendation=finding_req.recommendation,
        )
        report.add_finding(finding)
    path = _report_path(project_id, report.report_id, cfg.projects_root)
    report.save(path)
    return _report_schema(report)
