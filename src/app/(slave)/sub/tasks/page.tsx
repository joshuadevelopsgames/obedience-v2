import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TaskHistory } from "@/components/slave/TaskHistory";

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

  if (!profile) redirect("/dashboard");

  // Get the pair
  const { data: pair } = await supabase
    .from("pairs")
    .select("*")
    .eq("slave_id", user.id)
    .eq("status", "active")
    .single();

  // Get all tasks (not just active ones)
  const { data: tasks } = pair
    ? await supabase
        .from("tasks")
        .select("*")
        .eq("pair_id", pair.id)
        .eq("assigned_to", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Get proofs for tasks
  const { data: proofs } = tasks && tasks.length > 0
    ? await supabase
        .from("proofs")
        .select("*")
        .in(
          "task_id",
          tasks.map((t) => t.id)
        )
    : { data: [] };

  return (
    <TaskHistory
      profile={profile}
      pair={pair}
      tasks={tasks || []}
      proofs={proofs || []}
    />
  );
}
