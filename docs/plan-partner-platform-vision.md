# Assessment: Partner-Plattform-Vision & Use-Case „Accelerator-Badge"

> **Status:** Planungs-/Bewertungsdokument (KEIN Code, keine Schema-Änderung, keine Migration). Stand: Juli 2026 · Branch: `mara`.
> **Zweck:** Das Feedback eines Teammitglieds zur Partner-Journey **geerdet an der bestehenden Codebase** bewerten. Für jedes Thema: Was ist es, was haben wir schon, wo ist die Lücke, klares Verdikt + grober Aufwand, Leitplanken/Privacy.
> **Haltung:** Pragmatisch und ehrlich („plan first, don't go all out"). Wir sagen explizit, was **nicht** auf die Plattform gehört, und wo neues Feedback frühere Entscheidungen (**Notion-Ersatz**, **keine Kommunikationsplattform**) wieder aufmacht.

**Verdikt-Legende:** **[Build]** = jetzt sinnvoll bauen · **[Build partial]** = schlanke Teilmenge bauen · **[Later]** = konzeptionell ok, aber später · **[Not on platform]** = gehört nicht (oder nicht primär) auf die Plattform.
**Aufwand:** **S** ≈ 1–2 Tage · **M** ≈ 3–5 Tage · **L** ≈ 1–2 Wochen (jeweils Datenmodell + Actions + UI, ohne externe Infra).

---

## 1. Executive Summary

Das Feedback beschreibt im Kern **einen zugriffsgeschützten „Accelerator-Badge / Cohort-Space"** (nur Partner **und** Startups eines Badges) als „one-stop-shop", plus **zweiseitiges strukturiertes Feedback & Matchmaking** (Ersatz der Excel-„Matrix"), **Partnerprofile/-Onboarding**, **leichtgewichtige Terminkoordination** und ein **Quick-Share** („Startup per Klick weiterleiten").

Die wichtigste architektonische Erkenntnis: **Die Plattform hat heute KEIN Badge-/Cohort-Konzept mit Zugriffs-Scoping.** Sichtbarkeit läuft aktuell ausschließlich über **Rollen** (`src/lib/roles.ts`, `src/lib/auth-guards.ts`) und bei Inhalten über **`ContentAudience`** (`PARTNER`/`STARTUP`/`BOTH`). `ScoutingCampaign` bündelt Startups zwar als „Batch/Longlist", ist aber **nicht** zugriffsbeschränkend und kennt **keine Partner-Mitgliedschaft**. Ein `Badge`/`Cohort`-Modell mit **Membership-Join** ist damit die **größte neue Grundlage** — fast alles andere im Feedback hängt daran (Space-Inhalte, Teilnehmerlisten, Scoping des zweiseitigen Feedbacks, Marketplace-Zugang je Badge).

Gleichzeitig berührt das Feedback zwei bewusst gesetzte Leitplanken:
- **„Keine Kommunikationsplattform als Selbstzweck"** — Terminkoordination/Kalender und offene Q&A drücken genau dagegen. Hier bremsen wir und empfehlen die leichteste Variante bzw. „Later".
- **Notion-Ersatz** — das Feedback („Accelerator-Space **analog zum Notion-Space**") reaktiviert die früher **auf Wunsch entfernte** „Notion-Ersatz"-Rahmung. Das ist eine **Produktentscheidung fürs Team**, keine reine Technik-Frage (siehe §4).

Kurz: Der Badge-Space + strukturiertes zweiseitiges Feedback ist **die** wertvolle, gut andockbare Idee. Vieles davon ist eine **gezielte Erweiterung** bestehender Modelle (`PartnerStartupReview`, `Engagement`, `RoadmapItem`/`ContentPage`/`MediaAsset`, Marketplace, `StartupPush`), **nicht** ein Neubau von Grund auf.

---

## 2. Themen-für-Themen-Bewertung

### 2.1 Accelerator-Badge / Cohort als ZUGRIFFSGESCHÜTZTER Space — *Kernkonzept*

**(a) Was es ist.** Ein abgegrenzter Bereich pro Accelerator-Badge (z. B. „Construction Badge") mit allen relevanten Infos, **Zugang nur für Partner UND Startups dieses Badges**. Analog zum heutigen Notion-Space.

**(b) Was wir schon haben.**
- Rollen + Guards: `UserRole` (`ADMIN/MEMBER/BUSINESS_PARTNER/INVESTOR/STARTUP`), `requireRole`/`requirePartnerView`/`requireVentureView` in `src/lib/auth-guards.ts`, Approval-Gate `approvedAt`/`requireApprovedAccess`.
- Inhalts-Sichtbarkeit über `ContentAudience` (`RoadmapItem`, `ContentPage`, `MediaAsset`).
- Startup-Bündelung über `ScoutingCampaign` (`Startup.campaignId`).

**(c) Die Lücke.** Es gibt **kein** Modell, das *Personen/Startups einer Kohorte zuordnet* und Zugriff **darauf** einschränkt. Heute sieht ein Partner Partner-Flächen **rollenbasiert global**, nicht „nur seinen Badge". Es fehlt:
- ein `Badge`/`Cohort`-Modell,
- ein **Membership-Join** (welcher Partner/welches Startup gehört zu welchem Badge; ggf. mit Rolle im Badge),
- ein **Scoping-Layer**, der Content/Marketplace/Teilnehmerlisten je Badge filtert (neuer Guard „ist Mitglied von Badge X").

**(d) Empfehlung — [Build partial].** Das Fundament (Modell `Badge` + `BadgeMembership`, Scoping-Guard) ist hochwertig und **Voraussetzung** für fast alle anderen Themen → als **erste, schlanke Grundlage** bauen. Bewusst klein starten: 1 Badge modellieren, Mitgliedschaften pflegbar, ein Guard. **Kein** vollausgebautes Multi-Tenant-Rechtesystem.

**(e) Aufwand.** **M** (Modell + Membership + Scoping-Guard + minimale Admin-Pflege). Ohne UI-Ausbau der Unterbereiche.

**(f) Leitplanken/Privacy.** **Reopener:** Badge-Scoping verändert das heutige „rollenbasiert global"-Prinzip → muss bewusst entschieden werden (siehe §4). Datenschutz-Gewinn: Startups sehen andere Startups desselben Badges → klären, **welche** Startup-Infos innerhalb eines Badges sichtbar sind (interne Scores/Pipeline bleiben strikt Team-intern, wie in `release-mara.md`/`plan-partner-startup-ssot.md` festgelegt).

---

### 2.2 Badge-Space-Inhalte: Roadmap, Materialien, Teilnehmer-Directory, Marketplace-Zugang

**(a) Was es ist.** Im Badge-Space: Roadmap (was passiert wann), Materialien/Ressourcen, Übersicht/Verlinkung teilnehmender Partner + Startups, Zugang zu Marketplace/Buchung/Credits.

**(b) Was wir schon haben.** **Sehr viel.**
- Roadmap: `RoadmapItem` (Titel, Body, `phase`, `RoadmapStatus`, `audience`, `sortOrder`).
- Wissensseiten/Materialien: `ContentPage` (Markdown), `MediaAsset` (Downloads) — Pflege über `/hub-admin`, Lesesicht `/partner-hub`.
- Marketplace + Credits: `Program`/`MentorProfile`/`SupportOffering`/`MarketplaceBooking` + `CreditAccount`/`CreditTransaction` (voller Buchungs-Lifecycle, `redeem-on-confirm`).
- Teilnehmer-Daten: `User`, `Startup` (inkl. Storefront-Feldern) existieren.

**(c) Die Lücke.** Alle Inhalte sind heute **global je Audience**, nicht **je Badge**. Es fehlt: `badgeId`-Bezug (bzw. eine Badge-Filterung) an `RoadmapItem`/`ContentPage`/`MediaAsset`, ein **Teilnehmer-Directory je Badge** (fällt aus der Membership aus 2.1 ab) und optional **Marketplace-Scoping** je Badge (heute ist der Marketplace ein Startup-Self-Service, Partner haben **keinen** Zugriff — siehe Leitplanke).

**(d) Empfehlung — [Build partial], nach 2.1.** Sobald das Badge-Fundament steht, ist „Badge-scoped Roadmap + Materialien + Teilnehmerliste" ein hoher, sichtbarer Außenwert mit **geringem Neubau** (nur Scoping + eine Lesesicht). Marketplace-Zugang je Badge zunächst **zurückstellen**, da er die aktuelle Marketplace-Zielgruppe (nur STARTUP) aufmacht.

**(e) Aufwand.** Roadmap/Materialien/Directory scoped: **M**. Marketplace je Badge zusätzlich: **M–L** (Zielgruppen-/Gating-Frage).

**(f) Leitplanken/Privacy.** **Reopener Notion-Ersatz:** Ein „Space mit allen Infos" ist genau die Notion-Ersatz-Idee → siehe §4. Teilnehmer-Directory: klären, welche Kontaktdaten sichtbar sind (Directory ≠ CRM; `Contact` bleibt schlank laut `plan-partner-startup-ssot.md`).

---

### 2.3 Optionale Änderungs-Benachrichtigungen per E-Mail

**(a) Was es ist.** Bei bestimmten Änderungen/neuen Infos optional eine Mail an hinterlegte Personen.

**(b) Was wir schon haben.** Eine **fertige, abstrahierte E-Mail-Mechanik**: `sendEmail`/`EmailAdapter` (`src/lib/email.ts`), Verarbeitung `processDueReminders()` (`src/lib/reminders.ts`), Cron-Endpoint `POST /api/cron/reminders` (mit `CRON_SECRET`), Modell `CheckInReminder` als Vorlage für „geplanter Versand".

**(c) Die Lücke.**
- **Kein echter Provider** und **kein verdrahteter Scheduler** — der aktive Adapter ist `consoleEmailAdapter` (loggt nur), der Cron-Trigger ist nicht angebunden (`mara-implementation-notes.md`).
- Kein „bei Content-Änderung → Mail"-Trigger und **keine Opt-in-Abo-Struktur** (wer will worüber Mails).

**(d) Empfehlung — [Build partial] / teils [Later].** Die **Trigger-Logik** (Änderung an Badge-Roadmap/Content → Mail an Badge-Mitglieder mit Opt-in) ist schlank auf die bestehende Mechanik aufsetzbar. Der **produktive Versand** hängt an externer Infra (Provider-Key + Scheduler) → das bleibt eine **Infra-/Ops-Entscheidung**, nicht Teil des ersten Slices. Wichtig: **opt-in**, nicht laut.

**(e) Aufwand.** In-App-Trigger + Opt-in-Flag: **S–M**. Provider + Cron produktiv: separater Infra-Task (kein reiner Code-Aufwand).

**(f) Leitplanken/Privacy.** Passt zur Leitplanke „Plattform stößt höchstens **automatisierte Erinnerungen** an" — solange es **Benachrichtigungen** bleiben und **kein** Messaging/Diskussionsstrang wird. Opt-in + Frequenz-Deckel gegen Spam.

---

### 2.4 Zweiseitiges strukturiertes Feedback (Startup↔Partner) — Ersatz der Excel-„Matrix"

**(a) Was es ist.** Heute in Excel: Feedback **beider Seiten** gesammelt, im Tab „Matrix" vereint; links Tracker je Partner + finale relevante Startups (Status/Next Steps). Gewünschte Felder je Seite: **Relevanz-Bewertung**, **Use-Cases** (Enum: Pilotprojekt/Kundenbeziehung/White-label/…), **Folgegespräch erwünscht** (bool), **offene Fragen** (Text), **Kontaktstatus** (Enum: z. B. noch nicht / in Kontakt / ...). Darauf basierend **Matchmaking**.

**(b) Was wir schon haben.**
- `PartnerStartupReview` — **partner→startup**: `verdict` (`PENDING/CONTINUE/PASS`), `note`, optional `challengeId`, `@@unique([partnerId, startupId, challengeId])`. Genau die „Partner-Seite" der Matrix im Ansatz.
- `Engagement` — `partnerId`/`startupId`, `status` (`EngagementStatus`), `kpis`/`milestones` (JSON), `notes`. Ideal für den **Tracker „finale relevante Startups + Next Steps"**.
- `Challenge`/`ChallengeApplication` als Use-Case-Bezug; regelbasiertes Auto-Matching existiert bereits (`src/lib/matching.ts`, laut `plan-partner-startup-ssot.md`).

**(c) Die Lücke.**
- **Richtung Startup→Partner fehlt komplett** — es gibt kein symmetrisches Review-Modell, in dem ein **Startup** einen Partner bewertet.
- Die gewünschten **strukturierten Felder** (Relevanz-Rating, Use-Case-Enum, Follow-up-Bool, Kontaktstatus-Enum) fehlen an `PartnerStartupReview` (dort nur `verdict` + `note`).
- Keine **„Matrix"-Roll-up-Sicht**, die beide Seiten je Startup×Partner zusammenführt.

**(d) Empfehlung — [Build].** Das ist der **inhaltliche Kern** des Feedbacks und ersetzt echtes manuelles Excel-Handling → hoher Wert, gute Basis. Konkret (später umzusetzen):
- `PartnerStartupReview` um strukturierte Felder erweitern **oder** ein gemeinsames, **richtungsbehaftetes** Feedback-Modell (Feld `direction: STARTUP_TO_PARTNER | PARTNER_TO_STARTUP`) einführen, das beide Seiten symmetrisch abbildet.
- Neue Enums für **Use-Case-Typ** und **Kontaktstatus**; Relevanz als Skala; Follow-up als Bool; offene Fragen als Text.
- **Matrix-Roll-up-Sicht** (read-only Tabelle Startup×Partner mit beiden Verdikten) + **Tracker** über `Engagement` (Next Steps/Status der „finalen relevanten Startups").
- **Matchmaking**: zunächst simpel „beide Seiten CONTINUE/hohe Relevanz → Match-Kandidat", auf `matching.ts` aufbauend.

**(e) Aufwand.** Symmetrisches Modell + Felder + Erfassungs-UI beider Seiten: **M**. Matrix-Sicht + einfache Match-Logik zusätzlich: **M**. Zusammen realistisch **M–L**.

**(f) Leitplanken/Privacy.** Passt perfekt zur Kern-Mission „Screening- & Feedback-Plattform". Wichtig: Sichtbarkeit steuern — sieht ein Partner die Bewertung, die das **Startup** über ihn abgegeben hat (und umgekehrt)? Standard eher: Team sieht **beide** Seiten (Matrix), die Gegenseite sieht die Roh-Bewertung **nicht** ungefiltert. Muss entschieden werden (§4). Interne Team-Scores bleiben getrennt.

---

### 2.5 Startup lädt dediziertes Pitch-Deck je Partner hoch

**(a) Was es ist.** Ein Startup lädt **pro Partner** ein zugeschnittenes Pitch-Deck hoch (nicht nur das generische Deck).

**(b) Was wir schon haben.** `Attachment` (`name`, `url`, `type` = `LINK/DOCUMENT/DECK/OTHER`) — **aber startup-level** (`Attachment.startupId`), ohne Partner-Bezug.

**(c) Die Lücke.** Kein **partner-spezifischer** Deck-Bezug. Es fehlt eine Zuordnung „dieses Deck gehört zu Startup **für** Partner X" (z. B. optionaler `partnerId` an `Attachment` oder ein Feld am zweiseitigen Feedback aus 2.4).

**(d) Empfehlung — [Build partial], gekoppelt an 2.4.** Kleiner, konkreter Mehrwert, der natürlich am „Startup→Partner-Feedback"-Datensatz hängt. Am saubersten als **optionaler Deck-Link am Startup→Partner-Review** (statt `Attachment` aufzubohren), damit die Zuordnung eindeutig bleibt.

**(e) Aufwand.** **S** (ein Feld/Link + Upload-/Link-Feld in der Erfassungsmaske aus 2.4).

**(f) Leitplanken/Privacy.** Deck ist sensibel → **nur** für den adressierten Partner + Team sichtbar, nie badge-weit. Datei-Upload braucht Storage-Klärung (heute werden URLs referenziert, kein Binär-Upload im Repo).

---

### 2.6 Terminkoordination / Verfügbarkeiten

**(a) Was es ist.** Optionen aus dem Feedback: (i) beide geben reguläre Zeitfenster an → **Überschneidungen** erkennen; (ii) Startup gibt einseitig Slots an, Partner **wählt** einen für den Folgecall; (iii) **Kalendereinbindung** (optional). Das Teammitglied ist hier selbst **unsicher**, was praktikabel ist (bei Partnern je Startup unterschiedliche Ansprechpartner).

**(b) Was wir schon haben.** Nichts Dediziertes. Nächstliegend: `MarketplaceBooking.preferredAt` (Freitext-Wunschtermin) und `Engagement` als Kontext. Kein Scheduling, kein Kalender-Sync.

**(c) Die Lücke.** Komplett neu: Verfügbarkeits-Modell, Overlap-Logik, ggf. externe Kalender-Integration (OAuth zu Google/Microsoft, Zeitzonen, Sync-Zustände).

**(d) Empfehlung — ehrlich gestaffelt:**
- Volle **Kalender-Sync-Integration**: **[Not on platform]** (bzw. weit „Later"). Das ist schwer (OAuth, Zeitzonen, Sync-Konflikte), wartungsintensiv und drückt hart gegen die Leitplanke „keine Kommunikationsplattform". Terminfindung lösen etablierte Tools (Calendly/Google/Outlook) besser.
- **Einseitige Slots (Startup schlägt vor → Partner wählt)**: **[Later] / [Build partial]** wenn überhaupt — als **leichtestes** Muster (ein paar Freitext-/Slot-Felder + Auswahl), ohne Kalender-Anbindung. Nur bauen, wenn 2.4 im Betrieb zeigt, dass Terminfindung wirklich der Engpass ist.
- **Overlap-Detection aus beidseitigen Zeitfenstern**: **[Later]** — mehr Aufwand, unklarer Nutzen (unterschiedliche Ansprechpartner je Startup, wie das Teammitglied selbst anmerkt).

**(e) Aufwand.** Einseitige Slot-Auswahl: **M**. Overlap-Detection: **M–L**. Kalender-Sync: **L+** (plus laufende Wartung).

**(f) Leitplanken/Privacy.** Direkter Konflikt mit „keine Kommunikationsplattform als Selbstzweck". Empfehlung: **verlinken statt nachbauen** (z. B. Partner hinterlegt seinen Booking-Link). Wenn überhaupt in-App, dann die **einseitige** Slot-Variante — nichts mit externem Kalender.

---

### 2.7 Schnelleres Prüfen + „Key-Infos kopieren / per Mail weiterleiten"

**(a) Was es ist.** Startups einem Partner „zuspielen" für kurze Einschätzung; per Button/Klick die wesentlichen Infos kopieren und intern per Mail weiterleiten.

**(b) Was wir schon haben.** **Fast alles.**
- „Zuspielen": `StartupPush` (Team weist Partner ein Startup zu, mit `context`) + `CheckInReminder` (Erinnerung) — Pflege über `/pushes`, Partner-Sicht `/check-ins`.
- Kurze Einschätzung: `PartnerStartupReview` (leichtes Verdikt).
- **Share-/Copy-Muster existiert bereits**: `src/components/challenges/ShareChallengeButton.tsx` nutzt `navigator.clipboard` (mit `execCommand`-Fallback) und **`mailto:`**-Links. Genau dieses Muster ist auf „Startup-Kurzprofil kopieren / per Mail teilen" übertragbar.

**(c) Die Lücke.** Nur ein kleiner **„Copy summary / mailto"-Button** für ein Startup-Kurzprofil (Name, 1-Satz-Pitch, Einordnung) fehlt — die Bausteine (Push, Review, Share-Pattern) sind da.

**(d) Empfehlung — [Build] (Quick Win).** Geringer Aufwand, direkt nützlich, keine Leitplanken-Verletzung. Ein „Kurzprofil kopieren"/„per Mail weiterleiten"-Button auf der Startup-/Longlist-Karte, analog `ShareChallengeButton`.

**(e) Aufwand.** **S**.

**(f) Leitplanken/Privacy.** Unkritisch: `mailto:` öffnet das E-Mail-Programm des Nutzers (kein Server-Versand, kein Messaging-Layer). Kopierter Inhalt darf **keine** internen Scores/Pipeline enthalten (nur kuratierte Kurzinfos) — konsistent mit der Low-Overload-Leitplanke.

---

### 2.8 Partnerprofile + Onboarding

**(a) Was es ist.** Partner teilen: was sie suchen, welche Expertise sie mitbringen, welche Expertise sie suchen, Art der Zusammenarbeit, relevante Themen (z. B. Industrie-Fragebogen + kurze Einschätzung). Zukünftig als kleines **Partner-Onboarding**. Speist Matchmaking (2.4).

**(b) Was wir schon haben.** `User` (Rolle `BUSINESS_PARTNER`, `company`, Approval-Gate). Als **Muster** existiert `MentorProfile` (`expertise[]`, `bio`, `company`, `role`) — zeigt, wie ein Profilmodell an einen `User` gehängt wird. Ein echtes **Partnerprofil** fehlt aber.

**(c) Die Lücke.** Kein `PartnerProfile`-Modell (Suchprofil, mitgebrachte/gesuchte Expertise, Kollaborationstyp, Themen/Fragebogen) und kein Onboarding-Flow.

**(d) Empfehlung — [Build partial] / [Later].** Sinnvoll und gut andockbar, aber **abhängig** von Matchmaking-Bedarf (2.4). Empfehlung: schlankes `PartnerProfile` bauen, **sobald** das zweiseitige Feedback/Matchmaking steht — dann speist das Profil die Match-Kriterien. Onboarding-UI kann später folgen. Bewusst **kein** Self-Darstellungs-/Showcase-Profil (Leitplanke „kein Ökosystem-Showcase") — Profil dient dem **Matching**, nicht der Sichtbarkeit.

**(e) Aufwand.** Modell + Pflege-/Anzeige-UI: **M**. Geführtes Onboarding zusätzlich: **S–M**.

**(f) Leitplanken/Privacy.** Profil-Sichtbarkeit klären (nur Team? badge-intern für Startups?). Fragebogen-Daten sind Geschäftsinfos → Zugriff eng halten.

---

### Übersichtstabelle

| # | Thema | Verdikt | Aufwand | Baut primär auf |
| --- | --- | --- | --- | --- |
| 2.1 | Badge/Cohort als zugriffsgeschützter Space (Fundament) | **[Build partial]** | M | Rollen/Guards, `ContentAudience`, `ScoutingCampaign` |
| 2.2 | Badge-Space-Inhalte (Roadmap/Material/Directory/Marketplace) | **[Build partial]** | M (Marketplace +M–L) | `RoadmapItem`/`ContentPage`/`MediaAsset`, Marketplace |
| 2.3 | Optionale Änderungs-Mails | **[Build partial]** / Infra **[Later]** | S–M | `sendEmail`, `reminders.ts`, Cron-Route |
| 2.4 | Zweiseitiges strukturiertes Feedback + Matrix (Excel-Ersatz) | **[Build]** | M–L | `PartnerStartupReview`, `Engagement`, `matching.ts` |
| 2.5 | Pitch-Deck je Partner | **[Build partial]** | S | `Attachment` / Feedback aus 2.4 |
| 2.6 | Terminkoordination / Kalender | **[Later] / [Not on platform]** | M–L+ | (nichts Dediziertes) |
| 2.7 | Quick-Check + Copy/Mail-Weiterleitung | **[Build]** (Quick Win) | S | `StartupPush`, `ShareChallengeButton`-Muster |
| 2.8 | Partnerprofile + Onboarding | **[Build partial] / [Later]** | M (+S–M) | `MentorProfile`-Muster, `User` |

---

## 3. Abhängigkeiten & Sequenzierung

**Fundamental (zuerst):**
- **2.1 Badge/Cohort + Membership + Scoping-Guard.** Voraussetzung für 2.2 (scoped Inhalte/Directory), verstärkt 2.3 (Mail an Badge-Mitglieder) und rahmt 2.4 (Feedback je Badge).

**Baut darauf auf:**
- **2.2** (Badge-scoped Roadmap/Material/Directory) direkt nach 2.1.
- **2.4** (zweiseitiges Feedback + Matrix) — inhaltlicher Kern; kann teilweise **parallel** starten (das partner→startup-Modell existiert schon), profitiert aber vom Badge-Scope.
- **2.5** (Deck je Partner) hängt an 2.4.
- **2.8** (Partnerprofil) speist 2.4-Matchmaking → danach.
- **2.3** (Mails) andockbar, sobald es „Änderungen im Badge-Space" (2.2) gibt; produktiver Versand = separater Infra-Task.

**Quick Wins (unabhängig, sofort):**
- **2.7** Copy/Mail-Weiterleitung (**S**) — nutzt bestehendes Share-Muster, kein Fundament nötig.
- **2.5** Deck-Feld (**S**) — sobald die Feedback-Maske existiert.

**Big Rocks / bewusst spät oder außen vor:**
- **2.6** Terminkoordination (v. a. Kalender-Sync) — **[Later]/[Not on platform]**.
- **2.2** Marketplace-Zugang **je Badge** — öffnet die aktuelle Marketplace-Zielgruppe → gesonderte Entscheidung.

---

## 4. Entscheidungen, die das Team treffen muss

> Bewusst **ohne** vorweggenommene Antworten — das sind Produktweichen, keine reinen Technikfragen.

| # | Frage | Warum es zählt |
| --- | --- | --- |
| 1 | **Badge-Scoping vs. globale Sichtbarkeit:** Soll Zugriff künftig **je Badge** eingeschränkt werden statt (wie heute) rollenbasiert global? Ersetzt das die aktuelle globale Partner-Sicht, oder kommt Badge-Scoping **zusätzlich** dazu? | Verändert das Sichtbarkeits-Grundprinzip aus `release-mara.md`; bestimmt Datenmodell (`Badge`/`Membership`) und alle Guards. |
| 2 | **Notion-Ersatz — zurück im Scope?** Das Feedback beschreibt explizit einen „Accelerator-Space **analog zum Notion-Space**". Die „Notion-Ersatz"-Rahmung wurde früher **auf Wunsch entfernt**. Wollen wir sie **reaktivieren** (Plattform wird der Info-Space) oder bewusst dabei bleiben, dass Notion extern führt? | Entscheidet den gesamten Umfang von 2.1/2.2 und ob wir Inhalte migrieren oder nur verlinken. |
| 3 | **Terminkoordination — welcher Ansatz (wenn überhaupt)?** Kalender-Sync / beidseitige Zeitfenster+Overlap / einseitige Slots / **extern verlinken**? Das Teammitglied ist hier selbst unsicher. | Bestimmt, ob wir die Leitplanke „keine Kommunikationsplattform" antasten und ob großer Integrationsaufwand entsteht. |
| 4 | **Feedback-Sichtbarkeit (zweiseitig):** Sieht jede Seite die Bewertung der Gegenseite, oder nur das Team (Matrix), und die Gegenseite nur ein gefiltertes Signal? | Kern-Privacy-Entscheidung für 2.4; beeinflusst Vertrauen/Ehrlichkeit der Bewertungen. |
| 5 | **Feedback-Struktur:** Genaue Enums festlegen — Use-Case-Typen (Pilotprojekt/Kundenbeziehung/White-label/…?), Kontaktstatus-Werte, Relevanz-Skala (1–5? Ampel?). | Definiert Schema + Auswertbarkeit der „Matrix". |
| 6 | **Marketplace je Badge:** Sollen Partner (nicht nur Startups) über den Badge-Space Marketplace/Buchung sehen? Heute ist der Marktplatz reiner **Startup-Self-Service**. | Öffnet/verändert die Marketplace-Zielgruppe und das Gating. |
| 7 | **E-Mail produktiv:** Welcher Provider + welcher Scheduler (Vercel/Cloudflare Cron)? Opt-in-Regeln/Frequenz? | Voraussetzung, damit 2.3 real versendet (heute nur Console-Adapter). |
| 8 | **Datei-Upload (Deck je Partner):** Nur URL-Referenz (wie heute `Attachment`) oder echter Datei-Upload/Storage? | Bestimmt, ob wir Storage-Infra brauchen (heute nicht vorhanden). |
| 9 | **Partnerprofil-Reichweite:** Team-only, badge-intern, oder breiter? Fragebogen-Umfang? | Balance zwischen Matchmaking-Nutzen und „kein Ökosystem-Showcase". |

---

## 5. Was ich zuerst tun würde — vs. nicht jetzt

**Geist der Anfrage: „don't go all out."** Kleiner, hochwertiger erster Slice statt Big-Bang.

**Erster Slice (klein, hoher Wert):**
1. **Quick Win 2.7 — „Kurzprofil kopieren / per Mail weiterleiten"** (**S**). Nutzt das vorhandene `ShareChallengeButton`-Muster + `StartupPush`. Sofort spürbar, null Leitplanken-Risiko, keine Abhängigkeit.
2. **Fundament 2.1 — schlankes `Badge` + `BadgeMembership` + ein Scoping-Guard** (**M**). Die eine architektonische Grundlage, an der fast alles hängt — bewusst minimal (Modell + Mitgliedschaft pflegbar + ein Guard), noch keine ausgebauten Unterbereiche.
3. **Kern 2.4 (Teil 1) — `PartnerStartupReview` um strukturierte Felder erweitern + die Startup→Partner-Richtung ergänzen** (**M**). Ersetzt schrittweise die Excel-Matrix; das größte inhaltliche „Warum" des Feedbacks. Start mit der Erfassung beider Seiten, Matrix-Roll-up-Sicht als zweiter Schritt.

**Bewusst NICHT jetzt:**
- **Terminkoordination/Kalender-Sync (2.6)** — zurückstellen bzw. extern verlinken; erst evaluieren, ob Terminfindung real der Engpass ist.
- **Marketplace je Badge (2.2)** — braucht erst Entscheidung §4/6.
- **Produktiver E-Mail-Versand (2.3)** — erst Provider/Scheduler-Entscheidung (§4/7); die Trigger-Logik kann warten, bis Badge-Content existiert.
- **Voll ausgebautes Partner-Onboarding (2.8)** — erst nach dem Feedback-/Matchmaking-Kern.

**Vor dem Bauen entscheiden:** mindestens §4-Fragen **1, 2, 4, 5** (Badge-Scoping, Notion-Ersatz, Feedback-Sichtbarkeit, Enums) — sie prägen Datenmodell und Leitplanken.

---

*Dieses Dokument bewertet nur; es ändert keinen Code, kein Schema und triggert keine Migration. Umsetzung erst nach den §4-Entscheidungen, in der in §5 vorgeschlagenen Reihenfolge.*
