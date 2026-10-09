import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA_SQL } from "./schema";
import { seedDemoData } from "./seed";

declare global {
  var __benchmarkDb: Database.Database | undefined;
}

// Serverless hosts (Vercel) only allow writes under /tmp; data there is demo-only and resets on cold starts.
export const DB_PATH = process.env.BENCHMARK_DB_PATH
  ?? (process.env.VERCEL ? "/tmp/benchmark.db" : path.join(process.cwd(), "data", "benchmark.db"));

export function openDb(file = DB_PATH): Database.Database {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

/** Shared connection for the Next.js server. Seeds illustrative demo data into an empty database. */
export function getDb(): Database.Database {
  if (!global.__benchmarkDb) {
    const db = openDb();
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM sites").get() as { n: number };
    if (n === 0) seedDemoData(db);
    global.__benchmarkDb = db;
  }
  return global.__benchmarkDb;
}
