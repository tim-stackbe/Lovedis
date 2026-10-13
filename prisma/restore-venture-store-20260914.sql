-- Venture Store recovery, 2026-09-14.
--
-- Today's deploy ran prisma/apply-marketplace-notion.ts, whose prune step
-- hard-deleted the four hand-curated "Exclusive" session programs and
-- re-created eight MentorProfiles that had deliberately been removed on
-- Friday 2026-09-11. There was no database backup.
--
-- The four Program rows below were recovered forensically: the relation had
-- never been vacuumed (pg_stat_all_tables.last_vacuum and last_autovacuum were
-- both NULL), so the deleted tuples were still present as LP_NORMAL line
-- pointers 3-6 on heap page 0 and were read back with pageinspect's
-- heap_page_item_attrs(). All 13 columns were recovered; nothing is
-- reconstructed or guessed. The decoder was validated against the two live
-- tuples on the same page, which decoded identically to a plain SELECT.
--
-- Raw page evidence: /opt/lovedis/backups/Program-page0-deleted-tuples.hex
-- Pre-change dump:   /opt/lovedis/backups/lovedis-PRE-RECOVERY-20260914T105152Z.sql.gz
--
-- Run manually:
--   docker exec -i lovedis-db-1 psql -U lovedis -d lovedis -v ON_ERROR_STOP=1 \
--     -f restore-venture-store-20260914.sql

\set ON_ERROR_STOP on
BEGIN;

-- 1. Re-create the four deleted programs with their original ids, so any
--    external link or bookmark to them resolves again.
INSERT INTO "Program"
  (id, title, summary, description, "focusTags", status, "sortOrder",
   "createdById", "createdAt", "updatedAt", "contactPerson", "fixCreditCost", "sessionDate")
VALUES
  ('7586ed36-a091-4b07-bd17-789f96919e76',
   'Community / Ökosystem Sales',
   'Online Workshop zu Community- und Ökosystem-Vertrieb.',
   'Session im Rahmen von Sales, Pricing & Growth: Community / Ökosystem Sales mit unusual business (Sina Wans). Format: Online Workshop.',
   ARRAY['Sales','Growth','GTM'], 'OPEN', 1,
   'co4u0v4vuya2gzgkcr8qggc9w', '2026-09-11 10:26:08.021', '2026-09-11 10:26:08.021',
   'Sina Wans', 0, NULL),

  ('b3c1b388-929f-4c50-9a8d-7a132eed4472',
   'Aufbau strukturierter Pipelines',
   'Online Workshop zum Aufbau strukturierter Sales-Pipelines.',
   'Session im Rahmen von Sales, Pricing & Growth: Aufbau strukturierter Pipelines mit GAL Digital (Tobias Auradniczek). Format: Online Workshop.',
   ARRAY['Sales','Pipeline','GTM'], 'OPEN', 2,
   'co4u0v4vuya2gzgkcr8qggc9w', '2026-09-11 10:26:08.021', '2026-09-11 10:26:08.021',
   'Tobias Auradniczek', 0, NULL),

  ('06326b66-fce5-4c5f-bae5-cc7de3f046f8',
   'Nightmare Competitor',
   'Live Workshop zu Wettbewerbspositionierung.',
   'Session im Rahmen von Sales, Pricing & Growth: Nightmare Competitor mit Uni Marburg / StartMiUp (Michael Stephan). Format: Live Workshop.',
   ARRAY['Sales','Positioning','Growth'], 'OPEN', 3,
   'co4u0v4vuya2gzgkcr8qggc9w', '2026-09-11 10:26:08.021', '2026-09-11 10:26:08.021',
   'Michael Stephan', 0, NULL),

  ('ac850056-72cc-4499-84ce-ef55da9c2191',
   'SaaS Contracting',
   'Online Workshop zu SaaS-Vertragsgestaltung im Sales-Kontext.',
   'Session im Rahmen von Sales, Pricing & Growth: SaaS Contracting mit Aulinger Rechtsanwälte Notare (Dr. Ralf Heine). Format: Online Workshop.',
   ARRAY['Sales','Legal','SaaS'], 'OPEN', 4,
   'co4u0v4vuya2gzgkcr8qggc9w', '2026-09-11 10:26:08.021', '2026-09-11 10:26:08.021',
   'Dr. Ralf Heine', 0, '23. September, 10–12 Uhr')
ON CONFLICT (id) DO NOTHING;

-- 2. Drop the eight MentorProfiles the sync re-created. Friday's curated state
--    had zero mentors. MarketplaceBooking is the only table with an FK to
--    MentorProfile and it is empty, so this leaves nothing dangling; the
--    guard below aborts the transaction if that ever stops being true.
DO $$
DECLARE refs integer;
BEGIN
  SELECT count(*) INTO refs FROM "MarketplaceBooking" b
  WHERE b."mentorId" IN (SELECT id FROM "MentorProfile" WHERE "createdAt" >= '2026-09-14');
  IF refs > 0 THEN
    RAISE EXCEPTION 'Aborting: % MarketplaceBooking row(s) reference these mentors; deactivate instead of deleting', refs;
  END IF;
END $$;

DELETE FROM "MentorProfile"
WHERE name IN ('Celin Winter','Dr. Alexandra Hofmockel','Elena Tiegs','Henri Böwingloh',
               'Louisa Cronau','Marie Bender','Robin Sinemli','Thomas Pregla')
  AND "createdAt" >= '2026-09-14';

-- 3. Hide, but do NOT delete, the two rows the sync created today. Both are
--    provably absent from Friday's state (cuid ids and createdAt 10:38:22 UTC,
--    inside the deploy transaction; every Friday row has a uuid id). The
--    Venture Store only reads Program.status = 'OPEN' and
--    SupportOffering.isActive = true, so this restores Friday's storefront
--    while keeping the content for the user to accept or discard.
UPDATE "Program" SET status = 'DRAFT', "updatedAt" = now()
WHERE id = 'cmu140syl00007gp5ssi33b5t' AND title = 'Sales, Pricing & Growth';

UPDATE "SupportOffering" SET "isActive" = false, "updatedAt" = now()
WHERE id = 'cmu140szj00097gp57vr6npww';

COMMIT;
