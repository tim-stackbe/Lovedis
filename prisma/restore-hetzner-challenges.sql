-- Additive, idempotent insert of 4 industry Challenges.
-- Owner (createdById) = admin Tim Meggert (co4u0v4vuya2gzgkcr8qggc9w).
-- Stable ids => ON CONFLICT (id) DO UPDATE makes re-runs safe (no duplicates).
-- status = OPEN so they are visible to team + startups and open for applications.

BEGIN;

INSERT INTO "Challenge" (id, title, description, status, deadline, tags, "createdById", "createdAt", "updatedAt")
VALUES (
  'chl_ind_bedienunterstuetzung',
  $title$Bedienunterstützung und Onboarding$title$,
  $body$Wir suchen Lösungen, die das Bedienwissen an der Maschine dort abrufbar machen, wo es gebraucht wird: beim Anlernen neuer Mitarbeitender und bei der Inbetriebnahme durch Kund:innen.

Zentrale Challenge
Wissen rund um die Bedienung einer Maschine ist oft nicht dort, wo es gebraucht wird. Bei Legacy-Maschinen steckt es unstrukturiert im Kopf einzelner erfahrener Mitarbeitender und geht bei Personalwechsel verloren. Bei neuen Maschinen ist es zwar dokumentiert, aber verteilt über Handbücher, Spezifikationen und Ansprechpartner:innen und damit im Arbeitsalltag kaum schnell und praktikabel nutzbar. Besonders kritisch wird das beim Anlernen neuer Mitarbeitender und Kund:innen, die eine Maschine neu in Betrieb nehmen.

Zielbild
1. Bedienunterstützung: Eine interaktive Schulungssoftware führt direkt an der Maschine durch die Bedienung, um schnelles Onboarding und einen optimalen Wissenstransfer sicherzustellen. So sinkt die Anlernzeit spürbar, unabhängig davon, ob vor Ort bereits Erfahrung vorhanden ist.
2. Schulungsmodus: Ein eigener Schulungsmodus mit visueller Anleitung macht typische Handgriffe und Abläufe nachvollziehbar, für eigene Mitarbeitende ebenso wie für Bedienende. Der Wissensstand vor Ort wird angeglichen, die Einarbeitung wird planbar.

Herausforderung der Branche
- Erfahrungswissen in der Maschinenbedienung ist spezialisiert und komplex.
- Auch dokumentiertes Wissen wie Handbücher und Spezifikationen ist oft nicht intuitiv im Arbeitsalltag auffindbar.
- Fachkräftemangel und Fluktuation verschärfen den Wissensverlust beim Ausscheiden erfahrener Mitarbeitender.
- Lange Anlernzeiten führen zu vermeidbaren Fehlern und Qualitätsschwankungen, gleichzeitig steigt der Druck auf höhere Qualität bei Kund:innen.
- Das Anlernen hängt oft von der Verfügbarkeit einzelner erfahrener Mitarbeitender ab.
- Bestehende Checklisten oder Intranet-Dokumentationen bilden implizites Erfahrungswissen und die Anleitung direkt an der Maschine kaum ab.

Gesuchte Expertise
- Interaktive und intuitive Bedienunterstützung und Schulungssoftware direkt an der Maschine, zum Beispiel AR-Anleitungen und videobasierte Trainings.
- Multi-Language Conversational AI und Q&A-Systeme für den Wissensabruf direkt am Arbeitsplatz.
- Connected-Worker- und Skills-Plattformen für internes und kundenseitiges Onboarding.
- Erfassung und Aufbereitung von implizitem Erfahrungswissen zu strukturierten, an der Maschine abrufbaren Anleitungen.
- Integration in bestehende Shopfloor-, MES- und ERP-Systeme sowie in Kundenservice- und Schulungsplattformen.$body$,
  'OPEN'::"ChallengeStatus",
  NULL,
  ARRAY['Onboarding','Wissenstransfer','KI','Maschinenbau']::text[],
  'co4u0v4vuya2gzgkcr8qggc9w',
  now(),
  now()
),
(
  'chl_ind_wartungsunterstuetzung',
  $title$Wartungsunterstützung$title$,
  $body$Wir suchen Lösungen, die Wartung und Fehlerbehebung an der Maschine dort abrufbar machen, wo sie gebraucht werden: im Störungsfall, wenn keine Expert:in vor Ort ist.

Zentrale Challenge
Im Störungsfall ist schnelles Handeln gefragt, aber weder Erfahrungswissen noch die passende Dokumentation sind direkt greifbar. Ist keine Expert:in vor Ort, verlängern sich Stillstände, und die Lösung hängt an wenigen erfahrenen Mitarbeitenden. Das gilt in der eigenen Produktion ebenso wie beim Kunden, wo Servicetechniker:innen nicht überall gleichzeitig sein können.

Zielbild
1. Maintenance-Unterstützung: Ein mehrstufiges Eskalationsmodell macht Wartung und Fehlerbehebung auch ohne tiefes Expertenwissen vor Ort möglich. Die Maschine gibt zunächst selbst Anweisungen, bei komplexeren Fällen wird eine Fernwartung, zum Beispiel per AR-Brille, zugeschaltet. Die Abhängigkeit von einzelnen Expert:innen sinkt, Stillstandszeiten verkürzen sich.
2. Einsatz beim Kunden: Die Lösung ist für eigene Servicetechniker:innen und für den Einsatz bei Kund:innen gedacht, inklusive der Ausbildung von Kundentechniker:innen. So wird schnelle Fehlerbehebung unabhängig davon, wer gerade vor Ort ist.

Herausforderung der Branche
- Störungen treten unvorhersehbar auf und verlangen schnelles Handeln, doch das nötige Diagnose- und Reparaturwissen ist im Moment des Ausfalls selten direkt greifbar.
- Fehlersuche und Instandsetzung hängen häufig an wenigen erfahrenen Expert:innen, deren Verfügbarkeit begrenzt ist.
- Wartungswissen ist verteilt: bei Legacy-Maschinen unstrukturiert in den Köpfen, bei neuen Maschinen über Handbücher, Schaltpläne und Ersatzteillisten, und im Störungsfall kaum schnell nutzbar.
- Jeder ungeplante Stillstand kostet unmittelbar Produktion, beim Kunden bedeutet er Lieferverzug, Verderb oder Reputationsrisiko.
- Servicetechniker:innen können nicht überall gleichzeitig sein, Anfahrten verlängern die Ausfallzeit und treiben die Servicekosten.
- Fachkräftemangel und Fluktuation verschärfen den Verlust von Instandhaltungs- und Diagnosewissen beim Ausscheiden erfahrener Mitarbeitender.
- Bestehende Checklisten und Dokumentationen bilden die situative Fehlerdiagnose und den mehrstufigen Eskalationsweg von der Selbsthilfe über die Fernwartung bis zur Vor-Ort-Expertise kaum ab.

Gesuchte Expertise
- Wissensagenten und Knowledge-Operations-Plattformen, die verteiltes Wissen aus Systemen und aus den Köpfen der Mitarbeitenden kontextgerecht bereitstellen.
- Multi-Language Conversational AI und Q&A-Systeme für den Wissensabruf im Service und am Arbeitsplatz.
- Retrieval-Augmented-Generation auf freigegebenen Dokumenten und Wissensbasen, die Antworten ausschließlich aus geprüften Quellen erzeugt.
- Serviceassistenten für technische Kundenanfragen sowie Anwendungs- und Ersatzteilfragen.
- Kontextbezogene Bereitstellung des passenden Wissens je nach Situation, Rolle und Anwendungsfall.
- Plausibilitäts- und Konsistenzprüfung, die Verständnis- und Wissenslücken früh sichtbar macht.
- Integration in bestehende Service-, CRM-, ERP- und Ticketing-Systeme sowie in Kundenservice-Plattformen.
- Rechte- und Freigabemanagement für sensibles oder regulatorisch relevantes Wissen.$body$,
  'OPEN'::"ChallengeStatus",
  NULL,
  ARRAY['Wartung','Service','KI','Maschinenbau']::text[],
  'co4u0v4vuya2gzgkcr8qggc9w',
  now(),
  now()
),
(
  'chl_ind_erfahrungswissen',
  $title$Erfahrungswissen sichern und weitergeben$title$,
  $body$Wir suchen Lösungen, die verhindern, dass Erfahrungswissen mit einzelnen Mitarbeitenden das Unternehmen verlässt – und die es stattdessen sichtbar und abrufbar machen.

Zentrale Challenge
Implizites Erfahrungswissen einzelner Mitarbeitender steckt in den Köpfen von Expert:innen, die seit Jahren im Unternehmen sind. Sie kennen langjährige Kund:innen persönlich, wissen, welche Tricks im Alltag wirklich weiterhelfen, und kennen die Maschinen in und auswendig. Dieses Wissen ist häufig unzureichend dokumentiert, schwer zu erfassen und geht bei Fluktuation, Ausfall oder Ausscheiden unwiederbringlich verloren.

Zielbild
Die Lösung macht sichtbar, wer im Unternehmen welches Erfahrungswissen hat – ob Kundenwissen im Vertrieb, Troubleshooting-Wissen im Service oder Maschinenwissen auf dem Shopfloor – und hilft, dieses Wissen (laufend) zu erfassen, zu strukturieren und zu kumulieren sowie weiterzugeben. Sie zeigt zugleich auf, wo im Unternehmen Wissen konzentriert ist und wo Lücken bestehen. So können Mitarbeitende von den Erfahrensten lernen, unabhängig von deren Verfügbarkeit, und Wissen bleibt im Unternehmen, auch wenn Personen gehen.

Herausforderung der Branche
- Erfahrungswissen ist personengebunden, unstrukturiert und schwer zu erfassen – und sieht in Vertrieb, Service und Produktion jeweils anders aus.
- Bis 2030 suchen laut Schätzungen rund 186.000 deutsche Unternehmen eine Nachfolge, viele davon unvorbereitet.
- Fachkräftemangel und Fluktuation beschleunigen den Wissensverlust beim Ausscheiden erfahrener Mitarbeitender.
- Das Unternehmen verfügt nur über das Wissen, solange die Person in dem Unternehmen arbeitet. Wissenslücken werden meist erst sichtbar, wenn Wissensträger:innen bereits gegangen sind.

Gesuchte Expertise
- KI-gestützte oder strukturierte Interview- und Aufzeichnungsverfahren zur Erfassung von implizitem Wissen, inklusive automatischer Transkription und Verschlagwortung von Video- und Audioinhalten.
- Knowledge-Graph- und Skill-Mapping-Technologien zur strukturierten Verknüpfung von Personen, Kompetenzen und Themen im Unternehmen.
- Speech-to-Text und NLP zur automatischen Transkription und Zusammenfassung von Experten-Interviews oder Übergabegesprächen.
- Forschungs- oder wissenschaftsbasierte Methodik zur Abrufung von implizitem Wissen bei Mitarbeitenden.$body$,
  'OPEN'::"ChallengeStatus",
  NULL,
  ARRAY['Wissensmanagement','Nachfolge','KI','Fachkräfte']::text[],
  'co4u0v4vuya2gzgkcr8qggc9w',
  now(),
  now()
),
(
  'chl_ind_wissen_strukturieren',
  $title$Wissen strukturieren und abrufbar machen$title$,
  $body$Wir suchen Lösungen, die vorhandenes Wissen im Unternehmen aus Dokumenten, Daten und Projekten strukturieren und vernetzen - und dorthin bringen, wo es gebraucht wird.

Zentrale Challenge
Dokumentiertes Wissen existiert in ganz unterschiedlichen Formen – als Dateien, in Fachsystemen, Projektberichten oder Zahlentabellen – und ist über verschiedene Software-Systeme und Ordnerstrukturen verstreut, sodass es im Arbeitsalltag oft nicht gefunden oder effizient abgerufen und angewendet wird. Mitarbeitende verlieren Zeit durch langwierige Suchen. Gleichzeitig bleiben viele Prozesse manuell und ineffizient, obwohl sie sich mit vorhandenem Wissen automatisieren ließen.

Zielbild
Die Lösung führt vorhandenes Unternehmenswissen aus unterschiedlichsten Quellen und Formaten zusammen und macht es über eine zentrale, KI-gestützte Suche oder einen Assistenten abrufbar, kontextbezogen und zugeschnitten auf die jeweilige Abteilung. So findet Wissen, das bereits vorhanden und in Ordnerstrukturen versteckt ist, den Weg vom Datensilo in die tägliche Anwendung, verlässlich und nachvollziehbar, ohne dass Mitarbeitende es mühsam zusammensuchen müssen. Darüber hinaus wendet die Lösung dieses Wissen dort, wo es sinnvoll ist, auch automatisiert an – etwa indem sie Standardvorgänge direkt ausführt oder Arbeitsschritte anstößt – und macht Prozesse dadurch nicht nur informierter, sondern auch schneller und effizienter.

Herausforderung der Branche
- Dokumentiertes Wissen liegt verstreut über viele Systeme und Formate und ist im Arbeitsalltag oft nicht schnell oder intuitiv auffindbar.
- Auch wenn Wissen digital vorliegt, bleibt die Anwendung oft manuell – Prozesse sind dadurch langsam und fehleranfällig.
- KI-gestützte Antworten müssen vertrauenswürdig sein: Gerade bei sicherheits- oder qualitätsrelevantem Wissen sind Fehler oder Halluzinationen nicht tolerierbar.
- Zugriffsrechte, Datenschutz und Datenaktualität werden zur zentralen Anforderung, sobald Wissen zentral gebündelt wird.
- Legacy-IT und heterogene Systemlandschaften im Mittelstand erschweren die Integration neuer Lösungen.

Gesuchte Expertise
- Systeme zur Zusammenführung verteilter, auch unstrukturierter Wissensquellen (Dokumente, Daten, Zeichnungen, Video, Audio) über Abteilungsgrenzen hinweg.
- KI-gestützte Such- und Dialogsysteme für kontextbezogenen Wissensabruf, mit nachvollziehbaren, geprüften Antworten.
- Multimodale KI-Modelle, die nicht nur Text, sondern auch Zeichnungen, Bilder oder Sensordaten inhaltlich auswerten können.
- Lösungen, die vorhandenes Wissen nicht nur bereitstellen, sondern direkt in Prozesse einbinden und Routineschritte automatisieren (z. B. Workflow-Automatisierung, Decision-Intelligence-Tools).
- Lösungen für Datenqualität, Aktualität und rollenbasierte Zugriffssteuerung auf zentralisiertes Wissen, inklusive On-Premise- bzw. EU-gehosteter LLM-Bereitstellung.
- Integrationsfähigkeit in bestehende, auch heterogene Unternehmenssysteme (CRM, Ticketing, MES/Shopfloor-Systeme, ERP, Intranet).$body$,
  'OPEN'::"ChallengeStatus",
  NULL,
  ARRAY['Wissensmanagement','KI','Automatisierung','Suche']::text[],
  'co4u0v4vuya2gzgkcr8qggc9w',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  deadline = EXCLUDED.deadline,
  tags = EXCLUDED.tags,
  "createdById" = EXCLUDED."createdById",
  "updatedAt" = now();

COMMIT;

SELECT id, title, status, "createdById", array_length(tags,1) AS n_tags, length(description) AS desc_len
FROM "Challenge"
WHERE id LIKE 'chl_ind_%'
ORDER BY id;
