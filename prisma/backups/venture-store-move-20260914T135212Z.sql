-- Venture Store — move 3 Sales sessions from "Exklusive Programme" (Program)
-- to "Support-Angebote" (SupportOffering), + add a new "Sales" offering.
-- Applied 2026-09-14 against the LIVE Hetzner TEST DB (lovedis-db-1).
--
-- Mechanism (verified against src/app/(main)/venture/marketplace/page.tsx):
--   "Exklusive Programme" = Program rows with status='OPEN'.
--   "Support-Angebote"    = SupportOffering rows with isActive=true, grouped by category.
-- Moving therefore = create SupportOffering rows (SALES) preserving content,
-- then delete the source Program rows. MarketplaceBooking is the only FK to
-- Program (onDelete: SetNull) and is empty, so the delete orphans nothing.
--
-- Pre-change backup: prisma/backups/venture-store-20260914T135212Z.sql
--                    /opt/lovedis/backups/venture-store-premove-20260914T135212Z.sql
--
-- Run:
--   ssh hetzner-lovedis "docker exec -i lovedis-db-1 psql -U lovedis -d lovedis \
--     -v ON_ERROR_STOP=1" < prisma/backups/venture-store-move-20260914T135212Z.sql

\set ON_ERROR_STOP on
BEGIN;

-- Guard 1: exactly the three intended target programs exist and are OPEN.
DO $$
DECLARE cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM "Program"
   WHERE id IN ('7586ed36-a091-4b07-bd17-789f96919e76',
                'b3c1b388-929f-4c50-9a8d-7a132eed4472',
                '06326b66-fce5-4c5f-bae5-cc7de3f046f8')
     AND status = 'OPEN';
  IF cnt <> 3 THEN
    RAISE EXCEPTION 'Aborting: expected 3 OPEN target programs, found %', cnt;
  END IF;
END $$;

-- Guard 2: no bookings reference the target programs (delete must not orphan).
DO $$
DECLARE refs integer;
BEGIN
  SELECT count(*) INTO refs FROM "MarketplaceBooking"
   WHERE "programId" IN ('7586ed36-a091-4b07-bd17-789f96919e76',
                         'b3c1b388-929f-4c50-9a8d-7a132eed4472',
                         '06326b66-fce5-4c5f-bae5-cc7de3f046f8');
  IF refs > 0 THEN
    RAISE EXCEPTION 'Aborting: % booking(s) reference the target programs', refs;
  END IF;
END $$;

-- Guard 3: no SALES offering yet (avoid duplicating the new "Sales" or the moved rows).
DO $$
DECLARE cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM "SupportOffering" WHERE category = 'SALES';
  IF cnt > 0 THEN
    RAISE EXCEPTION 'Aborting: % SALES offering(s) already exist', cnt;
  END IF;
END $$;

-- 1. Create the three moved offerings (SALES). Content preserved 1:1 from the
--    Program rows; providerCompany/format lifted out of the Program.description.
--    creditCost = 0 preserves the programs' "keine Credits erforderlich" nature.
INSERT INTO "SupportOffering"
  (id, title, category, summary, description, format, "providerCompany",
   "contactPerson", website, "sessionDate", "creditCost", "isActive", "sortOrder",
   "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text,
   'Community / Ökosystem Sales', 'SALES',
   'Online Workshop zu Community- und Ökosystem-Vertrieb.',
   'Session im Rahmen von Sales, Pricing & Growth: Community / Ökosystem Sales mit unusual business (Sina Wans). Format: Online Workshop.',
   'Online Workshop', 'unusual business', 'Sina Wans', NULL, NULL, 0, true, 31, now(), now()),
  (gen_random_uuid()::text,
   'Aufbau strukturierter Pipelines', 'SALES',
   'Online Workshop zum Aufbau strukturierter Sales-Pipelines.',
   'Session im Rahmen von Sales, Pricing & Growth: Aufbau strukturierter Pipelines mit GAL Digital (Tobias Auradniczek). Format: Online Workshop.',
   'Online Workshop', 'GAL Digital', 'Tobias Auradniczek', NULL, NULL, 0, true, 32, now(), now()),
  (gen_random_uuid()::text,
   'Nightmare Competitor', 'SALES',
   'Live Workshop zu Wettbewerbspositionierung.',
   'Session im Rahmen von Sales, Pricing & Growth: Nightmare Competitor mit Uni Marburg / StartMiUp (Michael Stephan). Format: Live Workshop.',
   'Live Workshop', 'Uni Marburg / StartMiUp', 'Michael Stephan', NULL, NULL, 0, true, 33, now(), now());

-- 2. Add the new "Sales" support offering (defaults derived from the DRAFT
--    "Sales, Pricing & Growth" program; creditCost = 1, consistent with peers).
INSERT INTO "SupportOffering"
  (id, title, category, summary, description, format, "providerCompany",
   "contactPerson", website, "sessionDate", "creditCost", "isActive", "sortOrder",
   "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text,
   'Sales', 'SALES',
   'Individuelles Sales-Sparring rund um Vertrieb, Pricing und skalierbares Wachstum.',
   'Sparring rund um Sales, Pricing & Growth: geschärfte Value Proposition & ICP, strukturierte Pipeline und ein validiertes Pricing-Modell. Beschreibe deinen Bedarf — wir vermitteln die passende Expertise aus dem LOVEDIS-Netzwerk.',
   'Sparring', 'LOVEDIS', NULL, NULL, NULL, 1, true, 34, now(), now());

-- 3. Verify the four SALES offerings now exist and are active.
DO $$
DECLARE cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM "SupportOffering" WHERE category = 'SALES' AND "isActive";
  IF cnt <> 4 THEN
    RAISE EXCEPTION 'Aborting: expected 4 active SALES offerings, found %', cnt;
  END IF;
END $$;

-- 4. Remove the three source Program rows (now migrated to offerings).
DELETE FROM "Program"
 WHERE id IN ('7586ed36-a091-4b07-bd17-789f96919e76',
              'b3c1b388-929f-4c50-9a8d-7a132eed4472',
              '06326b66-fce5-4c5f-bae5-cc7de3f046f8');

-- 5. Verify the Program table is left with exactly the 3 untouched rows
--    (SaaS Contracting, Workshop 1: KI Trends & Modellvergleich, DRAFT
--     Sales, Pricing & Growth).
DO $$
DECLARE cnt integer; open_cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM "Program";
  SELECT count(*) INTO open_cnt FROM "Program" WHERE status = 'OPEN';
  IF cnt <> 3 THEN
    RAISE EXCEPTION 'Aborting: expected 3 Program rows after delete, found %', cnt;
  END IF;
  IF open_cnt <> 2 THEN
    RAISE EXCEPTION 'Aborting: expected 2 OPEN Program rows after delete, found %', open_cnt;
  END IF;
END $$;

COMMIT;
