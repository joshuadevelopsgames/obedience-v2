import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JournalView } from "@/components/mistress/JournalView";

export default async function JournalPage() {
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

  // Fetch journal entries
  const { data: entries } = pair
    ? await supabase
        .from("journal_entries")
        .select("*")
        .eq("pair_id", pair.id)
        .eq("author_id", pair.slave_id)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Fetch mood checkins for last 14 days
  const { data: moodCheckins } = pair
    ? await supabase
        .from("mood_checkins")
        .select("*")
        .eq("pair_id", pair.id)
        .eq("user_id", pair.slave_id)
        .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <JournalView
      pair={pair}
      profile={profile}
      entries={entries || []}
      moodCheckins={moodCheckins || []}
    />
  );
}
