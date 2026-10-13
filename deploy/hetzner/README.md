# Hetzner deployment (Storyblok hybrid)

## How to not lose your changes

**The deploy ships your local working tree, not a commit.** `deploy-platform.sh`
runs `rsync --delete`, so whatever is in your checkout becomes the server state —
and anything *not* in your checkout is deleted there. Uncommitted work that was
deployed on Friday disappears the moment someone deploys a clean tree (this is
exactly how last week's Challenges / Partner Hub edits vanished).

So:

1. **Commit before you deploy.** The deploy now aborts on a dirty tree and lists
   the offending files. Commit them and re-run.
2. **Escape hatch, use sparingly:** `DEPLOY_ALLOW_DIRTY=1 ./deploy/hetzner/deploy-platform.sh`
   deploys uncommitted work and prints a loud warning. The deployed content then
   matches no commit and the next clean deploy silently reverts it.
3. **Push your commits.** The deploy warns (does not block) when your branch has
   commits that are not on its upstream — nobody else could reproduce what's live.
4. **Verify what is actually live** after every deploy:

   ```bash
   curl -s https://app.49.13.222.76.nip.io/api/health
   # {"status":"ok","database":"up","version":"6a0e82a","branch":"Dedalus","deployedAt":"…"}
   ```

   A `-dirty` suffix (`6a0e82a-dirty`) means the live code does not match any
   commit. The deploy script prints this comparison itself at the end, and also
   writes a manifest on the server (`.deployed-version` in the rsync target) with
   the sha, dirty flag, branch, deploying user/host and UTC timestamp.

**Destructive data scripts are guarded.** `prisma/seed.ts` and
`prisma/cleanup-demo-data.ts` delete users, companies and everything attached to
them. Both now refuse to run unless `DATABASE_URL` points at `localhost` /
`127.0.0.1`, print the target host plus exactly what would be destroyed, and
require `I_KNOW_THIS_DELETES_EVERYTHING=1` for any remote database. Never point
them at the TEST box without a `pg_dump` first.

## Database backups

**Status (2026-09-14):** before this date there were **no database backups at all** —
no cron entry, no systemd timer, no dump files anywhere on the host. The old
`backup-postgres.sh` had never run: it sourced a `.env` that does not exist and
called an `aws` CLI that is not installed. It is now rewritten and scheduled.

| | |
|---|---|
| Schedule | twice daily, `17 3,15 * * *` in the server's local Europe/Berlin time (`deploy` user crontab) — 01:17 / 13:17 UTC in summer, 02:17 / 14:17 UTC in winter |
| Runs | `/opt/lovedis/scripts/backup-postgres.sh` |
| Output | `/opt/lovedis/backups/lovedis-<UTC-timestamp>.dump` (+ `.sha256`), mode `600` |
| Format | `pg_dump --format=custom --compress=9` (whole database, all schemas) |
| Retention | every dump from the last 14 days, plus the Sunday dump of the last 8 weeks |
| Log | `/opt/lovedis/logs/backup.log` |
| Off-box copy | **not enabled** — see [Enabling off-box backups](#enabling-off-box-backups) |

The runnable script lives in `/opt/lovedis/scripts/`, *not* in the rsync'd
`platform/` checkout, so an application deploy can never delete or downgrade the
scheduled backup. After changing the script in this repo, re-run the installer to
publish it:

```bash
ssh hetzner-lovedis /opt/lovedis/platform/deploy/hetzner/install-backup-cron.sh
```

The installer is idempotent — re-running updates the script and rewrites the cron
entry instead of adding a duplicate.

Every run refuses to keep a bad dump: it writes to a `.part` file, then checks the
size against `BACKUP_MIN_BYTES` (default 100 KB) and confirms `pg_restore --list`
reports table data for `User`, `Company` and `Program`. Only then is the file moved
into place. A `flock` prevents overlapping runs. Any failure exits non-zero and
prints `[backup FAILED ...]`.

Dump filenames are UTC but the cron schedule is not: Ubuntu's cron ignores
`CRON_TZ`, so crontab times are always the host's local Europe/Berlin time.

### Confirm the schedule is running

```bash
ssh hetzner-lovedis 'crontab -l | grep -A1 lovedis-postgres-backup'
ssh hetzner-lovedis 'tail -20 /opt/lovedis/logs/backup.log'
ssh hetzner-lovedis 'ls -la /opt/lovedis/backups/'
```

A healthy log tail ends with `done: lovedis-<stamp>.dump (N dumps retained, …)`.
If the newest dump is more than ~12 h old, the schedule is not firing.

### List backups

```bash
ssh hetzner-lovedis 'ls -la /opt/lovedis/backups/'
# verify integrity of every dump
ssh hetzner-lovedis 'cd /opt/lovedis/backups && sha256sum -c *.sha256'
```

`latest.dump` is a symlink to the most recent dump.

### Restore to a scratch database (safe — do this to verify a backup)

Runs a throwaway `postgres:18` container on a tmpfs. The live database is never
touched. Set `BASE` to the dump you want to test.

```bash
ssh hetzner-lovedis
BASE=$(readlink /opt/lovedis/backups/latest.dump)

docker run -d --name pg-restoretest \
  -e POSTGRES_USER=lovedis -e POSTGRES_PASSWORD=scratch \
  -e POSTGRES_DB=lovedis_restoretest -e PGDATA=/var/lib/postgresql/data \
  -v /opt/lovedis/backups:/backups:ro \
  --tmpfs /var/lib/postgresql/data:rw,size=512m postgres:18

until docker exec pg-restoretest pg_isready -U lovedis -d lovedis_restoretest; do sleep 1; done

docker exec pg-restoretest pg_restore -U lovedis -d lovedis_restoretest \
  --no-owner --no-privileges "/backups/$BASE"

# spot-check the tables that matter
docker exec pg-restoretest psql -U lovedis -d lovedis_restoretest -c '
  SELECT (SELECT count(*) FROM "User") AS users,
         (SELECT count(*) FROM "Challenge") AS challenges,
         (SELECT count(*) FROM "Program") AS programs,
         (SELECT count(*) FROM "SupportOffering") AS offerings,
         (SELECT count(*) FROM "Company") AS companies;'

# ALWAYS clean up
docker rm -f -v pg-restoretest
```

### Emergency restore over the live database

> **⚠️ This overwrites live data.** Every row created after the dump was taken is
> lost. Do not run it to "check" a backup — use the scratch procedure above for
> that. Take a fresh dump first if the current database is at all salvageable.

```bash
ssh hetzner-lovedis
cd /opt/lovedis

# 1. Capture the current state first — even if it looks broken.
/opt/lovedis/scripts/backup-postgres.sh
BASE=$(readlink /opt/lovedis/backups/latest.dump)   # or pick an older dump

# 2. Stop the app so nothing writes mid-restore. Leave `db` running.
docker compose stop platform

# 3. Restore. --clean --if-exists drops and recreates each object.
docker cp "/opt/lovedis/backups/$BASE" lovedis-db-1:/tmp/restore.dump
docker exec lovedis-db-1 pg_restore -U lovedis -d lovedis \
  --clean --if-exists --no-owner --no-privileges /tmp/restore.dump
docker exec lovedis-db-1 rm -f /tmp/restore.dump

# 4. Bring the app back.
docker compose start platform
```

`pg_restore` prints errors for objects it could not drop; those are usually
harmless on a `--clean` run. A non-zero exit with `error: could not execute query`
on a `COPY` is not harmless — stop and investigate before starting the app.

### Verify a restore succeeded

```bash
# row counts present
ssh hetzner-lovedis 'docker exec lovedis-db-1 psql -U lovedis -d lovedis -c "
  SELECT (SELECT count(*) FROM \"User\") AS users,
         (SELECT count(*) FROM \"Company\") AS companies,
         (SELECT count(*) FROM \"Program\") AS programs;"'

# app healthy and talking to the database
curl -s https://app.49.13.222.76.nip.io/api/health
```

Then log in and confirm a known account and a known Challenge are present.

### Enabling off-box backups

**Current risk: backups sit on `/dev/sda1`, the same disk as the Postgres volume.**
They protect against a bad migration or an accidental delete. They do **not**
protect against loss of the server — that would take the database and every backup
with it. Closing this gap needs a bucket the host can actually reach.

The R2 credentials in `platform.env` are not usable for this: the host cannot
complete a TLS handshake to `<account>.r2.cloudflarestorage.com` over IPv4 or IPv6,
while `s3.amazonaws.com` and `nbg1.your-objectstorage.com` both respond normally.
Hetzner Object Storage in the same region is the path of least resistance.

To enable, create a bucket, then on the server write `/opt/lovedis/backup.env`
(mode `600`, never committed — the script sources it if present):

```bash
ssh hetzner-lovedis
umask 077
cat > /opt/lovedis/backup.env <<'EOF'
BACKUP_S3_BUCKET=lovedis-backups-test
BACKUP_S3_ENDPOINT=https://nbg1.your-objectstorage.com
BACKUP_S3_ACCESS_KEY_ID=<key>
BACKUP_S3_SECRET_ACCESS_KEY=<secret>
EOF
chmod 600 /opt/lovedis/backup.env

# verify: the run should end with "off-box copy confirmed"
/opt/lovedis/scripts/backup-postgres.sh
```

Upload uses the `amazon/aws-cli` container, so no `aws` CLI is needed on the host.
A failed upload fails the whole run loudly rather than passing silently. Set
`BACKUP_S3_PREFIX` to change the key prefix (default `lovedis-postgres`). The
upload path has been tested end-to-end against a local S3 mock — the uploaded
object came back byte-identical and restored cleanly — so all that is missing is
a real bucket and credentials.

Two things to settle when you enable it. Retention is enforced on local dumps
only, so prune the bucket with a lifecycle rule. And these dumps contain real
user records, so an off-box copy should be encrypted at rest — either enable
bucket-level encryption, or pipe through `gpg --symmetric` and store the
passphrase somewhere that survives the server (a lost passphrase is a lost
backup). Local dumps are unencrypted by design: they are `600`-mode on a box
where `deploy` can already read the database.

## Deploy (Cursor agents, Mac, or CI)

```bash
# From repo root
./deploy/hetzner/deploy-platform.sh
# or: npm run deploy:hetzner
```

The script auto-selects a deploy path:

| Path | When | Target | Remote layout |
|---|---|---|---|
| **mac** | Mac with `hetzner-lovedis` in `~/.ssh/config`, or `HETZNER_*` env vars | SSH alias `hetzner-lovedis` | rsync → `/opt/lovedis/platform`, compose at `/opt/lovedis` |
| **cloud** | `SSH_KEY` set, or non-Mac / no SSH alias | `deploy@49.13.222.76` | rsync → `/opt/lovedis`, compose at `/opt/lovedis/deploy/hetzner`, db push + smoke test |

Override with `DEPLOY_MODE=mac` or `DEPLOY_MODE=cloud`.

| Environment | SSH auth |
|---|---|
| **Cursor cloud agent** | `SSH_KEY` in Cursor → Environment → Secrets (deploy user's private key) |
| **Mac desktop** | `~/.ssh/config` host `hetzner-lovedis` (ControlMaster); or `ssh deploy@49.13.222.76` via agent for cloud path |
| **GitHub Actions** | Repo secrets `SSH_HOST`, `SSH_USER`, `SSH_KEY` — see `github-actions-deploy.yml.example` |

**One-time cloud setup:** In [Cursor Environment settings](https://cursor.com/dashboard/cloud-agents/environments), add secret `SSH_KEY` with the full private key for `deploy@49.13.222.76` (PEM/OpenSSH format, including `-----BEGIN … KEY-----` lines). After saving, cloud agents can run `./deploy/hetzner/deploy-platform.sh` automatically.

---

**Current phase: TEST only.** The Hetzner box (`49.13.222.76`) is a staging environment.
**Do not change `lovedis.de` DNS** until the stack passes TEST smoke tests and you explicitly
run production cutover (see below).

| Environment | Homepage | Platform | CMS |
|---|---|---|---|
| **Production (live today)** | `lovedis.de` — existing host (Cloudflare / unchanged) | varies | Storyblok Visual Editor |
| **Hetzner TEST (this deploy)** | `https://home.49.13.222.76.nip.io` | `https://app.49.13.222.76.nip.io` | Storyblok (same space, read via API) |

See the full plan: `docs/architecture/plan-mara-homepage-merge.md`.

## Architecture (TEST)

```text
Hetzner TEST VPS (49.13.222.76)       Storyblok Cloud (EU)
┌──────────────────────────────┐      ┌──────────────────────┐
│ home.*.nip.io  → homepage    │◀─ API│ Visual Editor        │
│ app.*.nip.io   → platform    │      │ Content (unchanged)  │
│ Postgres (platform data)     │      └──────────────────────┘
│ Caddy + TLS (auto, nip.io)   │
└──────────────────────────────┘

lovedis.de  ──▶  NOT pointed here yet (production stays where it is)
```

## Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | `caddy` + `platform` + `homepage` + `db` |
| `Caddyfile` | **Active TEST** routes (`home.*` / `app.*` nip.io) |
| `Caddyfile.production.example` | **Inactive** — `lovedis.de` blocks for future cutover |
| `.env.example` | Platform + Postgres + backup vars → copy to `.env` |
| `homepage.env.example` | Storyblok tokens → copy to `homepage.env` |
| `smoke-test.sh` | Read-only HTTP checks against the TEST URLs |
| `deployment-audit.sh` | Extended smoke + TLS + headers + DNS probe |
| `migrate.sh` | Prisma migrations via one-off Node container (not in app image) |
| `backup-postgres.sh` | Twice-daily validated `pg_dump`, retention + optional S3 upload |
| `install-backup-cron.sh` | Idempotent installer for the backup schedule |
| `github-actions-deploy.yml.example` | CI build + SSH deploy to TEST |

## Deploy / update the TEST stack

**SSH reliability:** The server uses UFW `LIMIT` on port 22 — rapid parallel SSH
(from agents or scripts) triggers temporary `Connection refused`. Admin IP
`87.147.184.12` is whitelisted (UFW + fail2ban). Use `./deploy/hetzner/deploy-platform.sh`
from your laptop; it multiplexes SSH via `~/.ssh/config` (`ControlMaster`).

On the server (`/opt/lovedis/deploy/hetzner`):

```bash
cp .env.example .env                    # first time only; fill secrets
cp homepage.env.example homepage.env    # first time only; Storyblok token
chmod 600 .env homepage.env

# From your Mac (preferred — rsync + server-side build):
./deploy/hetzner/deploy-platform.sh

# Or manually on the server:
docker build --no-cache -t "$PLATFORM_IMAGE" -f Dockerfile /opt/lovedis
docker compose up -d platform
./migrate-db-push.sh

# From your laptop (or on the server):
./smoke-test.sh 49.13.222.76
```

### Env checklist (TEST)

- `NEXTAUTH_URL=https://app.49.13.222.76.nip.io` — must match the public TEST URL
- `PLATFORM_IMAGE` / `HOMEPAGE_IMAGE` — use `:test` tags, not `:latest`
- Storyblok delivery token in `homepage.env` — read-only; same LOVEDIS space as production
- Resend / other API keys — **test-scoped**, distinct from production (see security audit #13)

## Smoke test

```bash
./deploy/hetzner/smoke-test.sh              # default IP 49.13.222.76
./deploy/hetzner/smoke-test.sh <other-ip>   # different test box
```

Checks: platform `/api/health`, login, auth redirect; homepage `/` and `/de`.

Full QA reference: `docs/reports/2026-08-27-hetzner-functional-test.md`.

## Production cutover (later — do not run yet)

Only when TEST is green and you are ready to move real traffic:

1. Confirm stack on nip.io — `./smoke-test.sh` passes, editors happy with Storyblok preview against TEST URLs if configured.
2. Lower TTL on `lovedis.de` DNS to 300 s (24 h ahead).
3. Swap `Caddyfile` TEST blocks for `Caddyfile.production.example` content.
4. Update `.env`: `NEXTAUTH_URL=https://app.lovedis.de`, image tags → `:latest`.
5. Point DNS: `lovedis.de`, `www.lovedis.de`, `app.lovedis.de` → server IP.
6. `docker compose up -d` + reload Caddy; smoke-test production URLs.
7. Decommission old homepage host after a grace period. **Storyblok space stays as-is.**

## Provisioning (new TEST server)

1. **CX32** or **CAX21** (Ubuntu 24.04) + Cloud Volume at `/mnt/pgdata`.
2. Harden: SSH keys, UFW/firewall (22/80/443), fail2ban, unattended-upgrades.
3. Docker + Compose (backups use the `amazon/aws-cli` image — no host `aws` CLI needed).
4. Object Storage bucket for TEST backups (`lovedis-backups-test`).
5. Clone repo → `/opt/lovedis`, copy env files, update `Caddyfile` IP if not `49.13.222.76`.
6. `docker compose up -d` + migrations + `./install-backup-cron.sh`.

## Prerequisites

- **Nuxt homepage repo** — separate from this monorepo; CI builds `HOMEPAGE_IMAGE`.
- **Storyblok delivery token** — LOVEDIS space (`docs/storyblok-baseline/`).
- **SSH access** to the TEST server.

## Paused / not used

- **`cms/` (Payload CMS)** — paused; Storyblok is the active CMS.
- **`lovedis.de` in Caddyfile** — intentionally absent; see `Caddyfile.production.example`.

## Related reports

- `docs/reports/2026-08-27-hetzner-security-audit.md`
- `docs/reports/2026-08-27-hetzner-functional-test.md`
