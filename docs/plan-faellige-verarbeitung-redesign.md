# Redesign-Plan: „Fällige Verarbeitung" (Check-in-Erinnerungen)

_Status: Vorschlag / kein Code geändert. Erstellt als Reaktion auf Nutzer-Feedback:
„Die Funktion **Fällige Verarbeitung** sieht schlecht aus, passt nicht in die User
Journey, und ich weiß nicht, was sie tut."_

---

## 1. Was gemeint ist (Fundort)

Der exakte String **„Fällige Verarbeitung"** existiert **nicht** im Code. Die
Formulierung des Nutzers trifft eindeutig auf ein Feature-Bündel rund um die
**Check-in-Erinnerungen** zu — konkret auf zwei sichtbare Elemente:

### (A) Der Button „Fällige verarbeiten" (die eigentliche „Fällige Verarbeitung")

- **Datei:** `src/components/pushes/RunRemindersButton.tsx` (ganze Datei, v. a. Z. 15–28)
- **Label:** `Fällige verarbeiten` bzw. `Verarbeite…` im Ladezustand (Z. 19)
- **Gerendert auf:** `/pushes` als `actions`-Slot im HeroBanner-Header
  (`src/app/(main)/pushes/page.tsx` Z. 57–62, `actions={<RunRemindersButton />}`)
- **Was er tut:** Ruft die Server Action `runDueReminders()` auf
  (`src/app/actions/pushes.ts` Z. 171–185), die `processDueReminders()`
  (`src/lib/reminders.ts` Z. 21–64) ausführt: findet alle `CheckInReminder` mit
  `status = SCHEDULED` und `dueAt <= now`, verschickt pro Erinnerung eine
  E-Mail an den Partner und setzt den Status auf `SENT`.

### (B) Die Dashboard-Kachel „Fällige Check-in-Erinnerungen"

- **Dateien:**
  - `src/app/(main)/dashboard/member/page.tsx` Z. 151–158 (Kachel), Datenquelle Z. 57–59
  - `src/app/(main)/dashboard/admin/page.tsx` Z. 159–166 (Kachel), Datenquelle Z. 57–59
- **Label:** `Fällige Check-in-Erinnerungen`, Subtext `bereit zum Versand →`
- **Datenquelle:** `prisma.checkInReminder.count({ where: { status: "SCHEDULED", dueAt: { lte: now } } })`
- **Verlinkt auf:** `/pushes` (wo Button (A) sitzt)

### Rollen, die es sehen

- Button (A) `/pushes`: nur internes Team — `requireTeam()` = **ADMIN + MEMBER**
  (`src/app/(main)/pushes/page.tsx` Z. 22). Im Nav unter „Zusammenarbeit &
  Kommunikation" → „Push & Check-ins" (`src/lib/roles.ts` Z. 143–151).
- Kachel (B): **ADMIN + MEMBER** (Team-Dashboards). Partner/Investor/Startup
  sehen sie **nicht**.
- Verwandt, aber sauber: `/check-ins` (`src/app/(main)/check-ins/page.tsx`) ist
  die **Partner-Sicht** derselben Daten — ordentlich als Karten mit
  „Erledigt"-Button und „Überfällig"-Stat (`PARTNER_VIEW_ROLES`, Z. 69–73 in
  `roles.ts`). Diese Seite ist NICHT das Problem und dient als Vorbild.

### Datenfluss (End-to-End)

```
StartupPush (Team weist Partner ein Startup zu)
      │  optional: reminderInDays  →  createPush() (actions/pushes.ts Z. 71–87)
      ▼
CheckInReminder { status: SCHEDULED, dueAt }
      │
      ├─(Zeit vergeht, dueAt <= now  ⇒  „fällig")
      │
      ├─ CRON: POST /api/cron/reminders  ─┐   (src/app/api/cron/reminders/route.ts)
      └─ MANUELL: Button „Fällige         ├─►  processDueReminders()  ──► sendEmail()
                   verarbeiten"           ┘        (reminders.ts)          (email.ts)
                                                        │
                                                        ▼
                                          status: SENT, sentAt gesetzt
                                          Partner sieht/erledigt auf /check-ins
```

---

## 2. Warum es schlecht ist (konkret)

1. **Der Name beschreibt eine Maschine, kein Nutzerziel.** „Fällige
   verarbeiten" ist Dev-Ops-/Queue-Sprache (ein manueller Cron-Trigger, der in
   die Produkt-UI durchgesickert ist). Nutzer denken in „Erinnerungen
   verschicken", nicht in „fällige Objekte verarbeiten". Genau deshalb weiß der
   Nutzer nicht, was der Button tut. (`RunRemindersButton.tsx` Z. 19)

2. **Der Button macht sichtbar … nichts.** Der aktive E-Mail-Adapter ist
   `consoleEmailAdapter` — er **loggt nur auf die Konsole, verschickt keine
   echte Mail** (`src/lib/email.ts` Z. 33–55; bestätigt in
   `docs/mara-implementation-notes.md` Z. 38–49). Der Nutzer klickt, bekommt
   „X Erinnerung(en) versendet" — aber es passiert nichts Wahrnehmbares. Das ist
   das Kernproblem: eine Aktion ohne spürbaren Effekt wirkt kaputt.

3. **Redundant zum Cron.** Die exakt gleiche Logik läuft (sobald der Scheduler
   verdrahtet ist) automatisch über `POST /api/cron/reminders`
   (`route.ts` Z. 27–33). Ein manueller Knopf dafür ist ein Notbehelf aus der
   Entwicklung — kein Feature, das ein Endnutzer braucht.

4. **Optisch ein Fremdkörper.** Der Button sitzt als grauer Sekundär-Button im
   Hero-Header neben Marketing-Text („Weise Partnern gezielt Startups zu…",
   `pushes/page.tsx` Z. 57–62). Kein Icon-Kontext, keine Zahl, keine Erklärung —
   er sieht aus wie ein verirrter Admin-Schalter.

5. **Doppelte, leicht verschiedene Labels für dieselbe Sache.** „Fällige
   verarbeiten" (Button) vs. „Fällige Check-in-Erinnerungen / bereit zum
   Versand" (Kachel). Zwei Formulierungen, ein Konzept → Verwirrung.

6. **Kein Kontext / keine Vorschau vor der Aktion.** Der Button sagt nicht,
   *welche* oder *wie viele* Erinnerungen betroffen sind, bevor man klickt. Man
   erfährt die Zahl erst hinterher im Erfolgstext.

---

## 3. Redesign-Vorschlag

### Leitidee

Das manuelle „Verarbeiten" ist ein **Infrastruktur-Detail**, kein Produkt-Feature.
Der Nutzer will nicht „fällige Objekte verarbeiten" — er will **sehen, welche
Check-ins jetzt anstehen, und die Erinnerungen rausschicken (bzw. wissen, dass
sie automatisch rausgehen)**. Also: das kryptische Verb ersetzen durch eine
**kontextbezogene, zählende Aktion mit klarem Effekt**.

### 3.1 Neuer Name & Zweck

| Element | Alt | Neu (Vorschlag) |
| --- | --- | --- |
| Button `/pushes` | „Fällige verarbeiten" | **„Erinnerungen jetzt senden (N)"** — N = Anzahl fälliger Erinnerungen |
| Dashboard-Kachel | „Fällige Check-in-Erinnerungen / bereit zum Versand →" | **„Fällige Check-in-Erinnerungen / N warten auf Versand →"** (Label bleibt gut, Subtext präziser) |

**Ein-Satz-Zweck:** „Verschickt an die zugewiesenen Partner die
Check-in-Erinnerungen, deren Fälligkeitsdatum erreicht ist — normalerweise
automatisch, hier auf Knopfdruck."

### 3.2 Wo es leben soll

- **Bleibt auf `/pushes`** (richtige Rolle: Team koordiniert Pushes & Check-ins),
  aber **raus aus dem Hero-Header** und rein in einen **eigenen, erklärten
  „Automations"-Abschnitt** über dem Push-Verlauf.
- Die Dashboard-Kachel bleibt als Einstieg (`→ /pushes`), zeigt aber die echte
  Zahl und führt gezielt in diesen neuen Abschnitt (Anker `#erinnerungen`).
- **Wenn kein echter E-Mail-Provider verdrahtet ist:** Button klar als
  Dev-/Test-Aktion kennzeichnen ODER (siehe 3.6) ganz ausblenden.

### 3.3 Was es zeigen soll (statt nacktem Button)

- **Zähler „N fällig"** direkt am/neben dem Button — Vorschau *vor* dem Klick.
- **Kurze Klartext-Zeile:** „N Erinnerungen sind fällig. Im Normalbetrieb
  verschickt das System sie automatisch."
- **Statuszeile nach dem Klick** (bereits vorhanden, behalten): „N versendet".
- **Ehrlicher Hinweis auf den Versand-Modus**, wenn Adapter = console:
  „⚠️ Test-Modus: E-Mails werden nur protokolliert, nicht wirklich versendet."
- **Leerzustand:** Wenn N = 0 → Button ausgegraut/versteckt + „Keine fälligen
  Erinnerungen. Alles versendet. ✓".

### 3.4 Was wegfällt

- Das isolierte, kontextlose Verb „**Fällige verarbeiten**" im Hero-Header.
- Die doppelte Begriffswelt (Button-Label ≠ Kachel-Label vereinheitlichen).
- (Optional, siehe 3.6) der manuelle Trigger komplett, sobald Cron läuft.

### 3.5 Wireframe (redesigntes Segment auf `/pushes`)

```
┌─ 00 · Automation ─ Check-in-Erinnerungen ───────────────────────────┐
│                                                                      │
│  🔔  3 Erinnerungen sind fällig                                      │
│      Im Normalbetrieb verschickt Mara sie automatisch. Du kannst     │
│      sie hier auch sofort auslösen.                                   │
│                                                                      │
│      ⚠ Test-Modus: E-Mails werden nur protokolliert (kein Versand).  │  ← nur wenn console-Adapter
│                                                                      │
│                          [ ✉  Erinnerungen jetzt senden (3) ]        │
│                          └ nach Klick: „3 versendet ✓"               │
└──────────────────────────────────────────────────────────────────────┘

Leerzustand (N = 0):
┌─ 00 · Automation ─ Check-in-Erinnerungen ───────────────────────────┐
│  ✓  Keine fälligen Erinnerungen — alles versendet.                   │
└──────────────────────────────────────────────────────────────────────┘
```

Dashboard-Kachel (Aktions-Inbox, Team):

```
┌─────────────────────────────────────┐
│ FÄLLIGE CHECK-IN-ERINNERUNGEN        │  tone: warn (N>0) / muted (N=0)
│ 3                                    │
│ warten auf Versand  →                │  Link: /pushes#erinnerungen
└─────────────────────────────────────┘
```

### 3.6 Empfehlung zur Kernfrage: Behalten, umbauen oder entfernen?

**Umbauen (empfohlen), nicht ersatzlos streichen.** Begründung:

- Die *Daten* (fällige Check-ins) sind wertvoll und gehören sichtbar ins
  Team-Dashboard — die Kachel bleibt.
- Der *manuelle Button* ist aber ein Infrastruktur-Notbehelf. Zwei saubere
  Endzustände:
  - **Wenn Cron verdrahtet wird** (`POST /api/cron/reminders`,
    `mara-implementation-notes.md` Z. 43–49): manuellen Button **entfernen**;
    Abschnitt zeigt nur noch die Vorschau „N fällig, gehen automatisch raus"
    (+ „zuletzt automatisch versendet: …").
  - **Solange kein echter Provider/Scheduler existiert:** Button **behalten**,
    aber umbenennen (3.1), mit Zähler + ehrlichem Test-Modus-Hinweis (3.3), im
    eigenen Abschnitt (3.2). So versteht der Nutzer sofort, was er tut.

Ersatzlos entfernen ist **nicht** empfohlen, weil dann kein Weg bliebe, den
Reminder-Versand ohne Scheduler auszulösen (heute die einzige Trigger-Option
neben dem noch nicht verdrahteten Cron).

---

## 4. Implementierungs-Notizen (nur Plan, kein Code)

### Zu ändernde Dateien

1. **`src/components/pushes/RunRemindersButton.tsx`**
   - Neue Props: `dueCount: number` und optional `deliveryMode: "live" | "console"`.
   - Label → „Erinnerungen jetzt senden (N)"; bei `dueCount === 0` Button
     `disabled` + „Keine fälligen Erinnerungen".
   - Test-Modus-Hinweis rendern, wenn `deliveryMode === "console"`.
   - Erfolgs-/Fehlertext beibehalten (nutzt schon `ActionState`).

2. **`src/app/(main)/pushes/page.tsx`**
   - `RunRemindersButton` aus `actions={…}` (Z. 61) entfernen.
   - Neuen `SectionLabel number="00" label="Automation" title="Check-in-Erinnerungen"`
     + Card mit Anker-`id="erinnerungen"` über „01 · Neu" einfügen.
   - Fällige-Anzahl serverseitig berechnen (analog Dashboard):
     `prisma.checkInReminder.count({ where: { status: "SCHEDULED", dueAt: { lte: new Date() } } })`
     und als `dueCount` an den Button geben.
   - `deliveryMode` aus einem kleinen Helper ableiten (siehe 3).

3. **`src/lib/email.ts`** (optional, klein)
   - Kleiner Export `getEmailDeliveryMode(): "live" | "console"` (leitet aus
     `getEmailAdapter().name` ab), damit die UI ehrlich den Test-Modus zeigen
     kann. Kein Verhaltenswechsel beim Versand.

4. **`src/app/(main)/dashboard/member/page.tsx` & `dashboard/admin/page.tsx`**
   - Kachel-Subtext Z. 156 bzw. Z. 164: „bereit zum Versand →" →
     „warten auf Versand →" (einheitlich).
   - Link-Ziel Z. 151 bzw. Z. 159: `/pushes` → `/pushes#erinnerungen`.
   - Datenquelle (`dueCheckIns`, Z. 57–59) bleibt unverändert.

5. **`src/app/actions/pushes.ts`** — `runDueReminders()` (Z. 171–185) bleibt
   funktional unverändert; ggf. Kommentar/Erfolgstext an neue Sprache angleichen.

### Keine Schema-/Query-Änderungen nötig

- `CheckInReminder` (`prisma/schema.prisma`), `processDueReminders()` und der
  Cron-Endpoint bleiben wie sie sind. Der Redesign ist rein **UI/IA + Labels +
  ein optionaler Delivery-Mode-Getter**.

### Optionaler Folgeschritt (wenn Cron verdrahtet)

- Manuellen Button entfernen, Abschnitt auf reine Vorschau + „zuletzt
  automatisch versendet" umstellen (bräuchte ein `sentAt`-Max-Query o. Ä.).

---

## 5. Kurzfazit

- **Feature:** Ein manueller „Fällige verarbeiten"-Button auf `/pushes` (+ die
  Team-Dashboard-Kachel „Fällige Check-in-Erinnerungen"), der fällige
  Check-in-Erinnerungs-Mails an Partner auslöst — technisch der manuelle
  Zwilling des (noch nicht verdrahteten) Cron-Jobs.
- **Warum schlecht:** Dev-Ops-Sprache statt Nutzerziel, sichtbar wirkungslos
  (E-Mail-Adapter loggt nur, versendet nicht), kontextlos im Hero-Header, doppelte
  Labels, keine Vorschau der betroffenen Anzahl.
- **Top-Empfehlung:** Umbauen, nicht löschen — in einen erklärten
  „Check-in-Erinnerungen"-Abschnitt mit Zähler, Klartext und ehrlichem
  Test-Modus-Hinweis; Button umbenennen in „Erinnerungen jetzt senden (N)";
  Dashboard-Labels vereinheitlichen; sobald Cron läuft, den manuellen Button
  ganz entfernen.
