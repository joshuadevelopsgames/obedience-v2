import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RewardsShop } from "@/components/slave/RewardsShop";

export default async function RewardsPage() {
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

  if (!profile) redirect("/dashboard");

  // Get the pair
  const { data: pair } = await supabase
    .from("pairs")
    .select("*")
    .eq("slave_id", user.id)
    .eq("status", "active")
    .single();

  // Get available rewards
  const { data: rewards } = pair
    ? await supabase
        .from("rewards")
        .select("*")
        .eq("pair_id", pair.id)
        .eq("available", true)
        .order("xp_cost", { ascending: true })
    : { data: [] };

  // Get redemptions history
  const { data: redemptions } = await supabase
    .from("redemptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <RewardsShop
      profile={profile}
      pair={pair}
      rewards={rewards || []}
      redemptions={redemptions || []}
    />
  );
}
