# Hetzner Deployments (Protokoll)

Jeder Eintrag dokumentiert einen geplanten oder durchgeführten Release auf Alpha/Produktion.
Vor dem Deploy: lokal committen, `npm test` grün, dann `./deploy/hetzner/deploy-platform.sh`.

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
