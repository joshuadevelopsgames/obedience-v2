"use client";

import {
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  AlertCircle,
  MoreVertical,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ProofUpload } from "@/components/shared/ProofUpload";
import type { Profile, Pair, Task, Proof } from "@/types/database";

interface Props {
  profile: Profile;
  pair: Pair | null;
  tasks: Task[];
  proofs: Proof[];
}

const categoryColors: Record<string, string> = {
  service: "text-blue-400",
  obedience: "text-purple",
  training: "text-accent",
  self_care: "text-emerald-400",
  creative: "text-pink-400",
  endurance: "text-red-400",
  protocol: "text-cyan-400",
};

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  assigned: { icon: <Clock size={16} />, label: "Assigned", color: "text-blue-400" },
  in_progress: { icon: <Clock size={16} />, label: "In Progress", color: "text-yellow-400" },
  proof_submitted: { icon: <AlertCircle size={16} />, label: "Pending Review", color: "text-purple" },
  approved: { icon: <CheckCircle2 size={16} />, label: "Completed", color: "text-success" },
  rejected: { icon: <XCircle size={16} />, label: "Rejected", color: "text-danger" },
  completed: { icon: <CheckCircle2 size={16} />, label: "Completed", color: "text-success" },
};

export function TaskHistory({
  profile,
  pair,
  tasks,
  proofs,
}: Props) {
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "completed" | "rejected">("all");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "active") return ["assigned", "in_progress"].includes(task.status);
    if (filter === "pending") return task.status === "proof_submitted";
    if (filter === "completed") return ["approved", "completed"].includes(task.status);
    if (filter === "rejected") return task.status === "rejected";
    return true;
  });

  const handleStartTask = async (task: Task) => {
    await supabase
      .from("tasks")
      .update({ status: "in_progress" })
      .eq("id", task.id);
    toast.success("Task started!");
    router.refresh();
  };

  const taskProof = (taskId: string) => proofs.find((p) => p.task_id === taskId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Task History</h1>
        <p className="text-sm text-muted">Track all your assigned tasks and submissions</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { value: "all" as const, label: "All", count: tasks.length },
          {
            value: "active" as const,
            label: "Active",
            count: tasks.filter((t) => ["assigned", "in_progress"].includes(t.status)).length,
          },
          {
            value: "pending" as const,
            label: "Pending Review",
            count: tasks.filter((t) => t.status === "proof_submitted").length,
          },
          {
            value: "completed" as const,
            label: "Completed",
            count: tasks.filter((t) => ["approved", "completed"].includes(t.status)).length,
          },
          {
            value: "rejected" as const,
            label: "Rejected",
            count: tasks.filter((t) => t.status === "rejected").length,
          },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === tab.value
                ? "bg-accent text-black"
                : "bg-card border border-border text-muted hover:text-foreground"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Tasks list */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <FileText size={24} className="mx-auto mb-2 text-muted" />
            <p className="text-sm text-muted">No tasks in this category</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const taskProofRecord = taskProof(task.id);
            const config = statusConfig[task.status] || statusConfig.assigned;

            return (
              <div key={task.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Collapsed view */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-card-hover transition-colors"
                  onClick={() =>
                    setExpandedTask(expandedTask === task.id ? null : task.id)
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`text-xs font-medium ${
                          categoryColors[task.category] || "text-muted"
                        }`}
                      >
                        {task.category.replace("_", " ")}
                      </span>
                      <span className="text-xs text-muted">
                        {"★".repeat(task.difficulty)}
                      </span>
                      <div className={`flex items-center gap-1 text-xs ${config.color}`}>
                        {config.icon}
                        {config.label}
                      </div>
                    </div>
                    <h3 className="text-sm font-medium">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className="text-xs font-medium text-accent">
                      +{task.xp_reward}
                    </span>
                    {task.status === "approved" && task.updated_at && (
                      <span className="text-xs text-success">
                        {new Date(task.updated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded view */}
                {expandedTask === task.id && (
                  <div className="border-t border-border px-4 py-4 bg-card/50 space-y-4">
                    {task.description && (
                      <div>
                        <p className="text-xs font-medium text-muted mb-1">Description</p>
                        <p className="text-sm text-foreground">{task.description}</p>
                      </div>
                    )}

                    {/* Rejected task note */}
                    {task.status === "rejected" && taskProofRecord?.reviewer_note && (
                      <div className="rounded-lg bg-danger/10 border border-danger/30 p-3">
                        <p className="text-xs font-medium text-danger mb-1">Reviewer Note</p>
                        <p className="text-xs text-foreground">
                          {taskProofRecord.reviewer_note}
                        </p>
                      </div>
                    )}

                    {/* Proof submission */}
                    {["assigned", "in_progress"].includes(task.status) && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-muted">
                            Submit Proof ({task.proof_type})
                          </label>
                          {task.status === "assigned" && (
                            <button
                              onClick={() => handleStartTask(task)}
                              className="rounded-lg bg-purple/10 px-3 py-1.5 text-xs font-medium text-purple hover:bg-purple/20 transition-colors"
                            >
                              Start Task First
                            </button>
                          )}
                        </div>
                        {task.status === "in_progress" && (
                          <ProofUpload
                            taskId={task.id}
                            proofType={(task.proof_type as any) || "text"}
                            userId={profile.id}
                            onComplete={() => {
                              setExpandedTask(null);
                              router.refresh();
                            }}
                            onCancel={() => setExpandedTask(null)}
                          />
                        )}
                      </div>
                    )}

                    {/* Pending review */}
                    {task.status === "proof_submitted" && (
                      <div className="rounded-lg bg-purple/10 border border-purple/30 p-3">
                        <p className="text-xs font-medium text-purple">
                          ⏳ Waiting for review...
                        </p>
                        <p className="text-xs text-muted mt-1">
                          Your Mistress will review your submission shortly.
                        </p>
                      </div>
                    )}

                    {/* Completed */}
                    {task.status === "approved" && task.updated_at && (
                      <div className="rounded-lg bg-success/10 border border-success/30 p-3">
                        <p className="text-xs font-medium text-success">
                          ✓ Completed {new Date(task.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
