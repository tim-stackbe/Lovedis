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

## Phase 2 — Follow-ups (bewusst NICHT in diesem Iteration)

- **Beidseitiges Self-Input**: Partner bewerten Startups selbst (Partner-Relevanz +
  Use-Case-Wunsch) und Startups bewerten Partner selbst (Startup-Relevanz) über
  eigene, low-overload Masken — mit eigenen Guards (`requirePartner` /
  `requireStartup`) und ggf. einem Merge-/Freigabe-Schritt durchs Team. Die
  Team-gepflegte Matrix bleibt die konsolidierte Sicht.
- Verknüpfung `PartnerCompany` ↔ Partner-`User`s (Zuordnung von Accounts zu
  Unternehmen), sobald Self-Input kommt.
- Historie/Änderungslog je Zelle.
