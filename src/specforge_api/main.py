"""FastAPI application factory for SpecForge API."""

from fastapi import FastAPI

from specforge_api.routers import constitution as constitution_router
from specforge_api.routers import spec as spec_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="SpecForge API",
        description=(
            "REST API for the SpecForge CASE tool — "
            "Module 1: Constitution Engine · Module 2: Specification Studio"
        ),
        version="2.0.0",
    )
    app.include_router(constitution_router.router, prefix="/api/v1")
    app.include_router(spec_router.router, prefix="/api/v1")
    return app


app = create_app()
