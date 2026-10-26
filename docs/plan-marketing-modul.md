# Plan: Marketing-Modul („Marketing Space“)

**Stand:** 26.10.2026 · **Status:** Entwurf zur Abstimmung · **Mockup:** [`assets/marketing-modul-mock.html`](../assets/marketing-modul-mock.html)

## 1. Ziel

Unsere Social-Media- und Marketing-Verantwortliche bekommt einen eigenen Bereich auf der Plattform, in dem sie:

1. alle Engagement-Kennzahlen an einem Ort sieht (LinkedIn, E-Mail, Website, Events, Plattform-Anmeldungen),
2. Beiträge plant, freigeben lässt und nach Veröffentlichung automatisch auswertet,
3. sieht, ob alle angebundenen Tools laufen (Zustellung, Tokens, letzte Synchronisierung),
4. monatlich einen Marketing-Bericht exportiert.

Sie sieht dabei **keine** Startup-Bewertungen, Match-Matrix, Logbuch oder Partnerdaten. Der Bereich ist bewusst getrennt.

## 2. Anlass: Was heute schon schiefläuft

Beim Prüfen der Resend-Daten für diesen Plan ist ein echter Fehler aufgefallen:

| Datum | Kontaktanfrage (Homepage) | Status in Resend |
|---|---|---|
| 22.10. | Alex Trampisch | `bounced` |
| 23.10. | Andreas Reeh | `suppressed` |
| 26.10. | Frank Schmidt | `suppressed` |

Die Homepage schickt Kontaktanfragen an `berckan.guerrero@yumeda.de` und `info@lovedis.de`. Eine der beiden Adressen ist ein deaktiviertes Google-Konto (`550 5.2.1 The email account that you tried to reach is inactive`). Seitdem setzt Resend die Mails auf die Sperrliste. **Drei Leads seit dem 22.10. sind vermutlich nie angekommen.**

Die Empfänger kommen aus der Umgebungsvariable `CONTACT_EMAIL_TO` der Live-Homepage (`lovedis.de`, nicht der Hetzner-Server). Das muss unabhängig vom Modul sofort korrigiert werden (Phase 0). Genau solche Fälle soll das Modul künftig automatisch melden.

## 3. Zugriff und Rolle

**Entschieden (26.10.):** keine neue Rolle. Das Modul ist ein eigener Menüpunkt „Marketing Dashboard“ (`/marketing`) in der Admin-Navigation, geschützt mit `requireAdmin()`. Die Marketing-Person bekommt Admin-Rechte. Freigaben im Redaktionsplan macht jeder Admin.

## 4. Bausteine

### 4.1 Übersicht (Startseite)
Kennzahlen der letzten 30 Tage mit Vergleich zum Vormonat: LinkedIn-Follower und Impressionen, Engagement-Rate, Website-Besuche, Zustellrate E-Mail, neue Plattform-Anmeldungen. Darunter Warnungen (Bounce, ablaufendes Token, fehlgeschlagene Synchronisierung) und die nächsten geplanten Beiträge.

### 4.2 LinkedIn
- Unternehmensseite: Follower-Verlauf, Impressionen, Klicks, Reaktionen, Kommentare, Shares, Engagement-Rate je Beitrag.
- Top-Beiträge, Vergleich nach Format (Text, Bild, Video, Dokument, Event).
- Beiträge sind mit dem Redaktionsplan verknüpft, damit Planung und Ergebnis zusammen stehen.

**Datenquelle in zwei Stufen:**
1. **Sofort:** CSV/XLS-Export aus LinkedIn Page Analytics hochladen (Inhalte, Follower, Besucher). Kein API-Zugang nötig.
2. **Später:** LinkedIn Community Management API (`organizationalEntityShareStatistics`, `organizationalEntityFollowerStatistics`, Posts API). Braucht eine LinkedIn-Developer-App mit Freigabe für das Produkt „Community Management API“. Die Freigabe dauert erfahrungsgemäß Wochen und ist nicht garantiert. Token gelten 60 Tage, Refresh-Token ein Jahr.

**Einschränkung:** Statistiken zu Beiträgen von **persönlichen Profilen** (z. B. Gründer- oder Team-Posts) liefert die API nur sehr eingeschränkt. Diese werden per Link erfasst und Kennzahlen manuell nachgetragen.

### 4.3 E-Mail (Resend)
- Zustellrate, Bounces, Spam-Beschwerden, gesperrte Empfänger, je Kategorie (Einladung, Passwort, Support, Erinnerung, Kontaktformular, Newsletter).
- Warnung bei jedem Bounce oder jeder Sperre an kritische Empfänger (Kontaktformular, Support).
- Domain-Status (`lovedis.de`, aktuell verifiziert, Region `eu-west-1`).

**Technik:**
- Resend-Webhook `/api/webhooks/resend` für die Ereignisse `sent`, `delivered`, `delivery_delayed`, `bounced`, `complained`, `opened`, `clicked`. Signaturprüfung (Svix). Aktuell ist **kein Webhook** eingerichtet.
- Einmaliger Rückimport über `GET /emails` (Pagination).
- `sendEmail()` bekommt ein Pflichtfeld `category`, das als Resend-Tag mitgeht. Damit ist jede Mail einer Kategorie zuordenbar, ohne den Betreff zu parsen. Die Homepage sollte ihre Kontaktmails ebenfalls taggen.

**Einschränkung:** Unsere Plattform-Mails sind reiner Text. Öffnungs- und Klickraten lassen sich bei Text-Mails technisch nicht messen. Die gibt es erst für HTML-Mails, also sinnvollerweise für einen Newsletter (Phase 3, Resend Broadcasts).

### 4.4 Website
Auf `lovedis.de` läuft derzeit **keine** Web-Analyse. Vorschlag: **Umami** selbst gehostet auf dem Hetzner-Server (Docker, eigene Datenbank). Cookielos, also ohne Cookie-Banner, Daten bleiben in Deutschland. Das Modul zieht Besuche, Quellen, Top-Seiten und UTM-Kampagnen über die Umami-API.

Alternative: Plausible (gehostet, kostenpflichtig, EU). Google Analytics würde ich wegen Einwilligungspflicht nicht empfehlen.

### 4.5 Redaktionsplan
- Kalender- und Listenansicht, Status: Idee, Entwurf, In Freigabe, Geplant, Veröffentlicht.
- Felder: Kanal, Format, geplantes Datum, Text, Assets, Kampagne, verantwortliche Person, Link zum veröffentlichten Beitrag.
- Freigabe durch Admin mit Kommentar. Nach Veröffentlichung trägt die Marketing-Person den LinkedIn-Link ein, ab dann hängen die Kennzahlen am Eintrag.
- Vorlagen für wiederkehrende Formate (Startup-Spotlight, Event-Ankündigung, Challenge-Aufruf, Rückblick).
- Assets kommen aus dem bestehenden Media Kit.

### 4.6 Kampagnen und UTM-Links
- Kampagne mit Ziel, Zeitraum und Kanälen (z. B. „Challenge Wartungsunterstützung“, „KI Resilience Day“).
- UTM-Link-Generator, damit LinkedIn-Klicks bis zur Website und zur Plattform-Registrierung nachverfolgbar sind.
- Kampagnen-Auswertung: Reichweite, Klicks, Besuche, Anmeldungen, Event-Registrierungen.

### 4.7 Events
Anmeldungen und Teilnahmen aus Luma. Heute werden die Zahlen unter Insights > Förderung > Events manuell gepflegt. Später über die Luma-API (setzt Luma Plus voraus). Beide Stellen nutzen dann dieselben Zahlen.

### 4.8 Integrationen (Tool-Überwachung)
Eine Seite mit dem Status jedes Tools: verbunden ja/nein, letzte erfolgreiche Synchronisierung, letzter Fehler, Ablauf des Tokens, letzter empfangener Webhook. Bei Problemen Warnung auf der Übersicht und per E-Mail an Marketing und Admin.

### 4.9 Berichte
Monatsbericht als PDF und Excel im LOVEDIS-Design: Kennzahlen, Top-Beiträge, Kampagnen, Auffälligkeiten. Reichweitenzahlen können zusätzlich in den Verwendungsnachweis (Insights > Förderung) einfließen.

## 5. Datenmodell (Entwurf)

| Modell | Zweck |
|---|---|
| `MarketingIntegration` | Anbieter, Status, verschlüsselter Token, Ablaufdatum, `lastSyncAt`, `lastError` |
| `EmailEvent` | Resend-ID, Ereignistyp, Kategorie, Empfänger-Domain, Zeitpunkt. Volle Adresse nur bei Bounce und Beschwerde, Löschung nach 90 Tagen |
| `SocialPost` | Kanal, externe ID/URN, URL, Text, Format, Veröffentlichung, Autor, Kampagne |
| `SocialPostMetric` | Tages-Snapshot je Beitrag: Impressionen, Klicks, Reaktionen, Kommentare, Shares |
| `FollowerSnapshot` | Tages-Snapshot Follower je Kanal |
| `ContentItem` | Redaktionsplan-Eintrag inkl. Status, Freigabe, Verknüpfung zu `SocialPost` |
| `Campaign` | Name, Ziel, Zeitraum, `utm_campaign` |
| `WebTrafficDaily` | Tageswerte aus Umami (Besuche, Quellen, UTM) |

Alle Tabellen sind neu und rein additiv, also per `db push` ohne Risiko für bestehende Daten.

## 6. Synchronisierung

- Täglicher Cron `/api/cron/marketing-sync` nach dem bestehenden Muster (`/api/cron/reminders`, abgesichert mit `CRON_SECRET`): LinkedIn, Umami, Luma.
- Resend in Echtzeit per Webhook.
- Jeder Lauf schreibt Ergebnis und Fehler in `MarketingIntegration`.

## 7. Sicherheit und Datenschutz

- Tokens verschlüsselt in der Datenbank (AES-GCM, Schlüssel als Umgebungsvariable).
- E-Mail-Ereignisse aggregiert. Empfängeradressen nur, wenn für die Fehlersuche nötig, mit fester Löschfrist.
- Umami ohne Cookies und ohne personenbezogene Daten.
- Rolle `MARKETING` sieht keine Daten aus Scouting, Matching, Logbuch oder Partner-Bereichen.
- Neue Unterauftragsverarbeiter: keine bei Umami (selbst gehostet). LinkedIn-API und Resend bestehen bereits.

## 8. Phasen und Aufwand

| Phase | Inhalt | Aufwand (Schätzung) |
|---|---|---|
| **0. Sofort** | Kontaktformular-Empfänger korrigieren, Resend-Sperrliste bereinigen, Resend-Webhook einrichten | 0,5 Tage |
| **1. MVP** | Rolle `MARKETING` und eigener Bereich, E-Mail-Dashboard (Webhook, Rückimport, Kategorien), LinkedIn per CSV-Import, Redaktionsplan mit Freigabe, Integrationsseite | 5 bis 7 Tage |
| **2. Automatisierung** | LinkedIn-API (nach Freigabe), Umami auf Hetzner plus Anbindung, Kampagnen und UTM-Links, Monatsbericht als PDF/Excel | 6 bis 8 Tage |
| **3. Ausbau** | Newsletter über Resend Broadcasts mit Öffnungs- und Klickraten, Luma-API, Warnungen nach Slack, weitere Kanäle (Instagram, YouTube) | nach Bedarf |

Parallel zu Phase 1 sollte der Antrag für die LinkedIn Community Management API gestellt werden, damit Phase 2 nicht auf die Freigabe wartet.

## 9. Entscheidungen (26.10.)

1. Zugriff: Admins, keine eigene Rolle.
2. Website-Analyse: Umami selbst gehostet auf Hetzner.
3. Freigabe: jeder Admin.
4. Newsletter: läuft über Resend (Broadcasts) und wird als Add-on später ausgebaut. Phase 1 zeigt Broadcasts bereits an, Öffnungen und Klicks kommen über den Webhook.

## 10. Stand Umsetzung Phase 1 (26.10.)

Umgesetzt, lokal getestet, noch nicht deployt:

- Menüpunkt „Marketing Dashboard“ mit Reitern Übersicht, LinkedIn, E-Mail & Newsletter, Redaktionsplan, Integrationen.
- Resend-Abruf (Button und `POST /api/cron/marketing-sync`), Webhook `POST /api/webhooks/resend` mit Svix-Signatur (`RESEND_WEBHOOK_SECRET`).
- LinkedIn-Import aus dem Page-Analytics-Export (XLS/XLSX/CSV, deutsch und englisch), Follower-Gesamtzahl manuell.
- Redaktionsplan mit Wochenansicht und Freigabe-Workflow.
- Warnungen (u. a. nicht zugestellte Kontaktanfragen), Tabellen `MarketingIntegration`, `MarketingEmail`, `LinkedInPost`, `LinkedInFollowerDay`, `ContentItem` (rein additiv).

Für Live nötig: Deploy, Crontab-Eintrag für `marketing-sync`, Webhook in Resend anlegen und Secret auf dem Server setzen.
