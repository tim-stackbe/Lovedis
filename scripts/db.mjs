#!/usr/bin/env node
/**
 * Local development PostgreSQL 17 controller.
 * Uses the binaries shipped with the `embedded-postgres` dev dependency,
 * but runs them via pg_ctl so the server survives this script exiting.
 *
 *   node scripts/db.mjs start  — init (first run) + start on port 5433
 *   node scripts/db.mjs stop   — stop the server
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, ".pgdata");
const logFile = join(dataDir, "postgres.log");
const PORT = process.env.PGPORT || "5433";
const USER = "lovedis";
const DB = "lovedis";

function binDir() {
  // embedded-postgres ships platform-specific binaries in a sibling package.
  const platformPkg = `${process.platform}-${process.arch}`;
  const dir = join(root, "node_modules", "@embedded-postgres", platformPkg, "native", "bin");
  if (!existsSync(dir)) {
    console.error(`PostgreSQL binaries not found at ${dir}. Run "npm install" first.`);
    process.exit(1);
  }
  return dir;
}

function run(bin, args, opts = {}) {
  return execFileSync(join(binDir(), bin), args, {
    stdio: "inherit",
    ...opts,
  });
}

const cmd = process.argv[2];

if (cmd === "start") {
  if (!existsSync(join(dataDir, "PG_VERSION"))) {
    const pwFile = join(root, "node_modules", ".pg-pwfile");
    writeFileSync(pwFile, "lovedis\n");
    run("initdb", [
      "-D", dataDir,
      "-U", USER,
      "--auth=trust",
      "--pwfile", pwFile,
      "-E", "UTF8",
    ]);
  }
  try {
    run("pg_ctl", ["-D", dataDir, "status"], { stdio: "pipe" });
    console.log(`PostgreSQL already running on port ${PORT}.`);
  } catch {
    run("pg_ctl", [
      "-D", dataDir,
      "-l", logFile,
      "-o", `-p ${PORT} -c listen_addresses=localhost`,
      "-w",
      "start",
    ]);
  }
  // Create the app database if it does not exist yet.
  try {
    run("createdb", ["-h", "localhost", "-p", PORT, "-U", USER, DB], {
      stdio: "pipe",
    });
    console.log(`Created database "${DB}".`);
  } catch {
    // already exists
  }
  console.log(
    `\nPostgreSQL 17 ready: postgresql://${USER}:lovedis@localhost:${PORT}/${DB}`
  );
} else if (cmd === "stop") {
  run("pg_ctl", ["-D", dataDir, "-m", "fast", "stop"]);
} else {
  console.error("Usage: node scripts/db.mjs <start|stop>");
  process.exit(1);
}
