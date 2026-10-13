import type { LogEntryType } from "@/generated/prisma/enums";
import type { LogRefType } from "@/lib/constants";
import type { LogUser } from "@/lib/logbook";

/** Shared, serializable context the server page hands to every Logbuch client component. */
export interface LogContext {
  startupId: string;
  viewerId: string;
  /** Server render time (ms) so relative times hydrate identically. */
  now: number;
  contacts: { id: string; name: string; position: string | null }[];
  admins: LogUser[];
}

/** Optional platform context forwarded to `LogQuickAdd`. */
export interface LogQuickAddContext {
  refType?: LogRefType;
  refId?: string | null;
  partnerCompanyId?: string;
  batchId?: string;
  contextName?: string;
  defaultType?: LogEntryType;
}
