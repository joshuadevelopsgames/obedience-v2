import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/mistress/SettingsView";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "mistress") redirect("/dashboard");

  const { data: pair } = await supabase
    .from("pairs")
    .select("*")
    .eq("mistress_id", user.id)
    .eq("status", "active")
    .single();

  let subProfile = null;
  if (pair) {
    const { data } = await supabase.from("profiles").select("*").eq("id", pair.slave_id).single();
    subProfile = data;
  }

  const { data: contract } = pair
    ? await supabase.from("contracts").select("*").eq("pair_id", pair.id).order("created_at", { ascending: false }).limit(1).single()
    : { data: null };

  // Fetch kink library + profile selections
  const { data: allKinks }       = await supabase.from("kinks").select("*").order("category").order("name");
  const { data: profileKinks }   = await supabase.from("profile_kinks").select("kink_id").eq("profile_id", user.id);

  // Fetch limits library + profile selections
  const { data: allLimits }      = await supabase.from("limits_library").select("*").order("category").order("name");
  const { data: profileLimits }  = pair
    ? await supabase.from("profile_limits").select("limit_id").eq("profile_id", user.id).eq("pair_id", pair.id)
    : { data: null };

  // Fetch rewards for this pair
  const { data: rewards } = pair
    ? await supabase.from("rewards").select("*").eq("pair_id", pair.id).order("created_at", { ascending: false })
    : { data: null };

  return (
    <SettingsView
      profile={profile}
      pair={pair}
      subProfile={subProfile}
      contract={contract}
      userId={user.id}
      allKinks={allKinks || []}
      selectedKinkIds={(profileKinks || []).map((pk: any) => pk.kink_id)}
      allLimits={allLimits || []}
      selectedLimitIds={(profileLimits || []).map((pl: any) => pl.limit_id)}
      pairId={pair?.id}
      rewards={rewards || []}
    />
  );
}
