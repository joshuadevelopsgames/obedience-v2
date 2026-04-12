import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessagesView } from "@/components/shared/MessagesView";

export default async function SubMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "slave") redirect("/dashboard");

  // Fetch ALL active pairs for this slave
  const { data: pairs } = await supabase
    .from("pairs")
    .select("*")
    .eq("slave_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  // For each pair, fetch the partner (mistress) profile
  const pairsWithPartners = await Promise.all(
    (pairs || []).map(async (pair) => {
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", pair.mistress_id)
        .single();
      return { pair, partnerProfile: partnerProfile || null };
    })
  );

  // Preload messages for the first pair only
  const firstPair = pairsWithPartners[0]?.pair;
  const { data: initialMessages } = firstPair
    ? await supabase
        .from("messages")
        .select("*")
        .eq("pair_id", firstPair.id)
        .order("created_at", { ascending: true })
        .limit(100)
    : { data: [] };

  return (
    <MessagesView
      currentProfile={profile}
      pairsWithPartners={pairsWithPartners}
      initialMessages={initialMessages || []}
    />
  );
}
