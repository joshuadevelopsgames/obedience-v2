import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JournalPage } from "@/components/slave/JournalPage";
import { getSlaveActivePair } from "@/lib/slavePair";

export default async function JournalPageServer() {
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

  // Get the active pair (respects pair switcher cookie)
  const pair = await getSlaveActivePair(supabase, user.id);

  // Get journal entries
  const { data: entries } = pair
    ? await supabase
        .from("journal_entries")
        .select("*")
        .eq("pair_id", pair.id)
        .eq("author_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Get mood check-ins
  const { data: moodCheckins } = pair
    ? await supabase
        .from("mood_checkins")
        .select("*")
        .eq("pair_id", pair.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  return (
    <JournalPage
      profile={profile}
      pair={pair}
      entries={entries || []}
      moodCheckins={moodCheckins || []}
    />
  );
}
