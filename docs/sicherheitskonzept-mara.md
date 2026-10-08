# Sicherheitskonzept — Plattform & Website

**Stand:** 3. August 2026 · **Version:** 2.0 · **Klassifizierung:** Vertraulich

Dieses Dokument beschreibt das Sicherheitskonzept für zwei Systeme des Lovedis-Ökosystems: **(A) die Plattform** (interne Startup-Scouting-, Matchmaking- und Kollaborations­anwendung, Vercel-Projekt `lovedis-mara-test`, Branch `mara`) und **(B) die öffentliche Website `lovedis.de`** (Marketing-/Unternehmens-Website). Es unterscheidet durchgängig zwischen **Ist-Zustand** (gegen den Quellcode bzw. gegen belegbare Fakten verifiziert) und **Soll-Zustand / Empfehlung (Optimum)** (best-practice Zielarchitektur). Ziel ist nicht nur die Dokumentation des Status quo, sondern die Beschreibung des anzustrebenden Sicherheitsniveaus nach dem Stand der Technik.

## Inhalt

1. [Zweck, Geltungsbereich & Schutzziele](#1-zweck-geltungsbereich--schutzziele)
2. [Systemarchitektur, Datenflüsse & Threat Model](#2-systemarchitektur-datenflüsse--threat-model)
3. [Authentifizierung (Plattform)](#3-authentifizierung-plattform)
4. [Passwort-Handling](#4-passwort-handling)
5. [Autorisierung — Rollen- & Rechtemodell (RBAC)](#5-autorisierung--rollen---rechtemodell-rbac)
6. [Datenhaltung & Datenbank-Hosting](#6-datenhaltung--datenbank-hosting)
7. [Verschlüsselung](#7-verschlüsselung)
8. [Secrets-Management](#8-secrets-management)
9. [Netzwerk, Perimeter & Security-Header](#9-netzwerk-perimeter--security-header)
10. [Eingabevalidierung & Injection-Schutz](#10-eingabevalidierung--injection-schutz)
11. [Logging, Monitoring, Auditing & Alerting](#11-logging-monitoring-auditing--alerting)
12. [Datenschutz (DSGVO/GDPR)](#12-datenschutz-dsgvogdpr)
13. [Sichere Softwareentwicklung (SSDLC)](#13-sichere-softwareentwicklung-ssdlc)
14. [Verfügbarkeit & Resilienz (BCM/DR)](#14-verfügbarkeit--resilienz-bcmdr)
15. [Incident Response](#15-incident-response)
16. [Website lovedis.de — dediziertes Sicherheitskapitel](#16-website-lovedisde--dediziertes-sicherheitskapitel)
17. [Härtungs- & Maßnahmen-Roadmap](#17-härtungs---maßnahmen-roadmap)
18. [Ergebnisse des Security-Reviews (Ist, Juli 2026)](#18-ergebnisse-des-security-reviews-ist-juli-2026)
19. [Anhang: Glossar, Referenzen & Versionierung](#19-anhang-glossar-referenzen--versionierung)

---

## 1. Zweck, Geltungsbereich & Schutzziele

### 1.1 Zweck

Dieses Sicherheitskonzept legt die sicherheitsrelevante Architektur, die technischen und organisatorischen Maßnahmen (TOMs) sowie die anzustrebende Zielarchitektur für die beiden im Geltungsbereich genannten Systeme fest. Es dient als Referenz für Entwicklung, Betrieb, Audits, Kunden-/Partner-Due-Diligence und als Grundlage für die priorisierte Härtungs-Roadmap (Abschnitt 17).

### 1.2 Geltungsbereich (zwei Systeme)

| Kürzel | System | Beschreibung | Technologie | Hosting |
|---|---|---|---|---|
| **A** | **Plattform** | Interne Startup-Scouting-, Matchmaking- & Kollaborationsplattform. Sichtung/Bewertung von Startups (Sourcing, Longlist, Match-Matrix), Zusammenarbeit mit Business Partnern (Use-Cases/Challenges, Screening, Check-ins, PoC-Tracking) und kuratierter Marktplatz mit „Venture Credits". Fünf Nutzerrollen. | Next.js 16 (App Router, RSC, Server Actions), NextAuth v5, Prisma 7, PostgreSQL | Vercel (`lovedis-mara-test`), DB auf Neon |
| **B** | **Website `lovedis.de`** | Öffentliche Marketing-/Unternehmens-Website (Außendarstellung, Kontakt, ggf. Bewerbungs-/Newsletter-Formulare). Kein Login, keine internen Geschäftsdaten. | Nuxt (Annahme, siehe unten) | Cloudflare Pages oder Vercel (Annahme) |

> **Hinweis zum Verifikationsstand.** Aussagen zu **System A (Plattform)** wurden gegen den tatsächlichen Quellcode im Branch `mara` geprüft; die zugehörigen Dateipfade sind jeweils angegeben. Die Codebasis von **System B (`lovedis.de`)** liegt **nicht** in diesem Repository und war zum Zeitpunkt der Erstellung nicht im Dateisystem auffindbar. Aussagen zu System B sind daher auf Architektur-/Best-Practice-Ebene formuliert; angenommene technische Fakten (Framework Nuxt, Hosting Cloudflare/Vercel) sind ausdrücklich als **[Annahme]** gekennzeichnet und vor Freigabe des Dokuments zu verifizieren.

**In-Scope A:** Die Plattform (Next.js-App, Datenzugriffe, Server Actions, Auth, Datenbank) sowie ihr Deployment im Vercel-Projekt `lovedis-mara-test`.

**In-Scope B:** Die öffentliche Website `lovedis.de` auf Ebene Perimeter/Hosting, öffentliche Angriffsfläche (Formulare, Third-Party-Skripte), Security-Header/CSP, Website-DSGVO (Consent/Tracking) sowie Domain- und E-Mail-Sicherheit der Domain `lovedis.de`.

**Out-of-Scope:** Endgeräte-Sicherheit der Nutzer, physische Sicherheit der Cloud-Rechenzentren (Verantwortung der Betreiber Vercel/Neon/Cloudflare), sowie organisatorische Prozesse außerhalb der beiden Systeme. Für System B werden **keine Änderungen** vorgenommen; die Website wird ausschließlich dokumentiert.

### 1.3 Schutzziele

Das Konzept adressiert die klassischen Schutzziele der Informationssicherheit, ergänzt um Nachvollziehbarkeit und Authentizität:

| Schutzziel | Bedeutung | Priorität A (Plattform) | Priorität B (Website) |
|---|---|---|---|
| **Vertraulichkeit** (Confidentiality) | Schutz vor unbefugter Kenntnisnahme (Startup-/Partner-/Bewertungsdaten, Zugangsdaten) | Hoch | Niedrig (überwiegend öffentliche Inhalte) |
| **Integrität** (Integrity) | Schutz vor unbefugter/unbemerkter Veränderung (Scores, Verdicts, Credits, Rollen) | Hoch | Mittel (Defacement-Schutz) |
| **Verfügbarkeit** (Availability) | System nutzbar, wenn benötigt | Hoch | Mittel–Hoch (Außendarstellung) |
| **Nachvollziehbarkeit** (Accountability/Auditability) | Wer hat wann was getan | Hoch | Niedrig |
| **Authentizität** (Authenticity) | Echtheit von Identität und Herkunft (Login, Domain/E-Mail) | Hoch | Hoch (Domain-/Marken-Schutz, E-Mail-Spoofing) |

### 1.4 Datenklassifizierung

| Klasse | Beispiele | System | Behandlung |
|---|---|---|---|
| **Öffentlich** | Marketing-Inhalte, veröffentlichte Startup-Storefronts (`isPublished`) | A + B | Keine besonderen Vertraulichkeitsanforderungen |
| **Intern** | Longlist, Pipeline-Status, interne Notizen | A | Nur authentifiziertes Team |
| **Vertraulich** | Bewertungen/Scores, Partner-Verdicts, Cross-Partner-Match-Matrix, Nachrichten | A | Strikt rollen-/eigentümer­gescoped |
| **Geheim** | Passwort-Hashes, `AUTH_SECRET`, `DATABASE_URL`, `CRON_SECRET`, DNS-/Mail-Schlüssel | A (+ B für Domain-Keys) | Nur serverseitig, niemals im Repo, Rotation |
| **Personenbezogen (PII)** | Namen, E-Mail-Adressen, Firmen, Kontaktformular-Eingaben | A + B | DSGVO-konform (Abschnitt 12) |

---

## 2. Systemarchitektur, Datenflüsse & Threat Model

### 2.1 Architektur System A — Plattform (Ist)

Die Plattform ist eine **serverzentrierte** Web-Anwendung **ohne separate, öffentlich exponierte REST-/GraphQL-API**. Schreibende Operationen laufen ausschließlich über **Next.js Server Actions**; lesende Zugriffe erfolgen überwiegend in **React Server Components (RSC)** direkt gegen die Datenbank. Diese Architektur reduziert die Angriffsfläche erheblich, weil kein generischer API-Layer existiert, an dem Autorisierung „vergessen" werden könnte — jede Aktion trägt ihre Zugriffsprüfung selbst.

| Schicht | Technologie | Version |
|---|---|---|
| Framework | Next.js (App Router, RSC + Server Actions) | `^16.2.9` |
| Runtime | React / React DOM | `^19.2.7` |
| Authentifizierung | NextAuth (Auth.js) v5 | `5.0.0-beta.31` |
| ORM / DB-Zugriff | Prisma Client + Adapter (pg / Neon) | `^7.8.0` |
| Datenbank | PostgreSQL (in Produktion: Neon) | — |
| Passwort-Hashing | bcryptjs | `^3.0.3` |
| Validierung | Zod | `^4.4.3` |
| Hosting | Vercel (Projekt `lovedis-mara-test`) | — |

**Datenzugriff.** Der Prisma-Client wird zentral in `src/lib/prisma.ts` erzeugt. In der Cloudflare-Workers-Umgebung wird der Neon-Serverless-Adapter (`PrismaNeon`) verwendet, ansonsten der Standard-PostgreSQL-Adapter (`PrismaPg`); die Verbindung stammt in beiden Fällen aus `DATABASE_URL`.

**Request-Gate (Middleware, `src/middleware.ts`).** Vor jeder Route erfolgt ein JWT-basierter Session-Check (Edge-sicher, ohne Prisma-Import): nicht authentifizierte Anfragen auf geschützte Pfade werden auf `/login` umgeleitet (mit `callbackUrl`), authentifizierte Anfragen auf `/`, `/login` oder `/auth/*` auf die rollenspezifische Startseite. Öffentlich bleiben nur explizit gelistete Pfade (`/login`, `/api/auth`, `/api/health`, `/api/session-clear`, `/api/cron` u. a.). Die Cron-Pfade sind bewusst „öffentlich" im Sinne der Middleware, da sie von externen Schedulern ohne Session erreicht werden — ihre Zugriffskontrolle erfolgt über einen eigenen Bearer-Token.

### 2.2 Architektur System B — Website `lovedis.de` [Annahme]

Die öffentliche Website ist nach heutigem Kenntnisstand ein eigenständiges **Nuxt-Projekt** [Annahme], das getrennt von der Plattform gebaut und ausgeliefert wird. Sie enthält keinen Login und keine internen Geschäftsdaten. Details siehe **Abschnitt 16**. Beide Systeme teilen sich lediglich die Marke und die übergeordnete Domain `lovedis.de`; die Plattform läuft unter einer eigenen (Sub-)Domain bzw. dem Vercel-Deployment. Eine **strikte Trennung** beider Deployments (getrennte Projekte, getrennte Secrets, getrennte CI-Pipelines) ist bereits gegeben bzw. anzustreben.

### 2.3 Trust Boundaries & Datenflüsse

```
                        ┌──────────────────────────────────────────┐
   Öffentliches         │                Internet                   │
   Internet  ──────────▶│  (untrusted: Nutzer, Bots, Angreifer)    │
                        └───────────────┬───────────────┬──────────┘
                                        │               │
                      ┌─────────────────▼──┐        ┌────▼───────────────────┐
   TRUST BOUNDARY 1   │  CDN/WAF/TLS-Edge   │        │  CDN/WAF/TLS-Edge      │
   (Perimeter)        │  (Vercel Edge)      │        │  (Cloudflare/Vercel)   │
                      └─────────┬───────────┘        └────────┬───────────────┘
                                │                             │
              ┌─────────────────▼────────────┐      ┌─────────▼──────────────┐
   TRUST      │  SYSTEM A — Plattform         │      │  SYSTEM B — lovedis.de │
   BOUNDARY 2 │  Middleware (JWT-Gate)        │      │  statische Seiten +    │
   (AuthN/Z)  │  RSC + Server Actions         │      │  Formular-Endpunkte    │
              │  requireAuth/requireRole      │      │  (Kontakt/Newsletter)  │
              └───────┬───────────────────────┘      └─────────┬──────────────┘
                      │ TLS (parametrisiert, Prisma)           │  (Mail/API des
              ┌───────▼───────────┐                            │   Form-Providers)
   TRUST      │  PostgreSQL (Neon) │                    ┌───────▼──────────┐
   BOUNDARY 3 │  Daten at-rest     │                    │  Drittdienste    │
   (Daten)    └────────────────────┘                    │ (Analytics,Mail) │
                                                         └──────────────────┘
```

**Vertrauensgrenzen:** (1) Perimeter zwischen Internet und Anwendung (CDN/WAF/TLS), (2) Authentifizierungs-/Autorisierungsgrenze innerhalb der Plattform (Session → Rolle → Eigentümer), (3) Datengrenze zur Datenbank (nur parametrisierte Prisma-Queries über TLS). Für die Website ist die relevante Grenze der Übergang von statischen Inhalten zu dynamischen Endpunkten (Formularen) und zu Drittdiensten.

### 2.4 Threat Model (STRIDE) mit Zuordnung

| STRIDE-Kategorie | Bedrohung | Betroffen | Gegenmaßnahme (Ist/Soll) |
|---|---|---|---|
| **S**poofing | Fremde Identität annehmen (Login-Fälschung, E-Mail-Spoofing, Domain-Takeover) | A, B | Credentials-Auth + generische Fehler (Ist); MFA (Soll); SPF/DKIM/DMARC, DNSSEC (Soll, B) |
| **T**ampering | Manipulation von Daten/Requests (Scores, Credits, Formularinhalte) | A, B | Serverseitige Validierung (Zod), parametrisierte Queries, Serializable-Transaktionen (Ist); CSP/SRI (Soll) |
| **R**epudiation | Abstreiten von Handlungen | A | Audit-Logging (Soll) |
| **I**nformation Disclosure | Unbefugter Datenabfluss (IDOR, Over-Fetching, Secret-Leak) | A, B | Eigentümer-Guards, Team-only-Fetch (Ist, behoben); Secret-Hygiene (Ist); Feldverschlüsselung (Soll) |
| **D**enial of Service | Überlastung (Brute-Force, Bot-Flut, DDoS) | A, B | Vercel/Cloudflare-DDoS-Schutz (Ist teilweise); Rate-Limiting/WAF (Soll) |
| **E**levation of Privilege | Rechteausweitung (Rollen-Bypass) | A | RBAC-Guards, DB-Rollen-Refresh pro Request (Ist) |

### 2.5 OWASP Top 10 (2021) — Mapping

| OWASP-Kategorie | Relevanz | Status / Maßnahme |
|---|---|---|
| A01 Broken Access Control | Sehr hoch (A) | RBAC-Guards, IDOR-Fix `/challenges/[id]` (Ist behoben, Abschnitt 18); serverseitige Durchsetzung |
| A02 Cryptographic Failures | Hoch | TLS erzwungen (Ist); bcrypt cost 10 (Ist) → Argon2id (Soll); at-rest-Verschlüsselung (Neon/Vercel, Ist) |
| A03 Injection | Hoch | Prisma-Parametrisierung + Zod (Ist); XSS via React-Escaping (Ist); Website-Formulare (Soll) |
| A04 Insecure Design | Mittel | Serverzentrierte Architektur ohne offene API (Ist, positiv) |
| A05 Security Misconfiguration | Hoch | Security-Header/CSP fehlen (Ist-Lücke) → vollständige Header (Soll, Abschnitt 9) |
| A06 Vulnerable/Outdated Components | Mittel | NextAuth Beta (Ist-Risiko); Dependency-Scanning (Soll, Abschnitt 13) |
| A07 Identification & Authentication Failures | Hoch | Kein Rate-Limiting/MFA (Ist-Lücke) → Abschnitt 3/4 (Soll) |
| A08 Software & Data Integrity Failures | Mittel | Lockfile-Pinning (Ist); SRI/SBOM/Signaturen (Soll) |
| A09 Security Logging & Monitoring Failures | Hoch | Kein Audit-Trail (Ist-Lücke) → Abschnitt 11 (Soll) |
| A10 SSRF | Niedrig–Mittel | Keine nutzergesteuerten Server-Fetches bekannt; bei künftigen URL-Fetches Allowlist (Soll) |

---

## 3. Authentifizierung (Plattform)

### 3.1 Ist-Zustand

Die Authentifizierung basiert auf **NextAuth v5** mit einem **Credentials-Provider** (E-Mail + Passwort). Die Kernlogik liegt in `src/auth.ts`, die Edge-sichere Basiskonfiguration in `src/auth.config.ts`.

**Passwort-Prüfung (`src/auth.ts`).**
- Eingaben werden mit einem Zod-Schema validiert (`email` als E-Mail, `password` als nicht-leerer String).
- Der Nutzer wird case-insensitiv geladen (`email.toLowerCase()`).
- Inaktive Konten werden abgelehnt (`if (!user || !user.isActive) return null`).
- Das Passwort wird gegen den gespeicherten Hash mit **bcrypt** geprüft (`bcrypt.compare(...)`). Es werden ausschließlich Passwort-**Hashes** gespeichert; Klartext-Passwörter werden zu keinem Zeitpunkt persistiert.
- Bei Fehlschlag wird generisch `null` zurückgegeben (keine Unterscheidung „Nutzer unbekannt" vs. „Passwort falsch"), was User-Enumeration erschwert.

**Session-Handling (`src/auth.config.ts`).**
- Session-Strategie ist **JWT** (`session.strategy = "jwt"`); es werden keine server-seitigen Session-Datensätze geführt.
- Im `jwt`-Callback werden `id` und `role` in das Token übernommen; im `session`-Callback auf `session.user` gespiegelt.

**Rollen-Refresh bei jedem Request (`src/lib/auth-guards.ts`).** `requireAuth()` prüft nicht nur das JWT-Cookie, sondern lädt den Nutzer bei **jedem Request** frisch aus der Datenbank: Existiert die `session.user.id` nicht mehr oder ist das Konto inaktiv, wird zu `/api/session-clear` umgeleitet (löscht das kryptografisch noch gültige Cookie sauber und verhindert Redirect-Loops). Die **Rolle wird aus der DB übernommen** (`session.user.role = user.role`), sodass Rechteänderungen sofort beim nächsten Request greifen. Ergänzend blockiert `requireApprovedAccess()` selbst-registrierte Business Partner, deren Konto noch auf Admin-Freigabe wartet (`approvedAt == null`).

### 3.2 Cookie-Flags, CSRF & Session-Parameter

| Aspekt | Ist (NextAuth-Defaults v5) | Soll / Optimum |
|---|---|---|
| Cookie `HttpOnly` | Ja (Default) | Beibehalten |
| Cookie `Secure` | Ja in Produktion (Prefix `__Secure-`/`__Host-`) | Beibehalten, `__Host-`-Prefix erzwingen |
| Cookie `SameSite` | `Lax` (Default) | `Lax` beibehalten (Credentials-Flow) |
| CSRF-Schutz | NextAuth Double-Submit-CSRF-Token für Auth-Routen; Server Actions sind Origin-gebunden | Beibehalten; explizit `Origin`-Check in sicherheitskritischen Actions |
| Session-Strategie | JWT (stateless) | JWT ok; für sofortiges serverseitiges Invalidieren optional DB-Session-Strategie erwägen |
| Session-Timeout (`maxAge`) | **nicht explizit gesetzt** → NextAuth-Default **30 Tage** | **Explizit setzen:** absolutes Timeout 8–24 h, Idle-Timeout 30–60 min, `updateAge` konfigurieren |
| Token-Rotation | Refresh bei Aktivität (Default) | Rotierende Tokens, serverseitige Deny-List bei Logout/Kompromittierung |

### 3.3 Empfehlungen (Soll)

1. **Session-Timeout explizit konfigurieren** (siehe Tabelle) statt der impliziten 30-Tage-Default.
2. **MFA** für privilegierte Rollen (ADMIN/MEMBER) — siehe Abschnitt 4.
3. **`__Host-`-Cookie-Prefix** erzwingen (bindet Cookie an Host, kein `Domain`-Attribut, nur über HTTPS).
4. **Step-up-Authentication** für besonders sensible Aktionen (Rollenänderung, Nutzerlöschung, Credit-Korrektur).

---

## 4. Passwort-Handling

> Dieser Abschnitt wurde ausdrücklich ergänzt: Er beschreibt den verifizierten Ist-Zustand des Hashings **und** den best-practice Soll-Zustand.

### 4.1 Ist-Zustand (verifiziert)

- **Hashing-Algorithmus:** **bcrypt** über die Bibliothek `bcryptjs` (`^3.0.3`) mit **Kostenfaktor 10** (`2^10 = 1024` Runden). Verifiziert an allen Erzeugungsstellen:
  - Registrierung: `src/app/actions/auth.ts` → `bcrypt.hash(password, 10)`
  - Nutzeranlage/Passwortänderung (Admin/Self): `src/app/actions/users.ts` → `bcrypt.hash(..., 10)`
  - Seed: `prisma/seed.ts` → `bcrypt.hash(PASSWORD, 10)`
  - Prüfung: `src/auth.ts` und `src/app/actions/users.ts` → `bcrypt.compare(...)`
- **Passwort-Policy:** Mindestlänge **8 Zeichen** bei Registrierung und Passwortänderung (`signupSchema`, `passwordSchema` via Zod: `.min(8, ...)`). Login-Schema verlangt nur einen nicht-leeren String. Es existieren **keine** Anforderungen an Komplexität, keine Sperrlisten und **kein** Abgleich mit geleakten Passwörtern.
- **Speicherung:** Nur `passwordHash` in der Tabelle `User` (`prisma/schema.prisma`); nie Klartext.
- **Passwort-Reset-Flow:** **Nicht vorhanden.** Es gibt eine self-service Passwortänderung mit Prüfung des aktuellen Passworts (`changeOwnPassword`), aber keinen „Passwort vergessen"-Flow mit E-Mail-Token.
- **MFA / Rate-Limiting / Lockout:** **Nicht vorhanden.**
- **Passwörter im Log:** Es werden keine Passwörter geloggt; die Auth-Fehlerbehandlung gibt nur generische Meldungen zurück.

### 4.2 Soll-Zustand / Optimum

**1. Hash-Algorithmus — Migration auf Argon2id.**
Empfohlener Standard (OWASP Password Storage Cheat Sheet, 2026): **Argon2id**. Referenz-Parameter:

| Parameter | Empfehlung (OWASP) |
|---|---|
| Speicher (`memory`) | ≥ 19 MiB (Minimum), Ziel 46–64 MiB |
| Iterationen (`time`) | 2–3 |
| Parallelität (`parallelism`) | 1 |
| Salt | ≥ 16 Byte, kryptografisch zufällig, pro Passwort |
| Pepper (optional) | server-seitiges Geheimnis (in KMS), zusätzlich zum Salt |

**Fallback / Migration:** Wo Argon2id nicht verfügbar ist (z. B. bestimmte Edge-Runtimes), **bcrypt mit Kostenfaktor ≥ 12** als Übergang. Migration transparent bei nächstem Login: Passwort verifizieren, dann mit dem neuen Algorithmus **rehashen** und speichern (Algorithmus-/Parameter-Präfix im Hash erlaubt schrittweise Migration ohne Zwangs-Reset).

**2. Passwort-Policy nach NIST SP 800-63B.**
- Mindestlänge **≥ 12 Zeichen** (bis ≥ 64 erlauben), Unicode/Leerzeichen zulassen.
- **Keine** erzwungene periodische Rotation, **keine** willkürlichen Komplexitätsregeln (kontraproduktiv).
- Stattdessen **Breached-Password-Check** gegen die HaveIBeenPwned-„Pwned Passwords"-API per **k-Anonymity** (nur die ersten 5 Zeichen des SHA-1-Hash werden gesendet; das Klartextpasswort verlässt nie den Server).

**3. Mehrfaktor-Authentifizierung (MFA).**
- **TOTP** (RFC 6238, Authenticator-App) als Basis-zweiter Faktor.
- **WebAuthn/Passkeys** (FIDO2) als phishing-resistente Zielarchitektur — bevorzugt für privilegierte Rollen.
- **Recovery-Codes** (einmalig, gehasht gespeichert). MFA-Pflicht mindestens für ADMIN/MEMBER.

**4. Brute-Force-/Credential-Stuffing-Schutz.**
- **Rate-Limiting** pro IP **und** pro Konto am Login (z. B. Upstash Redis / Vercel KV; Sliding-Window).
- **Exponentielles Backoff** und temporäre **Account-Lockouts** nach n Fehlversuchen; Entsperrung zeitbasiert oder per verifizierter E-Mail.
- **Bot-/CAPTCHA-Challenge** (z. B. Cloudflare Turnstile) bei Anomalien.
- Konstante Antwortzeit / generische Fehler (bereits Ist), um Timing-/Enumeration-Angriffe zu erschweren.

**5. Sicherer Passwort-Reset-Flow (neu einzuführen).**
- Reset-Token **kryptografisch zufällig** (≥ 32 Byte), **nur als Hash** gespeichert, **single-use**, **kurzlebig** (15–60 min Ablauf).
- Versand über verifizierten E-Mail-Kanal; **generische** Rückmeldung („Falls ein Konto existiert, wurde eine E-Mail versendet"), um Enumeration zu vermeiden.
- Nach erfolgreichem Reset: **alle aktiven Sessions invalidieren** und den Nutzer benachrichtigen.

**6. Betriebshygiene.** Passwörter/Secrets nie in Logs, Fehlermeldungen, Analytics oder URLs; Eingabefelder mit `autocomplete="current-password"`/`new-password`; Übertragung ausschließlich über TLS (Ist erfüllt).

---

## 5. Autorisierung — Rollen- & Rechtemodell (RBAC)

### 5.1 Ist-Zustand

Das Rollenmodell ist in `src/lib/roles.ts` definiert, die serverseitigen Guards in `src/lib/auth-guards.ts`. **Die fünf Rollen (`ALL_ROLES`):** `ADMIN`, `MEMBER`, `BUSINESS_PARTNER`, `INVESTOR`, `STARTUP`. `isTeamRole(role)` ist genau für `ADMIN` und `MEMBER` wahr (internes Lovedis-Team).

**View-Rollen-Sets** setzen das Produktprinzip „Admin muss alles sehen" um, ohne Schreibrechte zu verwässern:

| Set | Enthaltene Rollen | Zweck |
|---|---|---|
| `VENTURE_SCOUT_ROLES` | ADMIN, MEMBER | Internes Venture-Scout-Modul / Back-Office |
| `VENTURE_VIEW_ROLES` | STARTUP, ADMIN, MEMBER | Startup-Marktplatz/Venture-Plattform ansehen |
| `PARTNER_VIEW_ROLES` | BUSINESS_PARTNER, ADMIN, MEMBER | Partner-Feedback-/Screening-Masken ansehen |
| `MARKETPLACE_ROLES` | ADMIN, MEMBER, INVESTOR, BUSINESS_PARTNER | Kuratiertes Ökosystem (Discover + Feed) |

**Kernprinzip: „Das Team kann sehen, aber nur die jeweiligen Eigentümer schreiben."** Das interne Team erhält Partner- bzw. Startup-Oberflächen als vollständig sichtbare, **nur lesende** Vorschau; das Schreiben bleibt an den Eigentümer gebunden (z. B. reicht nur ein Partner seinen eigenen Verdict ein). Vorschau-Daten sind auf den eingeloggten Nutzer gescoped.

**Guard-Übersicht (`src/lib/auth-guards.ts`).**

| Guard | Erlaubte Rollen | Verwendung |
|---|---|---|
| `requireAuth()` | jede gültige Session | Basis; Rollen-Refresh aus DB |
| `requireRole([...])` | explizit angegebene | generischer Rollen-Gate |
| `requireTeam()` / `requireScoutModule()` | ADMIN, MEMBER | internes Back-Office |
| `requirePartner()` | BUSINESS_PARTNER | Partner-Schreibpfade |
| `requireStartup()` | STARTUP | Startup-Self-Service |
| `requirePartnerView()` | BUSINESS_PARTNER, ADMIN, MEMBER | Partner-Masken (Vorschau) |
| `requireVentureView()` | STARTUP, ADMIN, MEMBER | Marktplatz-Sicht |
| `requireMarketplace()` | ADMIN, MEMBER, INVESTOR, BUSINESS_PARTNER | Ökosystem Discover/Feed |
| `requireApprovedAccess()` | wie `requireAuth`, blockt unbestätigte Partner | App-Shell-Gate |

**Least Privilege & IDOR-Schutz (Ist).** Zugriffe sind serverseitig durchgesetzt (RSC/Server Actions). Der im Juli-2026-Review gefundene **IDOR** auf `/challenges/[id]` (ein Partner konnte fremde — auch DRAFT — Challenges lesen) wurde behoben: Eigentümer-Guard (`challenge.createdById !== session.user.id` ⇒ `notFound()`) plus Team-only Bewerbungs-Fetch (Details in Abschnitt 18).

### 5.2 Soll-Zustand / Optimum

1. **Zentrale Policy-Schicht / Access-Matrix.** Deklarative Rechte-Matrix (Ressource × Aktion × Rolle × Eigentümer-Bedingung) als Single Source of Truth, testbar und auditierbar — reduziert das Risiko, in Einzel-Actions eine Prüfung zu vergessen.
2. **Automatisierte Autorisierungs-/E2E-Tests** pro Rolle (Negativtests: „Partner A darf Challenge von Partner B nicht sehen", „Startup sieht keine DRAFTs", „unbestätigter Partner kann nicht schreiben").
3. **Objektbezogene Berechtigungen** durchgängig über Eigentümer-Scoping in `where`-Klauseln (bereits überwiegend Ist) — als verbindliches Muster dokumentieren.
4. **Trennung von Datenmodell und Sichtbarkeit** (z. B. dedizierte „public"-Projektionen für Storefronts), um Over-Fetching strukturell auszuschließen.

---

## 6. Datenhaltung & Datenbank-Hosting

> Direkte Antwort auf die Stakeholder-Frage „Hosten wir die Datenbank auf mehreren Seiten?": **Ist-Zustand: nein** — die Plattform nutzt eine einzelne Neon-PostgreSQL-Instanz über eine `DATABASE_URL`. **Soll-Zustand:** Multi-AZ/Region-Redundanz, Read-Replicas, Point-in-Time-Recovery und getestete Backups (siehe unten).

### 6.1 Ist-Zustand

- **Primärdatenbank:** PostgreSQL, in Produktion **Neon** (serverless), angebunden über `PrismaPg` bzw. in Cloudflare-Workers über `PrismaNeon` (`src/lib/prisma.ts`), Verbindung aus `DATABASE_URL`.
- **Region/Redundanz:** Eine primäre Instanz/Region (Single-Region nach aktuellem Setup). Neon repliziert Storage intern über mehrere Availability Zones und bietet plan­abhängig PITR; eine **explizite** Multi-Region-/Read-Replica-Strategie ist nicht konfiguriert.
- **Verschlüsselung at-rest:** Durch Neon standardmäßig bereitgestellt (Storage-Verschlüsselung).
- **Transport:** TLS zur Datenbank (Neon erzwingt TLS).
- **Datenintegrität:** Referentielle Integrität über Prisma-Relationen mit definierten `onDelete`-Regeln (Cascade/SetNull); race-kritische Pfade (z. B. Credits, Partner-Verdict) über **Serializable-Transaktionen** mit Retry (P2034).

### 6.2 Soll-Zustand / Optimum

| Thema | Empfehlung |
|---|---|
| **Hochverfügbarkeit** | Multi-AZ-Deployment mit automatischem Failover; RPO ≈ Sekunden, RTO ≈ Minuten |
| **Geo-Redundanz** | Mindestens ein Cross-Region-Standby (EU-Region) für Disaster Recovery; regelmäßiger Failover-Test |
| **Read-Replicas** | Lese-Repliken zur Lastverteilung und als warme Ausfallreserve |
| **Point-in-Time-Recovery** | PITR aktiv, Recovery-Fenster ≥ 7–30 Tage; Wiederherstellung auf beliebigen Zeitpunkt |
| **Backups (3-2-1)** | 3 Kopien, 2 Medien/Anbieter, 1 Off-Site; verschlüsselte, unveränderliche (WORM/Immutable) Backups |
| **Restore-Drills** | **Regelmäßige, dokumentierte Restore-Tests** (mind. quartalsweise) — ein Backup gilt erst nach erfolgreichem Restore als gültig |
| **Verschlüsselung at-rest** | Zusätzlich zu Provider-Verschlüsselung ggf. Feldverschlüsselung für besonders sensible Felder (Abschnitt 7) |
| **Datenresidenz** | EU-Region verbindlich festlegen (DSGVO, Abschnitt 12) |
| **Aufbewahrung/Löschung** | Retention-Fristen je Datenklasse; automatisiertes Löschkonzept (Abschnitt 12) |
| **Zugriffskontrolle DB** | Least-Privilege-DB-Rollen (getrennte App-/Migrations-/Read-Only-Rollen), IP-Allowlist/Private Networking |

---

## 7. Verschlüsselung

### 7.1 In-Transit

| Aspekt | Ist | Soll |
|---|---|---|
| HTTPS/TLS | Von Vercel erzwungen (A); von CDN erzwungen (B, Annahme) | **TLS 1.3** als Minimum, alte Cipher deaktiviert |
| HSTS | Nicht explizit gesetzt (Ist-Lücke) | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` |
| DB-Verbindung | TLS zu Neon | Beibehalten, Zertifikatsprüfung (`verify-full`) |

### 7.2 At-Rest

- **Ist:** Storage-Verschlüsselung durch Neon (DB) und Vercel (Build-/Edge-Artefakte).
- **Soll:** **Feldverschlüsselung** (application-layer) für besonders sensible Felder (z. B. private Nachrichten `Message.body`, Kontaktdaten) mittels authentifizierter Verschlüsselung (AES-256-GCM / libsodium `crypto_secretbox`). Deterministische Verschlüsselung nur dort, wo Suche/Uniqueness nötig ist, sonst randomisiert.

### 7.3 Key-Management (Soll)

- Schlüssel in einem **KMS/Secret-Manager** (z. B. cloud-nativer KMS, HashiCorp Vault) statt in Umgebungsvariablen.
- **Rotation** von Datenschlüsseln (Envelope-Encryption: Data-Key durch Key-Encryption-Key geschützt) und `AUTH_SECRET`; dokumentierte Rotationsintervalle und Notfall-Rotation bei Kompromittierung.
- Trennung von Schlüsseln nach Umgebung (Dev/Prod) und Zweck.

---

## 8. Secrets-Management

### 8.1 Ist-Zustand

| Secret | Zweck |
|---|---|
| `DATABASE_URL` | PostgreSQL-/Neon-Verbindungsstring |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | Signatur-/Verschlüsselungsschlüssel für NextAuth-JWTs |
| `CRON_SECRET` | Bearer-Token zur Absicherung des Cron-Endpunkts |

- **Bereitstellung:** Über die Vercel-Projektumgebung (`lovedis-mara-test`) bzw. lokal über `.env`-Dateien; ausschließlich serverseitig gelesen (`process.env.*`). Keiner dieser Werte trägt das `NEXT_PUBLIC_`-Präfix (verifiziert per Suche: keine Treffer im App-Code) und gelangt damit nicht ins Client-Bundle.
- **`.gitignore`-Abdeckung (verifiziert):** `.env`, `.env.local`, `.env*.local`, `.env*`, `.dev.vars`, `.vercel`, `*.pem` sowie generierter Prisma-Client und lokale Tooling-/DB-Verzeichnisse.
- **CI-Secrets:** In `.github/workflows/ci.yml` werden bewusst **Dummy-Literale** für eine Wegwerf-Postgres-Instanz genutzt (keine echten Projekt-Secrets).

### 8.2 Soll-Zustand / Optimum

1. **Zentraler Secret-Manager / Vault** mit Zugriffssteuerung und Audit-Log statt reiner Env-Variablen; kurzlebige, dynamisch ausgestellte DB-Credentials.
2. **Automatische Rotation** aller langlebigen Secrets (DB, `AUTH_SECRET`, `CRON_SECRET`) mit definierten Intervallen.
3. **`NEXT_PUBLIC_`-Hygiene als CI-Gate:** Lint-/CI-Check, der `NEXT_PUBLIC_.*(KEY|SECRET|TOKEN|PASSWORD)` verbietet.
4. **Secret-Scanning** (gitleaks/GitHub Secret Scanning) in CI und als Pre-Commit-Hook; historische Repo-Historie scannen.
5. **Getrennte Secrets pro System** (Plattform vs. Website) und pro Umgebung; kein Secret-Sharing.

---

## 9. Netzwerk, Perimeter & Security-Header

### 9.1 Ist-Zustand

- **Transport:** HTTPS/TLS von Vercel (A) erzwungen; Plattform-Verkehr vollständig verschlüsselt.
- **DDoS/Edge:** Vercel-Edge bietet grundlegenden Netzwerkschutz; die Website (B) profitiert bei Cloudflare-Hosting zusätzlich von deren DDoS-/CDN-Schicht [Annahme].
- **Security-Header/CSP:** In `next.config.ts` sind **keine** Sicherheits-Header konfiguriert (Ist-Lücke). Es existiert keine explizite CSP.
- **Rate-Limiting/WAF:** Nicht anwendungsseitig konfiguriert (Ist-Lücke am Login, siehe Abschnitt 4).

### 9.2 Soll-Zustand — empfohlene HTTP-Security-Header (beide Systeme)

| Header | Empfohlener Wert | Zweck |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS erzwingen, Downgrade verhindern |
| `Content-Security-Policy` | restriktiv, siehe unten | XSS/Injection-Eindämmung |
| `X-Content-Type-Options` | `nosniff` | MIME-Sniffing verhindern |
| `X-Frame-Options` | `DENY` (bzw. via CSP `frame-ancestors`) | Clickjacking verhindern |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer-Leak reduzieren |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` u. a. | Browser-Features minimieren |
| `Cross-Origin-Opener-Policy` | `same-origin` | Cross-Origin-Isolation |
| `Cross-Origin-Resource-Policy` | `same-origin` | Ressourcen-Schutz |
| `X-DNS-Prefetch-Control` | `off` | Informationsabfluss reduzieren |

**CSP-Grundgerüst (Plattform, anzupassen):**
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
```
Nonce-basierte Skripte statt `unsafe-inline`; `style-src 'unsafe-inline'` nur solange Inline-Styles nötig sind, mittelfristig via Nonce/Hash ablösen.

### 9.3 Perimeter — weitere Maßnahmen (Soll)

- **WAF** (Vercel/Cloudflare) mit OWASP-Regelsatz vor beiden Systemen.
- **Rate-Limiting** global (pro IP) und pro sensitivem Endpunkt (Login, Formulare).
- **Bot-Management** (Cloudflare Bot Fight / Turnstile) besonders für die Website-Formulare.
- **CORS:** Da die Plattform keine offene API exponiert, restriktiv belassen; keine `*`-Origins.
- **Subresource Integrity (SRI)** für alle eingebundenen Drittanbieter-Skripte (v. a. Website).

---

## 10. Eingabevalidierung & Injection-Schutz

### 10.1 Ist-Zustand (Plattform)

- **Serverseitige Validierung mit Zod** in sämtlichen Server Actions vor jedem DB-Zugriff (verifiziert über `src/app/actions/*`: u. a. `challenges.ts`, `screening.ts`, `pushes.ts`, `credits.ts`, `marketplace.ts`, `users.ts`, `auth.ts` …). Fehler werden über `firstZodError(...)` benutzerfreundlich zurückgegeben, ohne die Aktion auszuführen (`src/lib/action-state.ts`).
- **Enums/Grenzen** werden gegen zugelassene Werte validiert (Challenge-Status, Verdicts, Entscheidungen `ACCEPTED`/`REJECTED`), Längen-/Formatgrenzen sind gesetzt (z. B. Titel 4–200, Beschreibung 20–8000, Pitch 30–5000 Zeichen).
- **SQL-Injection:** Strukturell minimiert — Prisma erzeugt **parametrisierte** Queries; es werden keine rohen SQL-Strings aus Nutzereingaben zusammengesetzt.
- **XSS:** React escapt Ausgaben standardmäßig; es ist kein `dangerouslySetInnerHTML` mit ungeprüften Nutzerdaten im kritischen Pfad bekannt.
- **Datei-Uploads:** Die Plattform speichert Anhänge als **URLs/Links** (`Attachment.url`), es findet **kein** binärer Datei-Upload/-Storage in der App statt — die klassische Upload-Angriffsfläche entfällt derzeit.

### 10.2 Soll-Zustand / Optimum

- **XSS-Härtung** durch CSP (Abschnitt 9) als zweite Verteidigungslinie; jede künftige `dangerouslySetInnerHTML`-Nutzung nur mit Sanitizer (DOMPurify) und Review.
- **SSRF-Schutz:** Falls künftig serverseitige Fetches nutzergesteuerter URLs (z. B. Logo-Import) hinzukommen: **Allowlist** von Hosts/Schemata, Blockade privater IP-Bereiche/Metadaten-Endpunkte, Timeouts.
- **Datei-Uploads (falls eingeführt):** Typ-Whitelist (Content-Sniffing, nicht nur Endung), Größenlimit, **Antiviren-/Malware-Scan**, Speicherung in isoliertem Bucket **außerhalb** des Web-Roots, zufällige Dateinamen, Auslieferung über eine separate Sandbox-Domain, kein Ausführungskontext.
- **Mass-Assignment-Schutz:** Nur explizit erlaubte Felder aus `FormData` in Prisma-`data` übernehmen (überwiegend Ist durch Zod-Schemas — als Muster verbindlich machen).

---

## 11. Logging, Monitoring, Auditing & Alerting

### 11.1 Ist-Zustand

- Anwendungs-/Plattform-Logs über Vercel; **kein dediziertes Audit-Log** für sicherheitsrelevante Ereignisse; **keine** zentrale SIEM-/Anomalieerkennung. Passwörter/Secrets werden nicht geloggt (Ist positiv).

### 11.2 Soll-Zustand / Optimum

- **Audit-Trail** für sicherheitsrelevante Ereignisse: Logins/Fehlversuche, Rollenänderungen, Partner-Freigaben, Nutzeranlage/-deaktivierung, Credit-Korrekturen, Entscheidungen über Bewerbungen, Zugriff auf vertrauliche Datensätze. Append-only, mit Zeitstempel, Akteur, Ziel, Ergebnis; manipulationsarm (z. B. WORM-Sink/Hash-Chaining).
- **Zentrales Log-Management/SIEM** (z. B. Better Stack, Datadog, ELK) mit Korrelation und **Anomalie-Erkennung** (ungewöhnliche Login-Muster, Massenzugriffe, Rate-Limit-Treffer).
- **Alerting** auf definierte Trigger (Brute-Force, 5xx-Spitzen, Cron-Fehlschläge, neue Admin-Anlage) an einen On-Call-Kanal.
- **Keine PII/Secrets in Logs**; strukturierte Logs mit Redaction; **Log-Retention** definieren (z. B. 30–90 Tage operativ, Audit-Logs länger gem. Nachweispflicht) und DSGVO-konform löschen.
- **Uptime-/Synthetics-Monitoring** für beide Systeme (Plattform-Health `/api/health`, Website-Startseite).

---

## 12. Datenschutz (DSGVO/GDPR)

### 12.1 Rechtsgrundlagen & Grundsätze

- **Rechtsgrundlagen (Art. 6 DSGVO):** Vertrag/vorvertraglich (Nutzung der Plattform durch Team/Partner/Startups), berechtigtes Interesse (Betrieb/Sicherheit) sowie **Einwilligung** (Website-Tracking/Newsletter). Für jede Verarbeitung ist die Rechtsgrundlage zu dokumentieren (Verzeichnis von Verarbeitungstätigkeiten, VVT, Art. 30).
- **Grundsätze (Art. 5):** Datenminimierung (nur benötigte Felder), Zweckbindung, Speicherbegrenzung, Integrität/Vertraulichkeit.

### 12.2 Betroffenenrechte (Art. 15–21)

| Recht | Umsetzung (Soll) |
|---|---|
| Auskunft (Art. 15) | Self-Service-/Prozess zum Datenexport pro Nutzer |
| Berichtigung (Art. 16) | Profil-/Stammdaten editierbar (teilweise Ist) |
| Löschung (Art. 17) | „Recht auf Vergessenwerden": harter Löschprozess inkl. abgeleiteter Daten; Beachtung von `onDelete`-Kaskaden |
| Datenübertragbarkeit (Art. 20) | Maschinenlesbarer Export (JSON) |
| Widerspruch/Einschränkung (Art. 18/21) | Deaktivierung (`isActive=false`) als Sperre; Tracking-Opt-out (Website) |

### 12.3 Auftragsverarbeitung & Datenresidenz

- **Sub-Prozessoren / AVV (Art. 28):** Auftragsverarbeitungsverträge mit **Vercel** (Hosting A), **Neon** (Datenbank A), **Cloudflare/Vercel** (Website B), sowie mit E-Mail-/Formular-/Analytics-Dienstleistern. Liste aktuell halten.
- **EU-Datenresidenz / Drittlandtransfer:** Verarbeitung in **EU-Regionen** festlegen; bei US-Anbietern **EU-U.S. Data Privacy Framework** bzw. **Standardvertragsklauseln (SCC)** + Transfer-Impact-Assessment.
- **Aufbewahrung/Löschkonzept:** Retention-Fristen je Datenklasse dokumentieren und technisch durchsetzen (Cron-Löschjobs).

### 12.4 TOMs

Die technischen und organisatorischen Maßnahmen dieses Dokuments (Zugriffskontrolle/RBAC, Verschlüsselung, Logging, Backups, Incident Response) bilden die TOMs nach Art. 32 DSGVO. Website-spezifische Datenschutzthemen (Consent/Tracking, Formular-Datenflüsse) siehe **Abschnitt 16.5**.

---

## 13. Sichere Softwareentwicklung (SSDLC)

### 13.1 Ist-Zustand

- **CI-Pipeline (`.github/workflows/ci.yml`)** auf Branches `mara`/`main` und für Pull Requests: Schritte **Lint → Typecheck (`tsc --noEmit`) → Test (Vitest) → Build** gegen eine Wegwerf-Postgres-Instanz mit Dummy-Secrets. Node 22, `npm ci` (Lockfile-gepinnt).
- **Typsicherheit** (TypeScript strict), **ORM-Schema** als Vertrag, deterministische Builds.

### 13.2 Soll-Zustand / Optimum

| Kontrolle | Empfehlung |
|---|---|
| Dependency-Scanning | `npm audit` als CI-Gate + **Dependabot/Renovate** für automatische Update-PRs; NextAuth-Beta (`5.0.0-beta.31`) gezielt beobachten |
| SAST | Statische Analyse (CodeQL/Semgrep) im PR-Gate |
| DAST | Dynamische Scans (OWASP ZAP) gegen Staging, inkl. Website |
| Secret-Scanning | gitleaks/GitHub Secret Scanning in CI + Pre-Commit |
| Code-Review | Verpflichtender Review, Branch-Protection auf `main`/`mara`, keine Direkt-Pushes |
| Signierte Commits/Tags | GPG/Sigstore-Signaturen, verifizierte Committer |
| SBOM | Software Bill of Materials (CycloneDX) je Release |
| Supply-Chain | Pinning per Lockfile (Ist), Integritäts-Hashes, minimale Transitive-Deps |
| Security-Gates | Build schlägt bei High/Critical-Findings fehl; Ausnahmen dokumentiert |

---

## 14. Verfügbarkeit & Resilienz (BCM/DR)

| Ziel/Thema | Ist | Soll / Optimum |
|---|---|---|
| **SLA** | Kein formales SLA | Definierte Verfügbarkeitsziele (z. B. 99,9 %) je System |
| **RTO** (Recovery Time Objective) | Nicht definiert | A: ≤ 1 h; B: ≤ 4 h |
| **RPO** (Recovery Point Objective) | Abhängig von Neon-PITR | A: ≤ 5 min (PITR/Replikation); B: statisch, aus Git rebuildbar |
| **Redundanz/Failover** | Vercel-Edge (A), CDN (B) | Multi-AZ-DB + Standby-Region, automatischer Failover |
| **Backup-Strategie** | Provider-Backups (Neon) | 3-2-1, immutable, quartalsweise Restore-Drills (Abschnitt 6) |
| **DR-Plan** | Nicht dokumentiert | Dokumentierter Disaster-Recovery-Runbook inkl. Rollen, Reihenfolge, Kontakte; jährliche Übung |
| **Website-Wiederherstellung** | — | Rebuild aus Git + Redeploy (immutable, reproduzierbar) |

---

## 15. Incident Response

**Prozess (Soll, für beide Systeme):**

1. **Erkennung:** Über Monitoring/Alerting (Abschnitt 11), Nutzer-/Partner-Meldungen, Provider-Statusmeldungen.
2. **Klassifizierung/Triage:** Schweregrad (SEV1–SEV4) nach Auswirkung auf CIA und Betroffenenzahl; betroffenes System (A/B) benennen.
3. **Eindämmung:** Sofortmaßnahmen (Secret-Rotation, Session-Invalidierung, Konto-Sperre `isActive=false`, WAF-Regel, Rollback/Redeploy).
4. **Beseitigung & Wiederherstellung:** Ursache beheben, aus sauberem Zustand wiederherstellen (Backups/Rebuild), Integrität prüfen.
5. **Meldepflichten:** Bei Verletzung des Schutzes personenbezogener Daten **Meldung an die Aufsichtsbehörde binnen 72 Stunden** (Art. 33 DSGVO) und ggf. Benachrichtigung Betroffener (Art. 34). Meldewege/Verantwortliche vorab festlegen.
6. **Post-Mortem:** Blameless Post-Mortem mit Zeitleiste, Root-Cause, Maßnahmen; Nachverfolgung der Härtungsmaßnahmen.

**Vorbereitung (Soll):** Incident-Runbook, Kontaktliste (intern + Vercel/Neon/Cloudflare-Support), Kommunikationsvorlagen, regelmäßige Tabletop-Übungen.

---

## 16. Website `lovedis.de` — dediziertes Sicherheitskapitel

> **Verifikationsstatus:** Die Codebasis von `lovedis.de` liegt nicht im Plattform-Repository und war im Dateisystem nicht auffindbar. Framework (**Nuxt**) und Hosting (**Cloudflare Pages/Vercel**) sind **[Annahme]** und vor Freigabe zu bestätigen. Der Abschnitt beschreibt daher überwiegend den Soll-Zustand nach Best Practice; wo möglich, ist der vermutliche Ist-Zustand markiert.

### 16.1 Charakterisierung & Angriffsfläche

Die Website ist eine überwiegend **öffentliche, inhaltsgetriebene** Anwendung ohne Login und ohne vertrauliche Geschäftsdaten. Die Angriffsfläche ist dadurch grundlegend anders als bei der Plattform: nicht IDOR/RBAC stehen im Vordergrund, sondern **Perimeter-/Verfügbarkeitsschutz, öffentliche Formulare (Spam/Injection), Third-Party-Skripte, Consent/Tracking-Datenschutz und Domain-/E-Mail-Sicherheit**.

### 16.2 Hosting & Perimeter

| Aspekt | Ist [Annahme] | Soll / Optimum |
|---|---|---|
| Auslieferung | CDN-basiert (Cloudflare Pages/Vercel) | Global CDN, **statischer** Anteil maximieren (SSG) |
| TLS | Vom CDN bereitgestellt | **TLS 1.3**, automatische Zertifikate, HSTS + Preload |
| DDoS | CDN-DDoS-Schutz | WAF mit Managed Rules, Rate-Limiting, Bot-Schutz |
| Caching | CDN-Cache | Cache-Control sauber setzen; keine sensiblen Antworten cachen |
| Isolation | Getrennt von Plattform | Getrennte Projekte/Secrets/Domains beibehalten |

### 16.3 Öffentliche Formulare (Kontakt/Bewerbung/Newsletter)

Öffentliche Formulare sind die primäre dynamische Angriffsfläche. **Soll-Maßnahmen:**

- **Bot-/Spam-Schutz:** unsichtbares CAPTCHA (Cloudflare Turnstile/hCaptcha), Honeypot-Felder, Zeit-basierte Heuristik.
- **Rate-Limiting** pro IP am Formular-Endpunkt.
- **Serverseitige Validierung** aller Felder (Typ, Länge, Format) — nie nur clientseitig.
- **Injection/XSS:** Eingaben beim Rendern/Weiterverarbeiten escapen; bei E-Mail-Versand **Header-Injection** verhindern (Zeilenumbrüche in Betreff/Absender filtern); bei Persistenz parametrisierte Queries.
- **Datei-Uploads (falls Bewerbungsformular):** Typ-/Größenprüfung, **AV-Scan**, isolierter Storage, keine Ausführung, zufällige Namen (analog Abschnitt 10.2).
- **Transport & Ziel:** Formulardaten nur über TLS; Weiterleitung an einen dedizierten, vertraglich gebundenen Dienst (AVV) mit minimaler Datenerhebung.

### 16.4 CMS/Build & Supply-Chain

- **Statisch vs. serverseitig:** So viel wie möglich **statisch generieren (SSG)**; serverseitige Funktionen (Formular-Handler) auf das Nötigste beschränken und isolieren.
- **CMS/Admin-Zugänge (falls Headless-CMS):** MFA-Pflicht, Least-Privilege-Rollen, Admin-Oberfläche nicht öffentlich verlinkt/ggf. IP-beschränkt, Audit-Log.
- **Dependency-/Supply-Chain-Sicherheit:** Lockfile-Pinning, Dependabot/Renovate, `npm audit`, SBOM — wie bei der Plattform (Abschnitt 13). Build-Pipeline mit Secret-Scanning.

### 16.5 Security-Header, CSP & Third-Party-Skripte

- **Vollständige Security-Header** wie in Abschnitt 9.2, angepasst an eine öffentliche Website.
- **CSP** ist bei der Website anspruchsvoller, weil oft Analytics/Fonts/Embeds eingebunden sind. Jede Drittquelle **explizit** allowlisten statt Wildcards; wo möglich Self-Hosting (z. B. Fonts lokal statt Google Fonts) zur Reduktion von Third-Party-Requests und DSGVO-Risiken.
- **Third-Party-Risiken:** Jedes externe Skript kann bei Kompromittierung (Supply-Chain) die Seite übernehmen. Gegenmaßnahmen: **Subresource Integrity (SRI)**, minimale Anzahl Drittskripte, Laden erst nach Consent, regelmäßige Prüfung.

**CSP-Grundgerüst (Website, mit Third-Parties anzupassen):**
```
default-src 'self';
script-src 'self' <analytics-host>;
style-src 'self';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' <analytics-host>;
frame-ancestors 'none';
base-uri 'self';
form-action 'self' <form-endpoint>;
object-src 'none';
```

### 16.6 DSGVO für die öffentliche Website

- **Cookie-/Consent-Management (DSGVO + TTDSG/§ 25 TDDDG):** Nicht notwendige Cookies/Tracking erst **nach aktiver Einwilligung** (Opt-in) setzen. Consent-Banner mit gleichwertigen „Akzeptieren/Ablehnen"-Optionen, granularer Auswahl, Widerruf jederzeit, dokumentierter Consent-Log.
- **Analytics/Tracking-Rechtsgrundlage:** Reichweitenmessung nur mit Einwilligung, oder **datenschutzfreundliche, cookiefreie** Analytics (z. B. Plausible/Matomo mit IP-Anonymisierung, EU-Hosting) als datensparsame Alternative.
- **Datenschutzerklärung & Impressum:** Vollständig, aktuell, mit Auflistung aller Dienste/Sub-Prozessoren und Betroffenenrechte; leicht auffindbar.
- **Formular-Datenflüsse:** Zweck, Rechtsgrundlage, Empfänger, Speicherdauer je Formular dokumentieren; Datenminimierung; sichere Weiterleitung an AVV-gebundene Dienste.
- **Auftragsverarbeiter der Website:** AVV mit Hosting-, Formular-, E-Mail- und Analytics-Anbietern; EU-Datenresidenz bzw. SCC.

### 16.7 Domain- & E-Mail-Sicherheit (`lovedis.de`)

Relevant für Marke und Vertrauen — betrifft indirekt beide Systeme.

| Kontrolle | Zweck | Soll |
|---|---|---|
| **DNS-Härtung** | Schutz der DNS-Zone | Registrar-Lock, 2FA beim Registrar/DNS-Provider, minimale Zugriffe |
| **DNSSEC** | Schutz vor DNS-Spoofing/Cache-Poisoning | DNSSEC für `lovedis.de` aktivieren |
| **SPF** | Absender-IPs autorisieren | Strikter SPF-Record (`-all`), nur legitime Versender |
| **DKIM** | E-Mails kryptografisch signieren | DKIM-Keys je Versanddienst, Rotation |
| **DMARC** | SPF/DKIM-Policy + Reporting | Start `p=none` (Monitoring) → schrittweise `p=quarantine` → `p=reject`; `rua`-Reports auswerten |
| **MTA-STS / TLS-RPT** | TLS für Mail erzwingen | Optional ergänzen |
| **Subdomain-Takeover-Schutz** | Verwaiste CNAMEs verhindern | Regelmäßiges Inventar der DNS-Einträge; nicht mehr genutzte Records/CNAMEs auf externe Dienste entfernen |
| **Domain-Monitoring** | Missbrauch/Look-alikes erkennen | Zertifikats-Transparency- und Domain-Monitoring |

---

## 17. Härtungs- & Maßnahmen-Roadmap

Priorisierung: **Sofort** (≤ 2 Wochen), **kurzfristig** (≤ 1–2 Monate), **mittelfristig** (Quartal+). System-Kennzeichnung: **A** = Plattform, **B** = Website, **A+B** = beide.

| # | Maßnahme | System | Priorität | Aufwand | Nutzen |
|---|---|---|---|---|---|
| 1 | Security-Header + CSP (HSTS, X-Content-Type-Options, Referrer-/Permissions-Policy) | A+B | Sofort | Niedrig | Hoch |
| 2 | Rate-Limiting & Lockout am Login | A | Sofort | Mittel | Hoch |
| 3 | Bot-/Spam-Schutz (Turnstile) + serverseitige Validierung der Website-Formulare | B | Sofort | Niedrig–Mittel | Hoch |
| 4 | Session-Timeout explizit setzen (statt 30-Tage-Default) | A | Sofort | Niedrig | Mittel |
| 5 | Dependency-/Secret-Scanning in CI (npm audit, Dependabot, gitleaks) | A+B | Sofort | Niedrig | Hoch |
| 6 | DMARC/SPF/DKIM + DNSSEC für `lovedis.de` | B | Sofort–kurzfristig | Niedrig–Mittel | Hoch |
| 7 | Breached-Password-Check (HIBP k-anonymity) + Policy ≥ 12 Zeichen | A | Kurzfristig | Mittel | Hoch |
| 8 | Audit-Logging sicherheitsrelevanter Ereignisse | A | Kurzfristig | Mittel | Hoch |
| 9 | Konsent-/Cookie-Management + datenschutzfreundliche Analytics | B | Kurzfristig | Mittel | Hoch (Compliance) |
| 10 | Automatisierte Autorisierungs-/E2E-Tests (Rollen-Matrix, Negativtests) | A | Kurzfristig | Mittel | Hoch |
| 11 | Passwort-Migration auf Argon2id (transparent bei Login) + bcrypt≥12 Übergang | A | Kurzfristig–mittelfristig | Mittel | Hoch |
| 12 | MFA (TOTP, dann WebAuthn/Passkeys) für ADMIN/MEMBER | A | Mittelfristig | Hoch | Hoch |
| 13 | Sicherer Passwort-Reset-Flow (single-use, kurzlebige Token) | A | Mittelfristig | Mittel | Mittel–Hoch |
| 14 | DB-Redundanz: Multi-AZ/Region, Read-Replicas, PITR + Restore-Drills | A | Mittelfristig | Hoch | Hoch |
| 15 | Zentrales Secret-Management/Vault + Rotation | A+B | Mittelfristig | Hoch | Mittel–Hoch |
| 16 | Feldverschlüsselung sensibler Daten + KMS | A | Mittelfristig | Hoch | Mittel |
| 17 | SIEM/Monitoring + Alerting + Anomalie-Erkennung | A+B | Mittelfristig | Mittel–Hoch | Hoch |
| 18 | WAF (Managed Rules) vor beiden Systemen | A+B | Mittelfristig | Mittel | Mittel–Hoch |
| 19 | DR-Plan + Incident-Runbook + Tabletop-Übungen | A+B | Mittelfristig | Mittel | Hoch |
| 20 | SAST/DAST, SBOM, signierte Commits, Branch-Protection | A+B | Mittelfristig | Mittel | Mittel–Hoch |

---

## 18. Ergebnisse des Security-Reviews (Ist, Juli 2026)

Im Juli 2026 wurde der `mara`-Branch (System A) einem Security-Review unterzogen. Nachfolgend die Befunde, Behebungen und als solide bestätigten Bereiche. **Jede Behebung wurde gegen den aktuellen Code verifiziert.**

> **Commit-Status (verifiziert per `git status`/`git diff`).** Die beschriebenen Behebungen sind im Arbeitsverzeichnis **implementiert, aber noch nicht committet** (uncommitted working-tree changes) in `src/app/(main)/challenges/[id]/page.tsx`, `src/app/(main)/pocs/page.tsx`, `src/app/actions/challenges.ts` und `src/app/actions/pushes.ts`. Sie sind wirksam, sobald deployt wird, aber bis zu einem Commit nicht dauerhaft in der Historie gesichert. **Empfehlung:** committen, damit sie versioniert und reproduzierbar sind.

### 18.1 MEDIUM — Cross-Partner-Leserechte (IDOR) auf `/challenges/[id]` — behoben

**Befund.** Ein `BUSINESS_PARTNER` konnte über `/challenges/[id]` eine Challenge eines **anderen** Partners lesen — inklusive `DRAFT`. Zusätzlich wurden `applications` inkl. Startup-Details für jeden Betrachter mitgeladen (Over-Fetching).

**Behebung (`src/app/(main)/challenges/[id]/page.tsx`).** Eigentümer-Guard für Partner (sonst `notFound()`); Bewerbungs-Fetch nur für das interne Team:
```ts
if (role === "BUSINESS_PARTNER" && challenge.createdById !== session.user.id) {
  notFound();
}
const applications = isManager
  ? await prisma.challengeApplication.findMany({ where: { challengeId: challenge.id }, ... })
  : [];
```

### 18.2 Härtung — `assertPartner` verlangt `isActive` + `approvedAt` — behoben

**`src/app/actions/challenges.ts`.** Bei der Use-Case-Attribution prüft `assertPartner()` nun, dass der gewählte Partner **aktiv und freigegeben** ist:
```ts
const partner = await prisma.user.findFirst({
  where: { id: partnerId, role: "BUSINESS_PARTNER", isActive: true, approvedAt: { not: null } },
  select: { id: true },
});
```

### 18.3 Härtung — Check-in-Reminder-Aktionen gaten auf `isPartnerApproved` — behoben

**`src/app/actions/pushes.ts`.** `markReminderDone`/`cancelReminder` prüfen über `getActionableReminder()` für Nicht-Team-Nutzer zusätzlich Eigentümerschaft **und** Freigabe (Parität mit `submitPartnerVerdict`).

### 18.4 Härtung — `/pocs` erlaubt nun `MEMBER` — behoben

**`src/app/(main)/pocs/page.tsx`.** PoC-Tracking erlaubt nun `ADMIN, MEMBER, BUSINESS_PARTNER, INVESTOR`; Datensicht per `isTeamRole()` gescoped.

### 18.5 Als solide bestätigte Bereiche

- **Team-only Challenge-Mutationen** (`src/app/actions/challenges.ts`): `createChallenge`, `updateChallenge`, `updateChallengeStatus`, `deleteChallenge`, `decideApplication` über `requireTeam()`.
- **Partner-Verdict-Flow** (`src/app/actions/screening.ts`): `submitPartnerVerdict` über `requirePartner()` + `isPartnerApproved()`, Challenge-Bezug strikt auf eigene Challenge gescoped; Longlist-Pfad race-sicher (Serializable + Retry P2034).
- **Cron-Endpunkt** (`src/app/api/cron/reminders/route.ts`): nur `POST` mit `Authorization: Bearer <CRON_SECRET>`; fehlt `CRON_SECRET`, **fail-closed** in Produktion; `GET` nebenwirkungsfrei (405).

---

## 19. Anhang: Glossar, Referenzen & Versionierung

### 19.1 Glossar

| Begriff | Bedeutung |
|---|---|
| RSC | React Server Components — serverseitig gerenderte Komponenten |
| Server Action | Serverseitig ausgeführte Mutations-Funktion (Next.js) |
| RBAC | Role-Based Access Control |
| IDOR | Insecure Direct Object Reference (Zugriff auf fremde Objekte via ID) |
| JWT | JSON Web Token (hier: stateless Session) |
| PITR | Point-in-Time-Recovery |
| RTO/RPO | Recovery Time / Recovery Point Objective |
| Argon2id | Speicher-harter Passwort-Hash (OWASP-Empfehlung) |
| HIBP | HaveIBeenPwned (Breached-Password-Datenbank) |
| MFA/TOTP/WebAuthn | Mehrfaktor-Auth / zeitbasiertes Einmalpasswort / FIDO2-Passkeys |
| CSP/HSTS/SRI | Content-Security-Policy / Strict-Transport-Security / Subresource Integrity |
| SPF/DKIM/DMARC | E-Mail-Authentifizierungsverfahren |
| DNSSEC | Kryptografische Signierung von DNS-Antworten |
| AVV/DPA | Auftragsverarbeitungsvertrag / Data Processing Agreement |
| SCC | Standardvertragsklauseln (Drittlandtransfer) |
| TTDSG/TDDDG | Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz (Cookie-Consent, § 25) |
| SIEM | Security Information and Event Management |
| SBOM | Software Bill of Materials |
| SSDLC | Secure Software Development Lifecycle |

### 19.2 Referenzen

- **OWASP ASVS** (Application Security Verification Standard) — Zielniveau **Level 2** für die Plattform (Umgang mit vertraulichen Geschäftsdaten).
- **OWASP Top 10 (2021)** — Mapping in Abschnitt 2.5.
- **OWASP Cheat Sheets** — Password Storage, Authentication, Session Management, Secure Headers.
- **NIST SP 800-63B** — Digital Identity Guidelines (Passwort-Policy).
- **BSI IT-Grundschutz** — insbesondere Bausteine `APP.3.1` (Webanwendungen), `APP.3.2` (Webserver), `SYS.1.x`/`OPS` (Betrieb), `CON.3` (Datensicherung), `DER` (Detektion/Reaktion).
- **DSGVO/GDPR** — Art. 5, 6, 15–21, 28, 30, 32, 33/34; **TTDSG/TDDDG § 25**.

### 19.3 Versionierung

| Version | Datum | Änderung |
|---|---|---|
| 1.0 | 31.07.2026 | Erst-Erstellung: Plattform (Architektur, Auth, RBAC, Review-Ergebnisse) |
| 2.0 | 03.08.2026 | Vollständige Überarbeitung zum state-of-the-art Konzept: Ist/Soll-Trennung; ergänzt um Passwort-Handling (Argon2id, MFA, HIBP, Reset), DB-Redundanz/PITR/Backups, Verschlüsselung/KMS, Secrets-Vault, Perimeter/Security-Header/CSP, Logging/SIEM, DSGVO, SSDLC, Verfügbarkeit/DR, Incident Response; **neuer Geltungsbereich: zusätzlich Website `lovedis.de`** (Perimeter, Formulare, CMS/Supply-Chain, Header/CSP/Third-Party, Website-DSGVO/Consent, Domain-/E-Mail-Sicherheit) |

**Review-Kadenz (Empfehlung):** halbjährliche Wiederholung sowie anlassbezogen vor größeren Releases; nächste Prüfung geplant für **Januar 2027**.

---

*Erstellt auf Basis des Quellcodes im Branch `mara` (System A) und auf Best-Practice-Ebene für `lovedis.de` (System B). Aussagen zu System A wurden gegen die referenzierten Dateien verifiziert; Annahmen zu System B sind als solche gekennzeichnet und vor Freigabe zu bestätigen. Klassifizierung: Vertraulich.*
