"use client";

import { ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { acknowledgeDataSharingNotice } from "@/app/actions/notice";
import { Button } from "@/components/ui/Button";

/**
 * One-time DSGVO data-sharing info modal. Rendered by the authenticated layout
 * only when the current user has not yet acknowledged it
 * (`User.dataSharingNoticeAckAt == null`). Confirming stamps the timestamp via
 * a server action so it never shows again. Non-dismissible except via the
 * "Verstanden" button, so acknowledgment is explicit.
 */
export function DataSharingNotice() {
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (dismissed) return null;

  const acknowledge = () => {
    // Hide immediately for a snappy feel; persist in the background.
    setDismissed(true);
    startTransition(async () => {
      await acknowledgeDataSharingNotice();
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-lv-text/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-sharing-title"
    >
      <div className="my-8 w-full max-w-lg rounded-card border border-lv-border bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lv-blue-soft text-lv-blue">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <p className="lv-wordmark text-[10px] text-lv-secondary">
              Datenschutz
            </p>
            <h2
              id="data-sharing-title"
              className="text-xl font-bold tracking-tight text-lv-text"
            >
              Hinweis zur Datenverarbeitung
            </h2>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-sm leading-relaxed text-lv-text/90">
          <p>Willkommen bei LOVEDIS 👋</p>
          <p>
            Damit das Matching zwischen Startups und Unternehmenspartnern
            funktioniert, werden bestimmte von dir bzw. deiner Organisation
            eingegebene Daten innerhalb der Plattform für andere Nutzer:innen
            sichtbar und mit ihnen geteilt.
          </p>
          <p className="font-semibold text-lv-text">Konkret bedeutet das:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold">
                Profil- und Organisationsangaben
              </span>{" "}
              (z. B. Name, Unternehmen/Startup, Kurzbeschreibung, öffentliches
              Profil) können von anderen teilnehmenden Startups,
              Unternehmenspartnern und dem LOVEDIS-Team eingesehen werden.
            </li>
            <li>
              <span className="font-semibold">
                Beiträge, Bewertungen, Nachrichten und Updates
              </span>
              , die du in der Plattform erstellst, werden den jeweils
              vorgesehenen Empfänger:innen (z. B. gematchten Partnern/Startups)
              angezeigt.
            </li>
            <li>
              Die Verarbeitung erfolgt zur Durchführung des
              Accelerator-Programms und Matchmakings (Art. 6 Abs. 1 lit. b
              DSGVO) sowie auf Basis unseres berechtigten Interesses an einem
              funktionierenden Ökosystem (Art. 6 Abs. 1 lit. f DSGVO).
            </li>
          </ul>
          <p>
            Bitte teile keine vertraulichen Informationen, die nicht für andere
            Teilnehmer:innen bestimmt sind.
          </p>
          <p>
            Deine Rechte (Auskunft, Berichtigung, Löschung, Widerspruch) und
            alle Details findest du in unserer{" "}
            <a
              href="https://lovedis.de/datenschutz"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-lv-blue hover:underline"
            >
              Datenschutzerklärung
            </a>
            . Fragen?{" "}
            <a
              href="mailto:datenschutz@lovedis.de"
              className="font-semibold text-lv-blue hover:underline"
            >
              datenschutz@lovedis.de
            </a>
          </p>
          <p className="text-lv-secondary">
            Mit &bdquo;Verstanden&ldquo; bestätigst du, dass du diesen Hinweis
            gelesen hast.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={acknowledge} disabled={pending}>
            Verstanden
          </Button>
        </div>
      </div>
    </div>
  );
}
