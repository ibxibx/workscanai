# Docker (local full-stack dev — optional)

This is an **optional, self-contained local development setup**. It is **not** used by
the live deployment.

> **Live architecture:** Vercel (Next.js) → HTTPS → Render (FastAPI) → Turso/libSQL.
> Production does not use Docker, docker-compose, or PostgreSQL.

This compose file spins up an offline equivalent (Next.js + FastAPI + a local
PostgreSQL container) for development without touching the cloud services.

## Usage

Run from **this** `docker/` directory:

```bash
cd docker
docker compose up --build      # first run (builds images)
docker compose up              # subsequent runs
docker compose down            # stop and remove containers
docker compose down -v         # also wipe the database volume
```

The Dockerfiles stay next to the code they build (`../backend/Dockerfile`,
`../frontend/Dockerfile`); only this compose file lives here.

- Frontend: http://localhost:3000
- Backend API + docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432 (internal use)
