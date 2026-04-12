"use client";

import {
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  AlertCircle,
  Zap,
  Play,
  Shield,
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
  obedience: "text-primary",
  training: "text-warning",
  self_care: "text-emerald-400",
  creative: "text-pink",
  endurance: "text-red-400",
  protocol: "text-cyan-400",
};

const statusStyles: Record<string, string> = {
  assigned: "text-[#00ff9d] bg-[#00ff9d]/5 border-[#00ff9d]/20",
  in_progress: "text-primary bg-primary/5 border-primary/20",
  proof_submitted: "text-warning bg-warning/5 border-warning/20",
  approved: "text-success bg-success/5 border-success/20",
  rejected: "text-[#ff3366] bg-[#ff3366]/5 border-[#ff3366]/20",
  completed: "text-success bg-success/5 border-success/20",
};

const statusLabels: Record<string, string> = {
  assigned: "Pending",
  in_progress: "In Progress",
  proof_submitted: "Under Review",
  approved: "Completed",
  rejected: "Rejected",
  completed: "Completed",
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

  const tabData = [
    { value: "all" as const, label: "All", count: tasks.length },
    {
      value: "active" as const,
      label: "Active",
      count: tasks.filter((t) => ["assigned", "in_progress"].includes(t.status)).length,
    },
    {
      value: "pending" as const,
      label: "Review",
      count: tasks.filter((t) => t.status === "proof_submitted").length,
    },
    {
      value: "completed" as const,
      label: "Done",
      count: tasks.filter((t) => ["approved", "completed"].includes(t.status)).length,
    },
    {
      value: "rejected" as const,
      label: "Rejected",
      count: tasks.filter((t) => t.status === "rejected").length,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Hero Header */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
        <div className="md:col-span-8">
          <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tighter leading-[0.9] mb-3">
            TASKS &amp; <br />
            <span className="text-pink italic">PROTOCOLS</span>
          </h1>
          <p className="text-muted text-lg max-w-md leading-relaxed">
            Submit to the cycle. Your progress is monitored. Completion is mandatory.
          </p>
        </div>
        <div className="md:col-span-4">
          <div className="glass-panel border border-outline-variant/10 p-6 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-label uppercase tracking-widest text-primary">System Integrity</span>
              <span className="text-sm font-headline font-bold">
                {tasks.length > 0
                  ? `${Math.round((tasks.filter(t => ["approved", "completed"].includes(t.status)).length / tasks.length) * 100)}%`
                  : "—"}
              </span>
            </div>
            <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full"
                style={{
                  width: tasks.length > 0
                    ? `${(tasks.filter(t => ["approved", "completed"].includes(t.status)).length / tasks.length) * 100}%`
                    : "0%",
                  boxShadow: "0 0 8px rgba(204,151,255,0.8)"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4">
        {tabData.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`font-label text-xs font-bold uppercase tracking-widest pb-2 transition-colors ${
              filter === tab.value
                ? "text-primary border-b-2 border-primary/30"
                : "text-zinc-500 hover:text-foreground"
            }`}
          >
            {tab.label} <span className="text-[10px] ml-1 opacity-60">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-surface-container-high rounded-xl p-12 text-center border border-outline-variant/5">
          <FileText size={32} className="mx-auto mb-4 text-zinc-600" />
          <p className="text-muted font-headline">No protocols in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTasks.map((task) => {
            const taskProofRecord = taskProof(task.id);
            const isExpanded = expandedTask === task.id;

            return (
              <div key={task.id} className="bg-surface-low rounded-xl border border-transparent hover:border-primary/20 transition-all duration-300 overflow-hidden glow-border-primary">
                {/* Task Row */}
                <div
                  className="flex items-center justify-between p-4 sm:p-6 cursor-pointer"
                  onClick={() =>
                    setExpandedTask(isExpanded ? null : task.id)
                  }
                >
                  <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-pink border border-outline-variant/10 flex-shrink-0">
                      <TaskIcon category={task.category} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-headline font-bold tracking-tight">{task.title}</h4>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className={`text-xs font-headline font-medium ${categoryColors[task.category] || "text-muted"}`}>
                          {task.category.replace("_", " ").toUpperCase()}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="text-[10px] text-zinc-500 font-headline">
                          {"●".repeat(task.difficulty)}{"○".repeat(5 - task.difficulty)}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="text-primary text-xs font-headline font-bold">
                          +{task.xp_reward} XP
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 ml-2 sm:ml-4 flex-shrink-0">
                    <span
                      className={`text-[9px] sm:text-[10px] font-headline font-bold tracking-wider sm:tracking-[0.2em] px-2 sm:px-3 py-1 rounded border ${
                        statusStyles[task.status] || "text-zinc-400 bg-zinc-400/5 border-zinc-400/20"
                      }`}
                    >
                      {(statusLabels[task.status] || task.status).toUpperCase()}
                    </span>
                    {task.status === "approved" && task.updated_at && (
                      <span className="hidden sm:inline text-xs text-zinc-500 font-headline">
                        {new Date(task.updated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Panel */}
                {isExpanded && (
                  <div className="border-t border-white/5 p-6 bg-surface-container space-y-4">
                    {task.description && (
                      <div>
                        <p className="text-[10px] font-label tracking-[0.2em] text-muted mb-2 uppercase">Description</p>
                        <p className="text-sm text-foreground leading-relaxed">{task.description}</p>
                      </div>
                    )}

                    {/* Rejected note */}
                    {task.status === "rejected" && taskProofRecord?.reviewer_note && (
                      <div className="bg-[#ff3366]/5 border-l-4 border-[#ff3366] p-4 rounded-r-xl">
                        <p className="text-[10px] font-headline font-bold uppercase text-[#ff3366] tracking-widest mb-1">Reviewer Note</p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {taskProofRecord.reviewer_note}
                        </p>
                      </div>
                    )}

                    {/* Proof submission for active tasks */}
                    {["assigned", "in_progress"].includes(task.status) && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-label tracking-[0.2em] text-muted uppercase">
                            Submit Proof ({task.proof_type})
                          </label>
                          {task.status === "assigned" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStartTask(task); }}
                              className="btn-gradient px-4 py-2 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center gap-2"
                            >
                              <Play size={12} /> Start First
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
                      <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-xl">
                        <p className="text-[10px] font-headline font-bold uppercase text-primary tracking-widest">
                          Awaiting Transmission...
                        </p>
                        <p className="text-sm text-muted mt-1">
                          Your Dominant will review your submission shortly.
                        </p>
                      </div>
                    )}

                    {/* Completed */}
                    {task.status === "approved" && task.updated_at && (
                      <div className="bg-success/5 border-l-4 border-success p-4 rounded-r-xl">
                        <p className="text-[10px] font-headline font-bold uppercase text-success tracking-widest">
                          Protocol Completed — {new Date(task.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskIcon({ category }: { category: string }) {
  const icons: Record<string, React.ReactNode> = {
    service: <Shield size={20} />,
    obedience: <Zap size={20} />,
    training: <AlertCircle size={20} />,
    self_care: <Clock size={20} />,
    creative: <FileText size={20} />,
    endurance: <XCircle size={20} />,
    protocol: <Shield size={20} />,
  };
  return <>{icons[category] || <Zap size={20} />}</>;
}
