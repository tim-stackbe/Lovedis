# Mara — Implementation Notes

Implementation log for the Partner/Startup-SSOT plan
(`docs/plan-partner-startup-ssot.md`), built on branch `mara`.

This file documents the **default decisions** taken for the plan's open
questions and **what still needs real wiring** (external infrastructure). The
plan document itself was left untouched.

## Delivery order

Implemented in the plan's recommended order: Phase 1 (Screening-Kern) → 2
(Use-Case-Bewertung) → 3 (Zusammenarbeit/Fortschritt) → 5 (Partner-SSOT) → 4
(Push + E-Mail/Cron) → 6 (Venture-Credits). One commit per phase on `mara`.

## Decisions on open questions

The plan lists open decisions (§ "Offene Entscheidungen" and inline). For each,
the simplest option that keeps the build green was chosen:

| # | Open question | Decision | Rationale |
| --- | --- | --- | --- |
| 1 | **Polina-Modell-Variante** (eigenes Modell vs. Felder am Startup) | **Variante A** — `screenSummary`, `screenRecommendation`, `screenedAt`, `screenedById`, `sourceType`, `sourceDetail` direkt am `Startup`. | Lightweight screening is 1:1 with a startup; no separate history needed yet. Avoids an extra join/table. |
| 2 | **PoC vs. neues Engagement-Modell** | **Neues `Engagement`-Modell** als Oberbegriff für Acc-unabhängige Zusammenarbeit; bestehende `PoCPerformance`/`/pocs` bleiben unangetastet. | Decouples the new collaboration tracking from the accelerator-bound PoC flow while reusing the proven KPI/Milestone JSON shape. |
| 3 | **E-Mail-Provider & Cron-Mechanik** | **Abstraktion + No-op-Konsolen-Adapter** (`src/lib/email.ts`); Verarbeitung über `processDueReminders()`; manueller Team-Trigger + `GET/POST /api/cron/reminders`-Endpoint. Kein echter Provider, kein Scheduler verdrahtet. | No email infra exists in the repo and no secrets may be added. See "Needs real wiring" below. |
| 4 | **Venture-Credit-Regeln** (Vergabe/Verbrauch/Wert) | **Manuelles, team-gebuchtes Ledger.** `GRANT` addiert, `SPEND` subtrahiert (positive Eingabe), `ADJUSTMENT` nimmt das Vorzeichen wie eingegeben. `CreditAccount.balance` ist ein gecachter Laufsaldo, transaktional aktualisiert. Konto wird bei erster Buchung automatisch angelegt. | Keeps the ledger correct and auditable without committing to automatic earn/spend rules, which are a business decision. |
| 5 | **„Batch"-Begriff** (eigenes Modell vs. `ScoutingCampaign`) | **`ScoutingCampaign` wiederverwendet** als Batch/Longlist; die Longlist gruppiert Startups nach Kampagne. | No separate `Batch` model needed; campaigns already structure the funnel. |
| 6 | **Attio-Sync-Tiefe** | **Nur Dokumentation, kein Sync.** Plattform bleibt SSOT für Workflow/Verdikte; Attio-Anbindung später. | No Attio credentials/integration in repo; out of scope for these phases. |
| 7 | **Partner-Sichtbarkeitsgrenzen** | **Kuratierte Low-Overload-Partneransichten** (`/screening`, `/use-cases`, `/check-ins`, `/partner-hub`) getrennt von internen Team-Ansichten (`/longlist`, `/pushes`, `/credits`, `/hub-admin`, `/engagements`). Gating via `requirePartner`/`requireTeam`/`requireStartup`. SSOT-Inhalte zusätzlich per `ContentAudience` gefiltert. | Mirrors the plan's audience rules; partners never see internal raw funnel data. |
| 8 | **Notion-Migrations-Umfang** | **Platzhalter-Inhalte im Seed** (`RoadmapItem`/`ContentPage`/`MediaAsset`); echte Migration aus Notion manuell/später über `/hub-admin`. | Content can be authored in-app; bulk migration is a separate, manual task. |
| 9 | **Screening-Lead-Rolle** | **Bestehende `BUSINESS_PARTNER`-Rolle beibehalten**; keine neue Rolle eingeführt. Team-Screening über `ADMIN`/`MEMBER`. | Avoids auth/role churn; existing roles cover the workflow. |

## Needs real wiring (external infrastructure)

Implemented end-to-end in-app (data model + logic + UI) but stubbed at the
infrastructure boundary:

- **E-Mail-Versand** — `src/lib/email.ts` exposes an `EmailAdapter` interface.
  The active adapter is `consoleEmailAdapter` (logs instead of sending). To go
  live: implement a provider adapter (Resend/Postmark/SES/SMTP), select it in
  `getEmailAdapter()`, and add the provider key as an environment secret
  (do **not** commit it).
- **Cron / Scheduler** — reminder processing lives in
  `processDueReminders()` and is exposed at `GET/POST /api/cron/reminders`. The
  *work* runs; the *trigger* is not wired. To go live: point a scheduler
  (Cloudflare Cron Trigger / Vercel Cron) at that endpoint on an interval.
  Optional `CRON_SECRET` env var enables `Authorization: Bearer <secret>`
  auth on the endpoint (open when unset, for local/dev). A manual
  "Fällige verarbeiten" button on `/pushes` triggers the same logic.

## Notable model additions

- Enums: `PartnerVerdict`, `SourceType`, `ReminderStatus`, `EngagementStatus`,
  `RoadmapStatus`, `ContentAudience`, `CreditTxType`.
- Models: `PartnerStartupReview`, `StartupPush`, `CheckInReminder`,
  `Engagement`, `RoadmapItem`, `ContentPage`, `MediaAsset`, `CreditAccount`,
  `CreditTransaction`; plus screening fields on `Startup` and back-relations on
  `User`/`Startup`/`Challenge`.

## Follow-ups / deferred

- Real email provider + cron trigger (see above).
- Attio sync (read and/or write-back).
- Bulk Notion → SSOT content migration.
- Automatic credit earn/spend rules (currently manual team bookings only).
