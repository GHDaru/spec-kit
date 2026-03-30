# SpecForge — Module 1 Constitution Engine: Application Guide

> How to start the **backend API** and the **React frontend** for Module 1.

---

## Overview

Module 1 — Constitution Engine — exposes a REST API built with **FastAPI** and a
**React + Vite** frontend that consumes it. The two processes run independently:

| Process  | Technology     | Default address         |
| -------- | -------------- | ----------------------- |
| Backend  | FastAPI/Uvicorn | `http://localhost:8000` |
| Frontend | Vite (React)   | `http://localhost:5173` |

---

## Prerequisites

| Requirement        | Minimum version | Notes                              |
| ------------------ | --------------- | ---------------------------------- |
| Python             | 3.11            | Enforced in `pyproject.toml`       |
| pip / uv           | latest          | `uv` recommended for speed         |
| Node.js            | 20              | LTS or later                       |
| npm                | 9               | Bundled with Node.js               |

### Install Python dependencies

```bash
# From the repository root
pip install -e ".[api]"
# or with uv (recommended)
uv pip install -e ".[api]"
```

The `[api]` extra installs `fastapi`, `uvicorn`, and `pydantic`.

### Install frontend dependencies

```bash
cd frontend
npm install
```

---

## Starting the Backend API

### 1. Set the projects root (optional)

By default the API looks for constitution files under `./projects/` relative to
where you start the server. Override with an environment variable:

```bash
export SPECFORGE_PROJECTS_ROOT=/path/to/your/projects
```

### 2. Start Uvicorn

```bash
# From the repository root
uvicorn specforge_api.main:app --reload --port 8000
```

The `--reload` flag enables hot-reload on source changes (development only).

Expected output:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [...] using WatchFiles
INFO:     Started server process [...]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 3. Verify the API is running

Open `http://localhost:8000/docs` in your browser — you should see the
auto-generated **Swagger UI** listing all four constitution endpoints.

---

## Starting the Frontend

In a **separate terminal**:

```bash
cd frontend
npm run dev
```

Expected output:

```
  VITE vX.Y.Z  ready in NNN ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open `http://localhost:5173` in your browser.

The development server proxies every `/api/*` request to `http://localhost:8000`,
so the frontend talks to the local API automatically (configured in
`frontend/vite.config.ts`).

---

## Building for Production

```bash
# Build the frontend
cd frontend
npm run build
# Output lands in frontend/dist/

# Serve the built frontend with a static server or mount it in FastAPI:
# e.g. app.mount("/", StaticFiles(directory="frontend/dist", html=True))
```

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### `GET /api/v1/projects/{project_id}/constitution`

Returns the current constitution for the given project.

| Code | Meaning                                |
| ---- | -------------------------------------- |
| 200  | Constitution found — JSON body returned |
| 404  | No `constitution.md` for that project  |

**Example response:**

```json
{
  "project_name": "My API",
  "version": "1.0.0",
  "ratification_date": "2026-01-01",
  "last_amended_date": null,
  "principles": [
    {
      "name": "Test-First",
      "description": "All code must have tests written before implementation.",
      "enforcement_level": "MUST",
      "category": "testing"
    }
  ]
}
```

---

### `POST /api/v1/projects/{project_id}/constitution`

Creates (or overwrites) the constitution for the given project.

**Request body:**

```json
{
  "project_name": "My API",
  "principles": [
    {
      "name": "Test-First",
      "description": "All code must have tests written before implementation.",
      "enforcement_level": "MUST",
      "category": "testing"
    }
  ]
}
```

| Code | Meaning                                  |
| ---- | ---------------------------------------- |
| 201  | Constitution created/saved               |

---

### `POST /api/v1/projects/{project_id}/constitution/check`

Runs a **Compliance Gate** check: validates an artifact Markdown file against
the project's constitution principles.

**Request body:**

```json
{
  "artifact_path": "specs/my-spec.md"
}
```

**Example response:**

```json
{
  "passed": false,
  "blocking_violations": [
    {
      "principle_name": "Test-First",
      "enforcement_level": "MUST",
      "message": "No evidence of test-first approach found in artifact.",
      "line_number": null,
      "is_blocking": true
    }
  ],
  "warning_violations": [],
  "summary": "❌ 1 blocking violation(s) found."
}
```

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| 200  | Check completed (inspect `passed` for result)  |
| 404  | No constitution found for the project          |

---

### `GET /api/v1/projects/{project_id}/constitution/history`

Returns the amendment history (version + dates) for a project's constitution.

| Code | Meaning                                |
| ---- | -------------------------------------- |
| 200  | History returned                       |
| 404  | No constitution found for the project  |

---

## Environment Variables

| Variable                  | Default       | Description                                    |
| ------------------------- | ------------- | ---------------------------------------------- |
| `SPECFORGE_PROJECTS_ROOT` | `./projects`  | Root directory where project folders are stored |

Each project's constitution is stored as:

```
$SPECFORGE_PROJECTS_ROOT/{project_id}/constitution.md
```

---

## Running Tests

```bash
# All tests (from repo root)
pytest

# API integration tests only
pytest tests/test_constitution_api.py -v

# Domain model tests only
pytest tests/test_constitution.py -v
```

---

## Troubleshooting

| Symptom                        | Likely cause                           | Fix                                                   |
| ------------------------------ | -------------------------------------- | ----------------------------------------------------- |
| `ModuleNotFoundError`          | API extras not installed               | Run `pip install -e ".[api]"` from the repo root      |
| Frontend shows network error   | Backend not running                    | Start Uvicorn first (`uvicorn specforge_api.main:app`) |
| 404 on `GET …/constitution`    | Project folder or file doesn't exist   | `POST …/constitution` first to create it              |
| Port 8000 already in use       | Another process on that port           | Add `--port 8001` and update `frontend/vite.config.ts`|

---

## Specification Reference

The full domain analysis, user stories, functional requirements, and acceptance
tests for Module 1 are documented in:

- **Spec**: `specs/001-module-1-constitution-engine/spec.md`
- **Plan**: `specs/001-module-1-constitution-engine/plan.md`
