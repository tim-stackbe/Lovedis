# Hetzner deployment (reference)

Single Hetzner Cloud VPS running the unified Lovedis app (marketing + platform + Payload CMS),
PostgreSQL, and Caddy — all via Docker. Media + DB backups go to Hetzner Object Storage.
See the diagram in `docs/architecture/lovedis-architecture.jpg` and the full plan in
`docs/architecture/plan-mara-homepage-merge.md`.

> These are **templates for later** — not wired up yet. Real deploy needs SSH access + secrets.

## Files
- `docker-compose.yml` — caddy + app + postgres.
- `Caddyfile` — auto-TLS + reverse proxy.
- `.env.example` — copy to `.env` on the server, fill secrets.
- `backup-postgres.sh` — nightly encrypted `pg_dump` → Object Storage (run via cron).
- `github-actions-deploy.yml.example` — CI build + SSH deploy (move into `.github/workflows/`).

## Provisioning outline
1. Create a **CX32** (x86) or **CAX21** (ARM) server (Ubuntu 24.04) + attach a **Cloud Volume**, mount at `/mnt/pgdata`.
2. Harden: SSH keys only, `ufw`/Hetzner firewall (allow 22/80/443), non-root user, `fail2ban`, unattended-upgrades.
3. Install Docker + Compose plugin and the `aws` CLI (for backups).
4. Create an **Object Storage** bucket for media and one for backups.
5. Clone the repo to `/opt/lovedis`, `cp deploy/hetzner/.env.example deploy/hetzner/.env`, fill secrets.
6. `docker compose up -d`, then run initial migrations + import (content from Storyblok, data from Neon).
7. Add the backup cron: `0 3 * * * /opt/lovedis/deploy/hetzner/backup-postgres.sh`.
8. Point `lovedis.de` DNS at the server IP; Caddy issues TLS automatically.

## What I need from you to actually deploy
- A Hetzner Cloud server (or a Hetzner API token so I can provision it).
- SSH access (my key authorized).
- DNS control for `lovedis.de`.
- Object Storage credentials (endpoint + access key/secret).
