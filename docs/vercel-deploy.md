# Deploying the SpecForge API to Vercel

> **TL;DR** – The `src/specforge_api/` directory ships with a ready-to-use
> `vercel.json`, `api/index.py` entry-point, and `requirements.txt`.
> Connect the Vercel project to the GitHub repository, set the **Root
> Directory** to `src/specforge_api`, and click **Deploy**.

---

## Why Vercel? Why 404?

Vercel is a static-site and serverless platform.  Without configuration it
returns **404** for every request because it has no idea that the directory
contains a Python/FastAPI application.  The files added in this guide tell
Vercel:

1. how to **build** the Python package (`vercel.json` → `@vercel/python` runtime)
2. which file is the **entry point** (`api/index.py`)
3. to **rewrite every URL** (`/(.*)`) to that entry point so FastAPI can handle
   the routing

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Vercel account | [vercel.com/signup](https://vercel.com/signup) – free tier is fine |
| GitHub repository access | The `GHDaru/spec-kit` repo must be linked to Vercel |
| Python ≥ 3.11 | Vercel's `@vercel/python` runtime supports this |

---

## Repository layout (relevant files)

```
src/specforge_api/          ← set this as the Vercel Root Directory
├── api/
│   └── index.py            ← Vercel serverless entry point
├── vercel.json             ← Vercel build + routing config
├── requirements.txt        ← Python dependencies for Vercel
├── main.py                 ← FastAPI app factory
├── config.py               ← settings / env vars
├── routers/
│   └── constitution.py     ← API endpoints
└── schemas/
    └── constitution.py     ← Pydantic models
```

---

## Step-by-step deployment

### 1 — Import the project in Vercel

1. Log in to [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Select the **GHDaru/spec-kit** GitHub repository.
3. Click **Import**.

### 2 — Set the Root Directory

In the **Configure Project** screen, expand **Root Directory** and type:

```
src/specforge_api
```

> ⚠️ This is the most common cause of the 404 error.  Without this setting
> Vercel tries to build the entire monorepo as a frontend app and returns 404
> for all API routes.

### 3 — Set environment variables

Click **Environment Variables** and add the variables your app needs.

| Variable | Example value | Description |
|----------|---------------|-------------|
| `SPECFORGE_PROJECTS_ROOT` | `/tmp/projects` | Where constitution files are stored. Vercel functions use an ephemeral `/tmp` filesystem; use an external store (e.g. Vercel KV, Supabase, S3) for persistence across invocations. |

### 4 — Deploy

Click **Deploy**.  Vercel will:

1. Install `specify-cli[api]` from PyPI (declared in `requirements.txt`).
   This single package bundles the `specify_cli` domain library **and** the
   `specforge_api` REST layer.
2. Bundle `api/index.py` as a serverless function using
   `@vercel/python`.
3. Apply the routing rules in `vercel.json` so every request goes to the
   FastAPI app.

---

## Verify the deployment

Once the deployment succeeds, Vercel shows a public URL like
`https://your-project.vercel.app`.

```bash
# Health check — should return the OpenAPI JSON schema
curl https://your-project.vercel.app/openapi.json

# Interactive docs
open https://your-project.vercel.app/docs

# Example API call
curl https://your-project.vercel.app/api/v1/projects/demo/constitution
```

---

## Configuration files explained

### `vercel.json`

```json
{
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.py"
    }
  ]
}
```

| Key | Purpose |
|-----|---------|
| `builds[].src` | Path to the serverless function file, relative to the project root |
| `builds[].use` | Vercel runtime — `@vercel/python` for Python ASGI/WSGI apps |
| `routes[].src` | URL pattern — `/(.*)`  matches every path |
| `routes[].dest` | Forwards matched requests to the FastAPI handler |

### `api/index.py`

```python
from specforge_api.main import app  # exposes the FastAPI ASGI app to Vercel
```

Vercel's `@vercel/python` runtime looks for a variable named `app` (an ASGI
callable) in the entry-point file and wraps it in a serverless handler
automatically.

### `requirements.txt`

```
specify-cli[api]
```

`specify-cli` (the PyPI package) ships **both** `specify_cli` and
`specforge_api`, so a single dependency line is enough.  The `[api]` extra
adds `fastapi`, `uvicorn`, and `pydantic`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| **404 on all routes** | Root Directory not set to `src/specforge_api` | Re-configure the project in Vercel settings → Root Directory |
| **404 on all routes** | Missing or incorrect `vercel.json` | Ensure `vercel.json` is present in `src/specforge_api/` and the route is `"src": "/(.*)"` |
| **500 / import error** | `specify-cli` not installed | Check build logs; confirm `requirements.txt` is present in `src/specforge_api/` |
| **404 on `GET /api/v1/projects/{id}/constitution`** | No constitution file exists for that project | First `POST` to `/api/v1/projects/{id}/constitution` to create it |
| **Constitution data lost between requests** | Vercel functions use an ephemeral filesystem | Set `SPECFORGE_PROJECTS_ROOT` to a persistent store path (see environment variables section) |
| **CORS errors from a frontend** | No CORS middleware configured | Add `fastapi.middleware.cors.CORSMiddleware` to `main.py` with the frontend origin |

---

## Persistent storage considerations

Vercel serverless functions run in an ephemeral environment.  Files written
to the filesystem (`/tmp`) are **not** shared between invocations and are
erased when the function container is recycled.

For production use, replace the file-based constitution store with an
external database or object store.  Options:

| Store | Python library | Environment variable |
|-------|---------------|----------------------|
| Vercel KV (Redis) | `upstash-redis` | `KV_REST_API_URL`, `KV_REST_API_TOKEN` |
| Supabase (Postgres) | `supabase` / `psycopg` | `SUPABASE_URL`, `SUPABASE_KEY` |
| AWS S3 / Cloudflare R2 | `boto3` | `AWS_*` |

---

## Deploying from the repository root (alternative)

If you prefer to deploy the entire repository from the root instead of from
`src/specforge_api`, add a `vercel.json` at the repository root with the
following content:

```json
{
  "builds": [
    {
      "src": "src/specforge_api/api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/specforge_api/api/index.py"
    }
  ]
}
```

And add a `requirements.txt` at the repository root (or symlink to the one
in `src/specforge_api/`).

---

## Related documentation

- [Module 1 Application Guide](module-1-app.md) — local development setup
- [FastAPI documentation](https://fastapi.tiangolo.com/)
- [Vercel Python Runtime](https://vercel.com/docs/functions/runtimes/python)
- [Vercel `vercel.json` reference](https://vercel.com/docs/projects/project-configuration)
