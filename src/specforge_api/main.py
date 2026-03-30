"""FastAPI application factory for SpecForge API."""

from fastapi import FastAPI

from specforge_api.routers import constitution as constitution_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="SpecForge API",
        description="REST API for the SpecForge Constitution Engine (Module 1).",
        version="1.0.0",
    )
    app.include_router(constitution_router.router, prefix="/api/v1")
    return app


app = create_app()
