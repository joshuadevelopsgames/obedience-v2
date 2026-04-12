import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MistressDashboard } from "@/components/mistress/Dashboard";

export default async function MistressPage() {
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

  // Get the pair
  const { data: pair } = await supabase
    .from("pairs")
    .select("*")
    .eq("mistress_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get sub profile if paired
  let subProfile = null;
  if (pair) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", pair.slave_id)
      .single();
    subProfile = data;
  }

  // Get recent tasks
  const { data: tasks } = pair
    ? await supabase
        .from("tasks")
        .select("*")
        .eq("pair_id", pair.id)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  // Get suggested tasks (AI generated, not yet approved)
  const { data: suggestions } = pair
    ? await supabase
        .from("tasks")
        .select("*")
        .eq("pair_id", pair.id)
        .eq("status", "suggested")
        .eq("ai_generated", true)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  // Get active photo demand (pending, or fulfilled so mistress can see the response)
  const { data: activeDemand } = pair
    ? await supabase
        .from('photo_demands')
        .select('*')
        .eq('pair_id', pair.id)
        .in('status', ['pending', 'fulfilled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    : { data: null };

  // Get recent mood
  const { data: recentMood } = pair
    ? await supabase
        .from("mood_checkins")
        .select("*")
        .eq("pair_id", pair.id)
        .eq("user_id", pair.slave_id)
        .order("created_at", { ascending: false })
        .limit(7)
    : { data: [] };

  return (
    <MistressDashboard
      profile={profile!}
      subProfile={subProfile}
      pair={pair}
      tasks={tasks || []}
      suggestions={suggestions || []}
      recentMood={recentMood || []}
      activeDemand={activeDemand ?? null}
    />
  );
}
