import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/mistress/SettingsView";

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

  if (!profile || profile.role !== "mistress") redirect("/dashboard");

  // Get the pair
  const { data: pair } = await supabase
    .from("pairs")
    .select("*")
    .eq("mistress_id", user.id)
    .eq("status", "active")
    .single();

  // Fetch sub profile if paired
  let subProfile = null;
  if (pair) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", pair.slave_id)
      .single();
    subProfile = data;
  }

  // Fetch contract
  const { data: contract } = pair
    ? await supabase
        .from("contracts")
        .select("*")
        .eq("pair_id", pair.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
    : { data: null };

  return (
    <SettingsView
      profile={profile}
      pair={pair}
      subProfile={subProfile}
      contract={contract}
      userId={user.id}
    />
  );
}
