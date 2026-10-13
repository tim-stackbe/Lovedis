# Build-Plan: Badge/Cohort-Fundament (Zugriffs-Scoping je Batch)

> **Status:** Detaillierter Umsetzungsplan (Code folgt erst nach Entscheidung #1, siehe `docs/decisions-mara-feedback.md`). Stand: Juli 2026 · Branch: `mara`.
> **Bezug:** Setzt Punkt 1.11 aus `docs/plan-mara-user-feedback.md` und §2.1/§2.2 aus `docs/plan-partner-platform-vision.md` um.
> **Ziel:** Die eine architektonische Grundlage schaffen, an der fast alle offenen Feedback-Wünsche hängen: **Batches/Kohorten mit Mitgliedschaft und Zugriffs-Scoping** — bewusst **minimal** („don't go all out").

---

## 1. Warum dieses Fundament zuerst?

Heute läuft **jede** Sichtbarkeit über zwei Achsen:
- **Rolle** (`UserRole` in `src/lib/roles.ts` + Guards in `src/lib/auth-guards.ts`), und
- bei Inhalten zusätzlich **`ContentAudience`** (`PARTNER`/`STARTUP`/`BOTH`).

Es gibt **keine** dritte Achse „gehört zu Batch X". `ScoutingCampaign` (`prisma/schema.prisma`) bündelt Startups (`Startup.campaignId`), ist aber **nicht zugriffsbeschränkend** und kennt **keine Partner-Mitgliedschaft**. Damit sind heute unmöglich:

- „Partner sieht **nur** Startups seines Batches" (1.11),
- „Partner sieht die Batch-Info in seiner Übersicht" (1.11),
- Batch-gescopte Roadmap/Material/Teilnehmerliste (1.2/1.14),
- gezielte Batch-Einladung von Startups (1.10),
- eine geführte Journey-Sicht **je Kohorte** (1.14).

**Alle diese Wünsche hängen an einem Membership-Modell.** Deshalb ist es der erste Baustein.

---

## 2. Scope (bewusst minimal)

**In-Scope (dieser Slice):**
1. Modell `Cohort` (= „Batch"/„Accelerator-Badge") + `CohortMembership` (Partner-User **und** Startups je Kohorte).
2. Ein **Scoping-Layer** (`src/lib/cohorts.ts`) mit Helferfunktionen: „In welchen Kohorten ist dieser User?", „Welche Startups/Partner sind in Kohorte X?".
3. Minimale **Team-Pflege-UI** (`/cohorts`, team-only): Kohorten anlegen, Mitglieder (Partner/Startups) zuordnen/entfernen.
4. **Ein sichtbarer Außeneffekt** als Proof: Partner sehen auf ihrem Dashboard **ihre Kohorte(n)** + die Startups darin (read-only, kuratierte Felder).

**Explizit NICHT in diesem Slice** (Folge-Slices):
- Kein Umbau der bestehenden globalen Rollensicht (Badge-Scoping kommt **additiv** dazu — siehe Entscheidung #1).
- Kein Badge-Scoping von Roadmap/Material/Marketplace (das ist der **nächste** Slice, sobald das Fundament steht).
- Kein Multi-Tenant-Rechtesystem, keine Badge-Rollen jenseits „Partner/Startup".

---

## 3. Datenmodell (additiv, non-destruktiv)

Neu in `prisma/schema.prisma`. `ScoutingCampaign` bleibt vorerst unangetastet (Migrationspfad in §7).

```prisma
enum CohortMemberRole {
  PARTNER   // ein Business-Partner-User in der Kohorte
  STARTUP   // ein Startup in der Kohorte
}

model Cohort {
  id          String   @id @default(cuid())
  name        String                       // "Construction Badge 2026"
  slug        String   @unique             // "construction-2026"
  description String?
  startDate   DateTime?
  endDate     DateTime?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  memberships CohortMembership[]

  @@index([isActive])
}

model CohortMembership {
  id        String           @id @default(cuid())
  cohortId  String
  cohort    Cohort           @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  role      CohortMemberRole

  // Genau eines von beiden ist gesetzt, je nach `role`.
  userId    String?          // Partner-User (role = PARTNER)
  user      User?            @relation("CohortUser", fields: [userId], references: [id], onDelete: Cascade)
  startupId String?          // Startup (role = STARTUP)
  startup   Startup?         @relation("CohortStartup", fields: [startupId], references: [id], onDelete: Cascade)

  createdAt DateTime         @default(now())

  @@unique([cohortId, userId])
  @@unique([cohortId, startupId])
  @@index([cohortId])
  @@index([userId])
  @@index([startupId])
}
```

Gegenseiten (Back-Relations) additiv ergänzen:
- `model User { … cohortMemberships CohortMembership[] @relation("CohortUser") }`
- `model Startup { … cohortMemberships CohortMembership[] @relation("CohortStartup") }`

**Warum `Cohort` neu und nicht `ScoutingCampaign` erweitern?** `ScoutingCampaign` ist heute rein team-intern (Startup-Bündelung, kein Zugriffs-Scoping, keine Partner). Ein sauberes `Cohort` mit `CohortMembership` trennt „Zugriffs-relevante Kohorte" klar von „Team-Sourcing-Kampagne" und vermeidet, bestehendes Verhalten umzudeuten. §7 beschreibt die optionale spätere Zusammenführung.

**Warum Partner als `User` statt `PartnerCompany`?** Zugriff hängt an Login-Accounts (`User`). `PartnerCompany` (existiert für die Match-Matrix) ist unternehmens-, nicht account-bezogen. Optional kann `CohortMembership` später ein `partnerCompanyId` bekommen; für Scoping zählt der `User`.

---

## 4. Scoping-Layer (`src/lib/cohorts.ts`)

Zentrale, testbare Helfer — analog zu `src/lib/ssot.ts`/`src/lib/roles.ts`:

```ts
/** Kohorten-IDs, in denen ein Partner-User Mitglied ist. */
export async function cohortIdsForUser(userId: string): Promise<string[]>;

/** Startup-IDs, die in denselben Kohorten wie der User sind (Partner-Sicht). */
export async function startupIdsVisibleToPartner(userId: string): Promise<string[]>;

/** Kohorten eines Startups (Startup-Sicht). */
export async function cohortIdsForStartup(startupId: string): Promise<string[]>;

/** Guard: wirft/false, wenn der User nicht Mitglied der Kohorte ist. */
export async function assertCohortMember(userId: string, cohortId: string): Promise<void>;
```

Team-Rollen (`isTeamRole`) umgehen das Scoping bewusst (Admin sieht alles — konsistent mit dem bestehenden „Vorschau"-Prinzip in `roles.ts`).

---

## 5. Server Actions (`src/app/actions/cohorts.ts`)

Muster wie `src/app/actions/match-matrix.ts`/`ssot.ts` (Zod + `firstZodError` + `ActionState` + `revalidatePath`, `requireTeam`-Guard, `isRecordNotFoundError`):

- `createCohort(prevState, formData)` — name/slug/description/Datum; Slug-Kollision prüfen (wie `createContentPage`).
- `updateCohort(id, …)` / `deleteCohort(id)`.
- `addCohortMember(prevState, formData)` — `cohortId` + `role` + (`userId` | `startupId`); Upsert auf `@@unique`.
- `removeCohortMember(membershipId)`.

Alle **team-only** (`requireTeam()`), da Kohorten-Pflege eine Team-Aufgabe ist.

---

## 6. UI

### 6.1 Team-Pflege — `/cohorts` (neu, team-only)
- RSC-Seite unter `src/app/(main)/cohorts/page.tsx`, `requireTeam()`. Muster: `hub-admin/page.tsx`.
- Liste der Kohorten (Card + `<details>`), je Kohorte: Mitglieder (Partner + Startups) mit Entfernen-Button + Zuordnungs-Formulare (Select Partner-User / Select Startup).
- Neuer Nav-Eintrag in `SOURCING_SECTION` **oder** `SPACE_SECTION` (`src/lib/roles.ts`) — z. B. „Kohorten/Batches" mit `Users`/`Layers`-Icon.

### 6.2 Partner-Außeneffekt (Proof) — Partner-Dashboard
- In `src/app/(main)/dashboard/partner/page.tsx` eine Sektion „Deine Kohorte" ergänzen: Kohortenname + Liste der Startups der Kohorte (`startupIdsVisibleToPartner`), read-only, **nur kuratierte Felder** (Name, Tagline, `publicPitch`) — **keine** internen Scores/Pipeline (Leitplanke `release-mara.md`).

### 6.3 (optional) Startup-Außeneffekt
- Analog auf `/dashboard/startup`: „Du bist Teil von: <Kohorte>".

---

## 7. Migration / Seed / Deploy

- **Additiv:** neue Enums/Tabellen. Workflow wie Match-Matrix (`docs/plan-match-matrix.md`): lokal `npm run db:push` + `npm run prisma:generate`; Neon separat mit `prisma db push` (keine Migrations-Files im Repo).
- **Seed:** in `prisma/seed.ts` 1 Demo-Kohorte + Mitgliedschaften anlegen (den geseedeten Partner-User + 2–3 Startups), damit die UI nicht leer ist.
- **Optionaler Brückenschritt (später):** `ScoutingCampaign` → `Cohort` migrieren, wenn sich zeigt, dass beide dasselbe meinen (Skript analog `prisma/apply-match-matrix.ts`). Bis dahin koexistieren sie.

---

## 8. Tests

Muster: `tests/unit/*` + `tests/integration/*` (siehe `tests/helpers/db.ts`).
- **Unit** (`tests/unit/cohorts.test.ts`): `cohortIdsForUser`/`startupIdsVisibleToPartner` mit gemocktem Prisma; `assertCohortMember` (Mitglied vs. Nicht-Mitglied vs. Team-Rolle).
- **Integration** (`tests/integration/cohorts.test.ts`): reale DB, `resetDb`, Kohorte + Mitgliedschaften anlegen, Sichtbarkeits-Query prüfen, `@@unique`-Verletzung (doppelte Mitgliedschaft) sicher.

---

## 9. Aufwand & Risiken

| Schritt | Aufwand |
|---|---|
| 3. Schema + generate + push | S |
| 4. Scoping-Layer | S |
| 5. Actions | S–M |
| 6.1 Team-Pflege-UI `/cohorts` | M |
| 6.2 Partner-Außeneffekt | S |
| 7. Seed | S |
| 8. Tests | S–M |
| **Summe** | **M** (≈ 3–5 Tage) |

**Risiken/Leitplanken:**
- **Entscheidung #1 (Scoping additiv vs. ersetzend)** muss **vorher** fallen — sie bestimmt, ob bestehende Guards angefasst werden. Empfehlung: **additiv** starten (nichts Bestehendes bricht).
- **Privacy:** In der Partner-Sicht der Kohorte **nur kuratierte Startup-Felder** zeigen (nie interne Scores/Pipeline). Klären, ob Startups einander innerhalb der Kohorte sehen.
- **Nicht übertreiben:** kein Badge-Rollenmodell, kein Marketplace-Scoping in diesem Slice.

---

## 10. Was dieses Fundament danach freischaltet

Sobald `Cohort`/`CohortMembership` + Scoping stehen, werden zu **kleinen Folge-Slices**:
- **1.2/1.14** Batch-gescopte Roadmap/Material/Teilnehmerliste (nur ein `cohortId`-Filter + Lesesicht).
- **1.10** Gezielte Batch-Einladung (Invite erzeugt direkt eine `CohortMembership`).
- **1.14** Journey-/Stage-Sicht **je Kohorte**.
- **1.11** „Partner sieht nur seinen Batch" wird zur reinen Query-Filterung.

---

*Umsetzung erst nach Entscheidung #1 (`docs/decisions-mara-feedback.md`). Dieser Plan ändert noch keinen Code.*
