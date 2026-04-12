"use client";

import {
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Pair, Profile, Task, Proof } from "@/types/database";

interface Props {
  pair: Pair | null;
  profile: Profile;
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

const statusColors: Record<string, string> = {
  assigned: "bg-blue-400/10 text-blue-400",
  in_progress: "bg-accent/10 text-accent",
  proof_submitted: "bg-yellow-400/10 text-yellow-400",
  approved: "bg-success/10 text-success",
  rejected: "bg-danger/10 text-danger",
  completed: "bg-success/10 text-success",
  expired: "bg-muted/10 text-muted",
  suggested: "bg-muted/10 text-muted",
};

export function TaskManagement({ pair, profile, tasks, proofs }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<
    "all" | "active" | "pending" | "completed"
  >("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedProofs, setExpandedProofs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "service" as const,
    difficulty: 3,
    proof_type: "text" as const,
    due_date: "",
  });

  const activeTasks = tasks.filter((t) =>
    ["assigned", "in_progress"].includes(t.status)
  );
  const pendingTasks = tasks.filter((t) => t.status === "proof_submitted");
  const completedTasks = tasks.filter((t) =>
    ["approved", "completed"].includes(t.status)
  );

  const getFilteredTasks = () => {
    switch (activeTab) {
      case "active":
        return activeTasks;
      case "pending":
        return pendingTasks;
      case "completed":
        return completedTasks;
      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();
  const tabCounts = {
    all: tasks.length,
    active: activeTasks.length,
    pending: pendingTasks.length,
    completed: completedTasks.length,
  };

  const handleApprove = async (taskId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "approved" })
        .eq("id", taskId);

      if (!error) {
        toast.success("Task approved!");
        router.refresh();
      } else {
        toast.error("Failed to approve task");
      }
    } catch {
      toast.error("Error approving task");
    }
    setSubmitting(false);
  };

  const handleReject = async (taskId: string, proofId: string) => {
    setSubmitting(true);
    try {
      const note = rejectNote[proofId] || "";

      const { error: proofError } = await supabase
        .from("proofs")
        .update({ status: "rejected", reviewer_note: note })
        .eq("id", proofId);

      const { error: taskError } = await supabase
        .from("tasks")
        .update({ status: "rejected" })
        .eq("id", taskId);

      if (!proofError && !taskError) {
        toast.success("Task rejected");
        router.refresh();
        setRejectNote((prev) => {
          const next = { ...prev };
          delete next[proofId];
          return next;
        });
      } else {
        toast.error("Failed to reject task");
      }
    } catch {
      toast.error("Error rejecting task");
    }
    setSubmitting(false);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pair) {
      toast.error("Not paired");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      const xpReward = formData.difficulty * 15;

      const { error } = await supabase.from("tasks").insert({
        pair_id: pair.id,
        created_by: profile.id,
        assigned_to: pair.slave_id,
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        difficulty: formData.difficulty,
        xp_reward: xpReward,
        proof_type: formData.proof_type,
        due_at: formData.due_date || null,
        status: "assigned",
        ai_generated: false,
      });

      if (!error) {
        toast.success("Task created!");
        setShowCreateForm(false);
        setFormData({
          title: "",
          description: "",
          category: "service",
          difficulty: 3,
          proof_type: "text",
          due_date: "",
        });
        router.refresh();
      } else {
        toast.error("Failed to create task");
      }
    } catch {
      toast.error("Error creating task");
    }
    setSubmitting(false);
  };

  if (!pair) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
        <p className="text-sm text-muted">
          Not paired yet. Share your pair code to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Task Management</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 rounded-lg bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
        >
          <Plus size={16} />
          Create Task
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">New Task</h3>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="—"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="—"
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as any,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="service">Service</option>
                  <option value="obedience">Obedience</option>
                  <option value="training">Training</option>
                  <option value="self_care">Self Care</option>
                  <option value="creative">Creative</option>
                  <option value="endurance">Endurance</option>
                  <option value="protocol">Protocol</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Proof Type
                </label>
                <select
                  value={formData.proof_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      proof_type: e.target.value as any,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="text">Text</option>
                  <option value="photo">Photo</option>
                  <option value="video">Video</option>
                  <option value="checkin">Check-in</option>
                  <option value="location">Location</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Difficulty: {formData.difficulty}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.difficulty}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      difficulty: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-accent text-background py-2 text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Task"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 rounded-lg border border-border bg-card text-foreground py-2 text-sm font-medium hover:bg-card/80"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(["all", "active", "pending", "completed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}{" "}
            <span className="text-xs ml-1">({tabCounts[tab]})</span>
          </button>
        ))}
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted">No tasks in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const proof = proofs.find((p) => p.task_id === task.id);
            const isExpanded = expandedProofs.includes(task.id);

            return (
              <div
                key={task.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                {/* Task Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs font-medium ${
                          categoryColors[task.category] || "text-muted"
                        }`}
                      >
                        {task.category.replace("_", " ")}
                      </span>
                      <span className="text-xs text-muted">
                        {"★".repeat(task.difficulty)}
                        {"☆".repeat(5 - task.difficulty)}
                      </span>
                      <span className="text-xs text-accent">
                        +{task.xp_reward} XP
                      </span>
                    </div>
                    <h4 className="font-medium text-sm">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-muted mt-1">
                        {task.description}
                      </p>
                    )}
                    <div className="mt-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          statusColors[task.status] ||
                          "bg-muted/10 text-muted"
                        }`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  {task.status === "proof_submitted" && proof && (
                    <button
                      onClick={() =>
                        setExpandedProofs((prev) =>
                          prev.includes(task.id)
                            ? prev.filter((id) => id !== task.id)
                            : [...prev, task.id]
                        )
                      }
                      className="ml-3 p-2 text-muted hover:text-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                  )}
                </div>

                {/* Proof Content */}
                {task.status === "proof_submitted" && proof && isExpanded && (
                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="bg-background rounded-lg p-3">
                      {proof.text_content ? (
                        <p className="text-sm text-foreground">
                          {proof.text_content}
                        </p>
                      ) : proof.content_url ? (
                        <a
                          href={proof.content_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-accent hover:underline"
                        >
                          View {proof.proof_type}
                        </a>
                      ) : (
                        <p className="text-sm text-muted">No content</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-2">
                        Review Note (optional)
                      </label>
                      <textarea
                        value={rejectNote[proof.id] || ""}
                        onChange={(e) =>
                          setRejectNote({
                            ...rejectNote,
                            [proof.id]: e.target.value,
                          })
                        }
                        placeholder="—"
                        rows={2}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(task.id)}
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-success/10 text-success py-2 text-sm font-medium hover:bg-success/20 disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(task.id, proof.id)}
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-danger/10 text-danger py-2 text-sm font-medium hover:bg-danger/20 disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <X size={14} />
                        )}
                        Reject
                      </button>
                    </div>
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
