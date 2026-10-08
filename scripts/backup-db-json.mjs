/**
 * Version-independent logical backup: dumps every table in the `public` schema
 * of DATABASE_URL to a single timestamped JSON file under ./backups.
 *
 * Used before the destructive real-data cutover when pg_dump isn't available.
 * The file contains { meta, tables: { <table>: [rows...] } } and per-table row
 * counts, so it can be inspected and, if ever needed, replayed row-by-row.
 *
 * Usage:
 *   DATABASE_URL=<target> node scripts/backup-db-json.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

function jsonReplacer(_key, value) {
  if (typeof value === "bigint") return value.toString();
  if (Buffer.isBuffer(value)) return { __buffer_base64__: value.toString("base64") };
  return value;
}

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();

  const { rows: tableRows } = await client.query(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename`
  );
  const tableNames = tableRows.map((r) => r.tablename);

  const tables = {};
  const counts = {};
  let total = 0;
  for (const name of tableNames) {
    const { rows } = await client.query(
      `SELECT * FROM "${name}"`
    );
    tables[name] = rows;
    counts[name] = rows.length;
    total += rows.length;
    console.log(`  • ${name}: ${rows.length}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const host = new URL(url.replace(/^postgres(ql)?:\/\//, "https://")).host;
  const meta = {
    createdAt: new Date().toISOString(),
    host,
    tableCount: tableNames.length,
    totalRows: total,
    counts,
  };

  mkdirSync("backups", { recursive: true });
  const file = `backups/db-backup-${stamp}.json`;
  writeFileSync(file, JSON.stringify({ meta, tables }, jsonReplacer, 0));

  console.log(`\nBackup geschrieben: ${file}`);
  console.log(`Tabellen: ${tableNames.length}, Zeilen gesamt: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => client.end());
