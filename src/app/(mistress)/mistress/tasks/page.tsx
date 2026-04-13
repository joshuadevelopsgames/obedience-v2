import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TaskManagement } from "@/components/mistress/TaskManagement";
import { DiscoverFeed } from "@/components/mistress/DiscoverFeed";

export default async function TasksPage() {
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
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch all tasks for the pair
  const { data: tasks } = pair
    ? await supabase
        .from("tasks")
        .select("*")
        .eq("pair_id", pair.id)
        .neq("status", "suggested")
        .order("created_at", { ascending: false })
    : { data: [] };

  // Fetch proofs for pending review tasks
  const pendingTaskIds = (tasks || [])
    .filter((t) => t.status === "proof_submitted")
    .map((t) => t.id);

  const { data: proofs } = pendingTaskIds.length > 0
    ? await supabase
        .from("proofs")
        .select("*")
        .in("task_id", pendingTaskIds)
    : { data: [] };

  // Fetch AI-generated task suggestions (suggested status)
  const { data: suggestions } = pair
    ? await supabase
        .from("tasks")
        .select("*")
        .eq("pair_id", pair.id)
        .eq("status", "suggested")
        .eq("ai_generated", true)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Fetch recent punishments
  const { data: punishments } = pair
    ? await supabase
        .from("punishments")
        .select("*")
        .eq("pair_id", pair.id)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  return (
    <div className="flex flex-col gap-12">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">COMMAND CENTER</h1>
        <p className="text-sm text-muted mt-1">Deploy protocols and review AI-generated suggestions</p>
      </div>

      {/* AI Intel section */}
      <DiscoverFeed
        pair={pair}
        profile={profile}
        initialSuggestions={suggestions || []}
        recentPunishments={punishments || []}
      />

      {/* Task management */}
      <div className="border-t border-white/5 pt-8">
        <TaskManagement
          pair={pair}
          profile={profile}
          tasks={tasks || []}
          proofs={proofs || []}
        />
      </div>
    </div>
  );
}
