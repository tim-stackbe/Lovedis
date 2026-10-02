-- Venture Store — reprice the 3 moved SALES offerings from 0 to 2 credits.
-- Applied 2026-09-14 against the LIVE Hetzner TEST DB (lovedis-db-1).
-- Backup: prisma/backups/venture-store-repricing-20260914T140309Z.sql
--
-- Run:
--   ssh hetzner-lovedis "docker exec -i lovedis-db-1 psql -U lovedis -d lovedis \
--     -v ON_ERROR_STOP=1" < prisma/backups/venture-store-repricing-20260914T140309Z.apply.sql

\set ON_ERROR_STOP on
BEGIN;

-- Guard 1 (BEFORE): the three target offerings exist and are currently at 0 credits.
DO $$
DECLARE cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM "SupportOffering"
   WHERE id IN ('29150788-f69f-446b-8e7f-637c88bc983f',
                '0dd3e824-5163-43f8-9869-19b557968175',
                '166982c5-6762-44af-adad-5f0d11f1439a')
     AND category = 'SALES' AND "creditCost" = 0;
  IF cnt <> 3 THEN
    RAISE EXCEPTION 'Aborting: expected 3 SALES target offerings at creditCost 0, found %', cnt;
  END IF;
END $$;

-- Update exactly the three rows; abort unless precisely 3 rows change.
DO $$
DECLARE affected integer;
BEGIN
  UPDATE "SupportOffering"
     SET "creditCost" = 2, "updatedAt" = now()
   WHERE id IN ('29150788-f69f-446b-8e7f-637c88bc983f',
                '0dd3e824-5163-43f8-9869-19b557968175',
                '166982c5-6762-44af-adad-5f0d11f1439a')
     AND "creditCost" = 0;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION 'Aborting: expected to update exactly 3 rows, updated %', affected;
  END IF;
END $$;

-- Guard 2 (AFTER): the three are now at 2 credits, the standalone Sales stays at 1,
-- and totals are unchanged (34 offerings / 33 active).
DO $$
DECLARE two_cnt integer; sales_cost integer; total integer; active integer;
BEGIN
  SELECT count(*) INTO two_cnt FROM "SupportOffering"
   WHERE id IN ('29150788-f69f-446b-8e7f-637c88bc983f',
                '0dd3e824-5163-43f8-9869-19b557968175',
                '166982c5-6762-44af-adad-5f0d11f1439a')
     AND "creditCost" = 2;
  IF two_cnt <> 3 THEN
    RAISE EXCEPTION 'Aborting: expected 3 target offerings at creditCost 2, found %', two_cnt;
  END IF;

  SELECT "creditCost" INTO sales_cost FROM "SupportOffering"
   WHERE id = '60f2a165-8e33-4ddc-9ad3-8d4326866fc7';
  IF sales_cost IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'Aborting: standalone Sales offering changed (creditCost = %)', sales_cost;
  END IF;

  SELECT count(*) INTO total FROM "SupportOffering";
  SELECT count(*) INTO active FROM "SupportOffering" WHERE "isActive";
  IF total <> 34 OR active <> 33 THEN
    RAISE EXCEPTION 'Aborting: offering totals changed (total=%, active=%)', total, active;
  END IF;
END $$;

COMMIT;
