# Hetzner Deployments (Protokoll)

Jeder Eintrag dokumentiert einen geplanten oder durchgeführten Release auf Alpha/Produktion.
Vor dem Deploy: lokal committen, `npm test` grün, dann `./deploy/hetzner/deploy-platform.sh`.

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
