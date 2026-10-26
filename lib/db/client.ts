import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __supabase: SupabaseClient | undefined;
}

/**
 * Server-side Supabase client (service-role key, bypasses RLS). Never import this from a client component:
 * the key must not reach the browser. Vercel's Supabase integration sets both variables automatically.
 */
export function getSupabase(): SupabaseClient {
  if (!global.__supabase) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).");
    }
    global.__supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return global.__supabase;
}

/** Unwraps a PostgREST response or throws with the database's message. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Supabase: ${what} failed — ${res.error.message}`);
  return (res.data ?? []) as T;
}

const PAGE = 1000; // PostgREST returns at most 1000 rows per request

/** Reads every row of a query by paging through it. `build` must return a fresh, ordered query for the given range. */
export async function fetchAll<T>(
  what: string,
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = unwrap(await build(from, from + PAGE - 1), what);
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}
