import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DiscoverFeed } from "@/components/mistress/DiscoverFeed";

export default async function DiscoverPage() {
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

  // Fetch AI-generated task suggestions (not yet approved)
  const { data: suggestions } = pair
    ? await supabase
        .from("tasks")
        .select("*")
        .eq("pair_id", pair.id)
        .eq("status", "suggested")
        .eq("ai_generated", true)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Fetch recent punishments (last 5)
  const { data: punishments } = pair
    ? await supabase
        .from("punishments")
        .select("*")
        .eq("pair_id", pair.id)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  return (
    <DiscoverFeed
      pair={pair}
      profile={profile}
      initialSuggestions={suggestions || []}
      recentPunishments={punishments || []}
    />
  );
}
