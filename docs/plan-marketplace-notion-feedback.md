# Plan: Marktplatz-Abgleich mit Notion (LOVEDIS Startup Support Marketplace)

> **Status:** Planungsdokument (kein Code, keine Migration). Stand: Juli 2026 · Branch `mara`.
> **Quelle:** Notion-Seite „LOVEDIS Startup Support Marketplace"
> (`359e06d44d1b80ec8400c410304a8a4d`) inkl. aller Unterseiten (Sales/Pricing & Growth,
> Mentor:innen, Fundraising, Legal, Marketing, AI/Product & Tech) und der eingebetteten
> Angebots-Datenbanken. Notion-Zugriff war **erfolgreich** (Seiten + Angebots-Zeilen via
> `notion-fetch`/`notion-search` gelesen; die SQL-Query-Tools sind plan-gesperrt, waren
> aber nicht nötig).
> **Ziel:** Die Notion-Spezifikation (die fachliche „Wahrheit" des Programms) gegen die
> live gebaute Marktplatz-/Credit-Implementierung stellen und daraus einen geerdeten
> Verbesserungsplan ableiten. **Leitplanken bleiben:** SSOT statt Tool-Doppelung; das Team
> koordiniert das Matching; Credits werden **nur bei `CONFIRMED`** eingelöst; keine
> Kommunikationsplattform als Selbstzweck.

---

## 1. Executive Summary

- **Der Flow stimmt fast 1:1.** Der in Notion beschriebene 5-Schritte-Anfrage-Flow
  (Angebot wählen → „Anfrage" → Formular mit Kontakt/Session/Bedarf → Team koordiniert
  Matching & Termin → nach Bestätigung Credits einlösen) ist in unserer Implementierung
  exakt so abgebildet (`requestBooking` → `takeBookingIntoCoordination` → `confirmBooking`
  mit atomarer `SPEND`-Buchung). Das ist die größte Stärke: **Architektur & Lifecycle
  passen.**
- **Die größte Abweichung ist der Credit-Maßstab.** Notion arbeitet mit einem **kleinen,
  fixen Budget: 12 Credits pro Startup** (6 fix für das Programm „Sales, Pricing & Growth",
  6 flexibel), und **jede Session kostet 1 oder 2 Credits**. Unser Seed/Modell nutzt dagegen
  Preise von **200–400 Credits**. Das ist keine kosmetische Differenz — es ändert das
  komplette mentale Modell (kleine Kontingente statt „Punktewährung").
- **Zwei Konzepte fehlen im Datenmodell:** (a) der **automatische 12-Credit-Grant**
  („sponsored by LOVEDIS") und (b) die Unterscheidung **fix verplant vs. flexibel** (die
  6 Programm-Credits, die man „nicht einlösen muss, nur anmelden").
- **Angebots-Metadaten sind dünner als in Notion.** Notion pflegt pro Angebot
  **Kontaktperson, Unternehmen/Anbieter, Website, Datum/Termin, Format**. Unser
  `SupportOffering` kennt nur `format` + Freitext; Anbieter/Kontakt/Website/Termin fehlen.
- **Netter Befund:** Kategorien, Angebotstypen (Programm/Mentor/Support) und der
  „Programme = 0 Credits, aber buchbar"-Ansatz decken die Notion-Struktur konzeptionell gut
  ab. Die Lücken sind **Werte & Felder**, nicht die Grundarchitektur.

---

## 2. Notion-Content-Digest (die „alle Infos")

### 2.1 Rahmen & Funktionsweise (Startseite)

> „Nutze das exklusive Programm rund um **Sales, Pricing & Growth** … Ergänzend kannst du
> auf unser Mentor:innen- und Expert:innen-Netzwerk … zugreifen … rund um **Fundraising,
> Legal, Marketing oder AI, Product & Tech**. Nutze hierfür flexibel deine Venture Credits."

**Wie funktioniert es? (5 Schritte, wörtlich):**
1. Melde dich für die Sessions aus Sales, Pricing & Growth an.
2. Wähle weitere passende Angebote aus und frage diese über den **Anfrage-Button** an.
3. Übermittle **Kontaktdaten, gewünschte Session und konkrete Bedarfe** im Antragsformular.
4. Das **LOVEDIS-Team koordiniert Matching und Terminabstimmung** mit dem jeweiligen
   Partner und/oder Dienstleister.
5. **Nach Bestätigung werden die entsprechenden Venture Credits eingelöst.**

### 2.2 Venture Credits (das Herzstück der Abweichung)

- **12 Credits** stehen jedem Startup für sein individuelles Programm zur Verfügung —
  „sponsored by LOVEDIS".
- **6 Credits sind fix verplant** für die **Sales, Pricing & Growth-Journey** — „diese
  brauchst du **nicht einlösen**, du musst dich nur offiziell **anmelden**".
- **6 Credits sind flexibel** — frei einsetzbar über die Themenfelder. „Wie viele Credits
  für jede Session eingelöst werden, findest du in den jeweiligen Übersichtsseiten."

### 2.3 Struktur der Angebote

| Bereich (Notion-Unterseite) | Typ | Credits |
| --- | --- | --- |
| 🚀 Sales, Pricing & Growth | Exklusives Programm | 6 (fix, nur anmelden) |
| 🧠 Mentor:innen | Mentor:innen-Netzwerk (Partner-Führungskräfte) | Credits (Zahl **nicht** in Notion-DB hinterlegt) |
| 💰 Fundraising | Support-Angebote + „Individuelle Expert:innen Sessions" (Investor:innen) | 1 pro Session |
| ⚖️ Legal | Support-Angebote | 1 pro Session |
| 📣 Marketing | Support-Angebote | 1–2 pro Session |
| 🛠️ AI, Product & Tech | Support-Angebote | 1–2 pro Session |

### 2.4 Konkrete Angebote & Credit-Kosten (wie in Notion hinterlegt)

**🚀 Sales, Pricing & Growth (Programm, 6 fixe Credits, keine `Credits`-Spalte pro Session):**
- *Sales Foundations: People, Process & Tools – ein Framework für skalierbares GTM* —
  Online Workshop, 90 Min., Input-Session 27. August 12–13:30, Q&A bei Bedarf
  (Kontakt: Claudia Proß). Programmziel lt. Callout: geschärfte Value Proposition/ICP,
  Sales Handbook (Pipeline/GtM/Playbook/Deal Qualification/Skalierung), Pricing-Strategie &
  validiertes Pricing-Modell.

**🧠 Mentor:innen (Sparring mit Führungskräften der LOVEDIS-Unternehmenspartner):**
- Partner-Unternehmen (Multi-Select): **Fingerhaus, Lupp Living GmbH & Co. KG, Weimer,
  Sälzer, Innexis** (Bau-/Immobilienbranche).
- Gelistete Mentor:innen (Hauptansprechpartner, tragen Themen ins Unternehmen): Elena Tiegs,
  Thomas Pregla, Marie Bender, Robin Sinemli, Henri Böwingloh, Celin Winter, Louisa Cronau,
  Dr. Alexandra Hofmockel.
- **Credit-Kosten pro Mentor-Session: in der Notion-DB nicht hinterlegt** (Schema hat keine
  `Credits`-Spalte). → offene Frage.

**💰 Fundraising:**

| Angebot | Credits | Format | Anbieter/Kontakt |
| --- | --- | --- | --- |
| Founder Insights: Vom ersten Fundraising zum Exit | 1 | Online Q&A | Wunderland Capital / Dirk Rudolf |
| Stakeholdermanagement | 1 | Online Workshop | LOVEDIS / Polina Kon |
| Funding Strategy & Insights zu Venture Debt | 1 | Online Workshop (60–90 Min.) | re:cap Technologies / Lilli Pukall |
| *Individuelle Expert:innen Sessions* (Investor-Sparring) | 1 je | Sparring Session | Realyze Ventures, HTGF, re:cap Technologies, Wunderland Capital, Business Angels FrankfurtRheinMain, Futury Capital, Business Angels Mittelhessen |

**⚖️ Legal (alle 1 Credit, Online Workshop ~2h):**
- Geschäftsführerhaftung (Momentum / Philipp Weber)
- SaaS Contracting (Aulinger / Axel Staudt)
- AI Act & Datenschutz (Aulinger / Axel Staudt)
- Schutz des geistigen Eigentums / IP-Rechte (Aulinger / Axel Staudt)
- Vorbereitung einer Finanzierungsrunde (Aulinger / Axel Staudt)
- Exit Readiness & Due Diligence (Momentum / Philipp Weber)
- „Lunch Learning Session" – Wandeldarlehen, SAFE & Venture Debt, VSOP/ESOP (Momentum / Philipp Weber)
- „Lunch Learning Session" – Finanzierungsrunden aus Gründersicht, Term Sheets (Momentum / Philipp Weber)
- Individual Expert Session (Fallback: „Beschreibe deine Herausforderung, wir vermitteln Expert:innen")

**📣 Marketing:**

| Angebot | Credits | Format | Anbieter |
| --- | --- | --- | --- |
| Marketing 101 | 1 | Online Workshop | LOVEDIS / Hannah Freese |
| Brand & Pitch Story | 1 | Online Workshop | LOVEDIS / Hannah Freese |
| Website-Strategie Starterkit | **2** | 1:1 Online Workshop | GAL Digital / Tobias Auradniczek |
| LinkedIn Visibility Sprint | 1 | Online Workshop | LOVEDIS / Hannah Freese |
| Pitching with Impact | 1 | Online Workshop | LOVEDIS / Hannah Freese |
| Individual Expert Session | 1 | Sparring | Fallback |

**🛠️ AI, Product & Tech:**

| Angebot | Credits | Format | Anbieter |
| --- | --- | --- | --- |
| Integrating AI in the Enterprise | 1 | Online Workshop | LOVEDIS / Tim Meggert |
| IP-AI | 1 | Online Workshop | LOVEDIS / Tim Meggert |
| Building an AI PoC | 1 | Online Workshop | LOVEDIS / Tim Meggert |
| AI Agents & Technical Scaling | 1 | Sparring | LOVEDIS / Tim Meggert |
| AI PoC Review & Lessons Learned | 1 | Online Workshop | LOVEDIS / Tim Meggert |
| Tech Due Diligence Readiness | 1 | Sparring | LOVEDIS / Tim Meggert |
| Tech-Stack Check-up | **2** | 1:1 Online Workshop | GAL Digital / Tobias Auradniczek |
| MVP Validation & Product Validation | 1 | Sparring | LOVEDIS / Tim Meggert |
| Cyber Security | 1 | Sparring | je nach Bedarf |
| Live Hacking | **2** | Online Workshop | LOVEDIS / Tim Meggert |
| Individual Expert Session | 1 | Sparring | Fallback |

**Muster:** Fast alle Sessions kosten **1 Credit**; die **1:1-Formate von GAL Digital** und
**Live Hacking** kosten **2 Credits**. Es gibt in jeder Kategorie eine „Individual Expert
Session" als **Fallback** (Bedarf beschreiben → Team matcht).

**Angebots-Metadaten in Notion (pro Zeile):** `Angebot` (Titel), `Credits`, `Format`,
`Datum`, `Kontaktperson`, `Unternehmen`, `Website`. Mentor-DB: `Name`, `Position`,
`Unternehmen` (Multi-Select Partnerfirmen), `URL`.

**Kommentare auf der Seite:** keine (page-level Discussions leer).

---

## 3. Gap-Analyse (Notion-Spec vs. Implementierung)

Status-Legende: **[Vorhanden]** · **[Teilweise]** · **[Fehlt]** · **[Abweichung]**

| # | Notion-Element | Status | Unsere Abbildung (Modell/Datei) | Was zu tun ist |
| --- | --- | --- | --- | --- |
| 1 | 5-Schritte-Anfrage-Flow | **[Vorhanden]** | `requestBooking` → `takeBookingIntoCoordination` → `confirmBooking` (`src/app/actions/marketplace.ts`); Formular `MarketplaceBookingForm.tsx` mit Kontakt/Session/Bedarf | Nichts — starke Deckung. Ggf. Formular-Feld „gewünschte Session" expliziter benennen. |
| 2 | Credits erst nach Bestätigung einlösen | **[Vorhanden]** | `confirmBooking` bucht atomar `SPEND` bei `CONFIRMED`; Storno = `ADJUSTMENT` 100 % | Nichts. Entspricht exakt der Spec („nach Bestätigung eingelöst"). |
| 3 | Team koordiniert Matching/Termin | **[Vorhanden]** | `BookingStatus.IN_COORDINATION`, `handledById`, `coordinatorNote`; Inbox `/marketplace` | Nichts. |
| 4 | Angebotstypen Programm / Mentor / Support | **[Vorhanden]** | `MarketplaceOfferingType`, `Program`/`MentorProfile`/`SupportOffering` | Nichts. |
| 5 | Kategorien (Fundraising/Legal/Marketing/AI-Product-Tech/Sales) | **[Vorhanden]** | `SupportCategory` (FUNDRAISING/LEGAL/MARKETING/PRODUCT_TECH/SALES/OTHER) | Notion bündelt „AI, Product & Tech" → `PRODUCT_TECH` passt. Ggf. Label „AI, Product & Tech". |
| 6 | **12-Credit-Budget pro Startup** (sponsored) | **[Fehlt]** | Kein Auto-Grant; nur manuelle `bookCreditTransaction` (`credits.ts`) | Onboarding-`GRANT` über 12 (Seed/Playbook/Action). |
| 7 | **6 fix / 6 flexibel** (Programm-Credits ohne Einlösung) | **[Abweichung]** | Programme = **0 Credits** (`Program`, `confirmBooking` ohne Ledger) | Konzept „earmarked/fix vs. flexibel" fehlt. Entscheidung nötig (siehe §5). |
| 8 | **Credit-Kosten je Session = 1–2** | **[Abweichung]** | Seed nutzt 200–400 (`mara-implementation-notes.md` §Marktplatz #1) | `creditCost`-Werte auf 1–2 umstellen; Seed anpassen. |
| 9 | Programm-interne Sessions mit **Datum/Termin** | **[Teilweise]** | `Program` hat Titel/Summary/Description/Tags, **keine** Sessions/Termine | Optional: Session-/Termin-Feld oder Freitext im Programm. |
| 10 | Angebot-Metadaten: Anbieter/Unternehmen, Kontaktperson, Website, Datum | **[Teilweise]** | `SupportOffering`: nur `format`+Freitext; kein Anbieter/Kontakt/Website/Datum | Felder ergänzen (`providerCompany`, `contactName`, `website`, `schedule`). |
| 11 | Mentor-Metadaten (Position, Partnerfirma, URL) | **[Teilweise]** | `MentorProfile`: `company`,`role`,`expertise`,`bio`,`photoUrl`; **keine** `website` | `website`/Link ergänzen; Partnerfirmen als kuratierte Liste. |
| 12 | Fundraising „Individuelle Expert:innen Sessions" (Investor-Sparring, 1 Credit) | **[Teilweise]** | Wäre `SupportOffering` (FUNDRAISING) oder mentor-artige Liste; aktuell kein eigener Sub-Typ | Als `SupportOffering`-Untergruppe oder Tag „Investor-Sparring" abbilden. |
| 13 | „Individual Expert Session" (Fallback pro Kategorie) | **[Vorhanden]** (konzeptuell) | Als `SupportOffering` mit `format="Sparring"` abbildbar; Flow passt (Bedarf beschreiben) | Je Kategorie eine Fallback-`SupportOffering` seeden. |
| 14 | Mentor-Session-Preis | **[Abweichung]** | `MentorProfile.creditCost` existiert; Seed 250–400 | Notion nennt keinen Preis → Team-Entscheidung + auf 1–2-Skala setzen. |
| 15 | Storno-/Rückbuchung | **[Vorhanden]** | `cancelBooking` → `ADJUSTMENT` 100 % | Nichts (Spec macht keine abweichende Aussage). |
| 16 | Rollen-Gating (Startup-Self-Service, Team koordiniert) | **[Vorhanden]** | `requireVentureView`/`requireTeam` (`auth-guards.ts`), Storefront `/venture/marketplace` | Nichts. |
| 17 | Credit-Anzeige „Guthaben" | **[Vorhanden]** | `BannerStat`-Guthaben in `page.tsx`; `/venture/credits` | Ggf. „X von 12" + „fix/flexibel"-Split (abhängig von #7). |

---

## 4. Empfehlungen (priorisiert)

Verdikt-Legende: **[Build]** · **[Build partial]** · **[Later]** · **[Not on platform]** ·
Aufwand **S/M/L**.

1. **Credit-Skala auf Notion angleichen (1–2 pro Session).** — **[Build]**, **S**
   Seed-/Katalog-Werte von 200–400 auf **1 (bzw. 2 für 1:1-/Live-Hacking-Formate)** setzen.
   Rein Datenwerte, kein Schema. Guardrail: Ledger bleibt SSOT; nur `creditCost`-Snapshots
   ändern sich. *Größter Hebel für „fühlt sich an wie das echte Programm".*

2. **12-Credit-Onboarding-Grant.** — **[Build]**, **S–M**
   Jedes Startup startet mit `GRANT +12` („sponsored by LOVEDIS"). Umsetzbar als Seed +
   Team-Playbook, oder kleine Action beim Startup-Onboarding. Guardrail: läuft über den
   bestehenden Ledger (`CreditTransaction type=GRANT`), keine Parallelwährung.

3. **Angebots-Metadaten ergänzen (Anbieter, Kontakt, Website, Termin/Format).** — **[Build partial]**, **M**
   `SupportOffering` um `providerCompany`, `contactName`, `website`, `schedule` (Freitext)
   erweitern; Storefront-Karte/Detail zeigt Anbieter + Termin. Bringt die reichen
   Notion-Zeilen in die Plattform. Guardrail: additive Felder, keine Umbenennung bestehender.

4. **„Fix vs. flexibel"-Budget entscheiden & abbilden.** — **[Build partial]**, **M–L**
   Wenn gewünscht: 6 Credits als earmarked-Programm-Kontingent modellieren (z. B.
   `CreditTransaction`-Kategorie/Tag oder ein zweites, zweckgebundenes Teilkonto).
   **Erst Team-Entscheidung (§5) abwarten** — sonst Over-Engineering. Guardrail: nicht den
   simplen Ledger sprengen; ggf. reicht ein UI-„6 fix / 6 flexibel"-Hinweis ohne Schema.

5. **Fallback „Individual Expert Session" je Kategorie seeden.** — **[Build]**, **S**
   Eine `SupportOffering` pro Kategorie mit `format="Sparring"`, 1 Credit, Text „Bedarf
   beschreiben → wir matchen". Deckt das Notion-Muster + passt exakt zum Anfrage-Flow.

6. **Investor-Sparring (Fundraising) als Untergruppe.** — **[Build partial]**, **S–M**
   Die 7 Investor:innen als `SupportOffering` (Kategorie FUNDRAISING, 1 Credit, Tag/Format
   „Investor-Sparring") oder als mentor-artige Liste seeden. Guardrail: kein neues Modell,
   Reuse bestehender Kataloge.

7. **Katalog aus Notion befüllen (echte Angebote).** — **[Build]**, **M**
   Die ~30 Angebote + 8 Mentor:innen als Seed/Katalog-Einträge übernehmen (Werte aus §2.4).
   Guardrail: Team pflegt weiter über `/marketplace/catalog`; Notion bleibt fachliche Quelle,
   Plattform wird operative SSOT.

8. **Programm-Sessions/Termine abbilden.** — **[Later]**, **M**
   Optionales Session-/Termin-Feld am `Program` (z. B. „Sales Foundations, 27. Aug 12–13:30").
   Niedrige Prio, solange Termine per Koordination laufen.

9. **UI „X von 12 Credits" + Herkunft.** — **[Later]**, **S**
   Guthaben-Anzeige als „genutzt/verfügbar von 12" (hängt an #2/#4).

*Nicht empfohlen:* eigene Chat-/Kommunikationsfläche für Matching — **[Not on platform]**
(Leitplanke: keine Comms-Plattform; Koordination bleibt Team-getrieben per Notiz/E-Mail).

---

## 5. Offene Entscheidungen fürs Team

1. **Credit-Skala verbindlich?** Notion = 12 gesamt, Sessions 1–2. Ist das der finale
   Maßstab (dann Seed/Modell darauf umstellen), oder war 200–400 bewusst eine andere Ökonomie?
2. **„6 fix / 6 flexibel" — echtes Feature oder nur Kommunikation?** Sollen die 6
   Programm-Credits technisch zweckgebunden sein (earmarked), oder reicht der UI-Hinweis
   „6 sind für Sales, Pricing & Growth reserviert"? (Bestimmt Aufwand von Empfehlung #4.)
3. **Programm = 0 Credits vs. „6 Credits, nur anmelden".** Heute sind Programme 0-Credit.
   Notion sagt: das Programm „verbraucht" 6 der 12, ohne Einlösung. Wie soll das Guthaben-
   Reporting das darstellen?
4. **Mentor-Session-Preis.** In Notion kein Preis hinterlegt. 1 Credit (wie Sessions) oder
   höher? (Betrifft `MentorProfile.creditCost`.)
5. **Investor-Sparring:** eigene Untergruppe/Kennzeichnung oder normale Support-Angebote?
6. **Anbieter/Partner-Stammdaten:** pflegt das Team frei je Angebot, oder brauchen wir eine
   kuratierte Anbieter-/Partnerliste (Fingerhaus, Lupp Living, Weimer, Sälzer, Innexis,
   Aulinger, Momentum, GAL Digital, …)?
7. **Notion ↔ Plattform:** bleibt Notion die redaktionelle Quelle (manuelle Übernahme) oder
   soll die Plattform alleinige SSOT werden (Notion dann read-only/abgelöst)?

---

## 6. „First slice" (im „nicht alles auf einmal"-Geist)

**Ein kleiner, sofort spürbarer Schritt — ohne Schema-Änderung, ohne Migration:**

1. **Credit-Werte im Katalog/Seed auf 1–2 umstellen** (Empfehlung #1).
2. **12-Credit-Grant** pro Startup über den bestehenden Ledger (Empfehlung #2, als Seed +
   Team-Playbook).
3. **Echte Angebote aus §2.4 in den Katalog** übernehmen (Empfehlung #7), inkl. je einer
   **Fallback-„Individual Expert Session"** pro Kategorie (#5).

Das bringt die Plattform ohne Datenmodell-Risiko auf das **reale ökonomische Modell** des
Programms und macht den Marktplatz mit echten Inhalten erlebbar. Die konzeptionell größeren
Themen (**fix/flexibel-Budget**, Metadaten-Felder, Programm-Termine) erst nach den
Team-Entscheidungen aus §5 — bewusst als zweite Iteration.

### 6.1 Umsetzungsstand „First slice" (implementiert)

Alle drei First-slice-Punkte sind umgesetzt — **kein Schema-Change, keine Migration**:

1. **Credit-Skala 1–2.** Katalog-/Seed-Werte auf die Notion-Skala gesetzt: die meisten
   Sessions **1 Credit**, die **GAL-Digital-1:1-Formate** (Website-Strategie Starterkit,
   Tech-Stack Check-up) und **Live Hacking** je **2 Credits**. Programme bleiben **0-Credit**.
   Mentor-Sessions: **1 Credit** (Notion nennt keinen Preis → bewusste Entscheidung, siehe §5.4).
2. **12-Credit-Onboarding-Grant.** Läuft über den bestehenden Ledger als `GRANT`
   (`amount = 12`, Grund „Onboarding-Guthaben — sponsored by LOVEDIS"). Zentrale, **idempotente**
   Helper-Funktion `grantOnboardingCredits` (`src/lib/onboarding-credits.ts`) — Guard auf einen
   bereits vorhandenen Onboarding-`GRANT`, kein Doppel-Grant, gecachte `balance` bleibt konsistent.
   **Onboarding-Hook:** beim erstmaligen Anlegen des Startup-Profils
   (`upsertOwnStartupProfile` in `src/app/actions/startups.ts`) — ein neu onboardetes Startup
   erhält die 12 Credits automatisch. Zusätzlich im Seed für alle Demo-Startups vergeben.
3. **Echte Notion-Angebote im Katalog.** Programme/Mentor:innen/Support-Angebote aus §2.4 liegen
   als geteilte Quelle in `src/lib/marketplace-catalog.ts` und werden vom Seed (`prisma/seed.ts`)
   sowie vom **idempotenten Sync-Script** `prisma/apply-marketplace-notion.ts` (Upsert per
   natürlichem Schlüssel: Programm-Titel, Mentor-Name, Angebot = Titel+Kategorie) verwendet.
   Inkl. je einer **„Individual Expert Session"-Fallback** pro Kategorie sowie der
   Fundraising-„Individuelle Expert:innen Sessions" (Investor-Sparring). Anbieter/Kontakt sind
   mangels eigener Spalte in die `description`/`bio` eingebettet.

**Sync auf die Neon-Test-DB (später, ohne Reseed):**
`export PATH="$PWD/.tools/node/bin:$PATH"` und dann
`DATABASE_URL=<neon-test-url> npx tsx prisma/apply-marketplace-notion.ts`.
Mehrfach ausführbar (idempotent). **Nicht** gegen Produktion ohne Review.

**Bewusst als Folge-Iteration offen gelassen (kein Schema-Change im First slice):**
eigene Anbieter-/Kontakt-/Website-/Termin-**Spalten** (Empfehlung #3), das **fix/flexibel**-Budget
(Empfehlung #4, §5.2/§5.3) und die „X von 12"-UI (Empfehlung #9). Der Signup selbst
(`auth.ts`) legt noch kein `Startup` an — deshalb hängt der Grant am Profil-Anlege-Schritt, was
der saubere bestehende Hook ohne Schema-Änderung ist.

---

*Dieses Dokument ergänzt `docs/plan-startup-marketplace.md` und
`docs/mara-implementation-notes.md` um den konkreten Abgleich mit der Notion-Spezifikation.
Keine Implementierung; alle Werte in §2.4 stammen 1:1 aus der Notion-Seite und ihren
Angebots-Datenbanken (Stand Juli 2026).*
