import { SupabaseClient } from "@supabase/supabase-js";
import { pickActivePair } from "@/lib/activePair";

/**
 * Fetch all active pairs for a slave and pick the currently active one
 * (from the active_pair_id cookie, falling back to most recent).
 */
export async function getSlaveActivePair(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: pairs } = await supabase
    .from("pairs")
    .select("*")
    .eq("slave_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return pickActivePair(pairs || []);
}
