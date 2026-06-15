# Lovedis — Plattform für Startup-Bewertung & Tech-Scouting

**Lovedis** ist eine Multi-Rollen-Plattform für Venture Scouts (Entdecken → Bewerten →
Pipeline → Berichten) plus eine zweiseitige Kollaborations-Ebene (Challenges, Bewerbungen,
PoC-Tracking, geteilte Scorings), gebaut mit dem Lovedis-Designsystem.

## Tech-Stack

- **Next.js 16** (App Router, Turbopack, RSC + Server Actions), **React 19**, **TypeScript**
- **NextAuth v5** (Credentials-Provider, JWT-Sessions, bcryptjs)
- **PostgreSQL 17** via **Prisma 7** mit dem `@prisma/adapter-pg`-Driver-Adapter
- **Tailwind CSS v4** mit den eigenen Lovedis-Design-Tokens (`lv`-Namespace)
- `lucide-react`, `cmdk`, `recharts`, `@dnd-kit`, Zustand (persistiert), Zod
- Exporte: jsPDF + html2canvas (PDF), xlsx (Excel), papaparse (CSV)

## Loslegen

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Umgebung konfigurieren

```bash
cp .env.example .env
```

Setze `DATABASE_URL`, `NEXTAUTH_SECRET` (z. B. `openssl rand -base64 32`) und `NEXTAUTH_URL`.

### 3. Datenbank

Richte `DATABASE_URL` entweder auf eine beliebige PostgreSQL-17-Instanz **oder** nutze die
mitgelieferte lokale Dev-Datenbank (PostgreSQL-17-Binaries kommen über die
`embedded-postgres`-Dev-Dependency — kein Docker, keine Systeminstallation nötig):

```bash
npm run db:start    # Init (erster Lauf) + Start von Postgres 17 auf localhost:5433
```

Dann das Schema pushen und Demo-Daten seeden:

```bash
npm run db:push
npm run db:seed
```

Oder alle drei Schritte auf einmal: `npm run db:setup`. Die lokale Datenbank stoppst du mit
`npm run db:stop`.

### 4. Starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

## Demo-Konten

Alle geseedeten Konten nutzen das Passwort **`Lovedis2026!`**:

| Rolle | E-Mail | Startseite |
|---|---|---|
| Admin | `admin@lovedis.dev` | `/dashboard/admin` |
| Mitglied (Scout) | `member@lovedis.dev` | `/dashboard/member` |
| Business Partner | `partner@lovedis.dev` | `/dashboard/partner` |
| Investor | `investor@lovedis.dev` | `/dashboard/investor` |
| Startup | `startup@lovedis.dev` | `/dashboard/startup` |

Öffentliche Selbstregistrierung gibt es für Partner (`/auth/signup/partner`) und Startups
(`/auth/signup/startup`).

## Architektur-Notizen

- **Zwei NextAuth-Konfigurationen**: `src/auth.config.ts` ist Edge-tauglich und treibt
  `src/middleware.ts` an (reiner JWT-Check); `src/auth.ts` ergänzt den Credentials-Provider
  mit bcrypt + Prisma-Lookup. Die Rolle reist im JWT mit und ist als `session.user.role`
  verfügbar.
- **Server Actions sind die einzige Schreib-API** (`src/app/actions/*.ts`), nach Domäne
  gruppiert. Jede Action prüft `auth()` + Rolle erneut, validiert mit Zod, schreibt über
  Prisma und ruft `revalidatePath` auf. Die einzigen REST-Routen sind
  `/api/auth/[...nextauth]` und `/api/health`.
- **Rollen-Gating** über `lib/auth-guards.ts` (`requireAuth`, `requireRole`,
  `requireScoutModule`); das Venture-Scout-Modul (`/startups`, `/evaluations`, `/compare`,
  `/pipeline`, `/radar`, `/reports`) ist auf `ADMIN` + `MEMBER` beschränkt.
- **Scoring-Engine** (`lib/scoring.ts` + `lib/constants.ts`): 7 gewichtete Dimensionen →
  gewichteter Gesamtscore (0–5), Potenzial × Machbarkeit → Quadrant (Money Maker / Dreamer /
  Solid Bet / Pass), Empfehlungs-Mapping (`STRONG_YES` … `STRONG_NO`). Persönliche
  Gewichtungs-Overrides liegen im persistierten Zustand-Store (`stores/useAppStore.ts`) und
  werden clientseitig angewendet.
- Der generierte Prisma-Client liegt in `src/generated/prisma/` (gitignored); neu generieren
  mit `npm run prisma:generate`.

## Skripte

| Skript | Zweck |
|---|---|
| `npm run dev` | Dev-Server (Turbopack) |
| `npm run build` / `npm start` | Produktions-Build / Serve |
| `npm run db:start` / `db:stop` | Lokales PostgreSQL 17 |
| `npm run db:push` | Prisma-Schema pushen |
| `npm run db:seed` | Demo-Daten seeden |
| `npm run prisma:generate` | Prisma-Client neu generieren |
| `npm run lint` | ESLint |
