# Entscheidungs-Checkliste — Mara-User-Feedback

> **Zweck:** Die Produktweichen, die **vor** dem Bau der noch offenen Feedback-Punkte fallen müssen. Bitte je Frage eine Option ankreuzen (oder kommentieren). Reihenfolge = grob nach Hebelwirkung.
> **Bezug:** `docs/plan-mara-user-feedback.md` (§4) und `docs/plan-badge-cohort-foundation.md`.
> **Legende:** ⭐ = blockiert mehrere andere Punkte · 🔧 = Infra/Ops (kein reiner Code-Task).

---

## Bereits umgesetzt (kein Entscheidungsbedarf)

Diese Quick-Wins aus dem Feedback sind **schon gebaut** und brauchen nur dein OK/Feedback:
- ✅ **Navigation nach Spaces/Kategorien** neu gruppiert (Team-Sicht: Sourcing & Screening · Matchmaking · Zusammenarbeit · Roadmap & Wissen · Marktplatz & Credits · Tracking).
- ✅ **Radar-Definition im UI**: Ziel-Erklärung + „So liest du die Ringe" (Adopt/Trial/Assess/Hold mit Bedeutung) — offene Restfrage nur noch D3 unten.
- ✅ **Knowledge-Board** im Hub (Empfehlungen: Bücher/Videos/Artikel/Podcasts/Tools/Kurse), pflegbar unter „SSOT-Pflege", sichtbar für Partner/Startups je nach Sichtbarkeit.

---

## Entscheidungen

### D1 ⭐ Batch-Scoping vs. globale Rollensicht
Soll Zugriff künftig **je Batch/Kohorte** eingeschränkt werden (Partner sieht nur seinen Batch), oder bleibt es bei der heutigen **rollenbasiert-globalen** Sicht?
- [ ] **A (empfohlen):** Kohorten-Scoping **additiv** — kommt als neue Ebene dazu, bestehende globale Sicht bleibt zunächst. *(nichts bricht; schrittweise)*
- [ ] **B:** Kohorten-Scoping **ersetzt** die globale Partner-Sicht. *(sauberer, aber Umbau aller Partner-Guards)*
- [ ] **C:** Vorerst keine Batches. *(dann entfallen 1.10/1.11/Teile 1.14)*
> Bestimmt: `docs/plan-badge-cohort-foundation.md` (blockiert dessen Start).

### D2 ⭐ Notion-Ersatz — im Scope?
Soll die Plattform der **führende Info-Space** werden, oder bleibt **Notion Master** und wir verlinken nur?
- [ ] **A:** Plattform wird führend (Roadmap/Wissen/Knowledge/Material dort pflegen). *(Hub ist bereits da)*
- [ ] **B:** Notion bleibt Master, Plattform verlinkt/spiegelt nur.
> Bestimmt Umfang von 1.2/1.7/1.16 (migrieren vs. verlinken).

### D3 Radar — Zweck & Reichweite
Die Ring-Definitionen sind jetzt im UI. Offen bleibt:
- [ ] Radar bleibt **team-intern** (Strategie-Tool). *(heutiger Stand)*
- [ ] Radar wird **auch extern** (Partner/Startups) sichtbar. *(dann Sichtbarkeits-Guard + ggf. andere Ring-Texte)*
- [ ] Ring-Bedeutungen anpassen? *(aktuell: Adopt = aktiv vorantreiben … Hold = zurückhalten — bitte bestätigen/ändern)*

### D4 Push-Richtung (1.3)
Heute: `StartupPush` = **Team → Partner**. Soll „pushen" auch **Startup → uns/Partner** ermöglichen (Follow-up-Wunsch)?
- [ ] **A:** Nein — Push bleibt Team→Partner (nur Missverständnis klären).
- [ ] **B:** Ja — neuer schlanker Kanal „Startup meldet Follow-up-Wunsch" (S–M).

### D5 ⭐ Feedback-Sichtbarkeit (1.15, „Wunsch an Partner")
Beim zweiseitigen Feedback: Sieht die **Gegenseite** die Roh-Bewertung, oder nur das **Team** (Matrix), und die Gegenseite nur ein gefiltertes Signal?
- [ ] **A:** Nur Team sieht beide Seiten; Gegenseite sieht nichts/gefiltert. *(schützt Ehrlichkeit)*
- [ ] **B:** Beide Seiten sehen das Feedback der anderen.
- [ ] **C:** Konfigurierbar je Feld.

### D6 Feedback-/Use-Case-Enums (1.8/1.15)
Bitte final festlegen (teils existieren sie schon in der Match-Matrix):
- **Use-Case-Typen:** aktuell `Pilot · Co-Dev · Kundenbeziehung · White-label · Tech-Lizenz · Sparring` — passt? ______
- **Kontaktstatus:** aktuell `Offen · In Kontakt · Folgetermin · Pilot vereinbart` — passt? ______
- **Relevanz-Skala:** aktuell `Hoch/Mittel/Niedrig` — oder 1–5? ______

### D7 🔧 E-Mail produktiv (1.9/1.10)
Reminder-/Einladungs-Mails laufen heute nur auf dem **Console-Adapter** (kein echter Versand).
- **Provider:** [ ] Resend  [ ] Postmark  [ ] SES  [ ] anderer: ______
- **Scheduler (Cron):** [ ] Cloudflare Cron  [ ] Vercel Cron  [ ] anderer: ______
- **Opt-in/Frequenz-Regeln:** ______
> Ohne diese Entscheidung bleiben 1.9-Mails und 1.10-Einladungen „nur Logik, kein Versand".

### D8 🔧 Attio-Sync (1.12)
Heute **nicht integriert** (nur dokumentiert).
- [ ] Vorerst gar nicht.
- [ ] **Nur lesen** (Attio → Plattform spiegeln).
- [ ] **Outcomes zurückschreiben** (Plattform → Attio als Aktivität/Status). Welche Felder? ______

### D9 🔧 GlassDollar-Import (1.13)
Heute **nicht integriert** (nur `sourceDetail`-Text).
- [ ] Vorerst gar nicht.
- [ ] **CSV-Import** von GlassDollar-Startups → `Startup` (Outbound-markiert).
- [ ] **API-Sync** (Zugang/Format klären: ______).

### D10 Datei-Upload vs. URL (1.2 Media / 1.10 Docs / Pitch-Decks)
Heute referenziert die Plattform **URLs** (kein Binär-Upload/Storage).
- [ ] **A:** Bei URL-Referenz bleiben. *(kein neuer Infra-Bedarf)*
- [ ] **B:** Echten Datei-Upload einführen. → braucht Storage (z. B. Cloudflare R2) — 🔧 Infra-Entscheidung.

---

## Vorgeschlagene Reihenfolge nach den Entscheidungen

1. **Nach D1:** Badge/Cohort-Fundament bauen (`plan-badge-cohort-foundation.md`, M).
2. **Nach D5/D6:** Zweiseitiges Feedback / „Wunsch an Partner" (1.15) + Matrix→Engagement-Durchfluss (1.8) + To-dos (1.9), M–L.
3. **Nach D7:** E-Mail produktiv → dann Reminder (1.9) + Batch-Einladungen (1.10).
4. **Nach D8/D9:** Attio-/GlassDollar-Anbindung.

> Die drei bereits umgesetzten Quick-Wins (Nav, Radar-Definition, Knowledge-Board) sind unabhängig und schon live im Code.
