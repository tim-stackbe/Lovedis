--
-- PostgreSQL database dump
--

\restrict chbSncDviub7j9IkZCKPaGpW7gTilzX41QM6RiFFTRv3zKfzLJjoA2X4L5HVeW7

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg13+2)
-- Dumped by pg_dump version 18.6 (Debian 18.6-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: SupportOffering; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SupportOffering" (
    id text NOT NULL,
    title text NOT NULL,
    category public."SupportCategory" DEFAULT 'OTHER'::public."SupportCategory" NOT NULL,
    summary text NOT NULL,
    description text NOT NULL,
    format text,
    "creditCost" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "contactPerson" text,
    "providerCompany" text,
    "sessionDate" text,
    website text
);


--
-- Data for Name: SupportOffering; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SupportOffering" (id, title, category, summary, description, format, "creditCost", "isActive", "sortOrder", "createdAt", "updatedAt", "contactPerson", "providerCompany", "sessionDate", website) FROM stdin;
cmu140szj00097gp57vr6npww	Funding Strategy & Insights zu Venture Debt	FUNDRAISING	Finanzierungsstrategie inkl. Venture Debt als Baustein.	Wann Eigenkapital, wann Venture Debt? Strategie-Session zu Finanzierungsmix, Timing und Konditionen.	Online Workshop (60–90 Min.)	1	f	3	2026-09-14 10:38:22.399	2026-09-14 10:58:27.872	Lilli Pukall	re:cap Technologies	\N	https://www.re-cap.com
cmtwsp8kq000s0xsvlv14u5r6	Integrating AI in the Enterprise	PRODUCT_TECH	KI sinnvoll ins Enterprise-Umfeld integrieren.	Use-Cases, Architektur und Change: wie KI im Unternehmenskontext echten Mehrwert stiftet.	Online Workshop	1	t	20	2026-09-11 10:10:22.25	2026-09-14 10:38:22.443	Tim Meggert	LOVEDIS	\N	https://lovedis.de
cmtwsp8kt000t0xsvr561qixy	IP-AI	PRODUCT_TECH	KI und geistiges Eigentum — Chancen und Grenzen.	Was KI-Nutzung für dein IP bedeutet: Trainingsdaten, Outputs und Schutzstrategien.	Online Workshop	1	t	21	2026-09-11 10:10:22.253	2026-09-14 10:38:22.444	Tim Meggert	LOVEDIS	\N	https://lovedis.de
cmtwsp8kw000u0xsvo54m916w	Building an AI PoC	PRODUCT_TECH	Von der Idee zum belastbaren KI-Proof-of-Concept.	Wie du einen KI-PoC scopest, baust und bewertest — pragmatisch und ergebnisorientiert.	Online Workshop	1	t	22	2026-09-11 10:10:22.256	2026-09-14 10:38:22.446	Tim Meggert	LOVEDIS	\N	https://lovedis.de
29150788-f69f-446b-8e7f-637c88bc983f	Community / Ökosystem Sales	SALES	Online Workshop zu Community- und Ökosystem-Vertrieb.	Session im Rahmen von Sales, Pricing & Growth: Community / Ökosystem Sales mit unusual business (Sina Wans). Format: Online Workshop.	Online Workshop	0	t	31	2026-09-14 13:54:09.031	2026-09-14 13:54:09.031	Sina Wans	unusual business	\N	\N
0dd3e824-5163-43f8-9869-19b557968175	Aufbau strukturierter Pipelines	SALES	Online Workshop zum Aufbau strukturierter Sales-Pipelines.	Session im Rahmen von Sales, Pricing & Growth: Aufbau strukturierter Pipelines mit GAL Digital (Tobias Auradniczek). Format: Online Workshop.	Online Workshop	0	t	32	2026-09-14 13:54:09.031	2026-09-14 13:54:09.031	Tobias Auradniczek	GAL Digital	\N	\N
166982c5-6762-44af-adad-5f0d11f1439a	Nightmare Competitor	SALES	Live Workshop zu Wettbewerbspositionierung.	Session im Rahmen von Sales, Pricing & Growth: Nightmare Competitor mit Uni Marburg / StartMiUp (Michael Stephan). Format: Live Workshop.	Live Workshop	0	t	33	2026-09-14 13:54:09.031	2026-09-14 13:54:09.031	Michael Stephan	Uni Marburg / StartMiUp	\N	\N
60f2a165-8e33-4ddc-9ad3-8d4326866fc7	Sales	SALES	Individuelles Sales-Sparring rund um Vertrieb, Pricing und skalierbares Wachstum.	Sparring rund um Sales, Pricing & Growth: geschärfte Value Proposition & ICP, strukturierte Pipeline und ein validiertes Pricing-Modell. Beschreibe deinen Bedarf — wir vermitteln die passende Expertise aus dem LOVEDIS-Netzwerk.	Sparring	1	t	34	2026-09-14 13:54:09.031	2026-09-14 13:54:09.031	\N	LOVEDIS	\N	\N
9d019183-1541-43be-aa9d-732a408b60d3	Geschäftsführerhaftung	LEGAL	Haftungsrisiken der Geschäftsführung verstehen und absichern.	Was Geschäftsführer:innen persönlich haftet — und wie du dich und dein Team absicherst.	Online Workshop (~2h)	1	t	5	2026-09-11 10:16:49.357	2026-09-14 10:38:22.404	Philipp Weber	Momentum	\N	https://www.momentum-partner.de/
1b57f45a-1612-4953-8cb6-cac6b367ecea	Lunch Learning Session — Wandeldarlehen, SAFE & Venture Debt, VSOP/ESOP	LEGAL	Kompakte Session zu Finanzierungsinstrumenten und Beteiligung.	Wandeldarlehen, SAFE, Venture Debt sowie VSOP/ESOP verständlich erklärt — inkl. wann welches Instrument passt.	Lunch Learning Session	1	t	11	2026-09-11 10:16:49.357	2026-09-14 10:38:22.418	Philipp Weber	Momentum	\N	https://www.momentum-partner.de/
b476ff1d-fc41-480e-a7e3-42ced0db2f32	Lunch Learning Session — Finanzierungsrunden aus Gründersicht & Term Sheets	LEGAL	Finanzierungsrunden und Term Sheets aus Gründerperspektive.	Term Sheets lesen und verhandeln — die wichtigsten Klauseln aus Gründersicht.	Lunch Learning Session	1	t	12	2026-09-11 10:16:49.357	2026-09-14 10:38:22.42	Philipp Weber	Momentum	\N	https://www.momentum-partner.de/
5999b604-970f-477e-861f-0117944f2b26	Individual Expert Session	LEGAL	Kein passendes Angebot dabei? Beschreibe deinen Bedarf — wir vermitteln passende Expert:innen.	Dein Thema wird aktuell durch keines der verfügbaren Angebote vollständig abgedeckt? Beschreibe deine Herausforderung und wir vermitteln dir passende Expert:innen aus unserem Netzwerk.	Sparring	1	t	13	2026-09-11 10:16:49.357	2026-09-14 10:38:22.423	\N	\N	\N	\N
4cae4caa-40b8-4739-996a-e43c9e0c6816	Marketing 101	MARKETING	Marketing-Grundlagen für Frühphasen-Startups.	Die Basics: Positionierung, Kanäle, Funnel und die ersten Wachstumsschritte.	Online Workshop	1	t	14	2026-09-11 10:15:35.832	2026-09-14 10:38:22.425	Hannah Freese	LOVEDIS	\N	https://lovedis.de
afda98e4-603c-4a67-80c7-05c564b59ade	Brand & Pitch Story	MARKETING	Marke und Pitch-Story, die hängen bleiben.	Entwickle eine klare Markenerzählung und eine Pitch-Story, die Investor:innen und Kund:innen überzeugt.	Online Workshop	1	t	15	2026-09-11 10:15:35.832	2026-09-14 10:38:22.427	Hannah Freese	LOVEDIS	\N	https://lovedis.de
c7da37aa-3fe1-408d-baca-a4ee1e700f3a	Website-Strategie Starterkit	MARKETING	1:1-Workshop für eine konversionsstarke Website.	Individueller 1:1-Workshop: Struktur, Messaging und Conversion-Elemente für deine Website.	1:1 Online Workshop	2	t	16	2026-09-11 10:15:35.832	2026-09-14 10:38:22.429	Tobias Auradniczek	GAL Digital	\N	https://www.gal-digital.de
b716fdd6-f6db-47b4-abe9-b538f653762a	LinkedIn Visibility Sprint	MARKETING	Sichtbarkeit auf LinkedIn systematisch aufbauen.	Content-Formate, Kadenz und Founder-Branding — mehr Reichweite und Inbound über LinkedIn.	Online Workshop	1	t	17	2026-09-11 10:15:35.832	2026-09-14 10:38:22.437	Hannah Freese	LOVEDIS	\N	https://lovedis.de
de1275e1-80cf-42e5-8d3a-185d5bb6b6ea	Pitching with Impact	MARKETING	Überzeugend pitchen — Struktur, Storytelling, Auftritt.	So baust du einen Pitch mit Wirkung: roter Faden, Storytelling und souveräner Auftritt.	Online Workshop	1	t	18	2026-09-11 10:15:35.832	2026-09-14 10:38:22.439	Hannah Freese	LOVEDIS	\N	https://lovedis.de
be2d24b5-e642-474b-b35d-939b8b1fc111	Individual Expert Session	MARKETING	Kein passendes Angebot dabei? Beschreibe deinen Bedarf — wir vermitteln passende Expert:innen.	Dein Thema wird aktuell durch keines der verfügbaren Angebote vollständig abgedeckt? Beschreibe deine Herausforderung und wir vermitteln dir passende Expert:innen aus unserem Netzwerk.	Sparring	1	t	19	2026-09-11 10:15:35.832	2026-09-14 10:38:22.441	\N	\N	\N	\N
cmtwsp8kz000v0xsvy844w0ze	AI Agents & Technical Scaling	PRODUCT_TECH	Agenten-Architekturen und technische Skalierung.	Sparring zu Agenten-Systemen, Orchestrierung und dem Skalieren deiner technischen Plattform.	Sparring	1	t	23	2026-09-11 10:10:22.259	2026-09-14 10:38:22.447	Tim Meggert	LOVEDIS	\N	https://lovedis.de
cmtwsp8l3000w0xsvf1hn4tuv	AI PoC Review & Lessons Learned	PRODUCT_TECH	Review eines bestehenden KI-PoC inkl. Learnings.	Wir schauen gemeinsam auf deinen PoC: was funktioniert, was fehlt und wie es produktreif wird.	Online Workshop	1	t	24	2026-09-11 10:10:22.263	2026-09-14 10:38:22.449	Tim Meggert	LOVEDIS	\N	https://lovedis.de
cmtwsp8l5000x0xsvvy4ylxz7	Tech Due Diligence Readiness	PRODUCT_TECH	Auf technische Due Diligence vorbereitet sein.	Codequalität, Architektur, Security und Doku — so bestehst du die technische DD im Fundraising.	Sparring	1	t	25	2026-09-11 10:10:22.265	2026-09-14 10:38:22.45	Tim Meggert	LOVEDIS	\N	https://lovedis.de
cmtwsp8l8000y0xsvbzza6hvy	Tech-Stack Check-up	PRODUCT_TECH	1:1-Review deines Tech-Stacks und deiner Architektur.	Individueller 1:1-Check-up: Tech-Stack, Architekturentscheidungen und technische Schuld.	1:1 Online Workshop	2	t	26	2026-09-11 10:10:22.268	2026-09-14 10:38:22.452	Tobias Auradniczek	GAL Digital	\N	https://www.gal-digital.de
cmtwsp8lb000z0xsvvbb8c4nu	MVP Validation & Product Validation	PRODUCT_TECH	MVP und Produkthypothesen validieren.	Wie du dein MVP und deine Produktannahmen schnell und günstig am Markt validierst.	Sparring	1	t	27	2026-09-11 10:10:22.271	2026-09-14 10:38:22.453	Tim Meggert	LOVEDIS	\N	https://lovedis.de
cmtwsp8lf00100xsvqp1yu2ve	Cyber Security	PRODUCT_TECH	Security-Grundlagen und Härtung für Startups.	Praktische Security-Maßnahmen für dein Produkt und deine Infrastruktur — je nach Bedarf.	Sparring	1	t	28	2026-09-11 10:10:22.275	2026-09-14 10:38:22.455	\N	je nach Bedarf	\N	\N
cmtwsp8li00110xsvurydwlj9	Live Hacking	PRODUCT_TECH	Live-Hacking-Session — Angriffe verstehen, Lücken schließen.	Interaktive Session: reale Angriffsszenarien live demonstriert und daraus abgeleitete Schutzmaßnahmen.	Online Workshop	2	t	29	2026-09-11 10:10:22.278	2026-09-14 10:38:22.456	Tim Meggert	LOVEDIS	\N	https://lovedis.de
cmtwsp8ln00120xsvujqfa1xi	Individual Expert Session	PRODUCT_TECH	Kein passendes Angebot dabei? Beschreibe deinen Bedarf — wir vermitteln passende Expert:innen.	Dein Thema wird aktuell durch keines der verfügbaren Angebote vollständig abgedeckt? Beschreibe deine Herausforderung und wir vermitteln dir passende Expert:innen aus unserem Netzwerk.	Sparring	1	t	30	2026-09-11 10:10:22.283	2026-09-14 10:38:22.458	\N	\N	\N	\N
a779417c-b424-4f5e-9c49-c680befca8f5	Founder Insights: Vom ersten Fundraising zum Exit	FUNDRAISING	Q&A mit einem erfahrenen Founder — vom ersten Raise bis zum Exit.	Offene Q&A-Session zu Fundraising-Realität: erste Runde, Wachstum, Verhandlung und Exit — aus erster Hand.	Online Q&A	1	t	1	2026-09-11 10:18:49.542	2026-09-14 10:38:22.392	Dirk Rudolf	Wunderland Capital	\N	https://wunderland.capital
1141f4ef-77c9-4118-a362-395e574d5b7f	Stakeholdermanagement	FUNDRAISING	Workshop zu Erwartungs- und Beziehungsmanagement mit Kapitalgebern.	Wie du Investor:innen, Beirat und weitere Stakeholder entlang der Finanzierungsreise aktiv steuerst und Vertrauen aufbaust.	Online Workshop	1	t	2	2026-09-11 10:18:49.542	2026-09-14 10:38:22.396	Polina Kon	LOVEDIS	\N	https://lovedis.de
ec14e76b-af44-4dda-8c4a-9d6fb0c1b1ea	Individuelle Expert:innen Sessions (Investor-Sparring)	FUNDRAISING	1:1-Sparring mit Investor:innen aus dem LOVEDIS-Netzwerk.	Direktes Sparring mit Investor:innen zu Story, Runde und Bewertung. Wir matchen die passende Person aus unserem Netzwerk.	Sparring Session	1	t	4	2026-09-11 10:18:49.542	2026-09-14 10:38:22.402	\N	Realyze Ventures, HTGF, re:cap Technologies, Wunderland Capital, Business Angels FrankfurtRheinMain, Futury Capital, Business Angels Mittelhessen	\N	\N
0f560c62-87b5-411d-9b36-45d114231947	SaaS Contracting	LEGAL	Rechtssichere SaaS-Verträge — AGB, SLAs, Datenschutz.	Vertragsgestaltung für SaaS-Produkte: AGB, Service Levels, Haftung und typische Fallstricke.	Online Workshop (~2h)	2	t	6	2026-09-11 10:16:49.357	2026-09-14 10:38:22.406	Axel Staudt	Aulinger	\N	https://www.aulinger.eu
9bcf9897-e344-4236-abf5-8fc9b660da8d	AI Act & Datenschutz	LEGAL	EU AI Act und DSGVO für KI-Produkte praxisnah eingeordnet.	Was der EU AI Act und die DSGVO für dein KI-Produkt bedeuten — Pflichten, Risiken und pragmatische Umsetzung.	Online Workshop (~2h)	2	t	7	2026-09-11 10:16:49.357	2026-09-14 10:38:22.408	Axel Staudt	Aulinger	\N	https://www.aulinger.eu
5e34d73f-9732-4928-81c0-7231ffda7230	Schutz des geistigen Eigentums / IP-Rechte	LEGAL	IP-Strategie: Marken, Patente, Lizenzen richtig aufsetzen.	Wie du dein geistiges Eigentum schützt und eine IP-Strategie entwickelst, die zu deinem Geschäftsmodell passt.	Online Workshop (~2h)	2	t	8	2026-09-11 10:16:49.357	2026-09-14 10:38:22.41	Axel Staudt	Aulinger	\N	https://www.aulinger.eu
b4c24af3-b9f0-4af2-9b46-83e31138dc79	Vorbereitung einer Finanzierungsrunde	LEGAL	Rechtliche Readiness für den nächsten Raise.	Datenraum, Cap Table, Verträge und Term Sheet — juristisch vorbereitet in die Finanzierungsrunde gehen.	Online Workshop (~2h)	2	t	9	2026-09-11 10:16:49.357	2026-09-14 10:38:22.412	Axel Staudt	Aulinger	\N	https://www.aulinger.eu
5f33f279-2107-4e84-950e-7f52b1be1fc0	Exit Readiness & Due Diligence	LEGAL	Auf Due Diligence und Exit-Prozesse rechtlich vorbereitet sein.	Woran Deals in der Due Diligence scheitern — und wie du dein Unternehmen frühzeitig exit-ready aufstellst.	Online Workshop (~2h)	2	t	10	2026-09-11 10:16:49.357	2026-09-14 10:38:22.417	Philipp Weber	Momentum	\N	https://www.momentum-partner.de/
\.


--
-- Name: SupportOffering SupportOffering_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SupportOffering"
    ADD CONSTRAINT "SupportOffering_pkey" PRIMARY KEY (id);


--
-- Name: SupportOffering_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SupportOffering_category_idx" ON public."SupportOffering" USING btree (category);


--
-- Name: SupportOffering_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SupportOffering_isActive_idx" ON public."SupportOffering" USING btree ("isActive");


--
-- PostgreSQL database dump complete
--

\unrestrict chbSncDviub7j9IkZCKPaGpW7gTilzX41QM6RiFFTRv3zKfzLJjoA2X4L5HVeW7

