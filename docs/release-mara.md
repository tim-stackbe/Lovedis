# Release „Mara" — Lovedis-Plattform

> **Status:** Release-Dokumentation. Stand: Juni 2026 · Branch: `mara`.
> **Kurzfassung:** „Mara" macht die Lovedis-Plattform zur **Single Source of Truth (SSOT)**
> für die Zusammenarbeit mit Partnern und Startups — von der **Screening-/Feedback-Schleife**
> über die **Dokumentation & das Tracking** der Zusammenarbeit bis hin zum
> **Startup-Marktplatz mit Venture-Credits**. Das bestehende Venture-Scout-/Ökosystem-Fundament
> bleibt erhalten und wird gezielt erweitert.

Verwandte Dokumente:
- `docs/plan-partner-startup-ssot.md` — Produkt-/Umsetzungsplan SSOT & Screening.
- `docs/plan-startup-marketplace.md` — Umsetzungsplan Startup-Marktplatz.
- `docs/mara-implementation-notes.md` — getroffene Default-Entscheidungen & offene Infrastruktur.
- `docs/deployment-plan-mara.md` — isolierter Cloudflare-Deployment-Plan (+ Free-Plan-Blocker).

---

## 1. Überblick

Mara bündelt mehrere zusammenhängende Bausteine zu einem durchgängigen Workflow:

- **Single Source of Truth (SSOT)** für Partner & Startups — Roadmap, Wissensseiten und
  MediaKit liegen an *einem* Ort (Partner-Hub als Notion-Ersatz) statt verstreut über Tools.
- **Screening & Feedback** — leichtgewichtige Erst-Einordnung durch das Team, kuratierte
  Low-Overload-Sichten für Partner und ein klares Verdikt „weitermachen / nicht weiter".
- **Dokumentation & Tracking der Zusammenarbeit** — Engagements mit KPIs/Milestones und
  messbarem Fortschritt, plus team-getriebene Pushes und automatisierbare Check-in-Erinnerungen.
- **Ökosystem (Discovery)** — bewusst schlanke Entdecken-/Feed-Flächen zum Sichten, **kein**
  öffentlicher Social-Graph.
- **Startup-Marktplatz + Venture-Credits** — Programme, Mentor:innen-Netzwerk und
  Support-Angebote, buchbar über einen gebrokerten Anfrage-Flow, abgerechnet über ein
  team-gepflegtes Venture-Credit-Ledger.

**Leitplanken** (aus dem Produktplan): SSOT statt Tool-Doppelung, kein Ökosystem-Showcase,
keine Kommunikationsplattform als Selbstzweck, und für Partner stets **kuratierte, verdichtete**
Sichten statt der vollen internen Datentiefe.

---

## 2. User Journeys

### Partner (Business Partner)
1. **Longlist-Screening:** Partner sieht eine kuratierte Karten-Liste je Batch — Name,
   1-Satz-Pitch und die Team-Erst-Einordnung — und gibt ein schnelles Verdikt
   („weitermachen" / „nicht weiter") mit optionaler Notiz. Interne Scores/Pipeline bleiben verborgen.
2. **Use-Case-Bewertung (nach Demo Day):** Zu einem Use-Case (Challenge) zugeordnete Startups
   werden bewertet; das Verdikt fließt zurück ans Team.
3. **Check-ins:** Vom Team „gepushte" Startups werden per kurzem Check-in beurteilt;
   Erinnerungen halten die Schleife am Laufen.
4. **Zusammenarbeit & Wissen:** Fortschritt der Engagements (KPIs/Milestones) ist sichtbar;
   der **Partner-Hub** liefert Roadmap, Accelerator-Infos und MediaKit an einem Ort.

### Startups
1. **Login & Dashboard:** Eigenes Dashboard und pflegbares (öffentliches) Profil/Storefront.
2. **Chancen:** Challenges entdecken, sich bewerben, Status der eigenen Bewerbungen verfolgen.
3. **Venture Platform:** Eigener Bereich mit **Mein Guthaben** (Venture-Credits inkl. Historie).
4. **Marktplatz:** Programme, Mentor:innen und Support-Angebote durchstöbern → „Anfrage" stellen
   → Team koordiniert Termin → nach Bestätigung werden Credits eingelöst (Programme = 0 Credits).
   Eigene Anfragen/Buchungen sind unter **Meine Anfragen** mit Status-Timeline einsehbar.

### Lovedis-Team (Admin/Member)
1. **Venture Scout:** Startups anlegen/kuratieren, bewerten, vergleichen, Pipeline/Radar/Berichte.
2. **Screening & SSOT:** Longlist pflegen, Erst-Einordnung erfassen, Engagements tracken,
   Pushes & Check-ins steuern, SSOT-Inhalte pflegen (Hub-Admin), Venture-Credits buchen.
3. **Marktplatz-Koordination:** Eingehende Buchungsanfragen über die Inbox bearbeiten
   (in Koordination nehmen → bestätigen/einlösen → abschließen; ablehnen/stornieren) und
   den Katalog (Programme/Mentor:innen/Support) pflegen.
4. **Vollsicht & Vorschau:** Das Team sieht **alles** — inklusive view-only „Partner-Sicht"- und
   „Storefront"-Vorschauen der externen Flächen, um nachzuvollziehen, was Externe sehen.

---

## 3. Feature-Liste

### Screening & SSOT
- **Longlist je Batch** — Startups nach `ScoutingCampaign` (Batch/Longlist) gruppiert, filterbar nach Pipeline-Stufe.
- **Erst-Einordnung (leichtgewichtig)** — kurze Einordnung + Empfehlung direkt am Startup
  (`screenSummary`, `screenRecommendation`, `screenedAt`, `screenedById`), bewusst getrennt vom tiefen 7-Dimensionen-Scoring.
- **Inbound/Outbound-Herkunft** — `sourceType` (`INBOUND`/`OUTBOUND`) + `sourceDetail` am Startup.
- **Partner-Verdikt** — `PartnerStartupReview` (`PENDING`/`CONTINUE`/`PASS` + Notiz), optional mit Use-Case-Bezug.
- **Kuratierte Partner-Sichten** — `/screening` (Longlist), `/use-cases` (Use-Case-Bewertung), `/check-ins`.
- **Engagement-Tracking** — `Engagement` als Acc-unabhängiger „Oberbegriff" für Zusammenarbeit
  (KPIs/Milestones als JSON, Status, Fortschritt); `PoCPerformance`/`/pocs` bleibt der challenge-gebundene Spezialfall.
- **Pushes & Check-in-Erinnerungen** — `StartupPush` (Team weist Partner ein Startup zu) und
  `CheckInReminder` (Fälligkeit/Status); Verarbeitung über `processDueReminders()` + Endpoint
  `GET/POST /api/cron/reminders` und einen manuellen „Fällige verarbeiten"-Trigger.
- **Partner-Hub (Notion-Ersatz)** — `RoadmapItem`, `ContentPage` (Markdown) und `MediaAsset`,
  per `ContentAudience` (`PARTNER`/`STARTUP`/`BOTH`) sichtbarkeitsgefiltert; Pflege über `/hub-admin`.

### Ökosystem (Discovery)
- **Entdecken (`/discover`)** — kuratierter, schlanker Storefront-Marktplatz zum Sichten (kein Social-Graph).
- **Feed (`/feed`)** — optionale Startup-Updates/Follows (`StartupFollow`, `StartupUpdate`).
- **Gebrokertes 1:1-Messaging** — `IntroRequest` + minimaler `Conversation`/`Message`-Flow,
  bewusst über den Intro-Flow gebrokert (keine Channels/Threads/Notification-Inbox).

### Marktplatz & Venture-Credits
- **Venture-Credit-Ledger** — `CreditAccount` (gecachter Saldo je Startup) + `CreditTransaction`
  (`GRANT`/`SPEND`/`ADJUSTMENT`); manuell vom Team gebucht, transaktional & auditierbar.
  Startup-Sicht „Mein Guthaben" inkl. Historie; Team-Pflege über `/credits`.
- **Kataloge** — `Program` (Programme, inklusive → 0 Credits), `MentorProfile` (Mentor:innen-Netzwerk),
  `SupportOffering` (Support-Angebote nach `SupportCategory`); Pflege über `/marketplace/catalog`.
- **Buchungs-Lifecycle** — `MarketplaceBooking` mit Status `REQUESTED → IN_COORDINATION →
  CONFIRMED → COMPLETED` (+ `DECLINED`/`CANCELLED`). Credits werden **erst bei `CONFIRMED`**
  atomar eingelöst (`SPEND`), Storno nach Bestätigung wird als `ADJUSTMENT` (100 %) zurückgebucht.
  Bei Anfrage nur **weiche** Guthabenprüfung; Programme erzeugen keine Transaktion.
- **Anfrage-Flow** — Startup wählt Angebot → „Anfrage"-Formular (Anliegen, Kontakt, Wunschtermin)
  → Team koordiniert mit Partner/Mentor:in → Bestätigung löst Credits ein.

---

## 4. Navigation & Rollen

Rollen: `ADMIN`, `MEMBER`, `BUSINESS_PARTNER`, `INVESTOR`, `STARTUP` (siehe `src/lib/roles.ts`).
Das interne Team (ADMIN/MEMBER) hat per Produktmodell **Vollsicht** und sieht externe Flächen als view-only Vorschau.

| Bereich / Route | ADMIN | MEMBER | BUSINESS_PARTNER | INVESTOR | STARTUP |
| --- | :--: | :--: | :--: | :--: | :--: |
| Dashboard (rollenspezifisch) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Venture Scout (`/startups`, `/evaluations`, `/compare`, `/pipeline`, `/radar`, `/reports`) | ✅ | ✅ | — | — | — |
| Screening & SSOT (`/longlist`, `/engagements`, `/pushes`, `/hub-admin`, `/credits`) | ✅ | ✅ | — | — | — |
| Marktplatz-Inbox (`/marketplace`) + Katalog (`/marketplace/catalog`) | ✅ | ✅ | — | — | — |
| Partner-Sichten (`/screening`, `/use-cases`, `/check-ins`, `/partner-hub`) | ✅ (Vorschau) | ✅ (Vorschau) | ✅ | — | — |
| Ökosystem (`/discover`, `/feed`) | ✅ | ✅ | ✅ | ✅ | — |
| Zusammenarbeit (`/challenges`, `/engagements`, `/pocs`, `/scorings`, `/messages`) | ✅ | ✅ | ✅ | ✅ (Portfolio) | teilw. |
| Venture Platform / Marktplatz-Storefront (`/venture`, `/venture/marketplace`, `/venture/credits`) | ✅ (Vorschau) | ✅ (Vorschau) | — | — | ✅ |

Gating-Quellen in `src/lib/roles.ts`: `VENTURE_SCOUT_ROLES` (ADMIN/MEMBER), `VENTURE_VIEW_ROLES`
(STARTUP + ADMIN/MEMBER), `PARTNER_VIEW_ROLES` (BUSINESS_PARTNER + ADMIN/MEMBER),
`MARKETPLACE_ROLES` (ADMIN/MEMBER/INVESTOR/BUSINESS_PARTNER) sowie `isTeamRole`.
Die durchgesetzten Guards (`requireTeam`/`requirePartner`/`requireStartup` etc.) liegen in `src/lib/auth-guards.ts`.

**Sichtbarkeits-Grundsatz:** Partner sehen kuratierte, verdichtete Masken (Verdikt + knappe Einordnung);
interne Daten (Scores, Pipeline, Notizen) bleiben dem Team vorbehalten. Der Startup-Marktplatz ist
ein Self-Service-Wachstumsangebot für STARTUP-User; BUSINESS_PARTNER/INVESTOR haben darauf keinen Zugriff.

---

## 5. Tech-Stack & Architektur

- **Framework:** Next.js 16 (App Router, React Server Components, Server Actions) auf React 19.
- **Sprache:** TypeScript.
- **Datenbank & ORM:** Prisma 7 auf PostgreSQL. Lokal via `@prisma/adapter-pg`; in Produktion
  **Neon** (serverless) via `@prisma/adapter-neon` — der Adapter wird zur Laufzeit in
  `src/lib/prisma.ts` umgeschaltet (Cloudflare-Workers-Runtime → Neon, sonst PrismaPg).
- **Auth:** NextAuth v5 (Credentials), Passwort-Hashing mit `bcryptjs` (Workers-kompatibel).
- **UI/Design:** Tailwind CSS v4 mit dem Lovedis-Designsystem (`HeroBanner`, `Card`/`ToneCard`,
  `BannerStat`, `SectionLabel`, `Badge`, `EmptyState`, `Field`, `Button`), Icons via `lucide-react`,
  Charts via `recharts`.
- **Datenmodell:** additive Erweiterungen am bestehenden Schema. Neue Enums u. a. `PartnerVerdict`,
  `SourceType`, `ReminderStatus`, `EngagementStatus`, `RoadmapStatus`, `ContentAudience`,
  `CreditTxType`, `MarketplaceOfferingType`, `SupportCategory`, `ProgramStatus`, `BookingStatus`;
  neue Modelle u. a. `PartnerStartupReview`, `StartupPush`, `CheckInReminder`, `Engagement`,
  `RoadmapItem`, `ContentPage`, `MediaAsset`, `CreditAccount`, `CreditTransaction`, `Program`,
  `MentorProfile`, `SupportOffering`, `MarketplaceBooking`.
- **Build:** `prisma generate && next build`. Für Cloudflare zusätzlich `@opennextjs/cloudflare`
  (`open-next.config.ts`, `cf:build`/`cf:preview`/`cf:deploy`-Scripts) und Neon-Externals in `next.config.ts`.

---

## 6. Deployment

### Isoliertes Online-Test-Environment (aktiv, Vercel)
Der `mara`-Branch läuft als **isoliertes Test-/Staging-Environment** auf Vercel — vollständig
getrennt von der Live-Homepage:

- **URL:** https://lovedis-mara-test.vercel.app
- Eigene, isolierte Datenbank (separater Neon-Branch/DB) und eigene, ausschließlich serverseitig
  hinterlegte Environment-Variablen — **getrennt** von Produktions-/Homepage-Ressourcen.

### Cloudflare-Plan (geplant, noch nicht deployed)
Parallel existiert ein vollständiger Plan für ein isoliertes Cloudflare-Workers-Deployment
(OpenNext) auf einer `*.workers.dev`-Subdomain ohne Eingriff in die `lovedis.de`-Zone/DNS —
siehe `docs/deployment-plan-mara.md`. Die Code-Vorbereitung (`wrangler.jsonc`,
`open-next.config.ts`, Neon-Adapter-Switch in `src/lib/prisma.ts`, `next.config.ts`-Externals,
`cf:*`-Scripts) ist auf `mara` vorhanden.

> **Blocker (Cloudflare):** Das Vorhaben hängt aktuell an einer Plan-/Limit-Hürde — der
> **Free-Plan-Grenze von 3 MiB Worker-Größe** — sowie an einem `CLOUDFLARE_API_TOKEN` mit dem
> Scope `Workers Scripts: Edit`. Details und Runbook stehen in `docs/deployment-plan-mara.md`.

### Benötigte Environment-Variablen (nur Namen — niemals Werte committen)
Werte werden **ausschließlich** serverseitig/als Worker-Secrets gesetzt; `.env`/`.env.local` sind gitignored.

- `DATABASE_URL` — Connection-String der **isolierten** Test-/Staging-DB.
- `NEXTAUTH_SECRET` / `AUTH_SECRET` — NextAuth-v5-Signatur-Secret (beide Namen werden akzeptiert; konsistent setzen).
- `NEXTAUTH_URL` — öffentliche Basis-URL des isolierten Hosts.
- `AUTH_TRUST_HOST` — `true` für die Serverless-/Workers-Runtime.
- (optional) `CRON_SECRET` — schützt den Reminder-Endpoint per `Authorization: Bearer <secret>`.

---

## 7. Test-Zugang (Demo)

Für das isolierte Test-Environment stehen **Demo-/Seed-Zugangsdaten** zur Verfügung (aus
`prisma/seed.ts`, bereits mit dem Team geteilt — ausdrücklich nur Demo-Daten, **keine** Produktion):

- **Demo-Login (Admin):** `admin@lovedis.dev` / `Lovedis2026!`

Die Seed-Daten enthalten zusätzlich Demo-Konten für die übrigen Rollen (Member, Business Partner,
Investor, Startup) sowie einen befüllten Katalog (Programme/Mentor:innen/Support), Beispiel-Buchungen
und Credit-Konten, damit alle Flows direkt erlebbar sind. Diese Zugangsdaten gelten **nur** für die
Demo-/Test-Umgebung.

---

*Diese Datei beschreibt den Auslieferungsstand des Mara-Releases. Implementierungs-Entscheidungen
und offene Infrastruktur-Punkte (echter E-Mail-Provider, Cron-Trigger, Attio-Sync) sind in
`docs/mara-implementation-notes.md` dokumentiert.*
