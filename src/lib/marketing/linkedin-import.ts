// ---------------------------------------------------------------------------
// Parser for the LinkedIn Page Analytics export (Inhalte / Follower), as XLS(X)
// or CSV, English or German UI. LinkedIn puts a description line above the
// header and renames columns now and then, so columns are matched by synonyms
// and the header row is searched instead of assumed.
// ---------------------------------------------------------------------------

export interface SheetRows {
  name: string;
  rows: unknown[][];
}

export interface ParsedLinkedInPost {
  postKey: string;
  url: string;
  title: string;
  postType: string | null;
  postedBy: string | null;
  publishedAt: Date;
  impressions: number;
  clicks: number;
  reactions: number;
  comments: number;
  reposts: number;
  follows: number;
  engagementRate: number | null;
}

export interface ParsedFollowerDay {
  day: Date;
  organic: number;
  sponsored: number;
}

export interface LinkedInImportResult {
  posts: ParsedLinkedInPost[];
  followers: ParsedFollowerDay[];
  /** Sheets that were recognized, for the import summary. */
  recognized: string[];
  skippedRows: number;
}

const POST_COLUMNS = {
  url: ["post link", "beitragslink", "link zum beitrag", "post url", "url", "link"],
  title: ["post title", "beitragstitel", "update title", "titel", "title"],
  contentType: ["content type", "inhaltstyp", "format", "medientyp"],
  postType: ["post type", "beitragstyp", "typ"],
  postedBy: ["posted by", "gepostet von", "erstellt von", "autor"],
  date: ["created date", "erstellungsdatum", "erstellt am", "published date", "veröffentlicht am", "date", "datum"],
  impressions: ["impressions", "impressionen"],
  clicks: ["clicks", "klicks"],
  reactions: ["likes", "reactions", "reaktionen", "gefällt mir"],
  comments: ["comments", "kommentare"],
  reposts: ["reposts", "shares", "geteilte inhalte", "weiterverbreitungen", "teilen"],
  follows: ["follows", "neue follower", "follower"],
  engagementRate: ["engagement rate", "engagement-rate", "engagementrate", "interaktionsrate"],
} as const;

const FOLLOWER_COLUMNS = {
  date: ["date", "datum"],
  organic: ["organic followers", "organische follower", "organic"],
  sponsored: ["sponsored followers", "gesponserte follower", "sponsored"],
} as const;

type ColumnMap<K extends string> = Partial<Record<K, number>>;

function norm(cell: unknown): string {
  return String(cell ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function mapColumns<K extends string>(
  header: unknown[],
  spec: Record<K, readonly string[]>
): ColumnMap<K> {
  const cells = header.map(norm);
  const map: ColumnMap<K> = {};
  const used = new Set<number>();
  for (const key of Object.keys(spec) as K[]) {
    // Exact synonym first, then "starts with" (e.g. "Views (excluding …)").
    for (const pass of ["exact", "prefix"] as const) {
      if (map[key] !== undefined) break;
      for (const syn of spec[key]) {
        const idx = cells.findIndex(
          (c, i) => !used.has(i) && (pass === "exact" ? c === syn : c.startsWith(`${syn} `) || c.startsWith(`${syn}(`))
        );
        if (idx >= 0) {
          map[key] = idx;
          used.add(idx);
          break;
        }
      }
    }
  }
  return map;
}

function findHeader<K extends string>(
  rows: unknown[][],
  spec: Record<K, readonly string[]>,
  required: NoInfer<K>[]
): { index: number; columns: ColumnMap<K> } | null {
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const columns = mapColumns(rows[i] ?? [], spec);
    if (required.every((k) => columns[k] !== undefined)) return { index: i, columns };
  }
  return null;
}

export function parseCount(cell: unknown): number {
  if (typeof cell === "number") return Number.isFinite(cell) ? Math.round(cell) : 0;
  const s = String(cell ?? "").replace(/[\s.,'](?=\d{3}\b)/g, "").replace(/[^\d-]/g, "");
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Engagement rate as a fraction (0.061). Accepts 0.061, "6.1%", "6,1 %". */
export function parseRate(cell: unknown): number | null {
  if (cell === null || cell === undefined || cell === "") return null;
  if (typeof cell === "number") return Number.isFinite(cell) ? (cell > 1 ? cell / 100 : cell) : null;
  const raw = String(cell).trim();
  const n = parseFloat(raw.replace(",", ".").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return raw.includes("%") || n > 1 ? n / 100 : n;
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/** Calendar day as UTC midnight. Slash dates are US (LinkedIn), dot dates German. */
export function parseDay(cell: unknown): Date | null {
  if (cell instanceof Date) {
    return Number.isNaN(cell.getTime())
      ? null
      : new Date(Date.UTC(cell.getFullYear(), cell.getMonth(), cell.getDate()));
  }
  if (typeof cell === "number" && cell > 20000 && cell < 80000) {
    return new Date(EXCEL_EPOCH + Math.floor(cell) * 86_400_000);
  }
  const s = String(cell ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return utcDay(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) return utcDay(fullYear(+m[3]), +m[1], +m[2]);
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (m) return utcDay(fullYear(+m[3]), +m[2], +m[1]);
  return null;
}

function fullYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

function utcDay(y: number, mo: number, d: number): Date | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCMonth() === mo - 1 ? date : null;
}

/**
 * Stable identity of a LinkedIn post across exports and hand-entered links:
 * the activity/share/ugcPost id when the URL carries one, else the URL
 * without query, fragment and trailing slash.
 */
export function linkedInPostKey(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();
  const m = decoded.match(/(activity|share|ugcPost)[:-](\d{10,})/i);
  if (m) return `${m[1].toLowerCase()}:${m[2]}`;
  try {
    const u = new URL(decoded);
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

function text(cell: unknown): string | null {
  const s = String(cell ?? "").trim();
  return s ? s : null;
}

function parsePostSheet(rows: unknown[][], result: LinkedInImportResult): boolean {
  const header = findHeader(rows, POST_COLUMNS, ["url", "impressions"]);
  if (!header) return false;
  const c = header.columns;
  const at = (row: unknown[], key: keyof typeof POST_COLUMNS) =>
    c[key] === undefined ? undefined : row[c[key] as number];

  const byKey = new Map<string, ParsedLinkedInPost>();
  for (const row of rows.slice(header.index + 1)) {
    if (!row || row.every((cell) => norm(cell) === "")) continue;
    const url = text(at(row, "url"));
    const postKey = url ? linkedInPostKey(url) : null;
    const publishedAt = parseDay(at(row, "date"));
    if (!url || !postKey || !publishedAt) {
      result.skippedRows++;
      continue;
    }
    const title = text(at(row, "title")) ?? url;
    byKey.set(postKey, {
      postKey,
      url,
      title: title.length > 300 ? `${title.slice(0, 297)}...` : title,
      postType: text(at(row, "contentType")) ?? text(at(row, "postType")),
      postedBy: text(at(row, "postedBy")),
      publishedAt,
      impressions: parseCount(at(row, "impressions")),
      clicks: parseCount(at(row, "clicks")),
      reactions: parseCount(at(row, "reactions")),
      comments: parseCount(at(row, "comments")),
      reposts: parseCount(at(row, "reposts")),
      follows: parseCount(at(row, "follows")),
      engagementRate: parseRate(at(row, "engagementRate")),
    });
  }
  result.posts.push(...byKey.values());
  return true;
}

function parseFollowerSheet(rows: unknown[][], result: LinkedInImportResult): boolean {
  const header = findHeader(rows, FOLLOWER_COLUMNS, ["date", "organic"]);
  if (!header) return false;
  const c = header.columns;
  for (const row of rows.slice(header.index + 1)) {
    if (!row || row.every((cell) => norm(cell) === "")) continue;
    const day = parseDay(row[c.date as number]);
    if (!day) {
      result.skippedRows++;
      continue;
    }
    result.followers.push({
      day,
      organic: parseCount(row[c.organic as number]),
      sponsored: c.sponsored === undefined ? 0 : parseCount(row[c.sponsored]),
    });
  }
  return true;
}

export function parseLinkedInSheets(sheets: SheetRows[]): LinkedInImportResult {
  const result: LinkedInImportResult = { posts: [], followers: [], recognized: [], skippedRows: 0 };
  for (const sheet of sheets) {
    if (parsePostSheet(sheet.rows, result)) result.recognized.push(`${sheet.name} (Beiträge)`);
    else if (parseFollowerSheet(sheet.rows, result)) result.recognized.push(`${sheet.name} (Follower)`);
  }
  return result;
}
