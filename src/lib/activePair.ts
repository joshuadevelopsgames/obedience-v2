import { cookies } from "next/headers";

const COOKIE_NAME = "active_pair_id";

/**
 * Get the active pair ID from the cookie (server-side).
 * Returns null if not set.
 */
export async function getActivePairId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Given an array of pairs (already fetched), pick the active one.
 * Prefers the cookie value; falls back to the most recent pair.
 */
export async function pickActivePair<T extends { id: string }>(
  pairs: T[]
): Promise<T | null> {
  if (!pairs.length) return null;
  const preferred = await getActivePairId();
  if (preferred) {
    const match = pairs.find((p) => p.id === preferred);
    if (match) return match;
  }
  return pairs[0]; // already ordered by created_at desc
}
