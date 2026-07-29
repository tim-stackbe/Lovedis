# Assessment: Mara-User-Feedback (Runde 2) — was ist da, was ändern wir?

> **Status:** Planungs-/Bewertungsdokument (KEIN Code, kein Schema, keine Migration). Stand: Juli 2026 · Branch: `mara`.
> **Zweck:** Das neue Nutzer-Feedback Punkt für Punkt **an der bestehenden Codebase geerdet** bewerten: Was gibt es schon (mit Datei-Referenz), wo ist die Lücke, klares Verdikt + grober Aufwand.
> **Bezug:** Baut auf `docs/plan-partner-platform-vision.md` (Runde 1) und `docs/plan-partner-startup-ssot.md` auf — vieles vom Feedback ist dort schon vorgedacht (v. a. Badge/Cohort, zweiseitiges Feedback). Dieses Dokument verbindet das neue Feedback mit dem tatsächlichen Ist-Stand.

**Verdikt-Legende:** **[Da]** = existiert bereits · **[Da, klein erweitern]** = existiert, kleine Ergänzung · **[Build]** = jetzt sinnvoll bauen · **[Build partial]** = schlanke Teilmenge · **[Later]** = ok, aber später · **[Nicht Plattform]** = gehört (primär) nicht auf die Plattform · **[Entscheidung]** = Produkt-/Definitionsfrage ans Team.
**Aufwand:** **S** ≈ 1–2 Tage · **M** ≈ 3–5 Tage · **L** ≈ 1–2 Wochen (Datenmodell + Actions + UI, ohne externe Infra).

---

## 0. Kurzfassung (TL;DR)

**Der Großteil des Feedbacks ist bereits gebaut** — es ist teils nur nicht sichtbar/verlinkt oder anders benannt als der Nutzer erwartet. Konkret:

- **Notion-Space / Roadmap / Media-Kit / Knowledge** → existiert als **SSOT-Hub** (`RoadmapItem`, `ContentPage`, `MediaAsset` mit `audience` PARTNER/STARTUP/BOTH). Pflege `/hub-admin`, Lesesicht `/partner-hub` + im Startup-`/venture`. → **[Da]**, Knowledge-Board als kleine Ergänzung.
- **Marketplace + Venture-Credits** → voll gebaut. → **[Da]**
- **Match-Matrix** (Excel-Ersatz) → gebaut (`/match-matrix`, `PartnerStartupMatch`). Aber: **kein Durchfluss in Engagements**, **kein To-do-/Reminder-Tracking in der Matrix**. → **[Da]** + gezielte Erweiterungen.
- **Startup-Push / Check-ins / Reminder** → gebaut (`StartupPush`, `CheckInReminder`, Cron-Route, E-Mail-Abstraktion) — **aber Versand läuft nur auf Console-Adapter** (kein echter Provider), und Push ist **Team→Partner**, nicht **Startup→uns**. → **[Da]** mit zwei echten Lücken.
- **Radar** → gebaut, aber **rein manuell platziert, ohne Trend-/Stage-Definition**. Der Nutzer hat recht: **Zweck + Ring-/Feld-Definitionen fehlen** → das ist primär eine **[Entscheidung]**, kein Build.
- **Batches / Zugriffs-Scoping je Batch für Partner** → **die größte echte Lücke.** Es gibt `ScoutingCampaign` als Bündelung, aber **kein Badge/Cohort mit Membership + Zugriffs-Scoping**. Partner sehen heute **rollenbasiert global**, nicht „nur ihren Batch". → **[Build]** (Fundament, s. Vision-Doc §2.1).
- **Attio-/GlassDollar-Anbindung** → **nur dokumentiert, NICHT integriert.** GlassDollar existiert nur als Freitext-`sourceDetail` in Seed-Daten. → **[Later / Infra-Entscheidung]**
- **Zweiseitiges Feedback (Startup↔Partner) + „Wunsch an Partner"** → Partner→Startup existiert; **Startup→Partner-Richtung fehlt.** → **[Build]** (Vision-Doc §2.4).
- **Navigation nach Segmenten/Kategorien** → heute **rollenbasiert** (`src/lib/roles.ts`). Der Nutzer-Vorschlag (Space-orientierte Struktur) ist eine sinnvolle **Umstrukturierung**, primär UI. → **[Build partial]**

**Zwei bewusst gesetzte Leitplanken werden erneut berührt** (wie in Runde 1): „Notion-Ersatz reaktivieren?" und „keine Kommunikationsplattform" — das sind Produktentscheidungen (§4).

---

## 1. Punkt-für-Punkt-Bewertung (in Reihenfolge des Feedbacks)

### 1.1 „Gibt es eine Startup-Übersicht-Seite?"

**Status: [Da].** Mehrere, je nach Rolle:
- **Team (Scout):** `/startups` (`src/app/(main)/startups/page.tsx`) — die interne Startup-Liste (Input-Maske, Pipeline-Stage, Radar-Felder), Detail unter `/startups/[id]`.
- **Ökosystem (Partner/Investor/Team):** `/discover` (`src/app/(main)/discover/page.tsx`) — kuratierte, veröffentlichte Startup-Storefronts.
- **Startup selbst:** `/profile` + Dashboard `/dashboard/startup`.

**Lücke:** Keine **badge-/batch-gescopte** Startup-Übersicht für Partner („nur meine Kohorte"). Das hängt an 1.11 (Batches).

**Verdikt:** **[Da]**; batch-gescopte Sicht → siehe 1.11.

---

### 1.2 Notion-Space replizieren · Roadmap Partner = Roadmap Startups? · Zugriff auf Media-Kits

**Status: [Da].** Das ist exakt der **SSOT-Hub** (bewusst als „Notion-Ersatz" gebaut, Rahmung wurde früher auf Wunsch entschärft):
- Datenmodell: `RoadmapItem`, `ContentPage` (Markdown), `MediaAsset` — alle mit `audience: PARTNER | STARTUP | BOTH` (`prisma/schema.prisma:731–770`).
- Pflege: `/hub-admin` (`src/app/(main)/hub-admin/page.tsx`, Formulare `RoadmapItemForm`, `ContentPageForm`, `MediaAssetForm`).
- Lesesicht: `/partner-hub` + im Startup-Bereich `/venture` (gerendert über `HubContent.tsx` → Roadmap / Wissen / **Media-Kit & Downloads**).
- Filterung nach Rolle: `audiencesForRole()` in `src/lib/ssot.ts`.

**„Roadmap Partner = Roadmap Startups?"** → **Beides möglich, deine Entscheidung pro Eintrag:** `audience=BOTH` = identische Roadmap für beide; `PARTNER`/`STARTUP` = getrennte Sicht. Die Mechanik ist da.

**Media-Kit** → ist die Sektion „Material — Media-Kit & Downloads" (`MediaAsset`). Aktuell **URL-Referenzen** (kein Binär-Upload im Repo).

**Lücke:** Inhalte sind heute **global je Audience**, nicht **je Batch** (→ 1.11). Media = nur Links, kein Datei-Upload/Storage.

**Verdikt:** **[Da].** Batch-Scoping später (1.11); echter Datei-Upload = separate Storage-Entscheidung.

---

### 1.3 „Startups können bei uns pushen für Follow-ups → ist das der Startup-Push?"

**Wichtige Klarstellung — Richtung:** Der heutige **`StartupPush` läuft Team → Partner** (das Team weist einem Partner ein Startup zu, mit Kontext + optionalem Check-in). Siehe `src/app/(main)/pushes/page.tsx` + `model StartupPush` (`schema.prisma:665`). Das ist **nicht** „Startup pusht bei uns".

**Status:** **[Da]** für Team→Partner-Zuspielen; **[fehlt]** für Startup→uns-Anstoß.

**Lücke:** Es gibt keinen Kanal, über den ein **Startup** aktiv einen Follow-up-Wunsch an das Team/an einen Partner signalisiert. Nächstliegende Bausteine: `IntroRequest` (`src/app/actions/discovery.ts`) und `Message`/`Conversation` existieren, decken aber „strukturierter Follow-up-Wunsch" nicht 1:1 ab.

**Verdikt:** **[Entscheidung + Build partial].** Zuerst klären: In welche Richtung soll „pushen" gehen? Wenn Startup→Team-Follow-up gewünscht ist, ist das ein schlankes neues Feld/Flag (analog `StartupPush`, umgekehrte Richtung) — **S–M**. Passt zu 1.15 („Wunsch an Partner").

---

### 1.4 „Aktuell nur die Credits"

**Status: [Da].** Das Venture-Credit-System ist vollständig: `CreditAccount` (fix/flex-Budget), `CreditTransaction`, Vergabe `/credits`, Startup-Sicht `/venture/credits`, Marktplatz-Buchung mit `redeem-on-confirm` (`src/app/actions/marketplace.ts`, `src/lib/credit-buckets.ts`). Onboarding-Grant (12 Credits) in `src/lib/onboarding-credits.ts`.

**Verdikt:** **[Da].** Kein Handlungsbedarf; der Kommentar bezog sich vermutlich darauf, dass im Startup-Bereich „nur" Credits/Marktplatz sichtbar sind — weitere Startup-Space-Inhalte siehe 1.15/§2.

---

### 1.5 Radar: „macht noch keinen Sinn → braucht Definition der Trends und Stages. Ziel? Für uns oder extern?"

**Status: [Da, aber unscharf].** Gebaut ist `src/components/radar/RadarView.tsx` + `/radar` (team-only, `requireScoutModule`):
- **Felder (Sektoren)** = `RadarQuadrant`: `AI_DATA`, `CLIMATE_ENERGY`, `CONSTRUCTION`, `HEALTH_TECH`, `INDUSTRY` (`schema.prisma:48`).
- **Ringe** = `RadarRing` (`RADAR_RING_LABELS` in `src/lib/constants.ts`).
- Platzierung ist **manuell** (`radarQuadrant`/`radarRing` am Startup) und **bewusst unabhängig vom Score**.

**Der Nutzer hat recht:** Es fehlt eine **klare Definition**, was die Ringe bedeuten (Reifegrad? Adoptions-Stufe? Zeit-Horizont?) und was der **Zweck** ist. Das ist **primär eine Definitions-Entscheidung**, kein Bau-Thema.

**Verdikt:** **[Entscheidung]** zuerst. Danach ggf. **[Build partial / S]**: Ring-/Feld-Labels + eine kurze Legende/„So liest du den Radar"-Erklärung im UI schärfen. **Ziel klären:** rein intern (Team-Strategie) oder extern zeigbar? Heute ist er team-only — das ist eine bewusste, aber revidierbare Setzung.

---

### 1.6 „Marketplace super!"

**Status: [Da].** Voll gebaut (Storefront, Programme/Mentor:innen/Angebote, Buchungs-Lifecycle, Credits). `src/app/(main)/venture/marketplace/*`, `src/app/(main)/marketplace/*`. Kein Handlungsbedarf.

---

### 1.7 Knowledge-Board (Empfehlungen: Bücher, Videos etc.)

**Status: [Teilweise da].** `ContentPage` (Markdown-Wissensseiten) + `MediaAsset` (Downloads/Links) im Hub decken „Wissen" grundsätzlich ab. Eine **dedizierte, kuratierte Empfehlungsliste** (Buch/Video/Podcast mit Typ, Link, kurzer Begründung) gibt es aber nicht als eigenes Format.

**Lücke:** Kein `KnowledgeResource`-artiges Modell mit Typ-Enum (Buch/Video/Artikel/Tool) + Empfehlungstext.

**Verdikt:** **[Build partial / S].** Kleinster sinnvoller Schnitt: `MediaAsset`-Typen erweitern (Enum um `BOOK`/`VIDEO`/`LINK` + `note`) **oder** eine schlanke neue `KnowledgeResource`-Tabelle + eine „Knowledge-Board"-Sektion im Hub (`HubContent.tsx`). Andockbar an vorhandene SSOT-Pflege — geringer Aufwand, sichtbarer Mehrwert.

---

### 1.8 „Durchfluss der Informationen — wenn ich in der Matrix was angebe, fließt das durch (z. B. in die Engagements)?"

**Status: [Teilweise / Lücke].** Heute sind **Match-Matrix und Engagements getrennte Modelle**:
- `PartnerStartupMatch` (`schema.prisma:22`-Bereich, Actions `src/app/actions/match-matrix.ts`) hält Relevanz S/P, Use-Case-Typen, `nextSteps`, `contactStatus`.
- `Engagement` (`schema.prisma:704`) hält `status`, `kpis`, `milestones`, `notes` — separater Tracker.
- **Es gibt keinen automatischen Durchfluss** Matrix→Engagement. Auch keinen von Screening-Verdikten (`PartnerStartupReview`) in die Matrix.

**Verdikt:** **[Build partial / M].** Das ist ein echter, sinnvoller Wunsch. Konkret:
- „Aus Match-Zelle ein Engagement anlegen"-Button (übernimmt Partner+Startup+`nextSteps`→`notes`).
- Optional: Kontakt-Status der Matrix aus Engagement-Status ableiten (oder umgekehrt spiegeln).
- Screening-Verdikt (`PartnerStartupReview`) als Signal in die Matrix-Zelle einblenden.
**Vor dem Bau:** definieren, was „durchfließen" heißt (Kopie bei Klick vs. Live-Verknüpfung) — sonst Doppelpflege.

---

### 1.9 Matrix: To-do-Tracking + Reminder als Push/E-Mail

**Status: [Teilweise].**
- **To-dos in der Matrix:** Es gibt `nextSteps` (Freitext) pro Zelle, aber **keine strukturierten To-dos** (mit Fälligkeit/Status/Verantwortlichem). `Engagement.milestones` (JSON) kommt dem am nächsten, ist aber nicht mit der Matrix verknüpft.
- **Reminder-Mechanik: [Da]** — `CheckInReminder` + `processDueReminders()` (`src/lib/reminders.ts`) + Cron-Route `POST /api/cron/reminders` + E-Mail-Abstraktion (`src/lib/email.ts`).
- **ABER: kein echter Versand.** Aktiver Adapter ist `consoleEmailAdapter` (loggt nur); Cron ist nicht produktiv angebunden (siehe `docs/mara-implementation-notes.md`). „Push-Nachricht" (App-Push/WebPush) gibt es **gar nicht**.

**Verdikt:**
- **To-do-Tracking an der Matrix:** **[Build partial / M]** — strukturierte To-dos (Titel/Fällig/Status) je Match-Zelle oder je Engagement, wiederverwendbar mit `CheckInReminder` für Fälligkeits-Mails.
- **Reminder per E-Mail produktiv:** **[Infra-Entscheidung]** — die Logik ist da, es fehlt **Provider-Key + Scheduler** (echtes Senden). Das ist Ops, kein reiner Code-Task.
- **„Push-Nachricht" (WebPush/mobil):** **[Later / eher Nicht jetzt]** — deutlich mehr Aufwand (Service Worker, Subscriptions, Berechtigungen); E-Mail deckt den Bedarf zuerst.

---

### 1.10 „Lade ich Startups hier ein, damit sie sich registrieren?"

**Status: [Teilweise da].** Es gibt **öffentliche Self-Registrierung** für Startups: `/auth/signup/startup` (`src/app/auth/signup/startup/page.tsx`) und für Partner `/auth/signup/partner`, mit **Approval-Gate** (`approvedAt`, `/pending`). Einen **gezielten Einladungs-Flow** (Team verschickt Invite-Link/-Mail an ein bestimmtes Startup) gibt es **nicht**.

**Verdikt:** **[Build partial / S–M].** Einladungs-Flow: Team erzeugt einen (ggf. tokenisierten) Invite → E-Mail mit Signup-Link → Startup registriert sich vorab zugeordnet (z. B. direkt einem Batch, → 1.11). Nutzt die vorhandene E-Mail-Abstraktion (produktiver Versand = gleiche Infra-Frage wie 1.9). Bis dahin: Self-Signup-Link teilen.

---

### 1.11 Batches: nur für uns? · Markieren wir Startups in Batches? · Sehen Partner ihren Batch / nur Startups ihres Batches? · Müssen Partner klassifiziert werden?

**Das ist die größte echte Lücke — und deckt sich mit Vision-Doc §2.1/§2.2.**

**Status heute:**
- Bündelung existiert als `ScoutingCampaign` (`schema.prisma:307`) + `Startup.campaignId`. Damit kann man Startups einem „Batch" zuordnen.
- **ABER `ScoutingCampaign` ist NICHT zugriffsbeschränkend** und kennt **keine Partner-Mitgliedschaft.** Sichtbarkeit läuft ausschließlich über **Rollen** (`src/lib/roles.ts`, `auth-guards.ts`) und bei Inhalten über `ContentAudience`.
- Folglich: Batch-Zuordnung ist heute faktisch **nur für uns** (Team) nützlich; **Partner sehen keine Batch-Info**, und sie sehen **alle** Partner-Flächen global, nicht „nur ihren Batch".
- **Partner werden heute nicht klassifiziert/kohorten-zugeordnet** (kein `PartnerCompany`↔`User`-Membership; `PartnerCompany` existiert nur für die Matrix, `schema.prisma`-Matrix-Block).

**Verdikt:** **[Build] — Fundament.** Ein schlankes **`Badge`/`Cohort` + `Membership`-Modell + Scoping-Guard** (Vision-Doc §2.1). Erst dann sind möglich: „Partner sieht Batch-Info", „Partner sieht nur Startups seines Batches", „Roadmap/Material je Batch". **Aufwand M** (bewusst minimal: Modell + Mitgliedschaft pflegbar + ein Guard, kein Multi-Tenant-Rechtesystem). **Entscheidung nötig** (§4): ersetzt Badge-Scoping die globale Rollensicht oder kommt es zusätzlich dazu?

**Antworten auf die Einzelfragen (Ist-Stand):**
- *Nur für uns ersichtlich?* → Heute **ja** (Campaign ist team-intern).
- *Markieren wir Startups in Batches?* → Ja, über `campaignId` (Team).
- *Kriegen Partner die Batch-Info / sehen nur ihren Batch?* → Heute **nein** (kein Scoping). Braucht das Badge-Fundament.
- *Müssen Partner klassifiziert werden?* → Heute nicht; für Batch-Scoping **ja** (Membership).

---

### 1.12 „Wo genau ist die Attio-Anbindung?"

**Status: [Nicht integriert].** Attio ist **nur dokumentiert** (Tooling-Abgrenzung in `docs/plan-partner-startup-ssot.md` §5: Attio = CRM-Master, Plattform = Workflow/Verdikte). `docs/mara-implementation-notes.md` §6: **„Nur Dokumentation, kein Sync"** — keine Attio-Credentials/Integration im Repo. Es gibt **keinen** Attio-Code.

**Verdikt:** **[Later / Infra-Entscheidung].** Vor dem Bau klären (§4): nur lesen (Attio→Plattform spiegeln) oder Outcomes zurückschreiben (Plattform→Attio als Aktivität)? Braucht API-Key + Feld-Mapping. Kein reiner Code-Task.

---

### 1.13 „Wo wäre die GlassDollar-Anbindung?"

**Status: [Nicht integriert].** GlassDollar existiert **nur als Freitext** `sourceDetail`-Wert in Seed-Daten (`prisma/seed.ts`) und im Feld `Startup.sourceDetail` (`schema.prisma:350`). Gedachte Rolle: **Sourcing/Discovery-Master** → Einbahn-Import ins `Startup`-Modell (`sourceType=OUTBOUND`, `sourceDetail="Glassdollar"`), siehe `plan-partner-startup-ssot.md` §5. Es gibt **keinen** Import-/Sync-Code.

**Verdikt:** **[Later / Infra-Entscheidung].** Erster sinnvoller Schnitt wäre ein **CSV-/API-Import** von GlassDollar-Startups → `Startup` (Outbound-markiert). Braucht Zugang/Export-Format-Klärung.

---

### 1.14 Journey Partner/Scouting: sind alle Phasen integriert? Feedback-Punkte je Stage für Startups UND Partner?

**Die vom Nutzer beschriebene Journey vs. Ist-Stand** (Mapping):

| # | Journey-Schritt (Feedback) | Ist-Stand in der Plattform |
|---|---|---|
| 1 | Themen mit Partnern definieren | `Challenge` (Partner-Bedarf) — `/challenges`, `ChallengeForm`. Partnerprofil/Suchprofil fehlt (Vision §2.8). |
| 2 | Erste Marktvalidierung durch uns | Team-Screening `Evaluation`/`Score`, Scoring-Engine (`src/lib/scoring.ts`). |
| 3 | Challenges ausschreiben + Partner-Feedback | `Challenge` + `ChallengeApplication`; Partner-Verdikt `PartnerStartupReview` (`/screening`). |
| 4 | Erste Longlist erstellen | `/longlist` (`src/app/(main)/longlist/page.tsx`). |
| 5 | Shortlist → Partner zur Ersteinschätzung | `StartupPush` (Team→Partner) + `/screening` (Partner-Verdikt CONTINUE/PASS). |
| 6 | Gespräche initiieren | `IntroRequest` / `/intros`; `Message`/`Conversation` (`/messages`). |
| 7 | Für Accelerator einladen | **Lücke** (kein Batch/Cohort-Einladungs-Flow → 1.10/1.11). |
| 8 | Startup-Demos | Nicht dediziert (ggf. Roadmap-Event/Content). |
| 9 | Partner-/Startup-Feedback zu Use-Cases | `/use-cases` (Partner), `PartnerStartupMatch.useCaseTypes`. **Startup-Seite fehlt** (→ 1.15). |
| 10 | Matchmaking | Match-Matrix + regelbasiertes Auto-Matching (`src/lib/use-case-suggestions.ts`, laut Vision `matching.ts`). |
| 11 | Intro-Calls + To-dos an Startups | `IntroRequest`; To-dos strukturiert **fehlen** (→ 1.9). |
| 12 | Call | Extern (kein Call-Tool auf Plattform — Leitplanke). |
| 13 | Partner-Feedback + Tracking durch uns | `PartnerStartupReview`, `CheckInReminder`, `Engagement`. |
| 14 | Testphase startet | `Engagement` (ACTIVE) + `PoCPerformance` (`/pocs`). |
| 15 | PoC o. Ä. | `PoCPerformance`/`/pocs`, `Startup.pipelineStage=PILOT/PARTNERED`. |

**Pipeline-Stages heute:** `DISCOVERED → SCREENING → IN_EVALUATION → PILOT → PARTNERED / PASSED` (`schema.prisma:34`). Deckt das Grobraster ab, aber **nicht 1:1 die feingranulare Journey** oben.

**Verdikt:** **[Weitgehend da, aber nicht als eine geführte Journey sichtbar].** Die **Bausteine existieren fast alle**, aber verteilt über viele Seiten — es gibt **keine durchgängige „Stage-für-Stage mit Feedback-Gate"-Ansicht.** Zwei Lücken: (a) **Startup-seitiges Feedback pro Stage** (heute nur Partner-Feedback) → 1.15; (b) **Accelerator-Einladung/Batch** → 1.11. Empfehlung: **[Build partial / M]** eine Journey-/Stage-Sicht, die die vorhandenen Modelle je Stage zusammenzieht — **nicht** neue Modelle, sondern Verdichtung + die zwei fehlenden Feedback-Richtungen.

---

### 1.15 Feedback je Stage von beiden Seiten · „Wunsch an Partner"

**Status: [Teilweise].** **Partner→Startup-Feedback** ist stark ausgebaut (`PartnerStartupReview`-Verdikt, `/screening`, `/use-cases`, `/check-ins`). **Startup→Partner-Richtung fehlt komplett** (Vision-Doc §2.4c) — es gibt kein symmetrisches Modell, in dem ein Startup Relevanz/Wunsch/Feedback zu einem Partner abgibt („Wunsch an Partner").

**Verdikt:** **[Build] — inhaltlicher Kern (M–L).** Symmetrisches, richtungsbehaftetes Feedback-Modell (`direction: STARTUP_TO_PARTNER | PARTNER_TO_STARTUP`) mit strukturierten Feldern (Relevanz-Skala, Use-Case-Enum, Follow-up-Bool, offene Fragen/Wünsche). Speist die Matrix (beide Seiten je Startup×Partner) und das Matchmaking. **Entscheidung nötig** (§4): Sieht die Gegenseite das Roh-Feedback oder nur das Team (Matrix)?

---

### 1.16 Navigation: „links Aufteilung nach Segmenten/Kategorien filtern, darunter Unterthemen" + konkreter Space-Vorschlag

**Status heute: rollenbasierte Navigation** (`src/lib/roles.ts` → `ROLE_NAV`), mit Sektionen wie „Venture Scout", „Screening & SSOT", „Ökosystem", „Plattform". Also **funktional gruppiert**, aber (a) team-zentriert und (b) nicht als „Space/Kategorie"-Struktur mit Unterthemen.

**Der konkrete Nutzer-Vorschlag** (Space-orientiert) lässt sich **direkt auf vorhandene Seiten mappen** — es ist überwiegend eine **UI-/IA-Umstrukturierung**, kein neuer Backend-Bau:

| Vorgeschlagener Space | Enthält (Wunsch) | Vorhandene Seiten/Modelle |
|---|---|---|
| **Startup-Space** | Eigenes Profil verwalten, Dokumente ergänzen | `/profile`, `OwnProfileForm`, `AttachmentForm`, `/dashboard/startup` |
| **Wunsch an Partner** | Startup äußert Wünsche/Feedback an Partner | **Lücke** → 1.15 (Startup→Partner-Richtung) |
| **Roadmap / Info-Space / Knowledge-Point** | Roadmap, Wissen, Empfehlungen | `/partner-hub` + `/venture` (Hub), Knowledge-Board → 1.7 |
| **Matchmaking der Partner / Use-Cases** | Matches + Use-Case-Bewertung | `/match-matrix`, `/use-cases` |
| **Status der Kommunikation der Partner** | Push „an", Eskalation wenn's hakt | `/pushes`, `/check-ins`, `CheckInReminder` (Eskalation = neu) |
| **Marketplace + Venture-Credits** | Marktplatz, Guthaben | `/venture/marketplace`, `/venture/credits`, `/credits` |
| **Tracking des Status (für uns)** | Interner Fortschritt | `/pipeline`, `/reports`, `Engagement`, `/dashboard/admin` |

**Verdikt:** **[Build partial / S–M].** Navigation nach diesen Spaces neu gruppieren (Anpassung `ROLE_NAV` in `src/lib/roles.ts`, ggf. Sidebar-Ausklapp-Unterthemen in `Sidebar.tsx`). **Bewusst zuerst nur Umbenennen/Umsortieren des Vorhandenen** — die einzige echte neue Fläche ist „Wunsch an Partner" (1.15) und die Eskalations-Logik im Kommunikations-Status (1.9). „Filter links nach Segment/Kategorie" (z. B. Startups nach Branche/Batch filtern) ist eine kleine Ergänzung an den Listen-Seiten.

---

## 2. Übersichtstabelle

| # | Thema | Verdikt | Aufwand | Baut auf |
|---|---|---|---|---|
| 1.1 | Startup-Übersicht | **[Da]** | — | `/startups`, `/discover` |
| 1.2 | Notion-Space/Roadmap/Media-Kit | **[Da]** | — | SSOT-Hub |
| 1.3 | Startup-Push für Follow-ups | **[Entscheidung]** + **[Build partial]** | S–M | `StartupPush`, `IntroRequest` |
| 1.4 | „Nur Credits" | **[Da]** | — | Credit-System |
| 1.5 | Radar-Definition/Zweck | **[Entscheidung]** (+S) | S | `RadarView`, Enums |
| 1.6 | Marketplace | **[Da]** | — | Marktplatz |
| 1.7 | Knowledge-Board (Bücher/Videos) | **[Build partial]** | S | `MediaAsset`/`ContentPage` |
| 1.8 | Durchfluss Matrix→Engagements | **[Build partial]** | M | `PartnerStartupMatch`, `Engagement` |
| 1.9 | To-do-Tracking + Reminder (Mail/Push) | **[Build partial]** + **[Infra]** | M (+Infra) | `CheckInReminder`, `email.ts`, Cron |
| 1.10 | Startups einladen (Invite-Flow) | **[Build partial]** | S–M | Signup + E-Mail |
| 1.11 | Batches + Zugriffs-Scoping für Partner | **[Build] Fundament** | M | `ScoutingCampaign` → `Badge`/Membership |
| 1.12 | Attio-Anbindung | **[Later/Infra]** | — (Infra) | nur dokumentiert |
| 1.13 | GlassDollar-Anbindung | **[Later/Infra]** | S (Import) | `sourceType`/`sourceDetail` |
| 1.14 | Journey-/Stage-Sicht | **[Build partial]** | M | vorhandene Modelle verdichten |
| 1.15 | Zweiseitiges Feedback / „Wunsch an Partner" | **[Build] Kern** | M–L | `PartnerStartupReview` symmetrisch |
| 1.16 | Navigation nach Spaces/Kategorien | **[Build partial]** | S–M | `roles.ts`, `Sidebar.tsx` |

---

## 3. Empfohlene Reihenfolge (klein anfangen, hoher Wert)

**Quick Wins (unabhängig, sofort — S):**
1. **1.16 Navigation umstrukturieren** nach dem Space-Vorschlag (nur Umsortieren/Umbenennen des Vorhandenen). Macht sofort spürbar, dass „alles schon da ist".
2. **1.5 Radar schärfen:** Ring-/Feld-Legende + „So liest du den Radar" — **nach** der Definitions-Entscheidung.
3. **1.7 Knowledge-Board** als kleine Hub-Sektion.

**Fundament (M) — schaltet vieles frei:**
4. **1.11 Badge/Cohort + Membership + Scoping-Guard.** Voraussetzung für batch-gescopte Startup-/Roadmap-/Material-Sichten, Partner-Klassifizierung, gezielte Einladungen (1.10) und die Journey-Sicht (1.14).

**Inhaltlicher Kern (M–L):**
5. **1.15 Zweiseitiges Feedback / „Wunsch an Partner"** (Startup→Partner-Richtung + strukturierte Felder) → speist Matrix + Matchmaking.
6. **1.8 Durchfluss Matrix→Engagements** + **1.9 strukturierte To-dos** (mit Reminder-Anbindung).

**Infra-/Ops-Entscheidungen (kein reiner Code-Task):**
7. **1.9 E-Mail produktiv** (Provider + Scheduler), dann **1.10** Einladungs-Mails.
8. **1.12 Attio** / **1.13 GlassDollar** Anbindung — je nach Sync-Tiefe (§4).

**Bewusst NICHT jetzt:**
- **App-/Web-Push-Nachrichten** (1.9) — E-Mail deckt den Bedarf zuerst.
- **Voll ausgebaute Journey-Automatik** — erst die verdichtende Sicht (1.14), dann evtl. Gates.

---

## 4. Entscheidungen, die das Team treffen muss (vor dem Bauen)

> Produktweichen, keine reinen Technikfragen.

| # | Frage | Warum es zählt |
|---|---|---|
| 1 | **Batch-Scoping vs. globale Rollensicht** (1.11): Zugriff künftig je Batch einschränken — ersetzend oder zusätzlich zur heutigen globalen Partner-Sicht? | Bestimmt Datenmodell (`Badge`/`Membership`) + alle Guards. Größter Hebel. |
| 2 | **Notion-Ersatz reaktivieren?** (1.2) Soll die Plattform der führende Info-Space werden, oder bleibt Notion Master und wir verlinken? | Entscheidet Umfang von 1.2/1.7/1.16 (migrieren vs. verlinken). |
| 3 | **Radar-Zweck + Definitionen** (1.5): Was bedeuten die Ringe? Rein intern oder extern zeigbar? | Ohne Definition bleibt der Radar „sinnlos" (O-Ton Nutzer). |
| 4 | **Push-Richtung** (1.3): Soll „pushen" Startup→Team/Partner ermöglichen, oder bleibt Push Team→Partner? | Bestimmt, ob 1.3 ein neues Feld/Flow oder nur Klärung ist. |
| 5 | **Feedback-Sichtbarkeit** (1.15): Sieht die Gegenseite das Roh-Feedback oder nur das Team (Matrix)? | Kern-Privacy-Entscheidung; beeinflusst Ehrlichkeit der Bewertungen. |
| 6 | **Feedback-/Use-Case-Enums** (1.15/1.8): Use-Case-Typen, Kontaktstatus-Werte, Relevanz-Skala final festlegen. | Definiert Schema + Auswertbarkeit der Matrix. |
| 7 | **E-Mail produktiv** (1.9/1.10): Provider (Resend/…?) + Scheduler (Cloudflare/Vercel Cron)? Opt-in/Frequenz? | Voraussetzung für echten Versand (heute nur Console-Adapter). |
| 8 | **Attio-Sync-Tiefe** (1.12): nur lesen, oder Outcomes zurückschreiben? Welche Felder? | Bestimmt Integrationsaufwand. |
| 9 | **GlassDollar-Import** (1.13): Import-Weg (CSV/API), wie oft, welche Felder? | Bestimmt Sourcing-Anbindung. |
| 10 | **Datei-Upload** (1.2 Media / 1.10 Docs): nur URL-Referenz (wie heute) oder echter Upload/Storage? | Braucht sonst Storage-Infra (heute nicht vorhanden). |

---

*Dieses Dokument bewertet nur; es ändert keinen Code, kein Schema und triggert keine Migration. Umsetzung erst nach den §4-Entscheidungen, in der in §3 vorgeschlagenen Reihenfolge.*
