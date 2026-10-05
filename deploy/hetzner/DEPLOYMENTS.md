# Hetzner Deployments (Protokoll)

Jeder Eintrag dokumentiert einen geplanten oder durchgeführten Release auf Alpha/Produktion.
Vor dem Deploy: lokal committen, `npm test` grün, dann `./deploy/hetzner/deploy-platform.sh`.

## DRAFT: Logbuch MVP (Integration)

| Feld | Wert |
|------|------|
| Status | **Nicht deployed** |
| Ziel | Alpha (`alpha.lovedis.de`) |
| Branch | `Dedalus` |
| Vorher live (Stand Abfrage 2026-10-05) | Version `58ad58f`, Branch `HEAD`, deployedAt `2026-10-05T13:37:06Z` |
| Geplanter Commit | _(nach lokalem Commit eintragen)_ |

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

Vorherige Version erneut deployen (rsync vom letzten bekannten SHA):

```bash
git checkout <vorheriger-sha>
./deploy/hetzner/deploy-platform.sh
# Health prüfen:
curl -s https://alpha.lovedis.de/api/health
```

### Checkliste nach Deploy

- [ ] `curl -s https://alpha.lovedis.de/api/health` zeigt neuen `version`-SHA
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
