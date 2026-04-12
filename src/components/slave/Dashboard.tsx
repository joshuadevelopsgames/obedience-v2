"use client";

import {
  CheckCircle2,
  Clock,
  Flame,
  Shield,
  Trophy,
  AlertOctagon,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ProofUpload } from "@/components/shared/ProofUpload";
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
  obedience: "text-accent",
  training: "text-warning",
  self_care: "text-emerald-400",
  creative: "text-pink",
  endurance: "text-red-400",
  protocol: "text-cyan-400",
};

const levelTiers = [
  { max: 10, name: "Initiate", color: "text-zinc-400" },
  { max: 25, name: "Devoted", color: "text-blue-400" },
  { max: 50, name: "Bound", color: "text-accent" },
  { max: 75, name: "Surrendered", color: "text-pink" },
  { max: 100, name: "Transcendent", color: "text-warning" },
];

export function SubDashboard({
  profile,
  pair,
  tasks,
  rituals,
}: Props) {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
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
  const clampedProgress = Math.max(2, Math.min(xpProgress, 100));

  // Circular ring math
  const ringRadius = 52;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (ringCircumference * clampedProgress) / 100;

  const handleStartTask = async (task: Task) => {
    await supabase
      .from("tasks")
      .update({ status: "in_progress" })
      .eq("id", task.id);
    toast.success("Task started!");
    router.refresh();
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
        ? "Yellow — slowing down. Your Commander has been notified."
        : "Red — full stop. All protocols paused.",
      { duration: 5000 }
    );
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Hero / Level Card with circular ring */}
      <div
        className="rounded-xl border border-border bg-card p-6"
        style={{ background: "linear-gradient(180deg, rgba(155,109,255,0.04) 0%, var(--card) 100%)" }}
      >
        <div className="flex items-center gap-5">
          {/* Circular XP Ring */}
          <div className="relative flex-shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle
                cx="60" cy="60" r={ringRadius}
                fill="none"
                stroke="var(--border)"
                strokeWidth="5"
              />
              <circle
                cx="60" cy="60" r={ringRadius}
                fill="none"
                stroke="url(#heroGradient)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="progress-ring-circle"
              />
              <defs>
                <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--pink)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{profile.level}</span>
              <span className="text-[9px] font-tech tracking-wider text-muted">Level</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="font-tech text-lg tracking-wider text-glow-purple truncate">
              {profile.collar_name || profile.display_name}
            </h1>
            <p className={`text-xs font-tech tracking-wider ${tier.color} mt-0.5`}>
              {tier.name}
            </p>

            {/* XP text */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-muted">{profile.xp}</span>
              <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full xp-bar-fill"
                  style={{ width: `${clampedProgress}%` }}
                />
              </div>
              <span className="text-xs text-muted">{nextLevelXp}</span>
            </div>

            {/* Streak */}
            <div className="flex items-center gap-3 mt-2">
              {profile.streak_current > 0 && (
                <div className="flex items-center gap-1">
                  <Flame size={14} className="text-orange-400 streak-flame" />
                  <span className="text-xs font-medium text-foreground">
                    {profile.streak_current}d
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted">
                <Trophy size={12} />
                <span>Best: {profile.streak_best}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safe Word (always visible when green) */}
      {pair && pair.safe_word_state === "green" && (
        <div className="flex gap-2">
          <button
            onClick={() => triggerSafeWord("yellow")}
            className="flex-1 rounded-lg border border-warning/20 bg-warning/5 py-2.5 text-[10px] font-tech tracking-wider text-warning hover:bg-warning/10 transition-colors"
          >
            Slow Down
          </button>
          <button
            onClick={() => triggerSafeWord("red")}
            className="flex-1 rounded-lg border border-danger/20 bg-danger/5 py-2.5 text-[10px] font-tech tracking-wider text-danger hover:bg-danger/10 transition-colors safe-word-pulse"
          >
            Full Stop
          </button>
        </div>
      )}

      {pair?.safe_word_state === "red" && (
        <div className="rounded-xl border border-danger/40 bg-danger/5 p-4 flex items-center gap-3">
          <AlertOctagon size={20} className="text-danger flex-shrink-0" />
          <div>
            <p className="text-xs font-tech tracking-wider text-danger">Protocol Halted</p>
            <p className="text-xs text-muted mt-0.5">
              All directives paused. Take the time you need.
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center card-glow">
          <p className="text-xl font-bold text-foreground">{activeTasks.length}</p>
          <p className="text-[10px] font-tech tracking-wider text-muted mt-0.5">Active</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center card-glow">
          <p className="text-xl font-bold text-foreground">{pendingReview.length}</p>
          <p className="text-[10px] font-tech tracking-wider text-muted mt-0.5">Pending</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center card-glow">
          <p className="text-xl font-bold text-success">{completedToday.length}</p>
          <p className="text-[10px] font-tech tracking-wider text-muted mt-0.5">Today</p>
        </div>
      </div>

      {/* Today's Rituals */}
      {rituals.length > 0 && (
        <div>
          <h2 className="font-tech text-xs tracking-wider text-muted mb-3 flex items-center gap-2">
            <Shield size={14} className="text-accent" />
            Rituals
          </h2>
          <div className="space-y-2">
            {rituals.map((ritual) => (
              <div
                key={ritual.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 card-glow"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{ritual.title}</p>
                  <p className="text-[10px] font-tech tracking-wider text-muted mt-0.5">
                    {ritual.schedule || "Daily"}
                  </p>
                </div>
                <button className="btn-neon rounded-lg px-3 py-1.5 text-[10px] font-tech tracking-wider">
                  Execute
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks */}
      <div>
        <h2 className="font-tech text-xs tracking-wider text-muted mb-3 flex items-center gap-2">
          <Zap size={14} className="text-pink" />
          Directives
        </h2>
        {activeTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center">
            <div className="mx-auto mb-3 w-10 h-10 rounded-full border border-border flex items-center justify-center">
              <Clock size={18} className="text-muted" />
            </div>
            <p className="text-sm text-muted">
              No active directives. Awaiting orders from Command.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-border bg-card overflow-hidden card-glow"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-[10px] font-tech tracking-wider ${categoryColors[task.category] || "text-muted"}`}
                      >
                        {task.category.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-muted/50">
                        {"●".repeat(task.difficulty)}
                        {"○".repeat(5 - task.difficulty)}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-foreground truncate">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <span className="text-[10px] font-tech text-accent">
                      +{task.xp_reward}
                    </span>
                    {task.status === "assigned" ? (
                      <button
                        onClick={() => handleStartTask(task)}
                        className="btn-neon rounded-lg px-3 py-1.5 text-[10px] font-tech tracking-wider"
                      >
                        Begin
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setExpandedTask(
                            expandedTask === task.id ? null : task.id
                          )
                        }
                        className="rounded-lg bg-success/10 border border-success/20 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20 transition-colors"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Proof submission */}
                {expandedTask === task.id && (
                  <div className="border-t border-border px-4 py-3 bg-background-elevated">
                    <p className="text-[10px] font-tech tracking-wider text-muted mb-2">
                      Submit proof — {task.proof_type}
                    </p>
                    <ProofUpload
                      taskId={task.id}
                      proofType={task.proof_type as any}
                      userId={profile.id}
                      onComplete={() => {
                        setExpandedTask(null);
                        router.refresh();
                      }}
                      onCancel={() => setExpandedTask(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Not paired */}
      {!pair && (
        <div
          className="rounded-xl border border-pink/20 p-6 text-center"
          style={{ background: "linear-gradient(180deg, rgba(255,77,141,0.05) 0%, transparent 100%)" }}
        >
          <h2 className="font-tech text-sm tracking-wider text-pink mb-2">
            Awaiting Connection
          </h2>
          <p className="text-sm text-muted">
            Request a protocol code from your Commander or share yours from settings.
          </p>
        </div>
      )}
    </div>
  );
}
