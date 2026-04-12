import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TaskManagement } from "@/components/mistress/TaskManagement";

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
    .single();

  // Fetch all tasks for the pair
  const { data: tasks } = pair
    ? await supabase
        .from("tasks")
        .select("*")
        .eq("pair_id", pair.id)
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

  return (
    <TaskManagement
      pair={pair}
      profile={profile}
      tasks={tasks || []}
      proofs={proofs || []}
    />
  );
}
