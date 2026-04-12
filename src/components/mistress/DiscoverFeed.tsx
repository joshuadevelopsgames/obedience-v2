"use client";

import {
  Sparkles,
  Brain,
  Loader2,
  ThumbsUp,
  Edit3,
  X,
  Zap,
  Shield,
  AlertCircle,
  Clock,
  FileText,
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
  obedience: "text-primary",
  training: "text-warning",
  self_care: "text-emerald-400",
  creative: "text-pink",
  endurance: "text-red-400",
  protocol: "text-cyan-400",
};

const proofTypeBadge: Record<string, string> = {
  text: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  photo: "text-pink bg-pink/10 border-pink/20",
  video: "text-primary bg-primary/10 border-primary/20",
  checkin: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  location: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
};

const punishmentStatusStyle: Record<string, string> = {
  suggested: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  assigned: "text-primary bg-primary/10 border-primary/20",
  in_progress: "text-warning bg-warning/10 border-warning/20",
  completed: "text-success bg-success/10 border-success/20",
};

function TaskCategoryIcon({ category }: { category: string }) {
  const icons: Record<string, React.ReactNode> = {
    service: <Shield size={18} />,
    obedience: <Zap size={18} />,
    training: <AlertCircle size={18} />,
    self_care: <Clock size={18} />,
    creative: <FileText size={18} />,
    endurance: <X size={18} />,
    protocol: <Shield size={18} />,
  };
  return <>{icons[category] || <Zap size={18} />}</>;
}

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
    if (!pair) { toast.error("Not paired yet"); return; }
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
    } catch { toast.error("Failed to generate tasks"); }
    setGeneratingTasks(false);
  };

  const handleGeneratePunishments = async () => {
    if (!pair) { toast.error("Not paired yet"); return; }
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
    } catch { toast.error("Failed to generate punishments"); }
    setGeneratingPunishments(false);
  };

  const handleApproveTask = async (task: Task) => {
    if (!pair) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("tasks").update({ status: "assigned" }).eq("id", task.id);
      if (!error) {
        setSuggestions((prev) => prev.filter((t) => t.id !== task.id));
        toast.success("Task assigned!");
        router.refresh();
      } else { toast.error("Failed to assign task"); }
    } catch { toast.error("Error assigning task"); }
    setSubmitting(false);
  };

  const handleSkipTask = async (taskId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (!error) {
        setSuggestions((prev) => prev.filter((t) => t.id !== taskId));
        toast.success("Task skipped");
      } else { toast.error("Failed to skip task"); }
    } catch { toast.error("Error skipping task"); }
    setSubmitting(false);
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditFormData({ title: task.title, description: task.description, difficulty: task.difficulty, category: task.category });
  };

  const handleSaveEdit = async (taskId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("tasks").update(editFormData).eq("id", taskId);
      if (!error) {
        setSuggestions((prev) => prev.map((t) => t.id === taskId ? { ...t, ...editFormData } : t));
        setEditingTaskId(null);
        toast.success("Task updated");
      } else { toast.error("Failed to update task"); }
    } catch { toast.error("Error updating task"); }
    setSubmitting(false);
  };

  const handleApprovePunishment = async (punishment: Punishment) => {
    if (!pair) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("punishments").update({ status: "assigned" }).eq("id", punishment.id);
      if (!error) {
        setPunishments((prev) => prev.map((p) => p.id === punishment.id ? { ...p, status: "assigned" } : p));
        toast.success("Punishment assigned!");
        router.refresh();
      } else { toast.error("Failed to assign punishment"); }
    } catch { toast.error("Error assigning punishment"); }
    setSubmitting(false);
  };

  const handleSkipPunishment = async (punishmentId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("punishments").delete().eq("id", punishmentId);
      if (!error) {
        setPunishments((prev) => prev.filter((p) => p.id !== punishmentId));
        toast.success("Punishment skipped");
      } else { toast.error("Failed to skip punishment"); }
    } catch { toast.error("Error skipping punishment"); }
    setSubmitting(false);
  };

  if (!pair) {
    return (
      <div className="bg-surface-container rounded-xl p-12 text-center border border-outline-variant/10">
        <Brain size={32} className="mx-auto mb-4 text-zinc-600" />
        <p className="text-muted font-headline">Not paired yet — share your code to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {/* ── AI Task Suggestions ───────────────────────── */}
      <section>
        {/* Section header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-headline font-bold tracking-tight flex items-center gap-3">
              <Sparkles size={20} className="text-primary" />
              AI TASK INTEL
            </h2>
            <p className="text-muted text-xs font-label tracking-widest uppercase mt-1">
              {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""} queued
            </p>
          </div>
          <button
            onClick={handleGenerateTasks}
            disabled={generatingTasks}
            className="btn-gradient px-4 py-2 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center gap-2 disabled:opacity-50"
          >
            {generatingTasks ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
            {generatingTasks ? "Synthesizing..." : "Generate More"}
          </button>
        </div>

        {suggestions.length === 0 ? (
          <div className="bg-surface-container rounded-xl p-12 text-center border border-outline-variant/5">
            <Brain size={32} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-muted font-headline text-sm mb-1">Neural buffer empty</p>
            <p className="text-zinc-600 text-xs font-label mb-6">Let AI generate personalized protocols for your submissive</p>
            <button
              onClick={handleGenerateTasks}
              disabled={generatingTasks}
              className="btn-gradient px-5 py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {generatingTasks ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
              Generate Protocols
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestions.map((task) => {
              const isEditing = editingTaskId === task.id;
              return (
                <div key={task.id} className="bg-surface-low rounded-xl border border-transparent hover:border-primary/20 transition-all duration-300 overflow-hidden glow-border-primary flex flex-col">
                  {isEditing ? (
                    /* Edit form */
                    <div className="p-5 space-y-3 flex-1">
                      <p className="text-[10px] font-label tracking-[0.2em] text-primary uppercase">Editing Protocol</p>
                      <input
                        type="text"
                        value={editFormData.title || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                        className="w-full bg-surface-container border-b border-primary/40 px-0 py-1.5 text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary"
                        placeholder="Protocol title"
                      />
                      <textarea
                        value={editFormData.description || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        rows={2}
                        className="w-full bg-surface-container border-b border-primary/40 px-0 py-1.5 text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary resize-none"
                        placeholder="Description"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={editFormData.category || "service"}
                          onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value as any })}
                          className="bg-surface-container border border-outline-variant/20 rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
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
                          type="number" min="1" max="5"
                          value={editFormData.difficulty || 3}
                          onChange={(e) => setEditFormData({ ...editFormData, difficulty: parseInt(e.target.value) })}
                          className="bg-surface-container border border-outline-variant/20 rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                          placeholder="Difficulty 1–5"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleSaveEdit(task.id)}
                          disabled={submitting}
                          className="flex-1 btn-gradient py-1.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase disabled:opacity-50"
                        >
                          {submitting ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingTaskId(null)}
                          className="flex-1 border border-outline-variant/20 py-1.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase text-muted hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display mode */
                    <>
                      <div className="p-5 flex-1">
                        {/* Icon + Category */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-pink border border-outline-variant/10 flex-shrink-0">
                            <TaskCategoryIcon category={task.category} />
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-headline font-bold uppercase tracking-[0.15em] ${categoryColors[task.category] || "text-muted"}`}>
                              {task.category.replace("_", " ")}
                            </span>
                            <span className={`text-[10px] font-headline font-bold tracking-[0.15em] px-2 py-0.5 rounded border ${proofTypeBadge[task.proof_type] || "text-muted bg-muted/10 border-muted/20"}`}>
                              {task.proof_type}
                            </span>
                          </div>
                        </div>

                        <h3 className="font-headline font-bold text-base tracking-tight leading-tight mb-1">{task.title}</h3>
                        {task.description && (
                          <p className="text-xs text-muted leading-relaxed line-clamp-3">{task.description}</p>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-white/5 px-5 py-3 bg-surface-container">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] text-zinc-500 font-headline tracking-wider">
                            {"●".repeat(task.difficulty)}{"○".repeat(5 - task.difficulty)}
                          </span>
                          <span className="text-primary text-xs font-headline font-bold">+{task.xp_reward} XP</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveTask(task)}
                            disabled={submitting}
                            className="flex-1 flex items-center justify-center gap-1 rounded-sm bg-success/10 text-success border border-success/20 py-1.5 text-[10px] font-headline font-bold tracking-widest uppercase hover:bg-success/20 disabled:opacity-50 transition-colors"
                          >
                            {submitting ? <Loader2 size={10} className="animate-spin" /> : <ThumbsUp size={10} />}
                            Assign
                          </button>
                          <button
                            onClick={() => handleEditTask(task)}
                            className="flex-1 flex items-center justify-center gap-1 rounded-sm bg-primary/5 text-primary border border-primary/20 py-1.5 text-[10px] font-headline font-bold tracking-widest uppercase hover:bg-primary/10 transition-colors"
                          >
                            <Edit3 size={10} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleSkipTask(task.id)}
                            disabled={submitting}
                            className="flex-1 flex items-center justify-center gap-1 rounded-sm bg-[#ff3366]/5 text-[#ff3366] border border-[#ff3366]/20 py-1.5 text-[10px] font-headline font-bold tracking-widest uppercase hover:bg-[#ff3366]/10 disabled:opacity-50 transition-colors"
                          >
                            {submitting ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
                            Skip
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Punishments ────────────────────────────────── */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-headline font-bold tracking-tight flex items-center gap-3">
              <Zap size={20} className="text-[#ff3366]" />
              PUNISHMENT QUEUE
            </h2>
            <p className="text-muted text-xs font-label tracking-widest uppercase mt-1">
              {punishments.length} protocol{punishments.length !== 1 ? "s" : ""} pending
            </p>
          </div>
          <button
            onClick={handleGeneratePunishments}
            disabled={generatingPunishments}
            className="border border-[#ff3366]/30 text-[#ff3366] bg-[#ff3366]/5 px-4 py-2 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center gap-2 hover:bg-[#ff3366]/10 disabled:opacity-50 transition-colors"
          >
            {generatingPunishments ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            {generatingPunishments ? "Synthesizing..." : "Generate"}
          </button>
        </div>

        {punishments.length === 0 ? (
          <div className="bg-surface-container rounded-xl p-8 text-center border border-outline-variant/5">
            <p className="text-muted text-sm font-headline">No punishments queued. Generate some with AI.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {punishments.map((punishment) => (
              <div key={punishment.id} className="bg-surface-low rounded-xl border border-transparent hover:border-[#ff3366]/20 transition-all duration-300 overflow-hidden glow-border-secondary">
                <div className="flex items-start justify-between p-5 gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-headline font-bold text-sm tracking-tight">{punishment.title}</h3>
                      <span className={`text-[10px] font-headline font-bold tracking-[0.2em] px-2 py-0.5 rounded border ${punishmentStatusStyle[punishment.status] || "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"}`}>
                        {punishment.status.toUpperCase()}
                      </span>
                    </div>
                    {punishment.description && (
                      <p className="text-xs text-muted leading-relaxed mb-2">{punishment.description}</p>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-label text-zinc-500 uppercase tracking-widest">Severity</span>
                      <span className="text-xs ml-1">{"🔥".repeat(Math.min(punishment.severity, 5))}</span>
                    </div>
                  </div>

                  {punishment.status === "suggested" && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprovePunishment(punishment)}
                        disabled={submitting}
                        className="rounded-sm bg-success/10 text-success border border-success/20 p-2 hover:bg-success/20 disabled:opacity-50 transition-colors"
                        title="Assign punishment"
                      >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
                      </button>
                      <button
                        onClick={() => handleSkipPunishment(punishment.id)}
                        disabled={submitting}
                        className="rounded-sm bg-[#ff3366]/5 text-[#ff3366] border border-[#ff3366]/20 p-2 hover:bg-[#ff3366]/10 disabled:opacity-50 transition-colors"
                        title="Skip"
                      >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
