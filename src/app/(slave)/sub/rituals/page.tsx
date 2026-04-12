import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RitualsPage } from "@/components/slave/RitualsPage";
import { getSlaveActivePair } from "@/lib/slavePair";

export default async function RitualsPageServer() {
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

  // Get rituals
  const { data: rituals } = pair
    ? await supabase
        .from("rituals")
        .select("*")
        .eq("pair_id", pair.id)
        .eq("active", true)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Get ritual completions for streak counts
  const { data: completions } = rituals && rituals.length > 0
    ? await supabase
        .from("ritual_completions")
        .select("*")
        .in(
          "ritual_id",
          rituals.map((r) => r.id)
        )
        .eq("completed_by", user.id)
    : { data: [] };

  return (
    <RitualsPage
      profile={profile}
      pair={pair}
      rituals={rituals || []}
      completions={completions || []}
    />
  );
}
