/**
 * Prisma raises `P2025` ("An operation failed because it depends on one or more
 * records that were required but not found") when an `update`/`delete`-by-id
 * targets a row that no longer exists — typically a stale/bad client-supplied
 * id. Left uncaught this surfaces as an uncaught exception (HTTP 500).
 *
 * Duck-typed on `code` rather than `instanceof
 * Prisma.PrismaClientKnownRequestError` so it stays robust across bundler /
 * module boundaries (the same pattern already used in `approvePartner`).
 */
export function isRecordNotFoundError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2025"
  );
}

/** Friendly German message for a stale/removed record. */
export const RECORD_NOT_FOUND_MESSAGE =
  "Eintrag nicht gefunden – er wurde möglicherweise bereits entfernt.";
