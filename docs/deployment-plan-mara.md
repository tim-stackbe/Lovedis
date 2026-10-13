# Deployment-Plan: `mara`-Branch isoliert auf Cloudflare

> **Status:** Planungsdokument. Dieses Dokument beschreibt ausschließlich das Vorgehen.
> Es wird **nichts deployed**, **keine Cloudflare-Ressource verändert** und **kein `wrangler deploy`** ausgeführt.
>
> **Repo:** `/Users/timmeggert/Documents/Lovedis` · **Branch:** `mara`

---

## 1. Ziel & Isolations-Garantien

### Ziel
Den `mara`-Branch der Lovedis-Plattform (Next.js 16 App Router + NextAuth v5 + Prisma 7) als **isoliertes Test-/Staging-Deployment** auf die Cloudflare-Infrastruktur des Teams bringen — **vollständig getrennt** von der bestehenden Live-Homepage `lovedis.de`.

### Harte Rahmenbedingung
**Die Live-Homepage auf `lovedis.de` darf NICHT angefasst werden und muss ohne jede Unterbrechung weiterlaufen.**

### Wie die Isolation technisch garantiert wird
| Dimension | Homepage (Live) | `mara` (isoliert) |
|-----------|-----------------|-------------------|
| Worker-Name | bestehender Homepage-Worker | **neuer, eindeutiger Name** z. B. `lovedis-platform-staging` (alt./ `lovedis-mara`) |
| Hostname | `lovedis.de` / `www.lovedis.de` | **eigener Host**: `*.workers.dev`-Subdomain **oder** dedizierte Subdomain (`mara.lovedis.de` / `app-staging.lovedis.de`) |
| Routes | bestehende Zone-Routes | **keine** Routes auf den Homepage-Pattern; idealerweise gar keine Custom-Route (nur `workers.dev`) |
| Datenbank | Homepage-DB | **separate Neon-DB bzw. separater Neon-Branch** |
| Secrets | Homepage-Secrets | **eigene** Worker-Secrets (eigener Namespace durch eigenen Worker) |

Weil es sich um einen **anderen Worker** mit **anderem Namen**, **eigenen Secrets** und **eigenem Hostnamen** handelt, ist eine technische Überschneidung mit der Homepage ausgeschlossen, solange Option A (siehe unten) gewählt wird.

### Was NICHT angefasst wird ("Hände weg"-Liste)
- ❌ Der bestehende **Homepage-Worker** (kein Edit, kein Re-Deploy, kein Rename).
- ❌ **DNS** für Apex `lovedis.de` und `www.lovedis.de`.
- ❌ Die bestehenden **Worker-Routes** der Homepage (z. B. `lovedis.de/*`, `www.lovedis.de/*`).
- ❌ Die **Datenbank** der Homepage (kein Schema-Push, kein Seed, keine Connection-Wiederverwendung).
- ❌ Vorhandene **Secrets/Variablen** des Homepage-Workers.
- ❌ Zone-weite Einstellungen (SSL/TLS, Page Rules, WAF) der `lovedis.de`-Zone.

---

## 2. Architektur-Optionen für das isolierte Ziel

### Option A — `*.workers.dev`-Subdomain (EMPFOHLEN)
Worker deployt auf die kostenlose `workers.dev`-Subdomain des Accounts:
`https://lovedis-platform-staging.<account>.workers.dev`

- ✅ **Kein DNS-Eingriff** in die `lovedis.de`-Zone → null Risiko für die Homepage.
- ✅ Keine Route-/Custom-Domain-Konfiguration nötig (`workers_dev: true`).
- ✅ Schnellste, risikoärmste Variante für einen isolierten Testlauf.
- ➖ URL ist "technisch" (kein hübscher Custom-Name) — für Staging unkritisch.

### Option B — Dedizierte Subdomain in der bestehenden Zone
Eigene Subdomain (`mara.lovedis.de` oder `app-staging.lovedis.de`) via Worker-Route / Custom Domain.

- ✅ Saubere, sprechende URL.
- ➖ Erfordert **DNS-/Route-Änderung in der Live-Zone** `28a78673…`.
- ⚠️ **Risiko:** Fehlerhafte Route-Pattern (`lovedis.de/*`, `*.lovedis.de/*`) könnten Traffic der Homepage abfangen. Muss strikt auf den exakten Subdomain-Host begrenzt werden (`mara.lovedis.de/*`), niemals Wildcard über die Apex.

### Option C — Komplett separates Cloudflare-Projekt/-Account
Eigener Account oder eigenes Projekt, vollständig getrennt von der Homepage-Zone.

- ✅ Maximale Isolation (auch organisatorisch).
- ➖ Höchster Setup-Aufwand; neuer Account/Billing/Token nötig.

### Empfehlung
**Option A (`*.workers.dev`).** Niedrigstes Risiko, kein Eingriff in DNS/Routes der Live-Zone, schnell umsetzbar. Ein Upgrade auf Option B (eigene Subdomain) ist später additiv möglich, ohne die Homepage zu berühren. Genau diese Variante wurde bereits auf `feat/team-ops` vorbereitet (`workers_dev: true`, **keine** `routes`).

---

## 3. Branch-Vorbereitung (Code) — was von `feat/team-ops` auf `mara` portiert wird

> Die Cloudflare-Vorbereitung existiert auf `feat/team-ops`, **nicht** auf `mara`.
> `mara` = `main` + SSOT + Marketplace. Alle folgenden Änderungen sind **additiv** auf `mara`
> und müssen einen **eigenen, eindeutigen Worker-Namen** verwenden.

### 3.1 Ist-Stand-Abgleich `mara` vs. benötigt

| Datei / Aspekt | Stand auf `mara` | Aktion |
|----------------|------------------|--------|
| `wrangler.jsonc` | **fehlt** | **neu anlegen** (mit neuem Worker-Namen, **ohne** Routes) |
| `open-next.config.ts` | **fehlt** | **neu anlegen** |
| `next.config.ts` | nur `@prisma/client, @prisma/adapter-pg, pg` als external | **erweitern** um Neon-Pakete + `outputFileTracingIncludes` |
| `src/lib/prisma.ts` | **nur lokal** (`PrismaPg`) | **erweitern** um Neon-Adapter-Auswahl im Worker-Runtime |
| `package.json` Scripts | keine `cf:*`-Scripts | **ergänzen** `cf:build`/`cf:preview`/`cf:deploy` |
| `package.json` Deps | kein `@opennextjs/cloudflare`, `@prisma/adapter-neon`, `@neondatabase/serverless` | **ergänzen** |
| `bcryptjs` (Worker-tauglich) | **bereits überall im Einsatz** (`auth.ts`, `actions/auth.ts`, `actions/users.ts`) | ✅ **kein Swap nötig** |
| `/api/health` | **vorhanden** (`SELECT 1`-DB-Check) | für Smoke-Test nutzen |
| `/login` (`(auth)/login`) | **vorhanden** | für Smoke-Test nutzen |

> **Hinweis bcrypt:** Anders als ursprünglich vermutet nutzt `mara` bereits durchgängig `bcryptjs` (reines JS, Workers-kompatibel). Ein Wechsel von `bcrypt` → `bcryptjs` entfällt.

### 3.2 `wrangler.jsonc` (NEU — kritisch für Isolation)
Vorlage von `feat/team-ops`, **mit eindeutigem Worker-Namen und ohne Routes**:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  // ISOLIERTER Staging-Worker. Deployt auf die *.workers.dev-Subdomain.
  // BEWUSST KEINE `route`/`routes` und KEINE Custom-Domain → berührt
  // die Live-Zone lovedis.de und ihr DNS nicht.
  "name": "lovedis-platform-staging",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-06-23",
  "compatibility_flags": ["nodejs_compat"],
  "account_id": "9337dd36d747f2ce704c633efd34fa0f",
  "workers_dev": true,
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

- **Worker-Name MUSS sich vom Homepage-Worker unterscheiden** (`lovedis-platform-staging`, alternativ `lovedis-mara`). Niemals den Homepage-Worker-Namen verwenden — sonst würde dieser überschrieben.
- **Keine `routes`** → kein Eingriff in DNS/Routes der `lovedis.de`-Zone.
- `account_id` referenziert den Team-Account (nicht geheim).

### 3.3 `open-next.config.ts` (NEU)
```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig();
```

### 3.4 `next.config.ts` (ERWEITERN)
Externals um Neon-Pakete ergänzen und das `pg-cloudflare`-Tracing-Workaround übernehmen:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "@prisma/adapter-neon",
    "@neondatabase/serverless",
  ],
  outputFileTracingIncludes: {
    "**/*": [
      "./node_modules/pg-cloudflare/dist/**",
      "./node_modules/pg-cloudflare/esm/**",
    ],
  },
};

export default nextConfig;
```

### 3.5 `src/lib/prisma.ts` (ERWEITERN — Runtime-Switch)
Auf dem Worker den serverlosen **Neon-Adapter** (HTTP/WebSocket, kein TCP) wählen, lokal weiter `PrismaPg`:

```ts
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const isCloudflareWorkers =
  typeof navigator !== "undefined" &&
  navigator.userAgent === "Cloudflare-Workers";

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (isCloudflareWorkers) {
    const adapter = new PrismaNeon({ connectionString, maxUses: 1 });
    return new PrismaClient({ adapter });
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### 3.6 `package.json` (ERGÄNZEN)
**Scripts:**
```jsonc
"prisma:generate": "prisma generate",
"cf:build": "prisma generate && opennextjs-cloudflare build",
"cf:preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
"cf:deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
```
**Dependencies** (Versionen analog `feat/team-ops`):
- `@neondatabase/serverless` (`^1.1.0`)
- `@prisma/adapter-neon` (`^7.8.0`)
- `@opennextjs/cloudflare` (`^1.19.11`, devDependency)

> Installation über die lokale Node-Toolchain in `.tools/node/bin` (siehe Runbook).

---

## 4. Datenbank (Neon)

- **Eigene Datenbank bzw. eigener Neon-Branch** für `mara` — strikt getrennt von allem, was die Homepage nutzt.
- Schema bereitstellen via `prisma db push` gegen die **separate** Neon-Connection (`DATABASE_URL` zeigt auf die Staging-DB/-Branch).
- Demo-Daten via `prisma db seed` (`tsx prisma/seed.ts`).
- **Kein** Schema-/Seed-Lauf gegen eine Homepage-DB. Vor dem Push die Connection-Ziel-Host/-Branch verifizieren.
- Neon-spezifisch: bei `prisma db push` ggf. die **direkte (unpooled)** Connection nutzen; zur Laufzeit auf dem Worker die **pooled** Connection (Neon-Adapter).

---

## 5. Secrets

Alle Secrets werden **ausschließlich** als Worker-Secrets per `wrangler secret put <NAME>` gesetzt — **nie** committet (`.env` ist gitignored). In diesem Dokument nur **Namen/Platzhalter**, keine Werte.

| Secret-Name | Zweck |
|-------------|-------|
| `DATABASE_URL` | Neon-Connection-String der **isolierten** Staging-DB |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | NextAuth v5 Signatur-Secret |
| `NEXTAUTH_URL` | öffentliche Basis-URL des isolierten Hosts (z. B. die `workers.dev`-URL) |
| `AUTH_TRUST_HOST` | `true` (Workers-Runtime, damit NextAuth den Host akzeptiert) |

> `AUTH_SECRET`/`NEXTAUTH_SECRET`: NextAuth v5 akzeptiert beide Namen — konsistent setzen.
> `NEXTAUTH_URL` **muss** exakt der isolierten Deploy-URL entsprechen (sonst Callback-/Redirect-Fehler beim Login).

---

## 6. Cloudflare-Token / Permissions (BLOCKER)

> ⚠️ **Offener Blocker aus vorherigen Versuchen:** Der vorhandene `CLOUDFLARE_API_TOKEN` hatte **nicht** den Scope `Workers Scripts: Edit` für den Ziel-Account. **Vor dem Deploy muss ein Token mit korrektem Scope ausgestellt werden.**

### Benötigte Token-Scopes (gebunden an Account `9337dd36d747f2ce704c633efd34fa0f`)
- **Account → Workers Scripts: Edit** (zwingend — Worker hochladen/aktualisieren)
- **Account → Account Settings: Read** (Account-Auflösung)
- **Account → Workers KV Storage: Edit** (nur falls KV/Inkremental-Cache genutzt wird)
- **Account → Workers R2 Storage: Edit** (nur falls R2-Cache genutzt wird)
- **Zone → Workers Routes: Edit** *(nur für Option B / Custom Domain; für Option A `workers.dev` NICHT nötig)*
- **Zone → DNS: Edit** *(nur für Option B; für Option A NICHT nötig)*

> **Für die empfohlene Option A genügt:** `Workers Scripts: Edit` + `Account Settings: Read` (+ KV/R2 nur bei Bedarf). Es werden **keine** Zone-/DNS-Rechte benötigt → zusätzliche Sicherheit, dass die Homepage-Zone nicht berührt wird.
- Token als `CLOUDFLARE_API_TOKEN` (Env-Var-Name) bereitstellen; **nicht** committen.
- **Verantwortlich:** Person mit Admin-Rechten auf dem Team-Account stellt das Token aus (siehe Offene Punkte).

---

## 7. Schritt-für-Schritt Deploy-Runbook

> Voraussetzung: Node-Toolchain auf den PATH legen, z. B. `export PATH="$PWD/.tools/node/bin:$PATH"`.
> Alle Schritte auf Branch `mara` mit dem **isolierten** Worker-Namen.

1. **Branch prüfen**
   ```bash
   git rev-parse --abbrev-ref HEAD   # => mara
   ```
2. **Code-Prep anwenden** (Abschnitt 3): `wrangler.jsonc`, `open-next.config.ts`, `next.config.ts`, `src/lib/prisma.ts`, `package.json` (Scripts + Deps).
3. **Dependencies installieren**
   ```bash
   npm install
   ```
4. **Prisma Client generieren**
   ```bash
   npm run prisma:generate
   ```
5. **Neon-DB (isoliert) vorbereiten** — `DATABASE_URL` zeigt auf die Staging-DB/-Branch:
   ```bash
   npm run db:push     # prisma db push (Schema)
   npm run db:seed     # Demo-Daten
   ```
6. **OpenNext-Build (Cloudflare)**
   ```bash
   npm run cf:build
   ```
7. **Lokale Preview** (Worker-Runtime via workerd, ohne Deploy)
   ```bash
   npm run cf:preview
   ```
8. **Secrets setzen** (für den isolierten Worker; Werte interaktiv):
   ```bash
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put NEXTAUTH_SECRET
   npx wrangler secret put AUTH_SECRET
   npx wrangler secret put NEXTAUTH_URL
   npx wrangler secret put AUTH_TRUST_HOST
   ```
9. **Deploy auf den isolierten Worker** (erst nach gelöstem Token-Blocker):
   ```bash
   npm run cf:deploy
   ```
   → Ergebnis-URL: `https://lovedis-platform-staging.<account>.workers.dev`
10. **Smoke-Tests** auf der isolierten URL (Abschnitt 8).

---

## 8. Verifikation & Smoke-Tests (nur auf der isolierten URL)

- `GET /api/health` → `200 { status: "ok", database: "up" }` (verifiziert Neon-Anbindung im Worker).
- `GET /login` → Login-Seite lädt (NextAuth-Pages erreichbar).
- Login mit Seed-User → Redirect funktioniert (bestätigt `NEXTAUTH_URL`/`AUTH_TRUST_HOST`).
- Stichprobe Kern-Flows: Feed, Venture/Marketplace laden ohne Server-Fehler.
- **Parallel-Check:** `https://lovedis.de` weiterhin unverändert erreichbar (Homepage unberührt).

---

## 9. Rollback

Da vollständig isoliert, betrifft ein Rollback **nur** den Staging-Worker — **die Homepage bleibt unberührt**:

```bash
npx wrangler delete --name lovedis-platform-staging   # Worker entfernen
```
- Alternativ `workers_dev` deaktivieren bzw. Worker deaktiviert lassen.
- DB-Rollback (Option Neon-Branch): Staging-Branch in Neon löschen.
- **Kein** Eingriff an Homepage-Worker, -Routes oder -DNS nötig oder erwünscht.

---

## 10. Risiken & Mitigationen

| Risiko | Auswirkung | Mitigation |
|--------|------------|------------|
| Worker-Name kollidiert mit Homepage-Worker | Homepage-Worker würde überschrieben | **Eindeutigen Namen** (`lovedis-platform-staging`) verwenden; vor Deploy `wrangler deployments`/Liste prüfen |
| Falsches Route-Pattern (Option B) | Homepage-Traffic abgefangen | **Option A** wählen (keine Routes); falls B: exakt `mara.lovedis.de/*`, nie Apex-/Wildcard |
| `DATABASE_URL` zeigt versehentlich auf Homepage-DB | Datenmischung/Schäden | Vor `db push`/`seed` Ziel-Host/-Branch verifizieren; separater Neon-Branch |
| Token mit Zone-/DNS-Rechten | Unbeabsichtigte DNS-Änderung möglich | Für Option A Token **ohne** Zone-/DNS-Scope ausstellen (least privilege) |
| Secret im Commit | Leak | Nur `wrangler secret put`; `.env` bleibt gitignored; Plan enthält nur Namen |
| Prisma-Driver falsch (TCP statt Neon) | Laufzeitfehler im Worker | Runtime-Switch in `prisma.ts` (Abschnitt 3.5) + Neon-Externals in `next.config.ts` |

---

## 11. Offene Punkte / Entscheidungen für das Team

1. **Hostname:** `*.workers.dev` (Option A, empfohlen) **oder** dedizierte Subdomain (`mara.lovedis.de` / `app-staging.lovedis.de`, Option B)?
2. **Datenbank:** eigener **Neon-Branch** der bestehenden Staging-DB **oder** komplett **eigene Neon-DB**?
3. **Token:** Wer (Account-Admin) stellt den `CLOUDFLARE_API_TOKEN` mit `Workers Scripts: Edit` (+ ggf. KV/R2) für Account `9337dd36…` aus? — **Blocker bis erledigt.**
4. **Persistenz der Code-Prep:** Soll die CF-Prep dauerhaft in `mara` gemerged oder in einem separaten Deploy-Branch gehalten werden?
5. **Worker-Name final:** `lovedis-platform-staging` vs. `lovedis-mara`.

---

### Anhang: Referenz-Quellen
- CF-Prep-Vorlagen: Branch `feat/team-ops` (`wrangler.jsonc`, `open-next.config.ts`, `next.config.ts`, `src/lib/prisma.ts`, `package.json`).
- Vorhandene App-Endpunkte auf `mara`: `src/app/api/health/route.ts`, `src/app/(auth)/login/page.tsx`.
- Account ID: `9337dd36d747f2ce704c633efd34fa0f` · Homepage-Zone ID: `28a78673cd03eca08870118c33955d3b` (Homepage-Routes **nicht** wiederverwenden).
