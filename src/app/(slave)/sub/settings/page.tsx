import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubSettings } from "@/components/slave/SubSettings";

export default async function SettingsPage() {
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

  // Get contract with limits
  const { data: contract } = pair
    ? await supabase
        .from("contracts")
        .select("*")
        .eq("pair_id", pair.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
    : { data: null };

  // Get recent mood check-ins
  const { data: recentMood } = pair
    ? await supabase
        .from("mood_checkins")
        .select("*")
        .eq("pair_id", pair.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  return (
    <SubSettings
      profile={profile}
      pair={pair}
      contract={contract}
      recentMood={recentMood || []}
    />
  );
}
