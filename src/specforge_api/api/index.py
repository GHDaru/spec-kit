"""Vercel serverless entry point for the SpecForge API.

Vercel's Python runtime discovers this file automatically because it lives in
the ``api/`` directory.  Every inbound request is rewritten here by
``vercel.json``, and Vercel's ASGI adapter forwards it to the FastAPI app.
"""

from specforge_api.main import app  # noqa: F401 - Vercel picks up the ``app`` name

__all__ = ["app"]
