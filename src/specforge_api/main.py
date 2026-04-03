"""FastAPI application factory for SpecForge API."""

from fastapi import FastAPI

from specforge_api.routers import constitution as constitution_router
from specforge_api.routers import spec as spec_router
from specforge_api.routers import plan as plan_router
from specforge_api.routers import tasks as tasks_router
from specforge_api.routers import releases as releases_router
from specforge_api.routers import implement as implement_router
from specforge_api.routers import quality as quality_router
from specforge_api.routers import dashboard as dashboard_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="SpecForge API",
        description=(
            "REST API for the SpecForge CASE tool — "
            "Module 1: Constitution Engine · Module 2: Specification Studio · "
            "Module 3: Architecture Planner · Module 4: Task Forge · "
            "Module 5: Release Manager · Module 6: Implement & Execute · "
            "Module 7: Quality Guardian · Module 8: Project Dashboard"
        ),
        version="8.0.0",
    )
    app.include_router(constitution_router.router, prefix="/api/v1")
    app.include_router(spec_router.router, prefix="/api/v1")
    app.include_router(plan_router.router, prefix="/api/v1")
    app.include_router(tasks_router.router, prefix="/api/v1")
    app.include_router(releases_router.router, prefix="/api/v1")
    app.include_router(implement_router.router, prefix="/api/v1")
    app.include_router(quality_router.router, prefix="/api/v1")
    app.include_router(dashboard_router.router, prefix="/api/v1")
    return app


app = create_app()
