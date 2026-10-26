# Hetzner Deployments (Protokoll)

Jeder Eintrag dokumentiert einen geplanten oder durchgeführten Release auf Alpha/Produktion.
Vor dem Deploy: lokal committen, `npm test` grün, dann `./deploy/hetzner/deploy-platform.sh`.

## 2026-10-26: Marketing Dashboard (Phase 1)

| Feld | Wert |
|------|------|
| Status | **Deployed** |
| Ziel | Alpha (`alpha.lovedis.de`) |
| Branch | `Dedalus` |
| Vorher live | Version `533c06f` |
| Jetzt live | Version `064f5b4`, deployedAt `2026-10-26T13:33:28Z` |
| Commit | `064f5b4` |
| Backup vor Deploy | `lovedis-20261026T133323Z.dump` |

### Inhalt dieses Releases

- Neuer Menüpunkt „Marketing Dashboard“ (`/marketing`, nur ADMIN) mit Übersicht, LinkedIn, E-Mail, Redaktionsplan und Integrationen. Details in `docs/plan-marketing-modul.md`.
- E-Mail: Resend-Sync (Zustellung, Bounces, Suppressions, Broadcasts) mit Warnung bei fehlgeschlagenen Kontakt- und Support-Mails. Webhook-Endpunkt `/api/webhooks/resend` (Svix-Signatur), antwortet ohne `RESEND_WEBHOOK_SECRET` mit 503.
- LinkedIn: Import der Analytics-Exporte (XLSX/CSV) der Company Page, Follower-Verlauf, Post-Kennzahlen.
- Redaktionsplan mit Freigabe durch Admins (Idee, Entwurf, Review, Geplant, Veröffentlicht).
- Schema: additiv, 5 neue Tabellen (`MarketingIntegration`, `MarketingEmail`, `LinkedInPost`, `LinkedInFollowerDay`, `ContentItem`) ohne Relationen zu bestehenden Tabellen.

### Server-Änderungen

- Neues Skript `/opt/lovedis/scripts/marketing-sync.sh` (liest `CRON_SECRET` aus `platform.env`) und Crontab-Eintrag `10 6 * * *` für `deploy`, Log in `/opt/lovedis/logs/marketing-sync.log`. Erster Lauf von Hand: 23 Mails übernommen.
- Offen: Resend-Webhook anlegen und `RESEND_WEBHOOK_SECRET` in `platform.env` setzen (Öffnungen und Klicks in Echtzeit). Ohne Webhook laufen Zustelldaten über den täglichen Sync.
- Deploy aus sauberem Worktree von `064f5b4`, weil der Haupt-Checkout nicht committete, nicht zugehörige Dateien enthält.

### Rollback

Version `533c06f` aus sauberem Worktree erneut deployen. Die neuen Tabellen können stehen bleiben. Crontab-Eintrag `marketing-sync` entfernen.

```bash
git worktree add --detach /tmp/lovedis-rollback 533c06f
cd /tmp/lovedis-rollback && ./deploy/hetzner/deploy-platform.sh
git worktree remove /tmp/lovedis-rollback
```

### Checkliste nach Deploy

- [x] Live-Version `064f5b4` laut Deploy-Skript und `alpha.lovedis.de/api/health`
- [x] Smoke-Test 8/8 OK, Schema per `db push` angewendet
- [x] `/marketing` ohne Login leitet auf `/login?callbackUrl=%2Fmarketing`
- [x] `POST /api/webhooks/resend` ohne Secret liefert 503, `POST /api/cron/marketing-sync` ohne Token 401
- [x] Cron-Skript von Hand: `{"ok":true,"resend":{"ok":true,"emails":23,"created":23}}`
- [ ] Admin: Marketing Dashboard im Menü, Tabs öffnen, LinkedIn-Export importieren
- [ ] Resend-Webhook einrichten

## 2026-10-19: MCP-Konnektor für Claude (nur lesen)

| Feld | Wert |
|------|------|
| Status | **Deployed** |
| Ziel | Alpha (`alpha.lovedis.de`) |
| Branch | `Dedalus` |
| Vorher live | Version `0712c3f` |
| Jetzt live | Version `b6f31e0`, deployedAt `2026-10-19T12:09:44Z` |
| Commit | `b6f31e0` |
| Backup vor Deploy | `lovedis-20261019T120936Z.dump` |

### Inhalt dieses Releases

- Neuer MCP-Server unter `/api/mcp` (Streamable HTTP, zustandslos). Claude.ai, Claude Desktop, Claude Code und Cursor können sich als Konnektor verbinden. Anmeldung per OAuth 2.1 mit PKCE und dynamischer Client-Registrierung; die Freigabe läuft über den normalen LOVEDIS-Login und die Seite `/oauth/authorize`.
- Nur ADMIN und MEMBER. Rolle und `isActive` werden bei jedem Aufruf frisch aus der DB geprüft. MEMBER sehen 13 Werkzeuge (Startups, Batches, Match-Matrix, Challenges, PoCs, Engagements, Venture Store, Buchungen, Credits, Updates), ADMIN zusätzlich 7 (Insights-KPIs, Pilot-Diagnose, Pipeline-Tracking, Logbuch).
- Alle Werkzeuge nur lesend. Keine E-Mail-Adressen oder Telefonnummern von Kontakten, keine Kontaktdaten aus Buchungen.
- Jeder Werkzeug-Aufruf wird in `McpAuditLog` protokolliert. Tokens und Codes liegen nur als SHA-256-Hash in der DB. Access-Token 1 h, Refresh-Token 30 Tage, rotierend.
- Einstellungen: neuer Abschnitt „Verbundene Apps“ (Konnektor-URL, Verbindungen trennen).
- Login-Weiterleitung behält jetzt die Query (`callbackUrl` inkl. `?…`), damit die OAuth-Anfrage den Login übersteht. `callbackUrl` mit `//` wird abgewiesen.
- Schema: additiv, 4 neue Tabellen (`OAuthClient`, `OAuthAuthorizationCode`, `OAuthGrant`, `McpAuditLog`) ohne Relationen zu bestehenden Tabellen. `db push` im Deploy-Skript legt sie an.

### Server-Änderungen

- Keine. `AUTH_URL` in `/opt/lovedis/platform.env` ist bereits `https://alpha.lovedis.de` und wird als öffentliche Konnektor-URL verwendet. `MCP_PUBLIC_URL` nur setzen, falls die Konnektor-URL davon abweichen soll.
- Deploy aus sauberem Worktree von `b6f31e0`, weil der Haupt-Checkout nicht committete, nicht zugehörige Dateien enthält.

### Rollback

Version `0712c3f` aus sauberem Worktree erneut deployen. Die neuen Tabellen können stehen bleiben (werden von der alten Version nicht genutzt).

```bash
git worktree add --detach /tmp/lovedis-rollback 0712c3f
cd /tmp/lovedis-rollback && ./deploy/hetzner/deploy-platform.sh
git worktree remove /tmp/lovedis-rollback
```

### Checkliste nach Deploy

- [x] Live-Version `b6f31e0` laut Deploy-Skript und `alpha.lovedis.de/api/health`
- [x] `curl https://alpha.lovedis.de/.well-known/oauth-protected-resource/api/mcp` liefert `resource: https://alpha.lovedis.de/api/mcp`
- [x] `POST /api/mcp` ohne Token liefert 401 mit `WWW-Authenticate: Bearer resource_metadata=…`
- [x] Fremde Redirect-URI bei der Registrierung abgewiesen, `/oauth/authorize` ohne Login leitet mit vollständiger Query auf `/login`
- [ ] Claude.ai: Konnektor `https://alpha.lovedis.de/api/mcp` hinzufügen, Login, Freigabe, Werkzeuge erscheinen
- [ ] MEMBER-Konto sieht keine Insights- und Logbuch-Werkzeuge
- [ ] Verbindung unter Einstellungen, Verbundene Apps trennen, danach 401
- [x] Smoke-Test 8/8 OK, Schema per `db push` angewendet

## 2026-10-16: Logbuch-Seite wieder scrollbar

| Feld | Wert |
|------|------|
| Status | **Deployed** |
| Ziel | Alpha (`alpha.lovedis.de`) |
| Branch | `Dedalus` |
| Vorher live | Version `eb5fb0b` |
| Jetzt live | Version `0712c3f`, deployedAt `2026-10-16T14:00:37Z` |
| Commit | `0712c3f` |
| Backup vor Deploy | `lovedis-20261016T140031Z.dump` |

### Inhalt dieses Releases

- Fehler behoben: Wer in der Match-Matrix das Logbuch eines Zellen-Panels öffnete und dann auf eine Notiz klickte, landete auf einer Logbuch-Seite, die sich nicht mehr scrollen ließ. Beide Panels sperrten das Seiten-Scrollen und gaben die Sperre beim Seitenwechsel in falscher Reihenfolge frei. Die Sperre ist jetzt gezählt (`src/lib/use-body-scroll-lock.ts`) und wird von Logbuch-Schnellansicht, Match-Matrix-Panels und Bestätigungsdialogen gemeinsam genutzt.
- Keine Schema-Änderung. Zählung nach Deploy: 11 Startups, 43 Paarungen, 38 Support-Angebote wie vorher.
- Deploy aus sauberem Worktree von `0712c3f`, weil der Haupt-Checkout nicht committete, nicht zugehörige Dateien enthält.

### Rollback

Version `eb5fb0b` aus sauberem Worktree erneut deployen.

```bash
git worktree add --detach /tmp/lovedis-rollback eb5fb0b
cd /tmp/lovedis-rollback && ./deploy/hetzner/deploy-platform.sh
git worktree remove /tmp/lovedis-rollback
```

### Checkliste nach Deploy

- [x] Live-Version `0712c3f` laut Deploy-Skript und `alpha.lovedis.de/api/health`
- [x] Smoke-Test 8/8 OK
- [x] Bestandsdaten unverändert

## 2026-10-13: KPI-Insights nur für ADMIN, Feed für Partner

| Feld | Wert |
|------|------|
| Status | **Deployed** |
| Ziel | Alpha (`alpha.lovedis.de`) |
| Branch | `Dedalus` |
| Vorher live | Version `b1b144b` (Phase 3) |
| Jetzt live | Version `eb5fb0b` |
| Commits | `90fee08`, `eb5fb0b` |
| Backup vor Deploy | `lovedis-20261013T123210Z.dump` |

### Inhalt dieses Releases

- Alle Seiten unter `/insights` und der Snapshot-Button sind nur noch für ADMIN. MEMBER werden auf ihr Dashboard umgeleitet, der Navigationseintrag „Insights & KPIs“ fehlt für MEMBER.
- Partner sehen unter „Ökosystem“ jetzt Entdecken und Feed.
- Keine Schema-Änderung. Zählung nach Deploy: 11 Startups, 43 Paarungen, 0 Engagements wie vorher.

### Rollback

Version `b1b144b` aus sauberem Worktree erneut deployen.

```bash
git worktree add --detach /tmp/lovedis-rollback b1b144b
cd /tmp/lovedis-rollback && ./deploy/hetzner/deploy-platform.sh
git worktree remove /tmp/lovedis-rollback
```

### Checkliste nach Deploy

- [x] Live-Version `eb5fb0b` laut Deploy-Skript
- [x] Smoke-Test 8/8 OK
- [x] Bestandsdaten unverändert

## 2026-10-13: KPI-Insights-Hub Phase 3 (Verwendungsnachweis)

| Feld | Wert |
|------|------|
| Status | **Deployed** |
| Ziel | Alpha (`alpha.lovedis.de`) |
| Branch | `Dedalus` |
| Vorher live | Version `00f8dc4` (Phase 2) |
| Jetzt live | Version `b1b144b`, deployedAt `2026-10-13T11:57:31Z` |
| Commit | `b1b144b` |
| Backup vor Deploy | `lovedis-20261013T115722Z.dump` |

### Inhalt dieses Releases

- Verwendungsnachweis `/insights/foerderung` mit Soll/Ist der Antrags-KPIs, Formaten, Begünstigten, Veranstaltungen und Prüfpunkten, dazu Excel-Export mit fünf neuen Blättern.
- Zuordnung von Batches und Programmen zum Förderzeitraum `/insights/foerderung/setup`.
- Manuelle Teilnehmendenzahlen aus Luma und Attio `/insights/foerderung/events`.
- Feedback-Umfragen (NPS) `/insights/foerderung/feedback`, Beantwortung durch Startups unter `/feedback/[surveyId]`, Hinweis im Startup-Dashboard.
- Neue Förder-Merkmale (aktuelle VZÄ, Marktreife Start und aktuell, Pre-Founding, Anschlussfinanzierung).
- Vier neue Tabellen `FundingScopeItem`, `FundingEventCount`, `FeedbackSurvey`, `FeedbackResponse` und sieben neue, optionale Spalten an `StartupReportingMeta` (rein additiv, per `db push`). Zählung nach Deploy: 11 Startups, 43 Paarungen, 0 Engagements wie vorher.

### Vorfall beim Deploy

Der Deploy-Befehl wurde versehentlich zweimal gestartet. Der zweite Lauf hat den lokalen Worktree gelöscht, während der erste lief. Der lokale Prozess wurde abgebrochen, nachdem Sync und Container-Start bereits durch waren. `migrate-db-push.sh` lief auf dem Server weiter und ist fertig geworden. Danach manuell geprüft: Manifest `b1b144b` mit dirty=no, neue Tabellen und Spalten vorhanden, Smoke-Test 8/8 OK, Bestandsdaten unverändert.

### Rollback

Version `00f8dc4` aus sauberem Worktree erneut deployen. Die neuen Tabellen und Spalten bleiben bestehen und stören nicht.

```bash
git worktree add --detach /tmp/lovedis-rollback 00f8dc4
cd /tmp/lovedis-rollback && ./deploy/hetzner/deploy-platform.sh
curl -s https://alpha.lovedis.de/api/health
git worktree remove /tmp/lovedis-rollback
```

### Checkliste nach Deploy

- [x] `/api/health` zeigt `b1b144b`, Datenbank up
- [x] Smoke-Test 8/8 OK
- [x] Neue Routen leiten ohne Login auf `/login` um
- [x] Bestandsdaten unverändert

## 2026-10-13: KPI-Insights-Hub Phase 2

| Feld | Wert |
|------|------|
| Status | **Deployed** |
| Ziel | Alpha (`alpha.lovedis.de`) |
| Branch | `Dedalus` |
| Vorher live | Version `e48fb76` (Match-Definition: beide Seiten „Hoch“) |
| Jetzt live | Version `00f8dc4`, deployedAt siehe `/api/health` |
| Commit | `00f8dc4` |
| Backup vor Deploy | `lovedis-20261013T111841Z.dump` |

### Inhalt dieses Releases

- Förder-Merkmale je Startup (Hessen, Gründer:innen und Team nach Geschlecht, FTE-Baseline, Nachweis) auf `/insights/startup/[id]`. Female Founder ab 50 % Gründerinnen.
- Pipeline-Tracking `/insights/tracking` für Basis- und 1:1 Accelerator: Stufe bis Vertrag und Umsatz, Intro durch LOVEDIS, Kosten, Outcome. Engagements werden nur angezeigt, nicht verändert.
- Challenges je Batch `/insights/setup`.
- Neue Batch-KPIs (Hessen, Female Founder, Frauenanteil, Jobs, Challenges, Pilot zu LOI/Vertrag, Umsatz, Marktreife) und zwei neue Excel-Blätter. Freitext wird nicht exportiert.
- Drei neue Tabellen `StartupReportingMeta`, `PipelineTracking`, `BatchChallengeLink` (rein additiv, per `db push`). Bestehende Tabellen und Daten unverändert, Zählung nach Deploy: 11 Startups, 43 Paarungen, 0 Engagements wie vorher.
- Pflege nur durch ADMIN, Lesen durch ADMIN und MEMBER.

### Rollback

Version `e48fb76` aus sauberem Worktree erneut deployen. Die drei neuen Tabellen bleiben bestehen und stören nicht.

```bash
git worktree add /tmp/lovedis-rollback e48fb76
cd /tmp/lovedis-rollback && ./deploy/hetzner/deploy-platform.sh
curl -s https://alpha.lovedis.de/api/health
git worktree remove /tmp/lovedis-rollback
```

### Checkliste nach Deploy

- [x] Live-Version `00f8dc4` laut Deploy-Skript
- [x] Smoke-Test 8/8 grün
- [x] Neue Tabellen angelegt und leer, Bestandszahlen unverändert
- [x] `/insights/tracking` ohne Login leitet auf Login um (307)
- [ ] Neue Seiten als Admin im Browser prüfen

---

## 2026-10-13: KPI-Insights-Hub Phase 1

| Feld | Wert |
|------|------|
| Status | **Deployed** |
| Ziel | Alpha (`alpha.lovedis.de`) |
| Branch | `Dedalus` |
| Vorher live | Version `1714c2c` |
| Jetzt live | Version `7fb9273`, deployedAt siehe `/api/health` |
| Commit | `7fb9273` |
| Backup vor Deploy | `lovedis-20261013T103857Z.dump`, `platform.env.bak.20261013T103858Z` |

### Inhalt dieses Releases

- Neue Seite `/insights` (ADMIN, MEMBER) mit Batch-KPIs, Partner- und Startup-Drill-downs, Excel-Export. Liest Match-Matrix, Engagements, Challenges und Venture Store nur, ändert sie nicht.
- Neue Tabelle `MetricSnapshot` (rein additiv, per `db push`).
- Neuer Cron-Endpunkt `POST /api/cron/insights-snapshot` (Bearer `CRON_SECRET`).

### Server-Änderungen

- `CRON_SECRET` in `/opt/lovedis/platform.env` ergänzt (vorher nicht gesetzt).
- `/opt/lovedis/scripts/insights-snapshot.sh` und Crontab-Eintrag `40 2 * * *` (Serverzeit Europe/Berlin) für den User `deploy`, Log in `/opt/lovedis/logs/insights-snapshot.log`.
- Erster Snapshot: 63 Zustände am 2026-10-13.

### Rollback

Vorherige Version `1714c2c` aus sauberem Worktree erneut deployen. Die Tabelle `MetricSnapshot` bleibt dabei bestehen und stört nicht. Crontab-Eintrag `# lovedis-insights-snapshot` entfernen.

```bash
git worktree add /tmp/lovedis-rollback 1714c2c
cd /tmp/lovedis-rollback && ./deploy/hetzner/deploy-platform.sh
curl -s https://alpha.lovedis.de/api/health
git worktree remove /tmp/lovedis-rollback
```

### Checkliste nach Deploy

- [x] `curl -s https://alpha.lovedis.de/api/health` zeigt `7fb9273`
- [x] Smoke-Test 8/8 grün
- [x] Cron-Endpunkt: ohne Token 401, GET 405, mit Token 200
- [x] `/insights` ohne Login leitet auf Login um (307)
- [ ] `/insights` als Admin im Browser prüfen

---

## 2026-10-08: Coming-Soon-Sticker unten am Cover (Feature-Karte)

| Feld | Wert |
|------|------|
| Status | **Deployed** |
| Ziel | Alpha (`alpha.lovedis.de`) |
| Branch | `Dedalus` |
| Vorher live | Version `153617d`, deployedAt siehe `/api/health` |
| Jetzt live | Version `1714c2c`, deployedAt siehe `/api/health` |
| Commit | `1714c2c` |

### Inhalt dieses Releases

- `ProgramFeatureCard`: orange Coming-Soon-Sticker auf Cover von `top-20` auf `bottom-6 top-auto` (unterer Cover-Bereich, `right-4 rotate-3` unverändert)

### Rollback

Vorherige Version `153617d` aus sauberem Worktree erneut deployen:

```bash
git worktree add /tmp/lovedis-rollback 153617d
cd /tmp/lovedis-rollback && ./deploy/hetzner/deploy-platform.sh
curl -s https://alpha.lovedis.de/api/health
git worktree remove /tmp/lovedis-rollback
```

### Checkliste nach Deploy

- [x] `curl -s https://alpha.lovedis.de/api/health` zeigt `1714c2c`
- [ ] Venture Marketplace: Feature-Karte, Sticker im unteren Cover-Bereich (`bottom-6`)

---

## 2026-10-06: Coming-Soon-Sticker deutlich tiefer (Feature-Karte)

| Feld | Wert |
|------|------|
| Status | **Deployed** |
| Ziel | Alpha (`alpha.lovedis.de`) |
| Branch | `Dedalus` |
| Vorher live | Version `4b9b1cd`, deployedAt siehe `/api/health` |
| Jetzt live | Version `153617d`, deployedAt siehe `/api/health` |
| Commit | `153617d` |

### Inhalt dieses Releases

- `ProgramFeatureCard`: orange Coming-Soon-Sticker auf Cover von `top-8` auf `top-20` (~80px, klar sichtbar tiefer im Cover)

### Rollback

Vorherige Version `4b9b1cd` aus sauberem Worktree erneut deployen:

```bash
git worktree add /tmp/lovedis-rollback 4b9b1cd
cd /tmp/lovedis-rollback && ./deploy/hetzner/deploy-platform.sh
curl -s https://alpha.lovedis.de/api/health
git worktree remove /tmp/lovedis-rollback
```

### Checkliste nach Deploy

- [x] `curl -s https://alpha.lovedis.de/api/health` zeigt `153617d`
- [ ] Venture Marketplace: Feature-Karte, Sticker deutlich tiefer auf dem Cover (`top-20`)

---

## 2026-10-06: Coming-Soon-Sticker Position Feature-Karte

| Feld | Wert |
|------|------|
| Status | **Deployed** |
| Ziel | Alpha (`alpha.lovedis.de`) |
| Branch | `Dedalus` |
| Vorher live | Version `47d4ce7`, deployedAt `2026-10-06T14:19:02Z` |
| Jetzt live | Version `4b9b1cd`, deployedAt siehe `/api/health` |
| Commit | `4b9b1cd` |

### Inhalt dieses Releases

- `ProgramFeatureCard`: orange Coming-Soon-Sticker von `top-4` auf `top-8` (Abstand zum oberen Kartenrand)

### Rollback

Vorherige Version `47d4ce7` aus sauberem Worktree erneut deployen:

```bash
git worktree add /tmp/lovedis-rollback 47d4ce7
cd /tmp/lovedis-rollback && ./deploy/hetzner/deploy-platform.sh
curl -s https://alpha.lovedis.de/api/health
git worktree remove /tmp/lovedis-rollback
```

### Checkliste nach Deploy

- [x] `curl -s https://alpha.lovedis.de/api/health` zeigt `4b9b1cd`
- [ ] Venture Marketplace: Feature-Karte mit Sticker sitzt tiefer (`top-8`)

---

## 2026-10-06: Sales & Growth Coming-Soon-Sticker

| Feld | Wert |
|------|------|
| Status | **Deployed** |
| Ziel | Alpha (`alpha.lovedis.de`) |
| Branch | `Dedalus` |
| Vorher live | Version `95dcce2`, deployedAt `2026-10-05T13:43:15Z` |
| Jetzt live | Version `47d4ce7`, deployedAt siehe `/api/health` |
| Commit | `47d4ce7` |

### Inhalt dieses Releases

- Programm „Sales & Growth“: Sticker-Text „COMING SOON Januar 2027“ (Katalog + Karten/Detail-UI)
- Keine DB-Migration nötig (UI liest `comingSoonLabel` aus `marketplace-catalog.ts` per Programmtitel)

### Rollback

Vorherige Version `95dcce2` aus sauberem Worktree erneut deployen:

```bash
git worktree add /tmp/lovedis-rollback 95dcce2
cd /tmp/lovedis-rollback && ./deploy/hetzner/deploy-platform.sh
curl -s https://alpha.lovedis.de/api/health
git worktree remove /tmp/lovedis-rollback
```

### Checkliste nach Deploy

- [x] `curl -s https://alpha.lovedis.de/api/health` zeigt `47d4ce7`
- [ ] Venture Marketplace: Karte „Sales & Growth“ mit Sticker „COMING SOON Januar 2027“

---

## 2026-10-05: Logbuch MVP (Integration)

| Feld | Wert |
|------|------|
| Status | **Deployed** |
| Ziel | Alpha (`alpha.lovedis.de`) |
| Branch | `Dedalus` |
| Vorher live | Version `58ad58f`, deployedAt `2026-10-05T13:37:06Z` |
| Jetzt live | Version `95dcce2`, deployedAt `2026-10-05T13:43:15Z` |
| Commits | `58ad58f` (Logbuch Kern) + `95dcce2` (Team-Integrationen) |

### Inhalt dieses Releases

- Startup-Logbuch (Schema, Actions, `/startups/[id]/logbuch`, Teaser, Drawer, Quick Add)
- ADMIN-only: Datenladung und UI auf Team-Seiten (Startup-Profil, Pipeline, Longlist, Match-Matrix, Venture Store, Engagements)
- Match-Matrix: Notiz im Zellen-Drawer mit Kontext `PartnerStartupMatch`
- Venture Store: Koordinations-Notiz pro Buchung (`MarketplaceBooking`)
- Admin-Dashboard: offene Follow-ups (eigene zuerst, überfällig) und „lange kein Kontakt“ (30+ Tage)
- Challenge-Entscheid: optionale interne DECISION-Notiz (`ChallengeApplication`)
- Engagement-Detail: Logbuch-Panel für Admins (`Engagement`)
- refType-Labels auf Timeline-Einträgen („aus Match-Matrix: …“)

### Migration / Ops

- Prisma-Schema: `StartupLogEntry`, `StartupLogComment` (Migration wie üblich auf dem Server via `migrate.sh` oder `db push`, je nach Team-Prozess)
- Keine Cron-Jobs, keine E-Mail, keine @mentions in diesem Release

### Rollback

Vorherige Version `58ad58f` aus sauberem Worktree erneut deployen:

```bash
git worktree add /tmp/lovedis-rollback 58ad58f
cd /tmp/lovedis-rollback && ./deploy/hetzner/deploy-platform.sh
curl -s https://alpha.lovedis.de/api/health
git worktree remove /tmp/lovedis-rollback
```

### Checkliste nach Deploy

- [x] `curl -s https://alpha.lovedis.de/api/health` zeigt `95dcce2`
- [ ] Admin: Startup-Logbuch anlegen, Follow-up, Drawer auf Pipeline
- [ ] Match-Matrix: Notiz aus Zelle
- [ ] Venture Store: Koordinations-Notiz
- [ ] Challenge annehmen mit optionaler Notiz
- [ ] Dashboard-Widgets sichtbar

---

## Vorlage (kopieren für nächsten Eintrag)

```markdown
## YYYY-MM-DD: Titel

| Feld | Wert |
| Status | Deployed / Nicht deployed |
| Version live | |
| Commit | |
| Rollback | `git checkout <sha> && ./deploy/hetzner/deploy-platform.sh` |
```
