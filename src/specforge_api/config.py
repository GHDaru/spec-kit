"""Configuration for the SpecForge API."""

import os
from pathlib import Path


class Settings:
    """Application settings, configurable via environment variables."""

    @property
    def projects_root(self) -> Path:
        """Resolve the projects root path from the environment on each access."""
        return Path(os.environ.get("SPECFORGE_PROJECTS_ROOT", "./projects"))


settings = Settings()
