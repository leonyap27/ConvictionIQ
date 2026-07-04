// Server-side helpers for MCP tools to read/write the shared `app_state` store.
import { createClient } from "@supabase/supabase-js";

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface AppStateSnapshot {
  recommendations: unknown[];
  monitoring_log: unknown[];
  holdings: unknown[];
  sim_current_date: string | null;
}

export async function readAll(): Promise<AppStateSnapshot> {
  const sb = client();
  const { data, error } = await sb.from("app_state").select("key,value");
  if (error) throw new Error(error.message);
  const map = new Map<string, unknown>((data ?? []).map((r) => [r.key as string, r.value]));
  return {
    recommendations: (map.get("recommendations") as unknown[]) ?? [],
    monitoring_log: (map.get("monitoring_log") as unknown[]) ?? [],
    holdings: (map.get("holdings") as unknown[]) ?? [],
    sim_current_date: (map.get("sim_current_date") as string | null) ?? null,
  };
}

export async function readKey(key: string): Promise<unknown> {
  const sb = client();
  const { data, error } = await sb.from("app_state").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value ?? null;
}

export async function writeKey(key: string, value: unknown): Promise<void> {
  const sb = client();
  const { error } = await sb
    .from("app_state")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
