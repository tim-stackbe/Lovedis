# Umsetzungsplan: Partner/Startup-SSOT & Screening-Plattform

> **Status:** Planungsdokument (kein Code). Stand: Juni 2026.
> **Ziel:** Die formulierten Produktanforderungen in einen konkreten, priorisierten
> Umsetzungsplan überführen — abgeglichen mit dem, was bereits in der Codebase steckt,
> sodass wir **bestehendes wiederverwenden statt neu bauen**.

**Legende für das Feature-Mapping:**

| Symbol | Bedeutung |
| --- | --- |
| ✅ | Existiert bereits — direkt nutzbar |
| 🔶 | Existiert teilweise — muss erweitert/angepasst werden |
| 🆕 | Muss neu gebaut werden |

---

## 1. Vision & Scope

### Was die Plattform sein soll
- **Single Source of Truth (SSOT)** für Partner & Startups — Informationen liegen an *einem* Ort.
- **Screening- & Feedback-Plattform** für Partner (Partner → ← Lovedis).
- **Dokumentation & Tracking** der Startup-/Partner-Zusammenarbeit mit *messbarem* Fortschritt.

### Was die Plattform NICHT sein soll
- **Keine** digitale Abbildung unseres Ökosystems (kein „Ecosystem-Showcase"/Netzwerk-Graph).
- **Keine** Kommunikationsplattform (kein Chat-/Social-Layer als Selbstzweck).

### Was diese Leitplanken für Design-Entscheidungen bedeuten

| Leitplanke | Konsequenz für die Umsetzung |
| --- | --- |
| Kein Ökosystem-Showcase | Der bestehende **`/discover`-Marketplace** und das **`/feed`** bleiben bewusst schlank und auf *Screening* fokussiert — **nicht** zu einem öffentlichen Netzwerk/Social-Graph ausbauen. Profile dienen der Bewertung, nicht der Selbstdarstellung. |
| Keine Kommunikationsplattform | Das bestehende **1:1-Messaging** (`Conversation`/`Message`) bleibt **minimal & gebrokert** (nur via Intro-Flow durch das Team geöffnet). Wir bauen **keine** Channels, Threads, Mentions, Notifications-Inbox. Kommunikation läuft weiter über E-Mail/bestehende Tools; die Plattform stößt höchstens **automatisierte Erinnerungen** an. |
| SSOT statt Tool-Doppelung | Vor jedem neuen Feature die Frage: „Gehört das in Attio, Glassdollar oder die Plattform?" (siehe Abschnitt 5). Die Plattform besitzt **Workflow + Screening-Verdikte + Zusammenarbeits-Doku + SSOT-Inhalte**, nicht CRM-Stammdaten oder Sourcing. |
| Low Info-Overload für Partner | Partner-Oberflächen zeigen **kuratierte, verdichtete** Sichten (Polina-Einordnung + klare Ja/Nein-Aktion), nicht die volle interne Datentiefe (Scores, Pipeline, Notizen bleiben intern). |

---

## 2. User-Journey → Feature-Mapping

### Ist-Zustand (Kurz-Inventar relevanter Bausteine)

| Baustein | Wo | Nutzbar für |
| --- | --- | --- |
| Rollen `ADMIN/MEMBER/BUSINESS_PARTNER/INVESTOR/STARTUP` | `prisma` `UserRole`, `src/lib/roles.ts` | alle Journeys |
| Rollen-/Nav-Gates `requireRole/requireMarketplace/requireScoutModule` | `src/lib/auth-guards.ts`, `src/lib/roles.ts` | Zugriffssteuerung |
| `Startup` inkl. Pipeline (`DISCOVERED→…→PARTNERED/PASSED`), Storefront-Felder, `campaign`, `contacts`, `attachments` | `prisma`, `/startups`, `/discover` | Screening-Daten, Longlist |
| `ScoutingCampaign` | `prisma` | Inbound/Outbound-Bündelung |
| `Evaluation` + `Score` (7 Dimensionen, Recommendation) | `prisma`, `/evaluations`, `src/lib/scoring.ts` | Polina-/Use-Case-Bewertung |
| `SharedScoring` (Eval an Empfänger teilen) | `prisma`, `/sharing`, `/scorings` | Bewertung an Partner geben |
| `Challenge` + `ChallengeApplication` (+ `ChallengeMatchDismissal`) | `prisma`, `/challenges`, `/matching` | Use-Case nach Demo Day |
| Regelbasiertes Auto-Matching (deterministisch, erklärbar) | `src/lib/matching.ts`, `/matching` | Startup↔Use-Case-Vorschläge |
| `PoCPerformance` (KPIs + Milestones als JSON, Status, Fortschritt) | `prisma`, `/pocs`, `src/lib/pocs.ts` | Zusammenarbeits-Tracking |
| Partner-Cockpit (Signale, „Nächste Aktion") | `src/lib/partners.ts`, `/partners` | Team-Sicht auf Partner |
| Scouting-Analytics (Funnel, Raten, Durchsatz) | `src/lib/scouting-analytics.ts`, `/analytics` | Fortschritts-Kennzahlen |
| `IntroRequest` (gebrokert) + 1:1-`Conversation`/`Message` | `prisma`, `/intros`, `/messages` | minimaler, gebrokerter Kontakt |
| `StartupFollow` + `StartupUpdate` (Feed) | `prisma`, `/feed`, `/profile` | optionale Updates |
| Startup-Login & -Dashboard, Public Storefront (`isPublished`) | `/dashboard/startup`, `/profile`, `actions/discovery.ts` | Venture-Platform-Basis |

**Kernbefund:** Sehr viel ist da. Es fehlen v. a. (a) **leichtgewichtiges Partner-Verdikt** („weitermachen / nicht weiter"), (b) **Acc-unabhängiger Push + E-Mail-Erinnerungen** (keine E-Mail-Infra vorhanden), (c) **SSOT-Inhaltsbereich** (Roadmap/MediaKit/Notion-Ersatz) und (d) das **Venture-Credit-System**.

---

### Partner-Journey 1a — Accelerator: Longlist + Polina-Erstbewertung + Partner-Feedback

| Feature | Status | Was konkret |
| --- | --- | --- |
| Longlist als Startup-Set je Batch | 🔶 | `ScoutingCampaign` als „Batch/Longlist" nutzen; `Startup.pipelineStage = DISCOVERED/SCREENING` markiert Longlist-Status. Filterbare Longlist-Ansicht je Batch fehlt. |
| Polina-Erstbewertung (kurz, einordnend, kein Overload) | 🔶 | `Evaluation` existiert, ist aber **zu schwer** (7 Dimensionen). Neue **leichte „Erst-Einordnung"** (1–2 Sätze + Ampel/Empfehlung) als eigenes, schlankes Feld/Modell — bewusst getrennt vom tiefen Scoring. |
| Partner sieht kuratierte Sicht (Low-Overload-UI) | 🆕 | Partner-Longlist-Seite, die **nur** Name, 1-Satz-Pitch, Polina-Einordnung und die Ja/Nein-Aktion zeigt. Interne Scores/Pipeline bleiben verborgen. |
| Partner-Verdikt „weitermachen / nicht weiter" | 🆕 | Neues Modell **`PartnerStartupReview`** (Verdikt + optionaler Kommentar). Treibt den Funnel & spätere Schritte. |
| Bewertung ans Team zurückspielen | 🔶 | `SharedScoring` deckt „Team→Partner" ab; für „Partner→Team-Feedback" das neue `PartnerStartupReview` nutzen. |

### Partner-Journey 1b — Post Demo Day: x Startups für Use-Case-Bewertung

| Feature | Status | Was konkret |
| --- | --- | --- |
| Use-Cases definieren | ✅ | `Challenge` ist faktisch der „Use Case" (Titel, Beschreibung, Tags, Deadline). |
| Startups einem Use-Case zuordnen | ✅ | `ChallengeApplication` + **Auto-Matching** (`/matching`) schlagen passende Startups vor; „Einladen" erzeugt eine Application. |
| Partner bewertet Startup je Use-Case | 🔶 | Entweder leichte Use-Case-Bewertung am `ChallengeApplication` (Status + kurze Notiz/Verdikt) **oder** das neue `PartnerStartupReview` mit optionalem `challengeId`-Bezug wiederverwenden. |
| Auswahl „x Startups" | ✅ | `ApplicationStatus PENDING/ACCEPTED/REJECTED` bildet die Auswahl ab. |

### Partner-Journey 1c — Dokumentation der Zusammenarbeit + messbarer Fortschritt

| Feature | Status | Was konkret |
| --- | --- | --- |
| Zusammenarbeit dokumentieren | 🔶 | `PoCPerformance` (KPIs, Milestones, Status, Notizen) ist ideal — aber **fest an `ChallengeApplication` gekoppelt**. Für Acc-unabhängige Zusammenarbeit entkoppeln (siehe 1c/Journey 2). |
| Messbarer Fortschritt | ✅ | `pocProgress()` (Milestones) + `kpiProgress()` existieren bereits. |
| Aggregierte Fortschritts-Sicht | ✅🔶 | Partner-Cockpit & Scouting-Analytics liefern Signale/Funnel; um „Engagement-Fortschritt" je Partner ergänzen. |
| Stale-Erkennung („seit X Tagen ohne Update") | ✅ | `STALE_POC_DAYS`-Logik in `src/lib/partners.ts` vorhanden. |

### Partner-Journey 2 — Acc-unabhängiger Push + automatisierte Check-in-Erinnerungen

| Feature | Status | Was konkret |
| --- | --- | --- |
| Team „pusht" Startup an Partner (ohne Polina-Eval) | 🆕 | Neues Modell **`StartupPush`/`PartnerStartupAssignment`**: Team weist einem Partner ein Startup zu (Kontext-Notiz, ohne tiefe Bewertung). |
| Kurzer Check-in durch Partner | 🔶 | Reuse `PartnerStartupReview` (leichtes Verdikt/Notiz) als Check-in-Ergebnis. |
| **Automatisierte E-Mail-Erinnerung** | 🆕 | **Keine E-Mail-Infra vorhanden.** Erfordert: (a) E-Mail-Versand (z. B. Resend/SMTP), (b) Modell **`CheckInReminder`** (Fälligkeit, Status, Bezug), (c) **Scheduler/Cron** (Cron-Job / Cloudflare-Trigger), der fällige Erinnerungen versendet. |

### Partner-Journey 3 — Partner-Lovedis-SSOT (Roadmap, Accelerator-Infos, MediaKit → Notion-Ersatz)

| Feature | Status | Was konkret |
| --- | --- | --- |
| Roadmap (Accelerator) | 🆕 | Modell **`RoadmapItem`** (Titel, Beschreibung, Phase/Quartal, Status) + Partner-Lesesicht. |
| Accelerator-Infos / Wissensseiten | 🆕 | Leichtes **`ContentPage`** (Titel, Markdown-Body, Sichtbarkeit, Sortierung) — bewusst simpel, **kein** vollwertiges CMS. |
| MediaKit / Downloads | 🔶🆕 | `Attachment` existiert (an `Startup` gebunden). Für SSOT-weite Assets neues **`MediaAsset`** (Name, URL, Typ, Sichtbarkeit). |
| „Notion ersetzen" | 🆕 | Summe aus `RoadmapItem` + `ContentPage` + `MediaAsset`, gebündelt in einem Partner-SSOT-Bereich (`/partner-hub` o. ä.). |

### Startup-Journey 1 — Potenzielle Acc-Startups: nur Daten (Inbound/Outbound) für Screening

| Feature | Status | Was konkret |
| --- | --- | --- |
| Stammdaten erfassen | ✅ | `Startup` + `Contact` + `Attachment` decken das vollständig ab. |
| Inbound/Outbound unterscheiden | 🔶 | Neues Feld **`Startup.sourceType` (`INBOUND`/`OUTBOUND`)** (+ optional `sourceDetail`/Herkunft, z. B. „Glassdollar"). |
| Bündelung je Sourcing-Welle | ✅ | `ScoutingCampaign` vorhanden. |
| Screening durch Partner | 🔶 | Über Longlist-Sicht (1a) + `PartnerStartupReview`. |

### Startup-Journey 2 — Acc-Startups: Login / Venture Platform (Roadmap, Venture Credit System → SSOT)

| Feature | Status | Was konkret |
| --- | --- | --- |
| Login / eigenes Dashboard | ✅ | `STARTUP`-Rolle, `Startup.ownerUserId`, `/dashboard/startup`, `/profile` existieren. |
| Eigenes Profil pflegen | ✅ | Public Storefront (`actions/discovery.ts`, `updatePublicProfile`). |
| Roadmap (Startup-Sicht) | 🆕🔶 | `RoadmapItem` aus Journey 3 wiederverwenden, mit Zielgruppen-Sichtbarkeit (Partner-Roadmap vs. Startup-Roadmap). |
| **Venture Credit System** | 🆕 | Neues **Credit-Ledger**: `CreditAccount` (je Startup) + `CreditTransaction` (Gutschrift/Verbrauch, Grund, Saldo). Startup-Sicht „Mein Guthaben". |
| SSOT für Startups | 🔶 | `ContentPage`/`MediaAsset` mit Startup-Sichtbarkeit wiederverwenden. |

---

## 3. Datenmodell-Änderungen (Prisma)

> Alle Ergänzungen sind additiv und respektieren bestehende Relationen. Bewusst **schlank**
> gehalten; JSON-Spalten dort, wo Flexibilität wichtiger ist als Abfragbarkeit (wie bei `PoCPerformance`).

### Neue Enums
```prisma
enum PartnerVerdict {
  PENDING      // noch nicht entschieden
  CONTINUE     // „spannend, weitermachen"
  PASS         // „nicht weiter"
}

enum SourceType {        // Inbound vs. Outbound Screening-Daten
  INBOUND
  OUTBOUND
}

enum ReminderStatus {
  SCHEDULED
  SENT
  DONE
  CANCELLED
}

enum EngagementStatus {  // Acc-unabhängige Zusammenarbeit
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}

enum RoadmapStatus {
  PLANNED
  IN_PROGRESS
  DONE
}

enum ContentAudience {   // Sichtbarkeit von SSOT-Inhalten
  PARTNER
  STARTUP
  BOTH
}

enum CreditTxType {
  GRANT            // Gutschrift
  SPEND            // Verbrauch
  ADJUSTMENT       // Korrektur
}
```

### Neue/erweiterte Modelle je Feature

**Journey 1a/1b/2 — Partner-Verdikt (zentrales Screening-Feedback)**
```prisma
model PartnerStartupReview {
  id          String         @id @default(cuid())
  partnerId   String         // User (BUSINESS_PARTNER)
  startupId   String
  challengeId String?        // optional: Use-Case-Bezug (Journey 1b)
  verdict     PartnerVerdict @default(PENDING)
  note        String?        // kurze Einordnung des Partners
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  // Relationen zu User, Startup, optional Challenge
  @@unique([partnerId, startupId, challengeId])
}
```

**Journey 1a — Polina-Erst-Einordnung (leichtgewichtig, getrennt vom tiefen Scoring)**
- Variante A (minimal): Felder direkt am `Startup`: `screenSummary String?`, `screenRecommendation Recommendation?`, `screenedAt DateTime?`.
- Variante B (sauberer): neues Modell `QuickScreen { id, startupId, authorId, summary, recommendation, createdAt }`.
- **Empfehlung:** Variante A für Tempo, später ggf. nach B migrieren.

**Journey 2 — Push & Erinnerungen**
```prisma
model StartupPush {                 // Team weist Partner ein Startup zu
  id        String   @id @default(cuid())
  partnerId String
  startupId String
  pushedById String                 // Team-User
  context   String?                 // warum dieser Push
  createdAt DateTime @default(now())
  @@unique([partnerId, startupId])
}

model CheckInReminder {             // automatisierte E-Mail-Erinnerung
  id         String         @id @default(cuid())
  partnerId  String
  startupId  String?
  pushId     String?                // Bezug zum Push
  dueAt      DateTime
  status     ReminderStatus @default(SCHEDULED)
  sentAt     DateTime?
  createdAt  DateTime       @default(now())
  @@index([status, dueAt])
}
```

**Journey 1c/2 — Zusammenarbeit entkoppelt dokumentieren**
- Option 1 (schnell): `PoCPerformance.applicationId` von `@unique`-required auf **optional** umstellen und `partnerId`/`startupId` direkt hinzufügen → PoC auch ohne Challenge nutzbar.
- Option 2 (sauber): neues Modell `Engagement` (partnerId, startupId, status `EngagementStatus`, KPIs/Milestones JSON wie `PoCPerformance`).
- **Empfehlung:** Option 2 als „Oberbegriff", `PoCPerformance` bleibt der Challenge-gebundene Spezialfall.

**Journey 3/Startup-2 — SSOT-Inhalte (Notion-Ersatz)**
```prisma
model RoadmapItem {
  id        String        @id @default(cuid())
  title     String
  body      String?
  phase     String?       // z. B. „Q3 2026" / Batch-Name
  status    RoadmapStatus @default(PLANNED)
  audience  ContentAudience @default(PARTNER)
  sortOrder Int           @default(0)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
}

model ContentPage {       // Accelerator-Infos / Wissensseiten
  id        String          @id @default(cuid())
  slug      String          @unique
  title     String
  body      String          // Markdown
  audience  ContentAudience @default(PARTNER)
  isPublished Boolean       @default(false)
  sortOrder Int             @default(0)
  updatedAt DateTime        @updatedAt
}

model MediaAsset {         // MediaKit / Downloads (SSOT-weit)
  id        String          @id @default(cuid())
  name      String
  url       String
  type      AttachmentType  @default(DOCUMENT)  // bestehenden Enum wiederverwenden
  audience  ContentAudience @default(PARTNER)
  createdAt DateTime        @default(now())
}
```

**Startup-1 — Inbound/Outbound**
```prisma
// am bestehenden Startup-Modell ergänzen:
//   sourceType   SourceType?
//   sourceDetail String?      // z. B. „Glassdollar", „Inbound-Form", Referrer
```

**Startup-2 — Venture Credit System**
```prisma
model CreditAccount {
  id        String   @id @default(cuid())
  startupId String   @unique
  balance   Int      @default(0)   // abgeleitet/gecached aus Transaktionen
  updatedAt DateTime @updatedAt
}

model CreditTransaction {
  id        String       @id @default(cuid())
  accountId String
  type      CreditTxType
  amount    Int          // positiv = Gutschrift, negativ = Verbrauch
  reason    String
  createdById String?    // Team-User, der bucht
  createdAt DateTime     @default(now())
  @@index([accountId, createdAt])
}
```

**Bezug zu `User`:** Neue Relationen (`partnerReviews`, `startupPushes`, `reminders`, `creditTxAuthored` etc.) am `User` ergänzen — analog zu den bestehenden Back-Relations.

---

## 4. Grundgerüst & Batch-Backlog (phasierter Fahrplan)

> Aufwand grob: **S** ≈ 1–2 Tage, **M** ≈ 3–5 Tage, **L** ≈ 1–2 Wochen. Reihenfolge nach Abhängigkeit.

### Phase 0 — Grundgerüst & Entscheidungen (Vorbereitung)
| # | Work-Item | Aufwand |
| --- | --- | --- |
| 0.1 | Tooling-Abgrenzung Attio/Glassdollar/Plattform final entscheiden (Abschnitt 5) | S |
| 0.2 | Datenmodell-Entscheidungen treffen (Variante A/B Polina, Engagement vs. PoC) | S |
| 0.3 | Batch-/Longlist-Begriff fixieren (`ScoutingCampaign` = „Batch"?) | S |

### Phase 1 — Screening-Kern (Longlist → Polina → Partner-Verdikt) — *höchster Wert*
| # | Work-Item | Aufwand |
| --- | --- | --- |
| 1.1 | Prisma: `PartnerVerdict`, `PartnerStartupReview`, Polina-Felder (`screen*`), `sourceType` + Migration | M |
| 1.2 | Longlist-/Batch-Ansicht (Team) je `ScoutingCampaign` mit Pipeline-Filter | M |
| 1.3 | Polina-Erst-Einordnung erfassen (leichtes Formular am Startup) | S |
| 1.4 | Partner-Longlist (Low-Overload-UI): kuratierte Karten + „weitermachen/nicht weiter" | M |
| 1.5 | `actions`: Verdikt setzen, Review-Feedback ans Team-Cockpit zurückspielen | S |

### Phase 2 — Use-Case-Bewertung nach Demo Day
| # | Work-Item | Aufwand |
| --- | --- | --- |
| 2.1 | `PartnerStartupReview.challengeId` an Use-Case-Flow anbinden | S |
| 2.2 | Partner-Sicht „meine Use-Cases + zugeordnete Startups bewerten" | M |
| 2.3 | Auto-Matching-Vorschläge in den Partner-Flow integrieren (reuse `/matching`) | S |

### Phase 3 — Zusammenarbeit & messbarer Fortschritt
| # | Work-Item | Aufwand |
| --- | --- | --- |
| 3.1 | Prisma: `Engagement` (+`EngagementStatus`) bzw. `PoCPerformance` entkoppeln | M |
| 3.2 | Engagement-Tracking-UI (KPIs/Milestones, Fortschritt) — reuse `src/lib/pocs.ts` | M |
| 3.3 | Fortschritts-Aggregation in Partner-Cockpit & Analytics ergänzen | S |

### Phase 4 — Acc-unabhängiger Push + E-Mail-Erinnerungen
| # | Work-Item | Aufwand |
| --- | --- | --- |
| 4.1 | Prisma: `StartupPush`, `CheckInReminder`, `ReminderStatus` + Migration | S |
| 4.2 | **E-Mail-Infra** aufsetzen (Provider, Templates, Versand-Util) | M |
| 4.3 | **Scheduler/Cron** für fällige Erinnerungen (Cloudflare-Trigger/Cron) | M |
| 4.4 | Push-UI (Team) + Check-in-Erfassung (Partner) | M |

### Phase 5 — Partner-SSOT (Notion-Ersatz)
| # | Work-Item | Aufwand |
| --- | --- | --- |
| 5.1 | Prisma: `RoadmapItem`, `ContentPage`, `MediaAsset` + Enums | S |
| 5.2 | Admin-Pflege (CRUD) für Roadmap/Infos/MediaKit | M |
| 5.3 | Partner-SSOT-Bereich (`/partner-hub`) — Lesesicht | M |
| 5.4 | Inhalte aus Notion migrieren | S–M |

### Phase 6 — Startup-Venture-Platform (Login-Bereich + Credits)
| # | Work-Item | Aufwand |
| --- | --- | --- |
| 6.1 | Prisma: `CreditAccount`, `CreditTransaction` + Enum | S |
| 6.2 | Credit-Buchungs-Actions (Team) + Saldo-Logik | M |
| 6.3 | Startup-Roadmap + SSOT-Inhalte (reuse Phase 5) im Startup-Dashboard | M |
| 6.4 | Startup-Sicht „Mein Venture-Guthaben" + Historie | S |

**Empfohlene Reihenfolge der Auslieferung:** Phase 1 → 2 → 3 (Kern-Wertschöpfung Screening & Zusammenarbeit), danach 5 (SSOT/Notion-Ersatz, hoher Außenwert), parallel 4 (E-Mail/Push, eigenständig), zuletzt 6 (Venture Credits).

---

## 5. Tooling-Abgrenzung (Attio / Glassdollar / Plattform)

### Empfohlene Eigentümerschaft („wer besitzt was")

| System | Besitzt (Source of Truth) | Besitzt NICHT |
| --- | --- | --- |
| **Glassdollar** | **Sourcing/Discovery** — Startup-Rohdaten & Marktabbildung für Outbound-Identifikation | Workflow, Verdikte, Zusammenarbeit |
| **Attio** | **CRM/Beziehungsdaten** — Personen, Firmen, Kontakte, Partner-Beziehungen, Deal-Status auf Beziehungsebene | Screening-Verdikte, KPIs der Zusammenarbeit, SSOT-Inhalte |
| **Plattform (Lovedis)** | **Workflow & SSOT** — Screening-Verdikte, Polina-Einordnung, Use-Case-/Challenge-Bewertung, Zusammenarbeits-Tracking (KPIs/Milestones), Partner-SSOT-Inhalte, Venture-Credits, Startup-Venture-Platform | CRM-Stammdaten, Ökosystem-Marktabbildung |

### Wie sie verbunden werden (Sync-Richtung)
- **Glassdollar → Plattform:** Import/Sync von Startups ins `Startup`-Modell (markiert mit `sourceType=OUTBOUND`, `sourceDetail="Glassdollar"`). Einbahn-Import; die Plattform reichert mit Verdikten/Tracking an.
- **Attio ↔ Plattform:** Kontakte/Partner-Stammdaten **aus Attio führen** (Attio bleibt Master). Die Plattform liest/spiegelt Partner & Kontakte; Workflow-Ergebnisse (z. B. „Verdikt: weitermachen") können **zurück nach Attio** als Aktivität/Statusfeld geschrieben werden (Einbahn Plattform→Attio für Outcomes).
- **Mechanik:** via API/CSV-Import in Phase 0/1 zunächst manuell/halb-automatisiert, später Webhook/Cron-Sync.

### Doppelung vermeiden
- **Kein** CRM in der Plattform nachbauen (Kontaktverwaltung bleibt Attio).
- **Kein** Ökosystem-/Markt-Graph in der Plattform (bleibt Glassdollar; deckt sich mit „NICHT Ökosystem-Abbildung").
- Das bestehende `Contact`-Modell bewusst **schlank** halten (nur Screening-relevante Ansprechpartner), nicht zum CRM ausbauen.

---

## 6. Offene Fragen / Entscheidungen für das Team

| # | Frage | Warum wichtig |
| --- | --- | --- |
| 1 | **Polina-Einordnung:** Felder am `Startup` (Variante A) oder eigenes `QuickScreen`-Modell (B)? | Bestimmt Migration & Erweiterbarkeit. |
| 2 | **Zusammenarbeit:** `PoCPerformance` entkoppeln oder neues `Engagement`-Modell? | Beeinflusst Phase 3 & bestehende `/pocs`. |
| 3 | **E-Mail-Provider** (Resend / Postmark / SES / SMTP) und Cron-Mechanik (Cloudflare Cron Triggers?) | Voraussetzung für Journey 2; ggf. Abstimmung mit dem laufenden Cloudflare-Deploy. |
| 4 | **Venture Credit System:** Welche Regeln (Vergabe, Verbrauch, Wert eines Credits)? | Ohne Fachlogik bleibt das Ledger leer. |
| 5 | **Batch-Begriff:** Ist `ScoutingCampaign` = „Batch/Longlist" oder brauchen wir ein eigenes `Batch`-Modell? | Strukturiert Longlist & Backlog. |
| 6 | **Attio-Sync-Tiefe:** Nur lesen, oder Outcomes zurückschreiben? Welche Felder? | Bestimmt Integrationsaufwand. |
| 7 | **Partner-Sichtbarkeit:** Welche internen Daten dürfen Partner *nie* sehen (Scores, Pipeline, Notizen)? | Leitplanke „Low Info-Overload" sauber umsetzen. |
| 8 | **Notion-Migration:** Welche Inhalte ziehen um, was bleibt extern? | Scope von Phase 5. |
| 9 | **Rollen:** Reicht `BUSINESS_PARTNER`, oder brauchen wir z. B. „Polina/Screening-Lead" als eigene Rolle/Recht? | Beeinflusst `roles.ts`/Guards. |

---

*Dieses Dokument ist die Planungsgrundlage. Implementierung erfolgt phasenweise; vor Phase 1 sollten mindestens die Entscheidungen 1, 2, 5 und 7 getroffen sein.*
