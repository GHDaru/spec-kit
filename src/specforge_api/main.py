"""FastAPI application factory for SpecForge API."""

from fastapi import FastAPI

from specforge_api.routers import constitution as constitution_router
from specforge_api.routers import plan as plan_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="SpecForge API",
        description="REST API for SpecForge — Constitution Engine (Module 1) and Architecture Planner (Module 3).",
        version="1.0.0",
    )
    app.include_router(constitution_router.router, prefix="/api/v1")
    app.include_router(plan_router.router, prefix="/api/v1")
    return app


app = create_app()
