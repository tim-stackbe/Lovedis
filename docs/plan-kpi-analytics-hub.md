# Plan: KPI- & Analytics-Hub (Plattform als SSOT)

**Stand:** 2026-10-13 (Rev. 3, Review gegen den Code)  
**Status:** Entwurf zur Freigabe, **keine Umsetzung** ohne OK  
**Bezug:** User Needs (Vision, Zielgruppen, Metriken), Landes-KPI-Mock (`assets/reporting-tool-mock-preview.html`)

---

## 0. Leitplanken (verbindlich)

1. **Match-Matrix bleibt unverändert.** UI, Felder, Workflows, Import und Schema von `PartnerStartupMatch` werden nicht für Reporting umgebaut.
2. **Bestehende Tools bleiben unverändert.** Engagements, PoCs, Challenges, `/reports`, Batches, Venture Store, Logbuch: Insights **liest nur**. Keine neuen Pflichtfelder, keine Redirects, keine Umbenennungen, keine Hooks im bestehenden Code.
3. **Neues Tracking ist additiv.** Was heute nirgends erfasst wird, kommt in neue Tabellen mit eigener Erfassungs-UI unter `/insights`.
4. **Verknüpfen statt kopieren.** Neue Datensätze referenzieren bestehende (`engagementId`, `pocId`, `matchId`), speichern aber nur Felder, die es dort nicht gibt. Keine Doppelpflege.

---

## 1. Was der Review ergeben hat (neu in Rev. 3)

| # | Befund im Code | Folge für den Plan |
|---|----------------|--------------------|
| 1 | **Keine Historie.** Matrix überschreibt `contactStatus`, Relevanz usw.; es gibt nur `updatedAt`. Bookings haben kein `completedAt`. | „Wie viele Matches in Q3?“ ist rückwirkend **nicht** rekonstruierbar. Lösung: täglicher **Read-only-Snapshot-Job** ab Tag 1 (siehe 4.1). Je früher er läuft, desto mehr Historie. |
| 2 | **`Engagement.partner` ist ein User**, kein Partner-Unternehmen. Zuordnung zu FingerHaus nur über `User.company → Company.matrixColumn → PartnerCompany`. | Drill-down „FingerHaus: alle Kollaborationen“ ist nur so gut wie diese Verknüpfung. Phase 0 prüft, wie viele Engagements sauber auflösen; Rest über `PipelineTracking.partnerCompanyId`. |
| 3 | **Challenges haben keinen Partner- und keinen Batch-Bezug** (nur `createdBy`). | „Welche Challenge des Partners“ und „Challenges pro Basis-Accelerator“ brauchen die neue Link-Tabelle `BatchChallengeLink` und die User→Company-Auflösung. |
| 4 | **Kein Veranstaltungs-Modell.** Der Mock zeigt „Abschnitt C, Veranstaltungen“ mit Quelle „Events / CMS“, die es nicht gibt. | Entweder neues, schlankes `ProgramEvent` + Teilnahme oder manuelle Förder-Werte. Mock entsprechend korrigieren. |
| 5 | **Retention, „extern dazugekommen“, Startups mit/ohne Challenge** sind schon heute aus `BatchPartner`, `BatchStartup`, `ChallengeApplication`, `Engagement` berechenbar. | Diese KPIs ohne neues Tracking in Phase 1 liefern. |
| 6 | **`Startup.city` und `teamSize` existieren.** | Hessen-Flag aus `city` **vorschlagen** (Team bestätigt). `teamSize` beim Programmstart als **Baseline** einfrieren, sonst ist der Job Multiplier nach 2 Jahren nicht berechenbar. |
| 7 | **Logbuch (`StartupLogEntry`)** hat CALL/MEETING/EMAIL mit `occurredAt`, ist aber **ADMIN-only**. | Gute Zeitquelle für Kontakte, darf aber nur aggregiert und nur für Admins in Insights einfließen. |
| 8 | **Matrix ist intern** (Cross-Partner-Daten, `requireScoutModule`). | Board-, Marketing- und Förder-Ansichten nur **aggregiert**; Partnernamen extern nur mit Freigabe. Claude bekommt Kennzahlen, keine Freitext-Notizen. |
| 9 | Rev. 2 sah **Feedback-Trigger bei Booking COMPLETED** vor. | Das wäre ein Eingriff in bestehenden Code. Ersatz: Cron-Job liest COMPLETED-Bookings und verschickt Feedback-Mails. Bestehender Code bleibt unberührt. |
| 10 | Rev. 2 sah **Metrik-Definitionen als DB-Tabelle mit SQL-Feld** vor. | Overengineered und schwer testbar. Besser: **Metrik-Registry im Code** (versioniert, unit-getestet). DB nur für Soll-Werte, manuelle Werte und Snapshots. |
| 11 | „Pivot / Power BI“ als eigener Pivot-Baukasten. | v1 baut **keinen** eigenen Pivot-Editor. Stattdessen feste Dashboards + **flache Fakt-Exporte** (XLSX), die man in Excel pivotieren kann. Optional später Metabase o. ä. auf einem Read-Replica. |

---

## 2. Zielbild

```
Bestehende Tools (unverändert)
  Match-Matrix · Engagements · PoCs · Challenges · Batches · Store · Logbuch
        │  nur lesen
        ▼
Snapshot-Job (täglich)  ──►  Historie: Match-Zustände, teamSize, Bookings
        │
Neues Tracking  ──►  PipelineTracking · StartupReportingMeta · BatchChallengeLink
        │            Förder-Soll/Manuell · Feedback · FundingRound · ProgramEvent
        ▼
Metrik-Registry (Code, getestet)  ──  eine Definition pro KPI
        ▼
/insights (UI)  ·  XLSX-Exporte  ·  Landes-Excel  ·  Read-only API für Claude
```

**Drill-downs** (lesen, verlinken zurück ins Original-Tool):

- **FingerHaus** (`PartnerCompany`): Matrix-Zeilen, Engagements (über Company-Link), PoCs, Tracking, Retention über Batches.
- **Lumos** (`Startup`): Batches, Matches, Engagements, PoCs, Credits, Sessions, Feedback, Runden.
- **Construction**: Filter über `Startup.industry` / `radarQuadrant` (Wertebereich in Phase 0 vereinheitlichen, nur im Insights-Mapping).

---

## 3. KPI-Definitionen (Match, Female Founder und Abgabefrist am 2026-10-13 entschieden)

| Begriff | Definition auf bestehenden Daten |
|---------|----------------------------------|
| **Match** | **Entschieden:** Matrix-Zelle im Batch, in der Startup **und** Partner die Relevanz mit „Hoch“ bewertet haben (identisch mit dem Top-Match der Matrix). Kontakt oder Folgegespräch-Wunsch allein zählen nicht. „Intro durch LOVEDIS“ (Datum) wird zusätzlich im Tracking erfasst, ändert die Match-Zählung aber nicht. |
| **Female Founder** | **Entschieden:** mindestens die Hälfte der Gründer:innen sind Frauen (50/50-Teams zählen mit). Zusätzlich berichtet: Frauenanteil im gesamten Team in %. |
| **Förder-Abgabe** | **Entschieden:** Bericht fällig 1 Monat nach Ende des Batches bzw. Programms (`endDate` + 1 Monat). |
| **Pilot / Testphase** | Engagement oder PoC zum Paar (Startup, Partner) mit Status aktiv/abgeschlossen, **oder** Matrix `PILOT_AGREED`, **oder** Tracking-Stufe ≥ PILOT. |
| **LOI / Vertrag / Umsatz** | Nur im neuen Tracking (gibt es heute nirgends). |
| **Conversion** | **Kohorte pro Batch:** Von allen Matches aus Batch X, wie viele erreichten jemals Pilot? Von diesen, wie viele LOI/Vertrag? (Nicht „Ereignisse im Quartal“, das kommt erst mit Snapshot-Historie.) |
| **Zeitraum** | Programm = `ScoutingCampaign.startDate/endDate`. Quartal/Jahr nur für Daten mit Zeitstempel oder ab Snapshot-Start. |
| **Partner-Retention** | Anteil Partner aus Batch N, die auch in Batch N+1 sind (`BatchPartner`), alternativ ≥ 2 Kooperationen. |
| **Extern dazugekommen** | Startup mit Engagement/Tracking, aber ohne Mitgliedschaft in einem Basis-Batch. |
| **Job Multiplier** | (FTE heute minus FTE-Baseline bei Programmstart) pro gefördertem Startup, innerhalb 24 Monaten, mit Evidenz-Stufe (selbst gemeldet / belegt). |

Jede Definition wird **eine** Funktion in der Metrik-Registry mit Unit-Tests. UI, Exporte und Claude nutzen dieselbe Funktion.

---

## 4. Neue Bausteine (bestehende Tabellen bleiben unangetastet)

### 4.1 Snapshot-Job (höchste Priorität)

- Täglicher Cron, liest Matrix, `teamSize`, Bookings, Engagement-Status, schreibt in `MetricSnapshotRow` (Datum, Entität, Zustand als JSON).
- Ermöglicht ab Start: Zeitraum-Auswertungen, Stage-Wechsel-Daten, Baselines.
- Kein Eingriff in bestehende Schreibpfade.

### 4.2 `StartupReportingMeta` (1:1 zum Startup)

- `isHessenBased` (Vorschlag aus `city`), `foundersTotal`, `foundersFemale` (daraus „Female Founder“ = mindestens 50 % weiblich), `teamTotal`, `teamFemale` (daraus Frauenanteil im Team), `fteBaseline` + Datum, `fteCurrent` + Datum, Evidenz-Stufe.
- Datenschutz: Zweck „Förder-Reporting“ dokumentieren, nur Team sichtbar, nur aggregiert exportiert.

### 4.3 `PipelineTracking` (1:1-Accelerator und Pipeline-Lücken)

- Bezug: `startupId`, `partnerCompanyId`, optional `batchId`, `challengeId`, `engagementId` (unique), `pocId` (unique), `matchId`.
- Felder: Stufe (Match, Intro, Pilot, LOI, Vertrag, Umsatz), Intro durch LOVEDIS (Datum), Form der Zusammenarbeit, Betreuungsintensität, Verträge (NDA, IP, Co-Innovation, Datum), Use Case, Ziel, Laufzeit, Ressourcen Partner, Kosten (Partner, LOVEDIS, Startup), Outcome (MVP zu Marktreife, Funding-ready).
- Ist ein Engagement verknüpft, zeigt die Maske dessen Titel, Status, KPIs und Meilensteine **read-only** an. Gepflegt werden nur die Zusatzfelder.
- Pflege: alle ADMINs (entschieden). MEMBER sehen die Daten nur.
- Einmal-Import aus Notion „1:1 Acceleration 2026“ und Excel-Pilottracking.

### 4.4 `BatchChallengeLink`

- Ordnet Challenges Basis-Accelerators zu. Pflege in `/insights/setup`, nicht in der Batch-UI.

### 4.5 Förder-Bausteine

- `ReportingPeriod` (Programm, Zeitraum, Fälligkeit = Ende + 1 Monat, Status Entwurf/Freigegeben). Dashboard zeigt die nächste Fälligkeit.
- `ProgramEvent` + `ProgramEventParticipant` (vorgezogen, entschieden): Veranstaltungen selbst anlegen (Titel, Datum, Format, Programm/Batch, Teilnehmerzahl) und Startups zuordnen. Fließt in den Förderbericht.
- `MetricTarget` (Soll je KPI und Periode), `MetricManualValue` (Ist für nicht automatisierbare KPIs, mit Kommentar und Nachweis-Link).
- Bei Freigabe: eingefrorener Snapshot; Export aus dem Snapshot, nicht aus Live-Daten (Nachvollziehbarkeit gegenüber Förderstelle).

### 4.6 Später: `FeedbackResponse` (Session, Programm, NPS), `FundingRound` + Attribution (Credits, Workshop, Investor-Intro), Review-Queue für externe Deal-Meldungen.

---

## 5. KPI-Abdeckung (Needs zu Quelle)

**Legende:** ✅ sofort aus bestehenden Daten · 🟡 bestehend + kleines Tracking · 🆕 nur mit neuem Tracking · 📄 bleibt außerhalb (Rechnungen)

### Pro Basis-Accelerator und Zeitraum

| KPI | Quelle | |
|-----|--------|---|
| Anzahl Startups | `BatchStartup` | ✅ |
| davon Hessen / Female Founder | `StartupReportingMeta` | 🆕 |
| Anzahl Challenges | `BatchChallengeLink` | 🟡 |
| Challenges abgedeckt | Link + `ChallengeApplication` ACCEPTED / PoC | 🟡 |
| Startups pro Challenge vs. ohne Challenge | `ChallengeApplication` + `BatchStartup` | ✅ |
| Matches | Matrix-Regel (3.) | ✅ |
| Match zu Pilot | Matrix + Engagement/PoC (+ Tracking) | 🟡 |
| Pilot zu LOI/Vertrag | `PipelineTracking` | 🆕 |
| Erste Umsätze mit Partner | `PipelineTracking` | 🆕 |
| Partner-Retention | `BatchPartner` über Batches | ✅ |
| MVP zu Marktreife | `PipelineTracking.outcome` | 🆕 |
| Credits eingelöst pro Startup | `CreditTransaction` | ✅ |
| Sessions gebucht pro Accelerator | Bookings über `BatchStartup` des Startups | ✅ (Zuordnung bei Startups in mehreren Batches über Buchungsdatum im Batch-Zeitraum) |
| Kosten externe Dienstleister | Rechnungen / Janinas Reporting | 📄 optional als manueller Wert |

### 1:1 Accelerator

Alle Felder aus den Needs über `PipelineTracking` 🆕; Conversion Basis zu 1:1 und „extern dazugekommen“ ✅ aus Batch-Mitgliedschaft.

### Allgemein

| KPI | Quelle | |
|-----|--------|---|
| Externe Finanzierungsrunden + Attribution | `FundingRound` (manuell, später Import-Queue) | 🆕 |
| Feedback Session / Programm / NPS | `FeedbackResponse` per Cron-Mail | 🆕 |
| Job Creation Multiplier | Baseline-Snapshot + `StartupReportingMeta` | 🆕 (erst ab Baseline belastbar) |

---

## 6. Zielgruppen und Sichtbarkeit

| Ansicht | Inhalt | Regeln |
|---------|--------|--------|
| **Intern** `/insights` | Alles inkl. Drill-down | Team-Rollen; Logbuch-Anteile nur ADMIN |
| **Board** | Kuratierte 8 bis 12 KPIs, Trends | Nur Aggregate, PDF |
| **Förderung** | Soll/Ist, Landes-Excel, Freigabe | Aus freigegebenem Snapshot |
| **Marketing** | „X Startups, Y Piloten, Z Partner“ | Nur Aggregate; Namen nur mit Freigabe |
| **Claude** | Read-only API auf Metrik-Registry | API-Key, Audit-Log, keine Freitexte/Notizen |

---

## 7. Phasen (revidiert)

### Phase 0: Klärung (2 bis 4 Tage, kein Produktcode)

- KPI-Definitionen aus Abschnitt 3 bestätigen.
- Förder-Excel/Sheet-Tab + Förderbescheid: KPI-IDs, Soll, Abgabetermine.
- Datenqualitäts-Check (read-only Skript): Wie viele Engagements lösen auf ein Partner-Unternehmen auf? Wie viele Startups haben `city`/`teamSize`? Wie viele Challenges lassen sich Batches zuordnen?
- Spaltenliste Notion 1:1 / Excel Pilottracking.

**Ergebnis:** bestätigte Definitionen + Datenqualitäts-Bericht + priorisierte KPI-Liste.

### Phase 1: Fundament + erste Zahlen (ca. 2 Wochen)

- **Snapshot-Job zuerst** (Historie läuft ab dann).
- Metrik-Registry mit allen ✅-KPIs + Tests.
- `/insights` Batch-Dashboard, Partner- und Startup-Drill-down.
- Datenqualitäts-Panel („Was fehlt für vollständige KPIs“).
- XLSX-Fakt-Export.

### Phase 2: Additives Tracking (ca. 2 bis 3 Wochen)

- `StartupReportingMeta`, `PipelineTracking`, `BatchChallengeLink` + Masken unter `/insights`.
- Import Notion/Excel 1:1.
- Funnel Match zu Pilot zu LOI/Vertrag.

### Phase 3: Förderung, Board, Claude (ca. 2 Wochen)

- `ReportingPeriod` mit Fälligkeit, Soll/Manuell, Freigabe-Snapshot, Landes-Excel-Export (Mock wird echt).
- Veranstaltungen: anlegen und Startups zuordnen (`ProgramEvent`).
- Board-PDF.
- Read-only API für Claude (vorgezogen, da die Registry dann existiert).

### Phase 4: Feedback und Veranstaltungen (ca. 2 Wochen)

- Cron-Feedback nach Sessions und Programmende, NPS.

### Phase 5: Finanzierung und externe Quellen (ca. 2 bis 3 Wochen)

- `FundingRound` + Attribution, Review-Queue für Startup Insider / Deal-Meldungen.
- Job-Multiplier-Auswertung (sinnvoll, sobald Baselines existieren).

**Reihenfolge-Option:** Steht eine Förder-Abgabe kurzfristig an, Phase 3 (nur Förder-Teil mit manuellen Werten) direkt nach Phase 1 ziehen.

---

## 8. Change Report

### Bleibt unverändert

Match-Matrix (UI, Schema, Sheet-Import) · Engagements · PoCs · Challenges · `/reports` · Batches-UI · Venture Store inkl. Buchungsflow · Logbuch.

### Kommt neu hinzu

- Route `/insights` (Dashboards, Drill-downs, Setup, Tracking-Masken, Förder-Export)
- Snapshot-Job (Cron, read-only auf Bestand)
- Tabellen: `MetricSnapshotRow`, `StartupReportingMeta`, `PipelineTracking`, `BatchChallengeLink`, `ReportingPeriod`, `MetricTarget`, `MetricManualValue`, später `ProgramEvent`, `FeedbackResponse`, `FundingRound`
- Metrik-Registry im Code + Tests
- Cron für Feedback-Mails
- Read-only API für Claude
- Navigationseintrag „Insights“ (einzige Berührung bestehender Navigation)

### Bewusst nicht geplant

- Neue Spalten oder Pflichtfelder in der Matrix
- Zusammenlegen oder Umbenennen von Engagements/PoCs
- Eigener Pivot-Editor in v1
- Automatische Kostenübernahme aus Rechnungen
- Ungeprüfter Import externer Deal-Meldungen

---

## 9. Risiken

| Risiko | Gegenmaßnahme |
|--------|---------------|
| Keine Historie vor Snapshot-Start | Job in Woche 1; ältere Perioden nur „Stand heute“ oder manuell |
| Doppelpflege Tracking vs. Engagement | Verknüpfte Engagement-Felder read-only, Tracking speichert nur Zusatzfelder |
| Partner-Zuordnung von Engagements lückenhaft | Datenqualitäts-Panel + `partnerCompanyId` im Tracking |
| Unterschiedliche Match-Interpretation | Eine getestete Definition in der Registry |
| Förder-Zahlen ändern sich nach Abgabe | Export nur aus freigegebenem Snapshot |
| Personenbezogene Merkmale (Female Founder) | Zweckbindung, Team-only, nur Aggregate nach außen |
| Google Sheet läuft parallel weiter | Stichtag festlegen, ab dann Sheet nur Archiv |

---

## 10. Entscheidungen (2026-10-13)

1. **Förder-Abgabefrist:** 1 Monat nach Ende des Batches bzw. Programms.
2. **Match:** beide Seiten „Hoch“. Umgesetzt in `isQualifiedMatch`.
3. **Veranstaltungen:** werden berichtet. Selbst eintragbar, Startups zuordenbar (`ProgramEvent`, Phase 3).
4. **Female Founder:** mindestens 50 % der Gründer:innen sind Frauen, plus Frauenanteil im Team in %.
6. **Bestandsdaten:** Phase 2 und folgende ändern keine bestehenden Daten oder Tabellen. Nur neue Tabellen; bestehende Daten werden ausschließlich gelesen.
5. **Pflege `PipelineTracking`:** alle ADMINs.

---

## 11. Freigabe-Checkliste

- [ ] Leitplanken (Abschnitt 0) bestätigt
- [ ] KPI-Definitionen (Abschnitt 3) bestätigt oder korrigiert
- [ ] Förder-KPI-Liste + Fristen geliefert
- [ ] Reihenfolge der Phasen bestätigt
- [ ] Go für Phase 0
