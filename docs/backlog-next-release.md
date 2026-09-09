# Backlog — fürs nächste Update vorgemerkt

> Ideen, die als gut markiert wurden und **im nächsten Release** umgesetzt werden
> sollen. (Erinnerung von Tim, Juli 2026.)

## ⭐ Zum nächsten Update umsetzen

### 1. Feedback-Historie je Partner
Kompakte Übersicht pro Partner: Was hat dieser Partner bisher gescreent, wie oft
„weitermachen" vs. „nicht weiter" gesagt, wann zuletzt aktiv. Hilft dem Team,
aktive von passiven Partnern zu unterscheiden.
- Baut auf vorhandenem `PartnerStartupReview` (Verdikte) auf.
- Nur fürs Team sichtbar.

### 2. Startup-Onboarding-Checkliste
Fortschrittsbalken „Profil zu X % vollständig" mit Punkten wie Pitch, Logo,
Kennzahlen, Website. Mehr ausgefüllte Profile → besseres Matching & Discovery.
- Baut auf vorhandenen `Startup`-Storefront-Feldern auf.
- Startup-Self-Service-Sicht.

---

## 💡 Maybe / später (noch nicht eingeplant)

### Calendly-Anbindung für Mentor:innen
Mentor:innen ihr Calendly anbinden, um Terminbuchung zu vereinfachen/automatisieren.
Drei mögliche Stufen:
- **Stufe 1 (S):** Feld `calendlyUrl` je Mentor:in + „Termin buchen"-Button auf der
  Detailseite; Credits bleiben team-bestätigt.
- **Stufe 2 (M):** Calendly-Widget eingebettet; Buchungs-/Credit-Flow wie heute.
- **Stufe 3 (L):** Vollautomatisch via Calendly-Webhook (Termin → Buchung +
  Credit-Abzug automatisch).
- **Zielkonflikt:** umgeht den bewusst team-gebrokerten Flow (Credits werden heute
  erst bei „Bestätigen" abgebucht) und berührt die Leitplanke „keine reine
  Buchungs-/Kommunikationsplattform". Vor Umsetzung Credit-Logik klären.

---

_Details/Erklärungen zu diesen und weiteren Ideen: siehe
`docs/plan-improvements-benchmark.md`._
