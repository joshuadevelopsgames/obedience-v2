"use client";

import {
  CheckCircle2,
  Clock,
  Flame,
  Shield,
  Trophy,
  AlertOctagon,
  Zap,
  ArrowRight,
  Play,
  Sparkles,
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
  obedience: "text-primary",
  training: "text-warning",
  self_care: "text-emerald-400",
  creative: "text-pink",
  endurance: "text-red-400",
  protocol: "text-cyan-400",
};

const levelTiers = [
  { max: 10, name: "Initiate", color: "text-zinc-400" },
  { max: 25, name: "Devoted", color: "text-blue-400" },
  { max: 50, name: "Bound", color: "text-primary" },
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

  // Ring math for 256px SVG (r=110)
  const ringCircumference = 2 * Math.PI * 110;
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
    <div className="flex flex-col gap-8 lg:gap-12">
      {/* ── Hero: Asymmetric Grid (Title + Progress Ring) ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-block px-3 py-1 bg-primary/10 border border-primary/20 rounded-lg">
            <span className="text-primary text-xs font-headline tracking-[0.2em] font-bold">
              OPERATIVE STATUS: ACTIVE
            </span>
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-headline font-bold leading-[0.9] tracking-tighter">
            THE <br />
            <span className="text-gradient">PROTOCOL</span>
          </h2>
          <p className="text-muted max-w-md text-lg leading-relaxed">
            {profile.collar_name || profile.display_name} — {tier.name} operative.
            Your progression is the only metric that matters.
          </p>
        </div>
        <div className="lg:col-span-5">
          <div className="p-8 bg-surface-container rounded-3xl border border-outline-variant/10 relative overflow-hidden">
            {/* Progress Ring */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative flex items-center justify-center">
                <svg className="w-64 h-64 -rotate-90 transform">
                  <circle
                    cx="128" cy="128" r="110"
                    fill="transparent"
                    stroke="var(--surface-container-highest)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="128" cy="128" r="110"
                    fill="transparent"
                    stroke="var(--primary)"
                    strokeWidth="12"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    className="neon-glow-primary"
                    style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-headline font-bold">
                    L-{String(profile.level).padStart(2, "0")}
                  </span>
                  <span className="text-muted text-sm font-label tracking-widest uppercase">
                    Rank Level
                  </span>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-headline font-bold">
                  {Math.round(clampedProgress)}% TO ASCENSION
                </h3>
                <p className="text-muted text-sm">
                  {profile.xp.toLocaleString()} XP / {nextLevelXp.toLocaleString()} XP
                </p>
              </div>
            </div>
            {/* Background Accent Glow */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/20 blur-[60px] rounded-full" />
          </div>
        </div>
      </section>

      {/* ── Safe Word ─────────────────────────────── */}
      {pair && pair.safe_word_state === "green" && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => triggerSafeWord("yellow")}
            className="flex items-center justify-center gap-3 bg-surface-container-high border border-warning/30 text-warning font-headline font-bold py-5 px-8 rounded-2xl active:scale-95 transition-transform hover:bg-warning/5"
          >
            Slow Down
          </button>
          <button
            onClick={() => triggerSafeWord("red")}
            className="flex items-center justify-center gap-3 bg-surface-container-high border border-danger text-danger font-headline font-bold py-5 px-8 rounded-2xl active:scale-95 transition-transform hover:bg-danger/5 safe-word-pulse"
          >
            Full Stop
          </button>
        </section>
      )}

      {pair?.safe_word_state === "red" && (
        <div className="bg-danger/10 border border-danger/30 p-6 rounded-2xl flex items-center gap-4">
          <AlertOctagon size={24} className="text-danger flex-shrink-0" />
          <div>
            <p className="font-headline font-bold text-danger">Protocol Halted</p>
            <p className="text-sm text-muted mt-1">All directives paused. Take the time you need.</p>
          </div>
        </div>
      )}

      {/* ── Bento Grid: Streak + Active Commands ──── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Streak Card (1 col, tall) */}
        <div className="md:col-span-1 bg-surface-container-high rounded-2xl p-6 border border-outline-variant/5 flex flex-col justify-between card-glow">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-xl bg-pink/10 flex items-center justify-center">
              <Flame size={24} className="text-pink neon-glow-secondary" />
            </div>
            <span className="text-muted text-[10px] font-label uppercase tracking-widest">Momentum</span>
          </div>
          <div className="mt-8">
            <span className="text-5xl font-headline font-bold">{profile.streak_current}</span>
            <h3 className="text-muted font-label tracking-tighter">DAY STREAK</h3>
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm text-muted">
            <Trophy size={14} />
            <span>Best: {profile.streak_best}</span>
          </div>
          <div className="mt-4 h-1 w-full bg-surface-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-pink rounded-full"
              style={{
                width: `${Math.min(100, (profile.streak_current / Math.max(profile.streak_best, 1)) * 100)}%`,
                boxShadow: "0 0 8px rgba(255,103,173,0.5)"
              }}
            />
          </div>
        </div>

        {/* Active Commands (2 cols, 2 sub-cards) */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeTasks.slice(0, 2).map((task, i) => {
            const isFirst = i === 0;
            const accentColor = isFirst ? "primary" : "pink";
            return (
              <div
                key={task.id}
                className={`p-6 bg-surface-container rounded-2xl border border-outline-variant/10 hover:border-${accentColor}/50 transition-all cursor-pointer group flex flex-col justify-between`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Zap size={20} className={isFirst ? "text-primary" : "text-pink"} />
                    <span className={`px-2 py-1 bg-surface-highest text-${accentColor} text-[10px] font-bold font-headline rounded`}>
                      {task.status === "in_progress" ? "IN PROGRESS" : "PENDING"}
                    </span>
                  </div>
                  <h4 className="text-2xl font-headline font-bold leading-tight">{task.title}</h4>
                  <p className="text-muted text-sm line-clamp-2">
                    {task.description || `${task.category.replace("_", " ")} protocol • +${task.xp_reward} XP`}
                  </p>
                </div>
                <div className={`mt-6 flex items-center text-${accentColor} gap-2 group-hover:gap-4 transition-all`}>
                  {task.status === "assigned" ? (
                    <button
                      onClick={() => handleStartTask(task)}
                      className="text-xs font-bold uppercase tracking-widest font-headline flex items-center gap-2"
                    >
                      Initialize <Play size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                      className="text-xs font-bold uppercase tracking-widest font-headline flex items-center gap-2"
                    >
                      Synchronize <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* If fewer than 2 active tasks, show placeholder */}
          {activeTasks.length < 2 &&
            Array.from({ length: 2 - activeTasks.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="p-6 bg-surface-container rounded-2xl border border-outline-variant/5 flex flex-col items-center justify-center text-center"
              >
                <Clock size={24} className="text-zinc-600 mb-3" />
                <p className="text-sm text-zinc-500 font-headline">Awaiting orders</p>
              </div>
            ))}
        </div>
      </section>

      {/* ── Quick Stats Row ───────────────────────── */}
      <section className="grid grid-cols-3 gap-4">
        <div className="bg-surface-container-high rounded-2xl p-6 border border-outline-variant/5 card-glow">
          <span className="text-muted text-[10px] font-label uppercase tracking-widest">Active</span>
          <p className="text-3xl font-headline font-bold mt-2">{activeTasks.length}</p>
        </div>
        <div className="bg-surface-container-high rounded-2xl p-6 border border-outline-variant/5 card-glow">
          <span className="text-muted text-[10px] font-label uppercase tracking-widest">Review</span>
          <p className="text-3xl font-headline font-bold mt-2 text-pink">{pendingReview.length}</p>
        </div>
        <div className="bg-surface-container-high rounded-2xl p-6 border border-outline-variant/5 card-glow">
          <span className="text-muted text-[10px] font-label uppercase tracking-widest">Today</span>
          <p className="text-3xl font-headline font-bold mt-2 text-success">{completedToday.length}</p>
        </div>
      </section>

      {/* ── Rituals ───────────────────────────────── */}
      {rituals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-headline font-bold tracking-tight">RITUALS</h3>
            <span className="text-[10px] font-headline uppercase tracking-widest text-muted">
              {rituals.length} Active
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {rituals.map((ritual) => (
              <div
                key={ritual.id}
                className="bg-surface-low p-6 rounded-xl border border-transparent hover:border-primary/20 transition-all duration-300 flex items-center justify-between glow-border-primary"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary border border-outline-variant/10">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-headline font-bold tracking-tight">{ritual.title}</h4>
                    <span className="text-zinc-500 text-xs font-headline uppercase tracking-widest">
                      {ritual.schedule || "Daily"}
                    </span>
                  </div>
                </div>
                <button className="btn-gradient px-6 py-3 rounded-sm text-xs tracking-widest font-headline font-bold uppercase flex items-center gap-2">
                  Execute <Zap size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Tasks List ────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-headline font-bold tracking-tight">ASSIGNED PROTOCOLS</h3>
          <span className="text-[10px] font-headline uppercase tracking-widest text-muted">
            {activeTasks.length} Pending
          </span>
        </div>

        {activeTasks.length === 0 ? (
          <div className="bg-surface-container-high rounded-xl p-12 text-center border border-outline-variant/5">
            <Clock size={32} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-muted font-headline">No active protocols. Awaiting directives from Command.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activeTasks.map((task) => (
              <div key={task.id}>
                <div
                  className="bg-surface-low p-6 rounded-xl border border-transparent hover:border-primary/20 transition-all duration-300 flex items-center justify-between glow-border-primary"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-pink border border-outline-variant/10">
                      <ListIcon category={task.category} />
                    </div>
                    <div>
                      <h4 className="text-lg font-headline font-bold tracking-tight">{task.title}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className={`text-xs font-headline font-medium ${categoryColors[task.category] || "text-muted"}`}>
                          {task.category.replace("_", " ").toUpperCase()}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="text-zinc-500 text-xs font-headline uppercase tracking-widest">
                          +{task.xp_reward} XP
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <StatusPill status={task.status} />
                    {task.status === "assigned" ? (
                      <button
                        onClick={() => handleStartTask(task)}
                        className="text-primary hover:text-foreground transition-colors"
                      >
                        <Play size={20} />
                      </button>
                    ) : (
                      <button
                        onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                        className="text-success hover:text-foreground transition-colors"
                      >
                        <CheckCircle2 size={20} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Proof submission */}
                {expandedTask === task.id && (
                  <div className="bg-surface-container p-6 rounded-b-xl border-x border-b border-outline-variant/10 -mt-1">
                    <p className="text-[10px] font-label tracking-widest text-muted mb-3 uppercase">
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
      </section>

      {/* ── Not paired ────────────────────────────── */}
      {!pair && (
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent)]" />
          <h2 className="relative text-2xl font-headline font-bold text-primary mb-3">Awaiting Connection</h2>
          <p className="relative text-muted max-w-md mx-auto">
            Request a protocol code from your Commander or share yours from settings.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    assigned: "text-[#00ff9d] bg-[#00ff9d]/5 border-[#00ff9d]/20",
    in_progress: "text-primary bg-primary/5 border-primary/20",
    proof_submitted: "text-warning bg-warning/5 border-warning/20",
    approved: "text-success bg-success/5 border-success/20",
    rejected: "text-[#ff3366] bg-[#ff3366]/5 border-[#ff3366]/20",
  };
  return (
    <span className={`text-[10px] font-headline font-bold tracking-[0.2em] px-3 py-1 rounded border ${styles[status] || "text-zinc-400 bg-zinc-400/5 border-zinc-400/20"}`}>
      {status.replace("_", " ").toUpperCase()}
    </span>
  );
}

function ListIcon({ category }: { category: string }) {
  // Simple category icon mapping
  const icons: Record<string, React.ReactNode> = {
    service: <Shield size={20} />,
    obedience: <Zap size={20} />,
    training: <Flame size={20} />,
    self_care: <Clock size={20} />,
    creative: <Sparkles size={20} />,
    endurance: <Trophy size={20} />,
    protocol: <Shield size={20} />,
  };
  return <>{icons[category] || <Zap size={20} />}</>;
}

