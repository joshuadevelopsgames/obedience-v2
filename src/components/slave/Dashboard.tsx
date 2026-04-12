"use client";

import {
  CheckCircle2,
  Clock,
  Camera,
  FileText,
  Flame,
  Shield,
  Trophy,
  AlertOctagon,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Profile, Pair, Task, Ritual } from "@/types/database";

interface Props {
  profile: Profile;
  pair: Pair | null;
  tasks: Task[];
  rituals: Ritual[];
  achievements: unknown[];
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

const levelTiers = [
  { max: 10, name: "Initiate", color: "text-zinc-400" },
  { max: 25, name: "Devoted", color: "text-blue-400" },
  { max: 50, name: "Bound", color: "text-purple" },
  { max: 75, name: "Surrendered", color: "text-accent" },
  { max: 100, name: "Transcendent", color: "text-yellow-300" },
];

export function SubDashboard({
  profile,
  pair,
  tasks,
  rituals,
}: Props) {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [proofText, setProofText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const tier = levelTiers.find((t) => profile.level <= t.max) || levelTiers[4];
  const activeTasks = tasks.filter((t) =>
    ["assigned", "in_progress"].includes(t.status)
  );
  const pendingReview = tasks.filter((t) => t.status === "proof_submitted");
  const completedToday = tasks.filter(
    (t) =>
      t.status === "approved" &&
      t.updated_at &&
      new Date(t.updated_at).toDateString() === new Date().toDateString()
  );

  const xpForLevel = (lvl: number) => lvl * lvl * 25;
  const currentLevelXp = xpForLevel(profile.level);
  const nextLevelXp = xpForLevel(profile.level + 1);
  const xpProgress =
    ((profile.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

  const handleStartTask = async (task: Task) => {
    await supabase
      .from("tasks")
      .update({ status: "in_progress" })
      .eq("id", task.id);
    toast.success("Task started!");
    router.refresh();
  };

  const handleSubmitProof = async (task: Task) => {
    if (!proofText.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from("proofs").insert({
      task_id: task.id,
      submitted_by: profile.id,
      proof_type: "text",
      text_content: proofText,
    });

    if (!error) {
      await supabase
        .from("tasks")
        .update({ status: "proof_submitted" })
        .eq("id", task.id);
      setProofText("");
      setExpandedTask(null);
      toast.success("Proof submitted for review!");
      router.refresh();
    } else {
      toast.error("Failed to submit proof");
    }
    setSubmitting(false);
  };

  const triggerSafeWord = async (level: "yellow" | "red") => {
    if (!pair) return;
    await supabase
      .from("pairs")
      .update({
        safe_word_state: level,
        safe_word_at: new Date().toISOString(),
      })
      .eq("id", pair.id);

    toast(
      level === "yellow"
        ? "Yellow — slowing down. Your Dominant has been notified."
        : "Red — full stop. All tasks paused. Your Dominant has been notified.",
      { duration: 5000 }
    );
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Hero / Level Card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              {profile.collar_name || profile.display_name}
            </h1>
            <p className={`text-sm font-medium ${tier.color}`}>{tier.name}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-accent">{profile.level}</p>
            <p className="text-xs text-muted">Level</p>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>{profile.xp} XP</span>
            <span>{nextLevelXp} XP</span>
          </div>
          <div className="h-2.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-yellow-300 xp-bar-fill transition-all"
              style={{ width: `${Math.max(2, Math.min(xpProgress, 100))}%` }}
            />
          </div>
        </div>

        {/* Streak & Stats */}
        <div className="flex items-center gap-4 mt-3">
          {profile.streak_current > 0 && (
            <div className="flex items-center gap-1.5">
              <Flame size={16} className="text-orange-400 streak-flame" />
              <span className="text-sm font-medium">
                {profile.streak_current} day streak
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <Trophy size={14} />
            Best: {profile.streak_best}
          </div>
        </div>
      </div>

      {/* Safe Word (always visible) */}
      {pair && pair.safe_word_state === "green" && (
        <div className="flex gap-2">
          <button
            onClick={() => triggerSafeWord("yellow")}
            className="flex-1 rounded-lg border border-yellow-500/30 bg-yellow-500/5 py-2 text-xs font-medium text-yellow-400 hover:bg-yellow-500/10 transition-colors"
          >
            🟡 Slow Down
          </button>
          <button
            onClick={() => triggerSafeWord("red")}
            className="flex-1 rounded-lg border border-danger/30 bg-danger/5 py-2 text-xs font-medium text-danger hover:bg-danger/10 transition-colors safe-word-pulse"
          >
            🔴 Full Stop
          </button>
        </div>
      )}

      {pair?.safe_word_state === "red" && (
        <div className="rounded-xl border border-danger bg-danger/10 p-4 flex items-center gap-3">
          <AlertOctagon size={20} className="text-danger" />
          <div>
            <p className="text-sm font-medium text-danger">Safe Word Active</p>
            <p className="text-xs text-muted">
              All tasks are paused. Take the time you need.
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-bold">{activeTasks.length}</p>
          <p className="text-xs text-muted">Active</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-bold">{pendingReview.length}</p>
          <p className="text-xs text-muted">Pending</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xl font-bold text-success">
            {completedToday.length}
          </p>
          <p className="text-xs text-muted">Today</p>
        </div>
      </div>

      {/* Today's Rituals */}
      {rituals.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Shield size={18} className="text-purple" />
            Rituals
          </h2>
          <div className="space-y-2">
            {rituals.map((ritual) => (
              <div
                key={ritual.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{ritual.title}</p>
                  <p className="text-xs text-muted">
                    {ritual.schedule || "Daily"}
                  </p>
                </div>
                <button className="rounded-lg bg-purple/10 px-3 py-1.5 text-xs font-medium text-purple hover:bg-purple/20">
                  Begin
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Your Tasks</h2>
        {activeTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Clock size={24} className="mx-auto mb-2 text-muted" />
            <p className="text-sm text-muted">
              No tasks assigned yet. Your Dominant will send some your way.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-xs font-medium ${categoryColors[task.category] || "text-muted"}`}
                      >
                        {task.category.replace("_", " ")}
                      </span>
                      <span className="text-xs text-muted">
                        {"★".repeat(task.difficulty)}
                      </span>
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
                    {task.status === "assigned" ? (
                      <button
                        onClick={() => handleStartTask(task)}
                        className="rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
                      >
                        Start
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setExpandedTask(
                            expandedTask === task.id ? null : task.id
                          )
                        }
                        className="rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Proof submission */}
                {expandedTask === task.id && (
                  <div className="border-t border-border px-4 py-3 bg-background/50">
                    <p className="text-xs text-muted mb-2">
                      Submit your proof ({task.proof_type})
                    </p>
                    {task.proof_type === "photo" ? (
                      <button className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 w-full text-sm text-muted hover:border-accent hover:text-accent transition-colors">
                        <Camera size={16} />
                        Upload Photo
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={proofText}
                          onChange={(e) => setProofText(e.target.value)}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder-muted/50 outline-none focus:border-accent resize-none"
                          rows={3}
                          placeholder="Describe how you completed this task..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSubmitProof(task)}
                            disabled={!proofText.trim() || submitting}
                            className="flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-background hover:bg-success/80 disabled:opacity-50"
                          >
                            <FileText size={12} />
                            Submit
                          </button>
                          <button
                            onClick={() => {
                              setExpandedTask(null);
                              setProofText("");
                            }}
                            className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Not paired */}
      {!pair && (
        <div className="rounded-xl border border-purple/30 bg-purple/5 p-6 text-center">
          <h2 className="font-semibold text-purple mb-2">Not Paired Yet</h2>
          <p className="text-sm text-muted">
            Ask your Dominant for their pair code, or share yours from settings.
          </p>
        </div>
      )}
    </div>
  );
}
