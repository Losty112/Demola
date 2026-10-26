// Usage: npm run db:seed   — wipes the demo tables in Supabase and loads the synthetic network (needs .env.local).
// The tables must already exist: run supabase/migrations/*.sql first.
import { getSupabase, unwrap } from "../lib/db/client";
import { TABLES, generateDemoDataset } from "../lib/demo/generate";

const db = getSupabase();
const data = generateDemoDataset();

for (const t of [...TABLES].reverse()) {
  unwrap(await db.from(t.name).delete().not(t.pk, "is", null).select(t.pk), `clearing ${t.name}`);
}
for (const t of TABLES) {
  const rows = data[t.name];
  for (let i = 0; i < rows.length; i += 500) {
    unwrap(await db.from(t.name).insert(rows.slice(i, i + 500)).select(t.pk), `inserting into ${t.name}`);
  }
  console.log(`${t.name.padEnd(22)} ${rows.length} rows`);
}
// Rows above were inserted with explicit ids; move the identity sequences past them so later inserts don't collide.
unwrap(await db.rpc("reset_identity_sequences"), "resetting identity sequences");
