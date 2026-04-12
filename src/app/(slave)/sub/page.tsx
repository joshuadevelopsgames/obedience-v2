import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubDashboard } from "@/components/slave/Dashboard";

export default async function SubPage() {
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
    .eq("slave_id", user.id)
    .eq("status", "active")
    .single();

  // Get assigned tasks
  const { data: tasks } = pair
    ? await supabase
        .from("tasks")
        .select("*")
        .eq("pair_id", pair.id)
        .eq("assigned_to", user.id)
        .in("status", ["assigned", "in_progress", "proof_submitted", "approved", "rejected"])
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  // Get today's rituals
  const { data: rituals } = pair
    ? await supabase
        .from("rituals")
        .select("*")
        .eq("pair_id", pair.id)
        .eq("active", true)
    : { data: [] };

  // Get achievements
  const { data: achievements } = await supabase
    .from("user_achievements")
    .select("*, achievements(*)")
    .eq("user_id", user.id)
    .order("unlocked_at", { ascending: false })
    .limit(5);

  return (
    <SubDashboard
      profile={profile!}
      pair={pair}
      tasks={tasks || []}
      rituals={rituals || []}
      achievements={achievements || []}
    />
  );
}
