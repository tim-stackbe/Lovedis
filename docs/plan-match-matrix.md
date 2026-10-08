# Plan — Match-Matrix

Beidseitige Passung zwischen Startups und Partner-Unternehmen auf einen Blick.
Spiegelt die geteilte Google-Sheet-„Matrix"-Tabelle wider und macht sie
datengetrieben, filterbar und team-pflegbar — bei identischem Look zur bisherigen
statischen Design-Vorschau.

Zugriff: **team-only** (`requireScoutModule` = ADMIN + MEMBER). Die Matrix enthält
interne Cross-Partner-Daten und ist **nicht** für Partner/Startups/Investoren
sichtbar. Der Nav-Eintrag „Match-Matrix" lebt dauerhaft in der Venture-Scout-
Sektion (`src/lib/roles.ts`).

## Datenmodell (additiv)

Neu in `prisma/schema.prisma` (bestehende `PartnerStartupReview` = Screening-
Verdikt eines Partner-**Users** bleibt unangetastet):

- `enum RelevanceLevel { HIGH, MEDIUM, LOW }` (Hoch/Mittel/Niedrig)
- `enum MatchUseCaseType { PILOT, CO_DEVELOPMENT, CUSTOMER_RELATION, WHITE_LABEL, TECH_LICENSE, SPARRING }`
- `enum MatchContactStatus { NONE, IN_CONTACT, FOLLOW_UP, PILOT_AGREED }`
- `model PartnerCompany { id, name @unique, slug @unique, sortOrder, … }`
- `model PartnerStartupMatch { id, partnerId→PartnerCompany, startupId→Startup, startupRelevance?, partnerRelevance?, useCaseTypes[], useCaseNote?, nextSteps?, contactStatus, updatedById?→User, … @@unique([partnerId, startupId]) }`

### Partner-Identität — Entscheidung: `PartnerCompany`

Die Sheet-Partner (FingerHaus, Lupp, Weimer, INNEXIS, Sälzer) sind **Unternehmen**,
nicht (zwingend existierende) `User`-Konten. Wir modellieren sie als eigenes,
leichtgewichtiges `PartnerCompany` (name/slug), auf das die Matrix referenziert.
Vorteile:

- Die Matrix funktioniert unabhängig davon, ob Partner-User-Accounts existieren.
- Das Sheet ist ohnehin unternehmens-, nicht personenbezogen.
- `PartnerStartupReview` (personenbezogenes Verdikt) bleibt sauber getrennt.

Natürlicher Schlüssel für Idempotenz: `PartnerCompany.slug`
(fingerhaus/lupp/weimer/innexis/saelzer) und `PartnerStartupMatch @@unique([partnerId, startupId])`.

Label-Maps in `src/lib/constants.ts` (`RELEVANCE_LABELS`, `MATCH_USE_CASE_LABELS`,
`MATCH_CONTACT_STATUS_LABELS`) + passende Badges in
`src/components/shared/badges.tsx` (`RelevanceBadge`, `MatchUseCaseBadge`,
`MatchContactStatusBadge`).

## Server Actions

`src/app/actions/match-matrix.ts` (Zod + `firstZodError` + `ActionState` +
`revalidatePath` + P2025 via `isRecordNotFoundError`), guarded by
`requireScoutModule`:

- `upsertMatchCell(prevState, formData)` — Upsert auf `@@unique([partnerId, startupId])`,
  setzt `updatedById`. Atomar/idempotent. Prüft beide Fremdschlüssel vorab und
  gibt freundliche Fehlermeldungen zurück.

Das Team pflegt die Matrix (MVP). **Partner-/Startup-Self-Input ist bewusst NICHT
gebaut** — siehe Phase 2.

## UI

- `src/app/(main)/match-matrix/page.tsx` (RSC): lädt `PartnerCompany` +
  `PartnerStartupMatch` aus der DB, baut das View-Model (Zeilen = Startups mit
  mind. einer Match-Row, Spalten = die 5 Partner in `PARTNER_COMPANIES`-Reihenfolge),
  berechnet Banner-Stats und rendert `HeroBanner` + `MatchMatrixBoard`.
- `MatchMatrixBoard.tsx` (Client): identisches Design (RelPill S/P, Use-Case-Chips,
  Kontakt-Status-Badge + `nextSteps`-Zeile, „—" bei leer, Top-Match-Highlight
  `bg-lv-mint/30` wenn beide HIGH). Responsive Desktop-Tabelle + Mobile-Stacked.
  - **Funktionale Filter** (client state): Partner-Auswahl (blendet Spalten aus),
    Use-Case-Typ, Toggle „Nur beidseitig Hoch". Logik in `src/lib/match-matrix.ts`
    (`filterRows`, `cellPassesContentFilters`) — unit-getestet.
  - **Edit-Affordance**: Zelle anklicken → Dialog mit kleinem Formular
    (S/P-Relevanz, Use-Case-Checkboxen, Kontakt-Status, Notiz, nächster Schritt)
    → `upsertMatchCell` (via `useActionState`), Erfolg → Toast + `router.refresh()`.

## Import / Seed

Quelle: `prisma/data/match-matrix.csv` (1:1-Kopie des „Matrix"-Tabs; Re-Fetch:
`curl -sL ".../export?format=csv&gid=1459693264"`). Parser + Apply-Helper in
`src/lib/match-matrix-import.ts` (Node-only, papaparse):

Mapping:
- Relevanz: Hoch→HIGH, Mittel→MEDIUM, Niedrig→LOW.
- Use-Case (Freitext → `useCaseTypes`): Pilotprojekt/„Pilotprojket"-Tippfehler→PILOT,
  Co-Development→CO_DEVELOPMENT, Kundenbeziehung→CUSTOMER_RELATION,
  White-label→WHITE_LABEL, Technologielizenz→TECH_LICENSE, Sparring→SPARRING.
  Original-Text bleibt in `useCaseNote`.
- Kontakt-Status (aus „Next steps" + „Intro Mail / Calls"): „Pilot … vereinbart"→
  PILOT_AGREED, „Folgetermin/Call/Termin"→FOLLOW_UP, „in Kontakt/im Loop"→IN_CONTACT,
  sonst NONE. „Next steps" (+ evtl. Intro-Text) landet in `nextSteps`.

**Startup-Matching**: per Name gegen bestehende `Startup`-Rows. Sheet-Startups, die
es (noch) nicht gibt, werden als **minimale `Startup`-Rows angelegt** (Entscheidung:
create statt skip, damit die Matrix voll funktioniert; Platzhalter-`description`/
`industry` markieren, dass das Profil noch anzureichern ist). Startups ohne Daten
im Sheet werden übersprungen und berichtet.

- `prisma/seed.ts` ruft `applyMatchMatrix(prisma, member.id)` (nach dem Wipe von
  `partnerStartupMatch` + `partnerCompany`).
- `prisma/apply-match-matrix.ts` — idempotentes Standalone-Sync (Upsert per
  slug + `@@unique([partnerId, startupId])`), gefahrlos re-runbar.
- `prisma/migrate-match-matrix.ts` — idempotentes Migrations-Skript (Pattern:
  `prisma/migrate-credit-buckets.ts`): `prisma db push` (fügt Enums/Tabellen
  additiv hinzu) + anschließend `applyMatchMatrix`.

### Auf die Neon-Test-DB anwenden (später, additiv/non-destruktiv)

```
export PATH="$PWD/.tools/node/bin:$PATH"
DATABASE_URL=<neon-test-url> npx tsx prisma/migrate-match-matrix.ts   # push + befüllen
# oder, wenn das Schema schon existiert:
DATABASE_URL=<neon-test-url> npx tsx prisma/apply-match-matrix.ts     # nur Daten-Upsert
```

## Tests

`tests/unit/match-matrix.test.ts`: Relevanz-Mapping, Use-Case-Parsing (inkl.
kombiniert + „Pilotprojket"-Tippfehler), Kontakt-Status-Ableitung, Top-Match
(beide HIGH), Filter-Logik, und `parseMatchMatrixCsv` gegen das echte Sheet
(Anzahl, übersprungene Startups, konkrete Mappings).

## Phase 2 — Zwei-seitige Matrix (UMGESETZT)

Aus der team-only Matrix wurde ein **beidseitiges Matchmaking-Tool**: Partner und
Startups pflegen jeweils **ihre eigene Seite**, isoliert von den Stimmen anderer
Partner. Das Team sieht beide Seiten + Audit und teilt Longlists gezielt.

### Datenmodell (additiv, `prisma/schema.prisma`)

`PartnerStartupMatch` behält die Team-Sicht (`useCaseTypes`, `useCaseNote`,
`nextSteps`, `contactStatus`) und `startupRelevance`/`partnerRelevance` als
Headline und bekommt **zwei getrennte Self-Service-Gruppen**:

- Startup-Seite: `startupUseCaseTypes[]`, `startupUseCaseNote`, `startupFollowUp`,
  `startupOpenQuestions`, `startupNotes`, `startupContacted`, `startupUpdatedAt`,
  `startupUpdatedById`.
- Partner-Seite: analog `partner*`.

Weiter:
- `PartnerCompany.companyId String? @unique → Company` (verknüpft eine Matrix-
  Spalte mit einem echten Partner-Login-Konto; `Company.matrixColumn` Gegenseite).
- `model MatrixShare { partnerCompanyId, startupId, sharedById?, note?, @@unique }`
  — Team teilt eine Longlist von Startups mit **einem** Partner (spiegelt
  `SharedScoring`).

Migration: `prisma/migrate-two-sided-matrix.ts` (`prisma db push --accept-data-loss`
für den neuen UNIQUE auf der all-null-Spalte `companyId`, dann Backfill der
Startup-Seite aus den Team-Feldern).

### Zugriff & Isolation

- **Team** (`/match-matrix`, `requireScoutModule`): volles Grid, beide Seiten +
  Audit-Zeitstempel im Detail-Drawer, plus **Longlist-Freigabe-Toggle** je Zelle.
- **Partner** (`/matrix`): sieht nur die ihm **freigegebenen** Startups (via
  `MatrixShare` oder bereits vorhandene Zelle) und pflegt ausschließlich seine
  Partner-Seite; sieht die Startup-Seite der eigenen Paarungen (das gegenseitige
  Bild), **nie** andere Partner. Auflösung `Company → PartnerCompany`.
- **Startup** (`/matrix`): sieht alle Partner-Unternehmen, pflegt seine
  Startup-Seite, sieht die Partner-Seite der eigenen Paarungen.

Guards: `src/lib/matrix-guards.ts` (`requireMatrixPartner`/`requireMatrixStartup`
als Page-Guards, `authorizeMatrixPartner`/`authorizeMatrixStartup` als
Action-Guards). Server Actions: `src/app/actions/matrix.ts`
(`upsertPartnerSideCell`, `upsertStartupSideCell` — die editierende Partei wird
**aus der Session** aufgelöst, nie aus dem Formular; `shareStartupWithPartner`,
`unshareStartupFromPartner`). Reusable UI: `src/components/matrix/SelfServiceMatrix.tsx`.

### Matching

Kombiniert über `mutualFitLevel()`/`isTopMatch()` (beide HIGH). Neue reine Helfer
in `src/lib/match-matrix.ts`: `MatchSideInput`, `sideHasInput`, `coordState`
(`matched`/`awaiting`/`todo`/`none`) — unit-getestet.

## Echt-Daten-Cutover (nur echte Daten)

- `prisma/import-matrix-sheet.ts`: importiert die **Live-Tabs** des Sheets
  `Matrix_Matchmaking_TMC_2026` (MATRIX-Master via `applyMatchMatrix`, 12
  Startup-Fragebögen → Startup-Seite, 3 Partner-Fragebögen → Partner-Seite).
  Spalten werden per **Header-Text** aufgelöst (Layouts unterscheiden sich),
  Helfer (`parseQuestionnaireTable`, `parseTriBool`, `resolvePartnerSlug`,
  `normalizeMatchKey`) liegen in `match-matrix-import.ts` und sind unit-getestet.
- `prisma/link-partner-companies.ts`: legt je `PartnerCompany` ein echtes
  `Company`-Konto an und verknüpft es (Partner-Personen kommen über den
  bestehenden Invite-Flow herein).
- `prisma/cleanup-demo-data.ts` (nur mit `CONFIRM_CLEANUP=1`): **behält** Admin
  (`admin@lovedis.dev`), die verknüpften Partner-`Company`s, die Matrix-Startups
  und alle `PartnerStartupMatch`/`MatrixShare`; **löscht** alle übrigen Demo-Nutzer,
  Demo-Startups und ihre abhängigen Datensätze, Demo-Firmen, den Marktplatz-
  Katalog und die SSOT-Demo-Inhalte.
- `prisma/seed.ts` ist hinter `SEED_DEMO=1` gated (Default aus), damit Fake-Daten
  nicht erneut entstehen; Produktion führt den Seed nie aus.

Reihenfolge (lokal verifiziert):
```
export PATH="$PWD/.tools/node/bin:$PATH"
DATABASE_URL=<ziel> npx tsx prisma/migrate-two-sided-matrix.ts
DATABASE_URL=<ziel> npx tsx prisma/import-matrix-sheet.ts
DATABASE_URL=<ziel> npx tsx prisma/link-partner-companies.ts
# Backup zuerst! Dann:
CONFIRM_CLEANUP=1 DATABASE_URL=<ziel> npx tsx prisma/cleanup-demo-data.ts
```

## Tests (erweitert)

Zusätzlich zu den bisherigen: `sideHasInput`, `coordState`, `parseTriBool`,
`resolvePartnerSlug` und `parseQuestionnaireTable` (Startup- **und** Partner-Tab-
Layout inkl. verschobener „Sonstige Anmerkungen"-Spalte).

## Phase 3 — Batch-scoped Matrices (Dedalus)

Jede Match-Matrix gehört jetzt zu genau **einem Batch** (Programm) — Accelerator,
Industrieprogramm oder Sonstiges. Nur die einem Batch zugewiesenen Startups
werden von den diesem Batch zugewiesenen Partner-Unternehmen bewertet.

Datenmodell:
- `BatchType`-Enum (`ACCELERATOR`, `INDUSTRIEPROGRAMM`, `SONSTIGES`) auf
  `ScoutingCampaign` (= „Batch"); zusätzlich `ScoutingCampaign.type`.
- Neue M:N-Join-Tabellen `BatchStartup` (Zeilen der Matrix) und `BatchPartner`
  (Spalten, mit `sortOrder`).
- `PartnerStartupMatch.batchId` (required) + neuer Unique-Key
  `@@unique([batchId, partnerId, startupId])` — dieselbe Paarung kann in mehreren
  Batches unabhängig bewertet werden.
- `MatrixShare` entfällt: die frühere „Longlist-Freigabe" ist jetzt die
  Batch-Mitgliedschaft (Admin weist Startups **und** Partner je Batch zu).

Autorisierung (`src/lib/matrix-guards.ts`): jede Self-Service-Bearbeitung ist an
die Batch-Mitgliedschaft gebunden (`batchHasPartner` / `batchHasStartup`).
Partner sehen weiterhin nur ihre eigene Spalte, Startups nur ihre eigene Zeile.

Oberflächen:
- Admin: `/batches` (Liste + Anlegen) und `/batches/[id]` (Eckdaten, Startups &
  Partner zuweisen). Actions in `src/app/actions/matrix.ts`:
  `createBatch`, `updateBatch`, `deleteBatch`, `setBatchStartup`, `setBatchPartner`.
- Team: `/match-matrix?batch=<id>` mit Batch-Auswahl; das Grid ist batch-scoped.
- Partner/Startup: `/matrix` gruppiert die Matrix je Batch, dem man angehört.

Migration (`prisma/migrate-batch-matrices.ts`, idempotent):
```
export PATH="$PWD/.tools/node/bin:$PATH"
DATABASE_URL=<ziel> npx tsx prisma/migrate-batch-matrices.ts
```
Bootstrappt `batchId` NULLABLE, legt den Standard-Batch „Love Disruption 2026"
an, ordnet alle bestehenden Zellen zu, setzt `NOT NULL`, führt dann `prisma db
push` aus (Join-Tabellen, FK, Unique-Key-Tausch, Drop `MatrixShare`) und trägt
zuletzt die Batch-Mitgliedschaften aus den vorhandenen Zellen nach.

## Phase 4 — Follow-ups

- Historie/Änderungslog je Zelle (aktuell nur `*UpdatedAt`-Zeitstempel).
- Fehlende Partner-Fragebögen (FingerHaus, Lupp) importieren, sobald im Sheet gepflegt.
- Batch-übergreifende Auswertung (z. B. „welche Startups sind in mehreren Batches Top-Match?").
