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
  Activity,
  Zap,
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
  obedience: "text-accent",
  training: "text-warning",
  self_care: "text-emerald-400",
  creative: "text-pink",
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
          <h1 className="font-tech text-xl tracking-wider text-glow-purple">
            Command Center
          </h1>
          {subProfile && (
            <p className="text-sm text-muted mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success status-dot" />
                <span className="text-foreground/80">
                  {subProfile.collar_name || subProfile.display_name}
                </span>
              </span>
              <span className="text-border">|</span>
              <span>Lv.{subProfile.level}</span>
              <span className="text-border">|</span>
              <span>{subProfile.streak_current}d streak</span>
              {avgMood > 0 && (
                <>
                  <span className="text-border">|</span>
                  <span>{moodEmoji[Math.round(avgMood)]}</span>
                </>
              )}
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || !pair}
          className="btn-neon flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-tech tracking-wider disabled:opacity-50"
        >
          {generating ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Brain size={15} />
          )}
          {generating ? "Processing..." : "Generate"}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Clock size={16} className="text-accent" />}
          label="Active"
          value={activeTasks.length}
          accent="accent"
        />
        <StatCard
          icon={<AlertTriangle size={16} className="text-warning" />}
          label="Review"
          value={pendingProofs.length}
          accent="warning"
        />
        <StatCard
          icon={<CheckCircle2 size={16} className="text-success" />}
          label="Complete"
          value={completedToday.length}
          accent="success"
        />
        <StatCard
          icon={<Sparkles size={16} className="text-pink" />}
          label="AI Queue"
          value={aiSuggestions.length}
          accent="pink"
        />
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div>
          <h2 className="font-tech text-xs tracking-wider text-muted mb-3 flex items-center gap-2">
            <Zap size={14} className="text-accent" />
            AI Directives
          </h2>
          <div className="space-y-2">
            {aiSuggestions.map((task) => (
              <div
                key={task.id}
                className="group rounded-xl border border-border bg-card p-4 card-glow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-tech tracking-wider ${categoryColors[task.category] || "text-muted"}`}
                      >
                        {task.category.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-muted/60">
                        {"●".repeat(task.difficulty)}
                        {"○".repeat(5 - task.difficulty)}
                      </span>
                      <span className="text-[10px] font-medium text-accent">
                        +{task.xp_reward} XP
                      </span>
                    </div>
                    <h3 className="font-medium text-sm text-foreground">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-muted mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleApprove(task)}
                      className="rounded-lg p-2 text-success hover:bg-success/10 transition-colors"
                      title="Approve & assign"
                    >
                      <ThumbsUp size={15} />
                    </button>
                    <button
                      className="rounded-lg p-2 text-muted hover:bg-card-hover hover:text-foreground transition-colors"
                      title="Edit before assigning"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleReject(task)}
                      className="rounded-lg p-2 text-danger hover:bg-danger/10 transition-colors"
                      title="Reject"
                    >
                      <ThumbsDown size={15} />
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
        <h2 className="font-tech text-xs tracking-wider text-muted mb-3 flex items-center gap-2">
          <Activity size={14} className="text-accent" />
          Active Protocols
        </h2>
        {activeTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center">
            <div className="mx-auto mb-3 w-10 h-10 rounded-full border border-border flex items-center justify-center">
              <Sparkles size={18} className="text-muted" />
            </div>
            <p className="text-sm text-muted">
              No active protocols. Generate directives with AI.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 card-glow"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <StatusChip status={task.status} />
                    <span className="text-sm font-medium text-foreground">{task.title}</span>
                  </div>
                  <span
                    className={`text-[10px] font-tech tracking-wider ${categoryColors[task.category] || "text-muted"}`}
                  >
                    {task.category.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-muted ml-2">
                    +{task.xp_reward} XP
                  </span>
                </div>
                {task.status === "proof_submitted" && (
                  <button className="btn-neon rounded-lg px-3 py-1.5 text-[10px] font-tech tracking-wider">
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
        <div className="rounded-xl border border-accent/20 p-6 text-center" style={{ background: 'linear-gradient(180deg, rgba(155,109,255,0.06) 0%, transparent 100%)' }}>
          <h2 className="font-tech text-sm tracking-wider text-accent mb-2">
            Awaiting Pair Link
          </h2>
          <p className="text-sm text-muted">
            Share your protocol code with your operative to establish the connection.
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
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 card-glow">
      <div className="flex items-center justify-between mb-3">
        {icon}
        <span className="text-[10px] font-tech tracking-wider text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    assigned: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    in_progress: "bg-accent/10 text-accent border-accent/20",
    proof_submitted: "bg-warning/10 text-warning border-warning/20",
    approved: "bg-success/10 text-success border-success/20",
    rejected: "bg-danger/10 text-danger border-danger/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-tech tracking-wider ${styles[status] || "bg-muted/10 text-muted border-muted/20"}`}
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
