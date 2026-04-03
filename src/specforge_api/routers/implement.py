"""FastAPI router for Implement & Execute (Module 6).

Endpoints
---------
GET  /api/v1/projects/{project_id}/sessions
POST /api/v1/projects/{project_id}/sessions
GET  /api/v1/projects/{project_id}/sessions/{session_id}
PUT  /api/v1/projects/{project_id}/sessions/{session_id}/status
DELETE /api/v1/projects/{project_id}/sessions/{session_id}
POST /api/v1/projects/{project_id}/sessions/{session_id}/results
PUT  /api/v1/projects/{project_id}/sessions/{session_id}/results/{result_id}
POST /api/v1/projects/{project_id}/sessions/{session_id}/results/{result_id}/compliance
POST /api/v1/projects/{project_id}/sessions/{session_id}/checkpoints
GET  /api/v1/projects/{project_id}/sessions/{session_id}/summary

NOTE: Static sub-paths (summary) are registered BEFORE the parameterised
{session_id} routes so FastAPI matches them correctly.
"""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from specify_cli.implement import (
    Checkpoint,
    ComplianceReport,
    ComplianceVerdict,
    ExecutionSession,
    SessionStatus,
    TaskResult,
    TaskResultStatus,
)
from specforge_api.config import Settings, settings as default_settings
from specforge_api.schemas.implement import (
    CheckpointCreateRequest,
    CheckpointSchema,
    ComplianceReportCreateRequest,
    ComplianceReportSchema,
    ExecutionSessionCreateRequest,
    ExecutionSessionSchema,
    SessionListResponse,
    SessionStatusUpdateRequest,
    SessionSummarySchema,
    TaskResultCreateRequest,
    TaskResultSchema,
    TaskResultUpdateRequest,
)

router = APIRouter()


def _get_settings() -> Settings:
    return default_settings


def _sessions_dir(project_id: str, projects_root: Path) -> Path:
    return projects_root / project_id / "sessions"


def _session_path(project_id: str, session_id: str, projects_root: Path) -> Path:
    return _sessions_dir(project_id, projects_root) / f"{session_id}.yaml"


def _load_session_or_404(project_id: str, session_id: str, cfg: Settings) -> ExecutionSession:
    path = _session_path(project_id, session_id, cfg.projects_root)
    try:
        return ExecutionSession.load(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found in project '{project_id}'",
        )


# ---------------------------------------------------------------------------
# Conversion helpers: domain → schema
# ---------------------------------------------------------------------------


def _result_schema(r: TaskResult) -> TaskResultSchema:
    return TaskResultSchema(
        result_id=r.result_id,
        task_id=r.task_id,
        task_title=r.task_title,
        status=r.status.value,
        output=r.output,
        error_message=r.error_message,
        started_at=r.started_at,
        completed_at=r.completed_at,
        compliance_report_id=r.compliance_report_id,
    )


def _report_schema(rpt: ComplianceReport) -> ComplianceReportSchema:
    return ComplianceReportSchema(
        report_id=rpt.report_id,
        result_id=rpt.result_id,
        spec_id=rpt.spec_id,
        verdict=rpt.verdict.value,
        summary=rpt.summary,
        findings=rpt.findings,
    )


def _checkpoint_schema(cp: Checkpoint) -> CheckpointSchema:
    return CheckpointSchema(
        checkpoint_id=cp.checkpoint_id,
        label=cp.label,
        story_id=cp.story_id,
        created_at=cp.created_at,
        notes=cp.notes,
    )


def _session_schema(session: ExecutionSession) -> ExecutionSessionSchema:
    return ExecutionSessionSchema(
        session_id=session.session_id,
        project_id=session.project_id,
        task_list_id=session.task_list_id,
        spec_id=session.spec_id,
        plan_id=session.plan_id,
        agent=session.agent,
        status=session.status.value,
        started_at=session.started_at,
        completed_at=session.completed_at,
        notes=session.notes,
        task_results=[_result_schema(r) for r in session.task_results],
        compliance_reports=[_report_schema(rpt) for rpt in session.compliance_reports],
        checkpoints=[_checkpoint_schema(cp) for cp in session.checkpoints],
    )


# ---------------------------------------------------------------------------
# Session list
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/sessions",
    response_model=SessionListResponse,
    summary="List all execution sessions for a project",
)
def list_sessions(
    project_id: str,
    cfg: Settings = Depends(_get_settings),
) -> SessionListResponse:
    """Return all sessions for *project_id* (empty list if none exist yet)."""
    sessions_dir = _sessions_dir(project_id, cfg.projects_root)
    sessions: list[ExecutionSessionSchema] = []
    if sessions_dir.exists():
        for yaml_file in sorted(sessions_dir.glob("*.yaml")):
            try:
                session = ExecutionSession.load(yaml_file)
                sessions.append(_session_schema(session))
            except Exception:
                continue
    return SessionListResponse(project_id=project_id, sessions=sessions)


# ---------------------------------------------------------------------------
# Create session
# ---------------------------------------------------------------------------


@router.post(
    "/projects/{project_id}/sessions",
    response_model=ExecutionSessionSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new execution session",
)
def create_session(
    project_id: str,
    body: ExecutionSessionCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> ExecutionSessionSchema:
    """Create and persist a new ExecutionSession for *project_id*."""
    session = ExecutionSession(
        project_id=project_id,
        agent=body.agent,
        started_at=body.started_at,
        task_list_id=body.task_list_id,
        spec_id=body.spec_id,
        plan_id=body.plan_id,
        status=body.status,
        notes=body.notes,
    )
    path = _session_path(project_id, session.session_id, cfg.projects_root)
    session.save(path)
    return _session_schema(session)


# ---------------------------------------------------------------------------
# Get session  (must come before sub-resource routes that share the prefix)
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/sessions/{session_id}",
    response_model=ExecutionSessionSchema,
    summary="Get a single execution session",
)
def get_session(
    project_id: str,
    session_id: str,
    cfg: Settings = Depends(_get_settings),
) -> ExecutionSessionSchema:
    """Return a single session by *session_id*, or 404 if absent."""
    session = _load_session_or_404(project_id, session_id, cfg)
    return _session_schema(session)


# ---------------------------------------------------------------------------
# Update session status
# ---------------------------------------------------------------------------


@router.put(
    "/projects/{project_id}/sessions/{session_id}/status",
    response_model=ExecutionSessionSchema,
    summary="Update a session's status",
)
def update_session_status(
    project_id: str,
    session_id: str,
    body: SessionStatusUpdateRequest,
    cfg: Settings = Depends(_get_settings),
) -> ExecutionSessionSchema:
    """Set a new status on *session_id* within *project_id*."""
    try:
        SessionStatus(body.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status '{body.status}'. Must be one of: {[s.value for s in SessionStatus]}",
        )
    session = _load_session_or_404(project_id, session_id, cfg)
    session.update_status(body.status)
    path = _session_path(project_id, session_id, cfg.projects_root)
    session.save(path)
    return _session_schema(session)


# ---------------------------------------------------------------------------
# Delete session
# ---------------------------------------------------------------------------


@router.delete(
    "/projects/{project_id}/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an execution session",
)
def delete_session(
    project_id: str,
    session_id: str,
    cfg: Settings = Depends(_get_settings),
) -> None:
    """Remove the session file for *session_id* in *project_id*."""
    path = _session_path(project_id, session_id, cfg.projects_root)
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found in project '{project_id}'",
        )
    path.unlink()


# ---------------------------------------------------------------------------
# Add task result
# ---------------------------------------------------------------------------


@router.post(
    "/projects/{project_id}/sessions/{session_id}/results",
    response_model=TaskResultSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Add a task result to a session",
)
def add_task_result(
    project_id: str,
    session_id: str,
    body: TaskResultCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> TaskResultSchema:
    """Append a new task result to *session_id* in *project_id*."""
    try:
        TaskResultStatus(body.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status '{body.status}'. Must be one of: {[s.value for s in TaskResultStatus]}",
        )
    session = _load_session_or_404(project_id, session_id, cfg)
    result = TaskResult(
        task_id=body.task_id,
        task_title=body.task_title,
        started_at=body.started_at,
        status=body.status,
        output=body.output,
        error_message=body.error_message,
        completed_at=body.completed_at,
    )
    session.add_task_result(result)
    path = _session_path(project_id, session_id, cfg.projects_root)
    session.save(path)
    return _result_schema(result)


# ---------------------------------------------------------------------------
# Update task result
# ---------------------------------------------------------------------------


@router.put(
    "/projects/{project_id}/sessions/{session_id}/results/{result_id}",
    response_model=TaskResultSchema,
    summary="Update a task result's status and output",
)
def update_task_result(
    project_id: str,
    session_id: str,
    result_id: str,
    body: TaskResultUpdateRequest,
    cfg: Settings = Depends(_get_settings),
) -> TaskResultSchema:
    """Update the status and output of *result_id* in *session_id*."""
    if body.status is not None:
        try:
            TaskResultStatus(body.status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid status '{body.status}'. Must be one of: {[s.value for s in TaskResultStatus]}",
            )
    session = _load_session_or_404(project_id, session_id, cfg)
    result = session.get_task_result(result_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"TaskResult '{result_id}' not found in session '{session_id}'",
        )
    result.update(
        status=body.status,
        output=body.output,
        error_message=body.error_message,
        completed_at=body.completed_at,
    )
    path = _session_path(project_id, session_id, cfg.projects_root)
    session.save(path)
    return _result_schema(result)


# ---------------------------------------------------------------------------
# Add compliance report
# ---------------------------------------------------------------------------


@router.post(
    "/projects/{project_id}/sessions/{session_id}/results/{result_id}/compliance",
    response_model=ComplianceReportSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Attach a compliance report to a task result",
)
def add_compliance_report(
    project_id: str,
    session_id: str,
    result_id: str,
    body: ComplianceReportCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> ComplianceReportSchema:
    """Attach a compliance report to *result_id* in *session_id*."""
    try:
        ComplianceVerdict(body.verdict)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid verdict '{body.verdict}'. Must be one of: {[v.value for v in ComplianceVerdict]}",
        )
    session = _load_session_or_404(project_id, session_id, cfg)
    if session.get_task_result(result_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"TaskResult '{result_id}' not found in session '{session_id}'",
        )
    report = ComplianceReport(
        result_id=result_id,
        verdict=body.verdict,
        summary=body.summary,
        spec_id=body.spec_id,
        findings=body.findings,
    )
    session.add_compliance_report(report)
    path = _session_path(project_id, session_id, cfg.projects_root)
    session.save(path)
    return _report_schema(report)


# ---------------------------------------------------------------------------
# Add checkpoint
# ---------------------------------------------------------------------------


@router.post(
    "/projects/{project_id}/sessions/{session_id}/checkpoints",
    response_model=CheckpointSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Add a checkpoint to a session",
)
def add_checkpoint(
    project_id: str,
    session_id: str,
    body: CheckpointCreateRequest,
    cfg: Settings = Depends(_get_settings),
) -> CheckpointSchema:
    """Append a new checkpoint to *session_id* in *project_id*."""
    session = _load_session_or_404(project_id, session_id, cfg)
    checkpoint = Checkpoint(
        label=body.label,
        created_at=body.created_at,
        story_id=body.story_id,
        notes=body.notes,
    )
    session.add_checkpoint(checkpoint)
    path = _session_path(project_id, session_id, cfg.projects_root)
    session.save(path)
    return _checkpoint_schema(checkpoint)


# ---------------------------------------------------------------------------
# Session summary
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/sessions/{session_id}/summary",
    response_model=SessionSummarySchema,
    summary="Get execution session summary statistics",
)
def get_session_summary(
    project_id: str,
    session_id: str,
    cfg: Settings = Depends(_get_settings),
) -> SessionSummarySchema:
    """Return summary statistics for *session_id* in *project_id*."""
    session = _load_session_or_404(project_id, session_id, cfg)
    s = session.summary()
    return SessionSummarySchema(
        total_tasks=s["total_tasks"],
        by_status=s["by_status"],
        total_compliance_reports=s["total_compliance_reports"],
        by_verdict=s["by_verdict"],
        total_checkpoints=s["total_checkpoints"],
    )
