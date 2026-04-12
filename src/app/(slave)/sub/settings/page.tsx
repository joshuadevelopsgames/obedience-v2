import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubSettings } from "@/components/slave/SubSettings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/dashboard");

  const { data: pair } = await supabase
    .from("pairs")
    .select("*")
    .eq("slave_id", user.id)
    .eq("status", "active")
    .single();

  const { data: contract } = pair
    ? await supabase.from("contracts").select("*").eq("pair_id", pair.id).order("created_at", { ascending: false }).limit(1).single()
    : { data: null };

  const { data: recentMood } = pair
    ? await supabase.from("mood_checkins").select("*").eq("pair_id", pair.id).eq("user_id", user.id).order("created_at", { ascending: false }).limit(10)
    : { data: [] };

  // Fetch kink library + profile selections
  const { data: allKinks }     = await supabase.from("kinks").select("*").order("category").order("name");
  const { data: profileKinks } = await supabase.from("profile_kinks").select("kink_id").eq("profile_id", user.id);

  // Fetch limits library + profile selections
  const { data: allLimits }    = await supabase.from("limits_library").select("*").order("category").order("name");
  const { data: profileLimits} = pair
    ? await supabase.from("profile_limits").select("limit_id").eq("profile_id", user.id).eq("pair_id", pair.id)
    : { data: null };

  return (
    <SubSettings
      profile={profile}
      pair={pair}
      contract={contract}
      recentMood={recentMood || []}
      allKinks={allKinks || []}
      selectedKinkIds={(profileKinks || []).map((pk: any) => pk.kink_id)}
      allLimits={allLimits || []}
      selectedLimitIds={(profileLimits || []).map((pl: any) => pl.limit_id)}
      pairId={pair?.id}
    />
  );
}
