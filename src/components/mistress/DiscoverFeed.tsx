"use client";

import {
  Sparkles,
  Brain,
  Loader2,
  ThumbsUp,
  Edit3,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Pair, Profile, Task, Punishment } from "@/types/database";

interface Props {
  pair: Pair | null;
  profile: Profile;
  initialSuggestions: Task[];
  recentPunishments: Punishment[];
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

const proofTypeColors: Record<string, string> = {
  text: "bg-blue-400/10 text-blue-400",
  photo: "bg-pink-400/10 text-pink-400",
  video: "bg-purple/10 text-purple",
  checkin: "bg-accent/10 text-accent",
  location: "bg-cyan-400/10 text-cyan-400",
};

const punishmentStatusColors: Record<string, string> = {
  suggested: "bg-muted/10 text-muted",
  assigned: "bg-accent/10 text-accent",
  in_progress: "bg-yellow-400/10 text-yellow-400",
  completed: "bg-success/10 text-success",
};

export function DiscoverFeed({
  pair,
  profile,
  initialSuggestions,
  recentPunishments,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [punishments, setPunishments] = useState(recentPunishments);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [generatingPunishments, setGeneratingPunishments] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Task>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleGenerateTasks = async () => {
    if (!pair) {
      toast.error("Not paired yet");
      return;
    }

    setGeneratingTasks(true);
    try {
      const res = await fetch("/api/ai/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId: pair.id }),
      });
      const data = await res.json();

      if (data.tasks) {
        setSuggestions((prev) => [...data.tasks, ...prev]);
        toast.success(`Generated ${data.tasks.length} task suggestions`);
      } else {
        toast.error(data.error || "Failed to generate tasks");
      }
    } catch {
      toast.error("Failed to generate tasks");
    }
    setGeneratingTasks(false);
  };

  const handleGeneratePunishments = async () => {
    if (!pair) {
      toast.error("Not paired yet");
      return;
    }

    setGeneratingPunishments(true);
    try {
      const res = await fetch("/api/ai/generate-punishments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId: pair.id }),
      });
      const data = await res.json();

      if (data.punishments) {
        setPunishments((prev) => [...data.punishments, ...prev]);
        toast.success(`Generated ${data.punishments.length} punishments`);
      } else {
        toast.error(data.error || "Failed to generate punishments");
      }
    } catch {
      toast.error("Failed to generate punishments");
    }
    setGeneratingPunishments(false);
  };

  const handleApproveTask = async (task: Task) => {
    if (!pair) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "assigned" })
        .eq("id", task.id);

      if (!error) {
        setSuggestions((prev) => prev.filter((t) => t.id !== task.id));
        toast.success("Task assigned!");
        router.refresh();
      } else {
        toast.error("Failed to assign task");
      }
    } catch {
      toast.error("Error assigning task");
    }
    setSubmitting(false);
  };

  const handleSkipTask = async (taskId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (!error) {
        setSuggestions((prev) => prev.filter((t) => t.id !== taskId));
        toast.success("Task skipped");
      } else {
        toast.error("Failed to skip task");
      }
    } catch {
      toast.error("Error skipping task");
    }
    setSubmitting(false);
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditFormData({
      title: task.title,
      description: task.description,
      difficulty: task.difficulty,
      category: task.category,
    });
  };

  const handleSaveEdit = async (taskId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update(editFormData)
        .eq("id", taskId);

      if (!error) {
        setSuggestions((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, ...editFormData } : t
          )
        );
        setEditingTaskId(null);
        toast.success("Task updated");
      } else {
        toast.error("Failed to update task");
      }
    } catch {
      toast.error("Error updating task");
    }
    setSubmitting(false);
  };

  const handleApprovePunishment = async (punishment: Punishment) => {
    if (!pair) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("punishments")
        .update({ status: "assigned" })
        .eq("id", punishment.id);

      if (!error) {
        setPunishments((prev) =>
          prev.map((p) =>
            p.id === punishment.id ? { ...p, status: "assigned" } : p
          )
        );
        toast.success("Punishment assigned!");
        router.refresh();
      } else {
        toast.error("Failed to assign punishment");
      }
    } catch {
      toast.error("Error assigning punishment");
    }
    setSubmitting(false);
  };

  const handleSkipPunishment = async (punishmentId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("punishments")
        .delete()
        .eq("id", punishmentId);

      if (!error) {
        setPunishments((prev) =>
          prev.filter((p) => p.id !== punishmentId)
        );
        toast.success("Punishment skipped");
      } else {
        toast.error("Failed to skip punishment");
      }
    } catch {
      toast.error("Error skipping punishment");
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
    <div className="space-y-8">
      {/* Suggestions Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles size={20} className="text-accent" />
            AI Task Suggestions
          </h2>
          <button
            onClick={handleGenerateTasks}
            disabled={generatingTasks}
            className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            {generatingTasks ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Brain size={14} />
            )}
            {generatingTasks ? "Generating..." : "Generate More"}
          </button>
        </div>

        {suggestions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center space-y-4">
            <Brain size={32} className="mx-auto text-muted opacity-50" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                No suggestions yet
              </h3>
              <p className="text-sm text-muted mb-4">
                Let AI generate personalized tasks for your submissive
              </p>
              <button
                onClick={handleGenerateTasks}
                disabled={generatingTasks}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {generatingTasks ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Brain size={16} />
                )}
                Generate Tasks
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((task) => {
              const isEditing = editingTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3 card-glow transition-all"
                >
                  {isEditing ? (
                    // Edit form
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editFormData.title || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            title: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <textarea
                        value={editFormData.description || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            description: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={editFormData.category || "service"}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              category: e.target.value as any,
                            })
                          }
                          className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          <option value="service">Service</option>
                          <option value="obedience">Obedience</option>
                          <option value="training">Training</option>
                          <option value="self_care">Self Care</option>
                          <option value="creative">Creative</option>
                          <option value="endurance">Endurance</option>
                          <option value="protocol">Protocol</option>
                        </select>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={editFormData.difficulty || 3}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              difficulty: parseInt(e.target.value),
                            })
                          }
                          className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(task.id)}
                          disabled={submitting}
                          className="flex-1 rounded-lg bg-accent text-background py-1.5 text-xs font-medium hover:bg-accent/90 disabled:opacity-50"
                        >
                          {submitting ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingTaskId(null)}
                          className="flex-1 rounded-lg border border-border bg-card text-foreground py-1.5 text-xs font-medium hover:bg-card/80"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-xs font-medium ${
                              categoryColors[task.category] || "text-muted"
                            }`}
                          >
                            {task.category.replace("_", " ")}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              proofTypeColors[task.proof_type] ||
                              "bg-muted/10 text-muted"
                            }`}
                          >
                            {task.proof_type}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm">{task.title}</h3>
                        {task.description && (
                          <p className="text-xs text-muted mt-1 line-clamp-3">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">
                            {"★".repeat(task.difficulty)}
                            {"☆".repeat(5 - task.difficulty)}
                          </span>
                          <span className="text-xs text-accent font-medium">
                            +{task.xp_reward} XP
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleApproveTask(task)}
                          disabled={submitting}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-success/10 text-success py-1.5 text-xs font-medium hover:bg-success/20 disabled:opacity-50"
                          title="Approve & assign"
                        >
                          {submitting ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ThumbsUp size={12} />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleEditTask(task)}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-muted/10 text-muted py-1.5 text-xs font-medium hover:bg-muted/20 transition-colors"
                          title="Edit before assigning"
                        >
                          <Edit3 size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleSkipTask(task.id)}
                          disabled={submitting}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-danger/10 text-danger py-1.5 text-xs font-medium hover:bg-danger/20 disabled:opacity-50"
                          title="Skip"
                        >
                          {submitting ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <X size={12} />
                          )}
                          Skip
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Punishments Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Zap size={20} className="text-danger" />
            Punishments
          </h2>
          <button
            onClick={handleGeneratePunishments}
            disabled={generatingPunishments}
            className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
          >
            {generatingPunishments ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}
            {generatingPunishments ? "Generating..." : "Generate Punishments"}
          </button>
        </div>

        {punishments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted">
              No punishments yet. Generate some with AI.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {punishments.map((punishment) => (
              <div
                key={punishment.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm">
                        {punishment.title}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          punishmentStatusColors[punishment.status] ||
                          "bg-muted/10 text-muted"
                        }`}
                      >
                        {punishment.status}
                      </span>
                    </div>
                    {punishment.description && (
                      <p className="text-xs text-muted mb-2">
                        {punishment.description}
                      </p>
                    )}
                    <div className="text-xs text-muted">
                      Severity:{" "}
                      {"🔥".repeat(Math.min(punishment.severity, 5))}
                    </div>
                  </div>

                  {punishment.status === "suggested" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprovePunishment(punishment)}
                        disabled={submitting}
                        className="rounded-lg bg-success/10 text-success p-2 hover:bg-success/20 disabled:opacity-50"
                        title="Assign"
                      >
                        {submitting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <ThumbsUp size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => handleSkipPunishment(punishment.id)}
                        disabled={submitting}
                        className="rounded-lg bg-danger/10 text-danger p-2 hover:bg-danger/20 disabled:opacity-50"
                        title="Skip"
                      >
                        {submitting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <X size={14} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
