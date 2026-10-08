# Umsetzungsplan: Startup-Marktplatz (Programme · Mentor:innen · Support-Angebote)

> **Status:** Planungsdokument (kein Code). Stand: Juni 2026.
> **Ziel:** Den startup-gerichteten **Marktplatz** planen, über den ein Startup
> mit drei Angebotstypen wächst — koordiniert vom LOVEDIS-Team. Dabei strikt
> **wiederverwenden statt duplizieren**: Das **Venture-Credit-System** und der
> **gebrokerte Anfrage-Flow** existieren bereits (bzw. sind in der Mara-Release
> in Arbeit) und werden nur **angedockt**, nicht neu gebaut.

**Legende für das Feature-Mapping:**

| Symbol | Bedeutung |
| --- | --- |
| ✅ | Existiert bereits (Mara/Bestand) — direkt nutzbar, **nicht** neu planen |
| 🔶 | Existiert teilweise — gezielt erweitern/andocken |
| 🆕 | Genuin neu — hier liegt der eigentliche Marktplatz-Scope |

> **Annahme zum Credit-System:** Die `prisma/schema.prisma` wurde zum Zeitpunkt
> dieses Plans parallel vom Mara-Worker bearbeitet. Der Credit-Ledger
> (`CreditAccount`, `CreditTransaction`, Enum `CreditTxType { GRANT, SPEND,
> ADJUSTMENT }`) ist bereits im Schema vorhanden, ebenso Konstanten/Badges
> (`CREDIT_TX_TYPE_LABELS`, `CreditTxTypeBadge`) und die Nav-Einträge
> `/venture` + `/venture/credits` (Startup) sowie `/credits` (Team). Dieser Plan
> **baut darauf auf** und beschreibt nur die **Verzahnung** (Redemption-Hook).

---

## 1. Kontext & Abgrenzung zur laufenden Mara-Release

### Was der Marktplatz fachlich ist
Ein Startup nutzt den Marktplatz, um über **drei Angebotstypen** zu wachsen — alle
vom LOVEDIS-Team koordiniert:

1. **Exklusive Programme** (z. B. „Sales, Pricing & Growth", „KI & Tech") —
   thematische Programme an Wachstumshebeln mit Expert:innen. **Im Programm
   enthalten, KEINE Credits.**
2. **Mentor:innen-Netzwerk** — direkter Zugang zu ausgewählten Mentor:innen aus
   LOVEDIS-Unternehmenspartnern (Bau-/Immobilienbranche); Einzel-Sessions für
   ehrliches Feedback/neue Perspektiven. **Venture Credits.**
3. **Individuelle Support-Angebote** — Workshops, Sparring, Expert:innen-Support
   (Fundraising, Legal, Marketing, Product & Tech), flexibel buchbar.
   **Venture Credits.**

**Anfrage-/Buchungs-Flow ("Wie funktioniert das?"):**
Angebot/Mentor:in wählen → „Anfrage"-Button → Kontaktdaten + Wunsch-Session per
Formular → LOVEDIS-Team koordiniert Matching & Termin mit Partner →
nach Bestätigung werden die Venture Credits eingelöst (Programme = 0 Credits).

### Reuse vs. Neu — pro Marktplatz-Baustein

| Marktplatz-Baustein | Status | Wie damit umgehen |
| --- | --- | --- |
| **Venture-Credit-Ledger** (Konto, Gutschrift, Verbrauch, Saldo, Historie) | ✅ | `CreditAccount` + `CreditTransaction` aus Mara **wiederverwenden**. Buchung = `CreditTransaction` mit `type=SPEND`, `amount` negativ. **NICHT** neu modellieren. |
| **Startup-Self-Service-Bereich** (`/venture`, „Mein Guthaben") | ✅ | Marktplatz wird **Unterbereich** von `/venture`; Guthaben-/Historien-Sicht aus Mara nutzen. |
| **Gebrokerter Anfrage-Flow** (Anfrage → Team prüft → handelt → Outcome) | 🔶 | Muster aus `IntroRequest` (`requestIntro`/`handleIntroRequest`, `/intros`-Inbox, `IntroRequestForm`) **adaptieren**, aber eigenes Modell (Booking hat Credits + Anbietertyp, `IntroRequest` nicht). |
| **Rollen & Guards** (`requireStartup`, `requireTeam`, `ROLE_NAV`) | ✅ | Vorhandene Guards/Nav-Struktur nutzen; nur neue Items ergänzen. |
| **UI-System** (`HeroBanner`, `Card`/`ToneCard`/`BannerStat`, `SectionLabel`, `Badge`, `EmptyState`, `Field`, `Button`) | ✅ | Komplett wiederverwenden — neue Seiten folgen dem `/intros`-Layoutmuster. |
| **Badges/Konstanten-Pattern** (`*_LABELS` + `*Badge`) | ✅ | Pattern kopieren für neue Status-/Kategorie-Enums. |
| **Status-getriebene Inbox** (offen → bearbeitet, `IntroDecision`) | 🔶 | Team-Inbox für Bookings analog `/intros` bauen (mehr Stati). |
| **Programme als Katalog** | 🔶 | Konzeptuell verwandt mit `Challenge` (Titel/Beschreibung/Tags/Status), aber **andere Semantik** (kuratierter Programm-Katalog, keine Bewerbungs-/Matching-Pipeline). → eigenes, schlankes `Program`-Modell, Pattern von `Challenge` als Vorlage. |
| **Mentor:innen-Katalog** | 🆕 | Neu: `MentorProfile`, angebunden an Partner/`User`. |
| **Support-Angebote-Katalog** | 🆕 | Neu: `SupportOffering` (+ Kategorie-Enum). |
| **Buchungs-/Anfrage-Lifecycle mit Credit-Einlösung** | 🆕 | Neu: `MarketplaceBooking` (Status-Workflow) + Verknüpfung zu `CreditTransaction`. |
| **Credit-Preis pro Angebot** | 🆕 | Neu: `creditCost`-Feld an Angebot/Mentor (Programme = 0/`null`). |

**Kernbefund:** Der gesamte „Geld"-Teil (Credits) **ist schon da**. Genuin neu sind
die **Kataloge** (Programme, Mentor:innen, Support-Angebote) und der **Buchungs-
Lifecycle** mit Team-Koordination und **Credit-Einlösung bei Bestätigung**.

---

## 2. Datenmodell-Deltas (nur NEU/erweitert)

> Additiv, respektiert bestehende Relationen. Bewusst schlank. **Der Credit-Ledger
> wird referenziert, nicht dupliziert.**

### Neue Enums
```prisma
enum MarketplaceOfferingType {   // Welcher der drei Angebotstypen
  PROGRAM        // Exklusive Programme — 0 Credits
  MENTOR_SESSION // Mentor:innen-Netzwerk — Credits
  SUPPORT        // Individuelle Support-Angebote — Credits
}

enum SupportCategory {           // Themen der individuellen Support-Angebote
  FUNDRAISING
  LEGAL
  MARKETING
  PRODUCT_TECH
  SALES
  OTHER
}

enum ProgramStatus {             // Sichtbarkeit/Lebenszyklus eines Programms
  DRAFT
  OPEN        // im Marktplatz sichtbar/anfragbar
  CLOSED
}

enum BookingStatus {             // Lifecycle einer Anfrage/Buchung (siehe §3)
  REQUESTED         // Startup hat angefragt
  IN_COORDINATION   // LOVEDIS koordiniert mit Partner/Mentor
  CONFIRMED         // Termin bestätigt → Credits werden eingelöst
  COMPLETED         // Session/Workshop fand statt
  DECLINED          // Team lehnt ab (kein Credit-Abzug)
  CANCELLED         // Startup/Team storniert (ggf. Rückbuchung)
}
```

### Neue Modelle

**Programme (Katalog) — Pattern von `Challenge` als Vorlage, eigene Semantik**
```prisma
model Program {
  id          String        @id @default(cuid())
  title       String        // z. B. "Sales, Pricing & Growth"
  summary     String        // 1-Satz-Teaser für die Karte
  description String        // Markdown/Langtext
  focusTags   String[]      @default([]) // Wachstumshebel-Tags
  status      ProgramStatus @default(DRAFT)
  sortOrder   Int           @default(0)
  // Programme sind INKLUSIVE → keine Credits. Feld bewusst weggelassen
  // (offeringType=PROGRAM ⇒ creditCost = 0, siehe Booking).
  createdById String
  createdBy   User          @relation("ProgramCreator", fields: [createdById], references: [id], onDelete: Cascade)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  bookings    MarketplaceBooking[]

  @@index([status])
}
```

**Mentor:innen-Netzwerk — angebunden an Partner/`User`**
```prisma
model MentorProfile {
  id          String   @id @default(cuid())
  // Optionaler Login-Bezug: Mentor:in kann (muss aber nicht) ein User-Konto
  // (Rolle BUSINESS_PARTNER) haben. Stammdaten pflegt zunächst das Team.
  userId      String?  @unique
  user        User?    @relation("MentorUser", fields: [userId], references: [id], onDelete: SetNull)
  name        String
  company     String?  // LOVEDIS-Unternehmenspartner (Bau-/Immobilien)
  role        String?  // Funktion/Titel der Mentor:in
  expertise   String[] @default([]) // Themen für Filter/Matching
  bio         String?
  photoUrl    String?
  creditCost  Int      @default(0) // Credits pro Session (Team pflegt Preis)
  isActive    Boolean  @default(true) // im Marktplatz sichtbar
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  bookings    MarketplaceBooking[]

  @@index([isActive])
}
```

**Individuelle Support-Angebote (Katalog)**
```prisma
model SupportOffering {
  id          String          @id @default(cuid())
  title       String          // z. B. "Cap-Table-Sparring"
  category    SupportCategory @default(OTHER)
  summary     String          // Teaser für die Karte
  description String          // Detailbeschreibung
  format      String?         // "Workshop" | "Sparring-Session" | "1:1" …
  creditCost  Int             @default(0) // Credits pro Buchung
  isActive    Boolean         @default(true)
  sortOrder   Int             @default(0)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  bookings    MarketplaceBooking[]

  @@index([category])
  @@index([isActive])
}
```

**Buchung/Anfrage — Herzstück, mit Credit-Verknüpfung**
```prisma
model MarketplaceBooking {
  id            String                  @id @default(cuid())
  offeringType  MarketplaceOfferingType // welcher der drei Typen
  status        BookingStatus           @default(REQUESTED)

  // Anfragendes Startup (Self-Service)
  startupId     String
  startup       Startup                 @relation(fields: [startupId], references: [id], onDelete: Cascade)
  requestedById String                  // User (Rolle STARTUP)
  requestedBy   User                    @relation("BookingRequester", fields: [requestedById], references: [id], onDelete: Cascade)

  // Genau EINE Ziel-Referenz ist gesetzt (je nach offeringType).
  programId     String?
  program       Program?                @relation(fields: [programId], references: [id], onDelete: SetNull)
  mentorId      String?
  mentor        MentorProfile?          @relation(fields: [mentorId], references: [id], onDelete: SetNull)
  offeringId    String?
  offering      SupportOffering?        @relation(fields: [offeringId], references: [id], onDelete: SetNull)

  // Anfrage-Formular (analog IntroRequest.message + Kontaktdaten)
  message       String                  // Wunsch-Session/Anliegen
  contactName   String
  contactEmail  String
  preferredAt   String?                 // Wunschtermin(e) als Freitext

  // Preis & Einlösung — Verzahnung mit dem bestehenden Credit-Ledger.
  // Snapshot des Preises bei Anfrage (Programme: 0). Erst bei CONFIRMED
  // entsteht die SPEND-CreditTransaction; deren id wird hier verlinkt.
  creditCost        Int                @default(0)
  creditTransactionId String?          @unique
  creditTransaction CreditTransaction? @relation("BookingRedemption", fields: [creditTransactionId], references: [id], onDelete: SetNull)

  // Team-Koordination (wer bearbeitet, Notiz, Outcome)
  handledById   String?
  handledBy     User?                   @relation("BookingHandler", fields: [handledById], references: [id], onDelete: SetNull)
  coordinatorNote String?

  createdAt     DateTime                @default(now())
  updatedAt     DateTime                @updatedAt

  @@index([status])
  @@index([startupId])
  @@index([offeringType])
}
```

### Erweiterungen an bestehenden Modellen (nur Back-Relations)
```prisma
// User: neue Relationen
//   programsCreated   Program[]            @relation("ProgramCreator")
//   mentorProfile     MentorProfile?       @relation("MentorUser")
//   bookingsRequested MarketplaceBooking[] @relation("BookingRequester")
//   bookingsHandled   MarketplaceBooking[] @relation("BookingHandler")

// Startup: bookings MarketplaceBooking[]

// CreditTransaction: redeemedBooking MarketplaceBooking? @relation("BookingRedemption")
//   → 1:1 Rückverweis; macht die Einlösung im Ledger nachvollziehbar
//     ("warum dieser SPEND?"). KEINE Duplizierung von Saldo/Betrag.
```

**Bewusst NICHT modelliert (Reuse):** Kein eigenes Credit-Konto, keine eigene
Saldo-/Transaktions-Logik. Der Betrag, der Saldo und die Historie bleiben
ausschließlich im Mara-Ledger (`CreditAccount`/`CreditTransaction`). Die Buchung
hält nur einen **Preis-Snapshot** (`creditCost`) und einen **Link** zur
auslösenden Transaktion.

### Konstanten/Badges (Pattern aus Mara fortführen)
- `MARKETPLACE_OFFERING_TYPE_LABELS`, `SUPPORT_CATEGORY_LABELS`,
  `PROGRAM_STATUS_LABELS`, `BOOKING_STATUS_LABELS` in `src/lib/constants.ts`.
- `BookingStatusBadge`, `SupportCategoryBadge`, `OfferingTypeBadge` in
  `src/components/shared/badges.tsx` (Tone-Mapping wie bei `IntroStatusBadge`).

---

## 3. Booking-Lifecycle (Zustandsdiagramm)

```
                 Startup fragt an
                       │
                       ▼
                 ┌───────────┐
                 │ REQUESTED │  Credits: nur PRÜFEN (Guthaben ≥ creditCost?),
                 └─────┬─────┘  noch KEIN Abzug. (Programme: creditCost=0)
            Team nimmt │ an / lehnt ab
          ┌────────────┼─────────────┐
          ▼            ▼              ▼
   ┌──────────────┐  (DECLINED)   (CANCELLED durch Startup vor Koordination)
   │IN_COORDINATION│  kein Abzug    kein Abzug
   └──────┬───────┘
 Team koordiniert Termin mit Partner/Mentor
          │ bestätigt
          ▼
   ┌───────────┐   ►► CREDITS EINLÖSEN ◄◄  (atomar: SPEND-Tx anlegen,
   │ CONFIRMED │       creditCost > 0 ⇒ CreditTransaction(type=SPEND,
   └─────┬─────┘       amount=-creditCost) + Saldo-Update + Link setzen.
         │             Programme (cost=0) ⇒ keine Tx.)
   Session/Workshop findet statt
         ▼
   ┌───────────┐
   │ COMPLETED │  Endzustand (Happy Path)
   └───────────┘

   Storno NACH CONFIRMED (optional): CANCELLED ⇒ Rückbuchung als
   CreditTransaction(type=ADJUSTMENT, amount=+creditCost).
```

**Statusliste & Credit-Berührungspunkte:**

| Status | Bedeutung | Credits | Akteur |
| --- | --- | --- | --- |
| `REQUESTED` | Startup hat angefragt | **Prüfen** (Guthaben ≥ Preis), kein Abzug | Startup (anfragend) |
| `IN_COORDINATION` | Team koordiniert mit Partner/Mentor | kein Abzug | LOVEDIS-Team |
| `CONFIRMED` | Termin bestätigt | **Einlösen** (SPEND, atomar) | LOVEDIS-Team |
| `COMPLETED` | Session fand statt | — (bereits eingelöst) | LOVEDIS-Team / Mentor |
| `DECLINED` | Team lehnt ab | kein Abzug | LOVEDIS-Team |
| `CANCELLED` | Storno | ggf. Rückbuchung (ADJUSTMENT) wenn nach CONFIRMED | Startup oder Team |

**Rollen:**
- **Startup** (`requireStartup`): anfragend; sieht eigene Buchungen.
- **LOVEDIS-Team** (`requireTeam` = ADMIN/MEMBER): koordinierend/bestätigend;
  besitzt die Inbox und löst Credits ein.
- **Partner/Mentor:in**: Erbringer der Leistung; **nicht** zwingend in der App
  (Phase 1: Koordination per E-Mail/Tools durch das Team). Optionaler späterer
  Login via `MentorProfile.userId`.

**Reservierung vs. Einlösung (Designentscheidung, siehe §7):** Empfehlung
**Einlösung erst bei `CONFIRMED`** (kein „Reservieren"). Bei `REQUESTED` nur eine
**weiche Prüfung** des Guthabens; Race-Conditions zwischen mehreren offenen
Anfragen werden beim Bestätigen final geprüft (Tx in einer Prisma-`$transaction`,
Abbruch bei zu geringem Saldo).

---

## 4. UI- & Routen-Plan

> Alle Seiten im `(main)`-Layout, Patterns aus `/intros`, `/discover`, `/venture`.

### Startup-facing (Rolle STARTUP, `requireStartup`)
| Route | Inhalt |
| --- | --- |
| `/venture/marketplace` | **Marktplatz-Übersicht** mit `HeroBanner` + Tabs/Sektionen: **Programme** · **Mentor:innen** · **Support-Angebote**. Karten (`Card`) je Eintrag mit Teaser, Tags/Kategorie, Credit-Preis-Badge (Programme: „Inklusive"). Guthaben-Anzeige aus Mara-Credit-Sicht. |
| `/venture/marketplace/mentors/[id]` & `…/support/[id]` & `…/programs/[id]` | Detail mit „Anfrage"-Button → Anfrage-Formular. |
| `/venture/marketplace/requests` | **„Meine Anfragen/Buchungen"** — Liste eigener `MarketplaceBooking` mit `BookingStatusBadge`, Credit-Kosten, Timeline-Status. |

**Anfrage-Formular** (`MarketplaceBookingForm`, Client-Component analog
`IntroRequestForm`): Felder Anliegen/Wunsch-Session (`message`), Kontaktname,
Kontakt-E-Mail (vorausgefüllt aus Session), Wunschtermin (`preferredAt`).
Bei Credit-Angeboten Hinweis: „X Credits — werden erst nach Bestätigung
eingelöst. Dein Guthaben: Y." Bei Programmen: „Im Programm enthalten — keine
Credits."

### LOVEDIS-Team (ADMIN/MEMBER, `requireTeam`)
| Route | Inhalt |
| --- | --- |
| `/marketplace` (Inbox) | **Koordinations-Inbox** analog `/intros`: offene Anfragen (REQUESTED), in Koordination, bestätigt; Aktionen „In Koordination nehmen", „Bestätigen (Credits einlösen)", „Ablehnen", „Stornieren". `BannerStat` für Offen/In Koordination/Gesamt. |
| `/marketplace/catalog` | **Katalog-Pflege** (CRUD): Programme, Mentor:innen, Support-Angebote anlegen/aktiv schalten, Credit-Preise pflegen. |

### Rollen-Gating
- **STARTUP** → sieht nur eigenen Marktplatz + eigene Anfragen (kein Team-Inbox).
- **ADMIN/MEMBER** → Inbox + Katalog-Pflege; sehen alle Buchungen.
- **BUSINESS_PARTNER/INVESTOR** → **kein** Zugriff auf den Startup-Marktplatz
  (Self-Service-Wachstumsangebot für Startups). Optional später Mentor-Sicht.

### Nav (`src/lib/roles.ts`) — nur neue Items ergänzen
- STARTUP, Sektion „Venture Platform": Eintrag **„Marktplatz" → `/venture/marketplace`**.
- ADMIN/MEMBER, Sektion „Screening & SSOT" (oder „Plattform"): **„Marktplatz" → `/marketplace`** (Coins/Store-Icon).

---

## 5. Server-Actions-Plan

> In `src/app/actions/marketplace.ts`, angelehnt an `discovery.ts`
> (`requestIntro`/`handleIntroRequest`), mit `ActionState` + `zod` + `firstZodError`.

| Action | Guard | Aufgabe |
| --- | --- | --- |
| `requestBooking(input, prev, formData)` | `requireStartup` | Validiert Formular; bestimmt `offeringType` + Ziel-Id; ermittelt `creditCost` (Snapshot, Programme=0); **weiche Guthabenprüfung**; legt `MarketplaceBooking` (`REQUESTED`) an. `revalidatePath` Marktplatz + „Meine Anfragen". |
| `takeBookingIntoCoordination(id)` | `requireTeam` | `REQUESTED → IN_COORDINATION`, `handledById` setzen. |
| `confirmBooking(id)` | `requireTeam` | `IN_COORDINATION → CONFIRMED`. **Atomar in `prisma.$transaction`:** falls `creditCost>0` → finale Saldo-Prüfung am `CreditAccount`, `CreditTransaction(type=SPEND, amount=-creditCost, reason)`, `CreditAccount.balance` dekrementieren, `creditTransactionId` verlinken. Bei zu geringem Saldo: Abbruch mit Fehler. |
| `declineBooking(id, note?)` | `requireTeam` | `→ DECLINED`, kein Credit-Effekt. |
| `completeBooking(id)` | `requireTeam` | `CONFIRMED → COMPLETED`. |
| `cancelBooking(id)` | `requireStartup` (vor CONFIRMED) **oder** `requireTeam` | `→ CANCELLED`. War bereits `CONFIRMED` und `creditCost>0`: Rückbuchung `CreditTransaction(type=ADJUSTMENT, amount=+creditCost)` + Saldo-Korrektur (atomar). |
| Katalog-CRUD (`upsertProgram`, `upsertMentor`, `upsertOffering`, Aktiv-Toggle) | `requireTeam` | Pflege der drei Kataloge. |

**Wiederverwendete Bausteine:** `ActionState`/`firstZodError` (`@/lib/action-state`),
`prisma` (`@/lib/prisma`), Guards (`@/lib/auth-guards`). Credit-Mutationen nutzen
**dieselben Felder** wie die Mara-Credit-Buchungs-Action (`type`, `amount`,
`reason`, `createdById`); falls Mara bereits eine `spendCredits()`-Hilfsfunktion
bereitstellt → diese **aufrufen** statt neu schreiben (siehe §7, offene Frage).

---

## 6. Kreditlogik (Verzahnung, nicht Neubau)

- **Programme** = **0 Credits** (`offeringType=PROGRAM`, `creditCost=0`,
  keine `CreditTransaction`). Im UI als „Inklusive" gekennzeichnet.
- **Mentor-Sessions & Support-Angebote** = Credits (`creditCost` aus Katalog,
  Snapshot in der Buchung).
- **Einlösung erst nach Bestätigung** (`CONFIRMED`): genau dann entsteht die
  `CreditTransaction(type=SPEND)`; vorher kein Abzug.
- **Quelle der Wahrheit** für Guthaben/Saldo/Historie bleibt der Mara-Ledger.
  Die Buchung referenziert nur (1:1) die auslösende Transaktion → volle
  Nachvollziehbarkeit „welche Buchung hat welchen SPEND erzeugt".
- **Rückbuchung** bei Storno nach Bestätigung über `ADJUSTMENT` (positiv).

---

## 7. Phasen & Abhängigkeiten

> Der Marktplatz **baut auf dem fertigen Credit-Ledger auf** (Mara). Phase 0
> startet erst, wenn `CreditAccount`/`CreditTransaction` stabil gemerged sind.

| Phase | Inhalt | Abhängigkeit |
| --- | --- | --- |
| **0 — Voraussetzung** | Mara-Credit-Ledger gemergt & stabil; klären, ob eine `spendCredits()`-Helper-Funktion existiert. | Mara-Release |
| **1 — Kataloge + Schema** | Prisma-Deltas (Enums + 4 Modelle), Konstanten/Badges, Team-Katalog-Pflege (`/marketplace/catalog`). | Phase 0 |
| **2 — Anfrage-Flow** | `MarketplaceBookingForm`, `requestBooking`, Startup-Marktplatz-Seiten (Tabs) + „Meine Anfragen". | Phase 1 |
| **3 — Team-Koordination + Einlösung** | Inbox `/marketplace`, Status-Actions inkl. `confirmBooking` mit Credit-SPEND (atomar). | Phase 2 + Credit-Ledger |
| **4 — Storno/Rückbuchung & Feinschliff** | `cancelBooking`/`completeBooking`, ADJUSTMENT-Rückbuchung, leere Zustände, Empty States, optional Mentor-Login. | Phase 3 |

**Empfohlene Reihenfolge:** 0 → 1 → 2 → 3 → 4. Phase 3 ist der eigentliche
Wert (Koordination + Einlösung) und **darf nicht vor** dem stabilen Credit-Ledger
gebaut werden.

---

## 8. Offene Entscheidungen fürs Team

| # | Frage | Warum wichtig |
| --- | --- | --- |
| 1 | **Credit-Preise je Angebotstyp/Angebot** — fixe Preise pro Mentor/Offering oder Preis-Staffeln? | Bestimmt `creditCost`-Pflege & UI. |
| 2 | **Reservierung vs. Einlösung-bei-Bestätigung** — reicht „prüfen bei Anfrage, abziehen bei CONFIRMED", oder soll bei Anfrage **reserviert** (geblockt) werden? | Beeinflusst Race-Handling & ob ein vierter Credit-Zustand nötig ist. |
| 3 | **Helper-Wiederverwendung** — stellt Mara bereits eine `spendCredits()/grantCredits()`-Funktion bereit? | Vermeidet doppelte Saldo-Logik; sonst eigene atomare Tx. |
| 4 | **Mentor-Datenpflege** — pflegt ausschließlich das Team, oder bekommen Mentor:innen Self-Service-Login (`MentorProfile.userId`, Rolle BUSINESS_PARTNER)? | Scope von Phase 1/4 & Rollen-Gating. |
| 5 | **Programme: Bewerbung vs. offene Teilnahme** — sind Programme „anfragbar/bewerbbar" (Booking mit `PROGRAM`) oder einfach „enthalten/sichtbar" ohne Anfrage? | Entscheidet, ob Programme den Booking-Flow durchlaufen oder nur Info-Seiten sind. |
| 6 | **Storno-Policy** — Rückbuchung bei Storno nach CONFIRMED zu 100 %, anteilig, oder gar nicht (No-Show)? | Bestimmt ADJUSTMENT-Logik. |
| 7 | **Sichtbarkeit** — sehen nur Acc-Startups (mit Credit-Konto) den Marktplatz, oder alle STARTUP-User? | Gating + Empty-State bei fehlendem `CreditAccount`. |
| 8 | **Mentor↔Angebot-Überschneidung** — sollen Mentor-Sessions und Support-Angebote getrennte Kataloge bleiben (so geplant) oder vereinheitlicht werden? | Beeinflusst Datenmodell-Konsolidierung. |

---

*Dieses Dokument ergänzt `docs/plan-partner-startup-ssot.md` (Mara-Release) gezielt
um den Startup-Marktplatz. Es plant ausschließlich die **neuen** Teile (Kataloge +
Buchungs-Lifecycle) und **verzahnt** sie mit dem bereits vorhandenen
Venture-Credit-System — ohne dieses zu duplizieren. Keine Implementierung; vor
Phase 1 sollten mindestens die Entscheidungen 1, 2, 3 und 5 getroffen sein.*
