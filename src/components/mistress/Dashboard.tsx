"use client";

import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Brain,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Edit3,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Profile, Pair, Task, MoodCheckin } from "@/types/database";

interface Props {
  profile: Profile;
  subProfile: Profile | null;
  pair: Pair | null;
  tasks: Task[];
  suggestions: Task[];
  recentMood: MoodCheckin[];
}

const moodEmoji = ["", "😢", "😔", "😐", "🙂", "😊"];
const categoryColors: Record<string, string> = {
  service: "text-blue-400",
  obedience: "text-purple",
  training: "text-accent",
  self_care: "text-emerald-400",
  creative: "text-pink-400",
  endurance: "text-red-400",
  protocol: "text-cyan-400",
};

export function MistressDashboard({
  profile,
  subProfile,
  pair,
  tasks,
  suggestions,
  recentMood,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(suggestions);
  const supabase = createClient();

  const activeTasks = tasks.filter(
    (t) => !["completed", "expired", "suggested"].includes(t.status)
  );
  const pendingProofs = tasks.filter((t) => t.status === "proof_submitted");
  const completedToday = tasks.filter(
    (t) =>
      t.status === "completed" &&
      new Date(t.updated_at).toDateString() === new Date().toDateString()
  );

  const avgMood =
    recentMood.length > 0
      ? recentMood.reduce((sum, m) => sum + m.mood, 0) / recentMood.length
      : 0;

  const handleGenerate = async () => {
    if (!pair) {
      toast.error("You need to be paired first");
      return;
    }
    setGenerating(true);

    try {
      const res = await fetch("/api/ai/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId: pair.id }),
      });
      const data = await res.json();

      if (data.tasks) {
        setAiSuggestions(data.tasks);
        toast.success(`Generated ${data.tasks.length} task suggestions`);
      } else {
        toast.error(data.error || "Failed to generate tasks");
      }
    } catch {
      toast.error("Failed to generate tasks");
    }
    setGenerating(false);
  };

  const handleApprove = async (task: Task) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status: "assigned" })
      .eq("id", task.id);

    if (!error) {
      setAiSuggestions((prev) => prev.filter((t) => t.id !== task.id));
      toast.success("Task assigned!");
    }
  };

  const handleReject = async (task: Task) => {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id);

    if (!error) {
      setAiSuggestions((prev) => prev.filter((t) => t.id !== task.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Good {getTimeOfDay()}, {profile.display_name}
          </h1>
          {subProfile && (
            <p className="text-sm text-muted mt-1">
              {subProfile.collar_name || subProfile.display_name} is Level{" "}
              {subProfile.level} • {subProfile.streak_current} day streak
              {avgMood > 0 && (
                <span className="ml-2">
                  Mood: {moodEmoji[Math.round(avgMood)]}
                </span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || !pair}
          className="flex items-center gap-2 rounded-lg bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
        >
          {generating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Brain size={16} />
          )}
          {generating ? "Thinking..." : "Generate Tasks"}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Clock size={18} className="text-accent" />}
          label="Active Tasks"
          value={activeTasks.length}
        />
        <StatCard
          icon={<AlertTriangle size={18} className="text-yellow-400" />}
          label="Pending Review"
          value={pendingProofs.length}
        />
        <StatCard
          icon={<CheckCircle2 size={18} className="text-success" />}
          label="Completed Today"
          value={completedToday.length}
        />
        <StatCard
          icon={<Sparkles size={18} className="text-purple" />}
          label="AI Suggestions"
          value={aiSuggestions.length}
        />
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            AI Suggestions
          </h2>
          <div className="space-y-3">
            {aiSuggestions.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-border bg-card p-4 card-glow transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-medium ${categoryColors[task.category] || "text-muted"}`}
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
                    <h3 className="font-medium text-sm">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-muted mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={() => handleApprove(task)}
                      className="rounded-lg p-2 text-success hover:bg-success/10 transition-colors"
                      title="Approve & assign"
                    >
                      <ThumbsUp size={16} />
                    </button>
                    <button
                      className="rounded-lg p-2 text-muted hover:bg-card-hover transition-colors"
                      title="Edit before assigning"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleReject(task)}
                      className="rounded-lg p-2 text-danger hover:bg-danger/10 transition-colors"
                      title="Skip"
                    >
                      <ThumbsDown size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Tasks */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Active Tasks</h2>
        {activeTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted">
              No active tasks. Generate some with AI or create one manually.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={task.status} />
                    <span className="text-sm font-medium">{task.title}</span>
                  </div>
                  <span
                    className={`text-xs ${categoryColors[task.category] || "text-muted"}`}
                  >
                    {task.category.replace("_", " ")} • +{task.xp_reward} XP
                  </span>
                </div>
                {task.status === "proof_submitted" && (
                  <button className="rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20">
                    Review
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Not paired warning */}
      {!pair && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-6 text-center">
          <h2 className="font-semibold text-accent mb-2">Not Paired Yet</h2>
          <p className="text-sm text-muted">
            Share your pair code with your submissive to get started. Once
            paired, AI will generate personalized tasks.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    assigned: "bg-blue-400/10 text-blue-400",
    in_progress: "bg-accent/10 text-accent",
    proof_submitted: "bg-yellow-400/10 text-yellow-400",
    approved: "bg-success/10 text-success",
    rejected: "bg-danger/10 text-danger",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[status] || "bg-muted/10 text-muted"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
