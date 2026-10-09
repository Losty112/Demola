// Usage: npm run db:seed   — wipes the database and loads the illustrative demo network.
import fs from "node:fs";
import { DB_PATH, openDb } from "../lib/db/client";
import { seedDemoData } from "../lib/db/seed";

for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(DB_PATH + suffix, { force: true });
const db = openDb();
seedDemoData(db);
const { n } = db.prepare("SELECT COUNT(*) AS n FROM site_snapshots").get() as { n: number };
console.log(`Seeded demo data into ${DB_PATH} (${n} snapshots).`);
