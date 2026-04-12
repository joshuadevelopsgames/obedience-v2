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
  Zap,
  ArrowRight,
  Play,
  ChevronRight,
  Camera,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { PhotoDemandButton } from "@/components/mistress/PhotoDemandButton";
import type { Profile, Pair, Task, MoodCheckin } from "@/types/database";

interface PhotoDemand {
  id: string;
  prompt: string;
  window_seconds: number;
  expires_at: string;
  status: 'pending' | 'fulfilled' | 'expired' | 'cancelled';
  photo_url: string | null;
  caption: string | null;
}

interface Props {
  profile: Profile;
  subProfile: Profile | null;
  pair: Pair | null;
  tasks: Task[];
  suggestions: Task[];
  recentMood: MoodCheckin[];
  activeDemand: PhotoDemand | null;
}

import { Frown, Meh, Smile, SmilePlus, Heart } from "lucide-react";

// Mood icon map: index 1-5 → icon + color
const moodIcons = [
  null,
  <Frown size={16} className="text-[#ff3366]" key="1" />,
  <Frown size={16} className="text-orange-400" key="2" />,
  <Meh size={16} className="text-zinc-400" key="3" />,
  <Smile size={16} className="text-[#00ff9d]" key="4" />,
  <SmilePlus size={16} className="text-primary" key="5" />,
];
const categoryColors: Record<string, string> = {
  service: "text-blue-400",
  obedience: "text-primary",
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
  activeDemand: initialDemand,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(suggestions);
  const [demand, setDemand] = useState<PhotoDemand | null>(initialDemand);
  const [demandSecondsLeft, setDemandSecondsLeft] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const supabase = createClient();

  // Countdown timer for pending demand
  const calcSecondsLeft = useCallback((expiresAt: string) =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)), []);

  useEffect(() => {
    if (!demand || demand.status !== 'pending') return;
    setDemandSecondsLeft(calcSecondsLeft(demand.expires_at));
    const interval = setInterval(() => {
      const s = calcSecondsLeft(demand.expires_at);
      setDemandSecondsLeft(s);
      if (s <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [demand?.id, demand?.status, demand?.expires_at, calcSecondsLeft]);

  // Realtime: watch for fulfillment or expiry
  useEffect(() => {
    if (!pair) return;
    const channel = supabase
      .channel('mistress-demand-watch')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'photo_demands', filter: `pair_id=eq.${pair.id}` },
        (payload) => {
          const updated = payload.new as PhotoDemand;
          setDemand(updated);
          if (updated.status === 'fulfilled') {
            toast.success('📸 Photo received!');
          } else if (updated.status === 'expired') {
            toast.error('⏰ Demand expired — punishment issued');
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pair?.id, supabase]);

  // Fetch signed URL when demand is fulfilled
  useEffect(() => {
    if (demand?.status !== 'fulfilled' || !demand.photo_url) return;
    supabase.storage.from('proofs').createSignedUrl(demand.photo_url, 3600)
      .then(({ data }) => { if (data) setPhotoUrl(data.signedUrl); });
  }, [demand?.status, demand?.photo_url, supabase]);

  const handleCancelDemand = async () => {
    if (!demand) return;
    const { error } = await supabase
      .from('photo_demands')
      .update({ status: 'cancelled' })
      .eq('id', demand.id);
    if (!error) {
      setDemand(null);
      toast.success('Demand cancelled');
    }
  };

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

  // Sub XP ring math
  const subLevel = subProfile?.level || 0;
  const subXp = subProfile?.xp || 0;
  const xpForLevel = (lvl: number) => lvl * lvl * 25;
  const subCurrentXp = xpForLevel(subLevel);
  const subNextXp = xpForLevel(subLevel + 1);
  const subProgress = subNextXp > subCurrentXp
    ? Math.max(2, Math.min(((subXp - subCurrentXp) / (subNextXp - subCurrentXp)) * 100, 100))
    : 50;

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
    <div className="flex flex-col gap-8 lg:gap-10">
      {/* ── Welcome Header ────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-primary text-xs font-headline tracking-[0.2em] font-bold">
            DOMINANT STATUS: ACTIVE
          </span>
        </div>
        <h1 className="text-5xl md:text-6xl font-headline font-bold leading-[0.9] tracking-tighter mb-3">
          COMMAND<br />
          <span className="text-gradient">CENTRE</span>
        </h1>
        <p className="text-muted max-w-md text-lg leading-relaxed">
          {profile.display_name || profile.title || "Dominant"} — your authority shapes everything.
          Guide, push, and watch your submissive grow under your hand.
        </p>
      </div>

      {/* ── Hero Section: 12-col grid ─────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Submissive Rank Card (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container p-8 rounded-2xl border border-white/5 glow-purple">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-headline text-xl font-bold tracking-tight">SUBMISSIVE RANK</h2>
            {subProfile && (
              <span className="text-xs font-headline text-primary bg-primary/10 px-3 py-1 rounded-full">
                LEVEL {String(subLevel).padStart(2, "0")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-8">
            {/* Glowing Progress Ring */}
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 rounded-full ring-gradient p-1">
                <div className="w-full h-full bg-surface-container rounded-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-headline font-bold">{Math.round(subProgress)}%</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Sync</p>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 ring-gradient opacity-20 blur-xl rounded-full" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Total XP</span>
                  <span className="text-primary">{subXp.toLocaleString()} / {subNextXp.toLocaleString()}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${subProgress}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-[10px] text-zinc-500 mb-1">Tasks Done</p>
                  <p className="text-lg font-headline font-bold">{completedToday.length}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-[10px] text-zinc-500 mb-1">Streak</p>
                  <p className="text-lg font-headline font-bold text-pink">
                    {subProfile?.streak_current || 0}d
                  </p>
                </div>
              </div>
            </div>
          </div>
          {subProfile && (
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-success" style={{ boxShadow: "0 0 8px rgba(34,197,94,0.5)" }} />
              <span className="text-sm text-foreground font-medium">
                {subProfile.collar_name || subProfile.display_name}
              </span>
              {avgMood > 0 && (
                <span className="ml-auto">{moodIcons[Math.round(avgMood)]}</span>
              )}
            </div>
          )}
        </div>

        {/* Active Missions (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-headline text-xl font-bold tracking-tight">ACTIVE MISSIONS</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {pair && subProfile && (
                demand && demand.status === 'pending' ? (
                  /* Pending demand status */
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#ff67ad]/10 border border-[#ff67ad]/30 rounded-sm">
                    <Camera size={12} className="text-[#ff67ad]" />
                    <span className="text-[10px] font-headline font-bold tracking-widest uppercase text-[#ff67ad]">
                      Waiting
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground tabular-nums">
                      {String(Math.floor(demandSecondsLeft / 60)).padStart(2, '0')}:{String(demandSecondsLeft % 60).padStart(2, '0')}
                    </span>
                    <button onClick={handleCancelDemand} className="ml-1 text-muted hover:text-foreground transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ) : demand && demand.status === 'fulfilled' ? (
                  /* Fulfilled — show photo thumbnail */
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#00ff9d]/10 border border-[#00ff9d]/30 rounded-sm">
                    <CheckCircle2 size={12} className="text-[#00ff9d]" />
                    <span className="text-[10px] font-headline font-bold tracking-widest uppercase text-[#00ff9d]">
                      Received
                    </span>
                    {photoUrl && (
                      <a href={photoUrl} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoUrl} alt="Submitted photo" className="h-7 w-7 rounded object-cover border border-[#00ff9d]/30 hover:opacity-80 transition-opacity" />
                      </a>
                    )}
                    <button onClick={() => setDemand(null)} className="ml-1 text-muted hover:text-foreground transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <PhotoDemandButton
                    pairId={pair.id}
                    slaveId={pair.slave_id}
                    slaveName={subProfile.collar_name || subProfile.display_name || 'submissive'}
                  />
                )
              )}
              <button
                onClick={handleGenerate}
                disabled={generating || !pair}
                className="btn-gradient flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs font-headline font-bold tracking-widest uppercase disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Brain size={14} />
                )}
                {generating ? "Processing" : "Generate"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {activeTasks.slice(0, 2).map((task, i) => (
              <div
                key={task.id}
                className={`bg-surface-container-high p-5 rounded-xl border-l-4 ${i === 0 ? "border-primary" : "border-pink"} hover:bg-surface-bright transition-all cursor-pointer group`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 ${i === 0 ? "bg-primary/10" : "bg-pink/10"} rounded-lg`}>
                    <Zap size={18} className={i === 0 ? "text-primary" : "text-pink"} />
                  </div>
                  {task.status === "in_progress" ? (
                    <span className="text-[8px] font-bold text-primary animate-pulse font-headline">LIVE TRACKING</span>
                  ) : (
                    <span className="text-[8px] font-bold text-pink font-headline">PENDING</span>
                  )}
                </div>
                <h3 className={`font-headline font-bold text-sm mb-1 group-hover:${i === 0 ? "text-primary" : "text-pink"} transition-colors`}>
                  {task.title.toUpperCase()}
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                  {task.description || `${task.category.replace("_", " ")} • +${task.xp_reward} XP`}
                </p>
                <div className={`mt-4 flex items-center ${i === 0 ? "text-primary" : "text-pink"} gap-2 group-hover:gap-4 transition-all`}>
                  <span className="text-xs font-bold uppercase tracking-widest font-headline">
                    {task.status === "proof_submitted" ? "Review" : "Synchronize"}
                  </span>
                  <ArrowRight size={14} />
                </div>
              </div>
            ))}

            {activeTasks.length < 2 &&
              Array.from({ length: 2 - activeTasks.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="bg-surface-container-high p-5 rounded-xl border border-outline-variant/5 flex flex-col items-center justify-center text-center"
                >
                  <Clock size={24} className="text-zinc-600 mb-2" />
                  <p className="text-xs text-zinc-500 font-headline">No active mission</p>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* ── AI Suggestions ────────────────────────── */}
      {aiSuggestions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-headline font-bold tracking-tight">AI DIRECTIVES</h3>
            <span className="text-[10px] font-headline uppercase tracking-widest text-muted">
              {aiSuggestions.length} Generated
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {aiSuggestions.map((task) => (
              <div
                key={task.id}
                className="bg-surface-low p-4 sm:p-6 rounded-xl border border-transparent hover:border-primary/20 transition-all duration-300 flex items-center justify-between gap-3 glow-border-primary group overflow-hidden"
              >
                <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary border border-outline-variant/10 flex-shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base sm:text-lg font-headline font-bold tracking-tight truncate">{task.title}</h4>
                    <div className="flex items-center gap-2 sm:gap-4 mt-1 flex-wrap">
                      <span className={`text-[10px] sm:text-xs font-headline font-medium ${categoryColors[task.category] || "text-muted"}`}>
                        {task.category.replace("_", " ").toUpperCase()}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700 flex-shrink-0" />
                      <span className="text-zinc-500 text-[10px] sm:text-xs font-headline">
                        {"●".repeat(task.difficulty)}{"○".repeat(5 - task.difficulty)}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700 flex-shrink-0" />
                      <span className="text-primary text-[10px] sm:text-xs font-headline font-bold">
                        +{task.xp_reward} XP
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleApprove(task)}
                    className="p-1.5 sm:p-2 text-success hover:bg-success/10 rounded-lg transition-colors"
                    title="Approve & assign"
                  >
                    <ThumbsUp size={16} />
                  </button>
                  <button
                    className="p-1.5 sm:p-2 text-zinc-500 hover:bg-white/5 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleReject(task)}
                    className="p-1.5 sm:p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                    title="Reject"
                  >
                    <ThumbsDown size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Neural Load Monitor (Bar Chart) ───────── */}
      <section className="bg-surface-container p-8 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-headline text-xl font-bold tracking-tight">NEURAL LOAD MONITOR</h2>
            <p className="text-xs text-zinc-500 mt-1">Protocol completion biometrics</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-headline">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink" />
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-headline">Pending</span>
            </div>
          </div>
        </div>
        {/* Decorative Chart */}
        <div className="h-48 w-full flex items-end gap-1 relative">
          {[40, 65, 45, 80, 60, 95, 85, 55, 70, 50].map((h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t-sm transition-colors ${
                i === 5 || i === 6
                  ? "bg-pink/30 hover:bg-pink/50"
                  : "bg-primary/20 hover:bg-primary/40"
              }`}
              style={{ height: `${h}%` }}
            />
          ))}
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-3 border border-white/10 rounded-lg">
            <p className="text-[10px] text-pink font-bold font-headline">EFFICIENCY</p>
            <p className="text-xl font-headline font-bold">
              {activeTasks.length > 0 ? `+${Math.round((completedToday.length / Math.max(activeTasks.length, 1)) * 100)}%` : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* ── Quick Actions ─────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={handleGenerate}
          disabled={generating || !pair}
          className="p-6 bg-surface-container border border-outline-variant/10 rounded-2xl flex flex-col items-center gap-3 hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50"
        >
          <Brain size={24} className="text-primary" />
          <span className="font-headline font-bold text-xs uppercase tracking-widest">New Protocol</span>
        </button>
        <button className="p-6 bg-surface-container border border-outline-variant/10 rounded-2xl flex flex-col items-center gap-3 hover:bg-pink/5 transition-all active:scale-95">
          <Sparkles size={24} className="text-pink" />
          <span className="font-headline font-bold text-xs uppercase tracking-widest">AI Analyze</span>
        </button>
        <button className="p-6 bg-surface-container border border-outline-variant/10 rounded-2xl flex flex-col items-center gap-3 hover:bg-primary/5 transition-all active:scale-95">
          <AlertTriangle size={24} className="text-primary" />
          <span className="font-headline font-bold text-xs uppercase tracking-widest">Review Queue</span>
        </button>
        <button className="p-6 bg-surface-container border border-outline-variant/10 rounded-2xl flex flex-col items-center gap-3 hover:bg-pink/5 transition-all active:scale-95">
          <CheckCircle2 size={24} className="text-pink" />
          <span className="font-headline font-bold text-xs uppercase tracking-widest">History</span>
        </button>
      </section>

      {/* ── Not paired ────────────────────────────── */}
      {!pair && (
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent)]" />
          <h2 className="relative text-2xl font-headline font-bold text-primary mb-3">Awaiting Pair Link</h2>
          <p className="relative text-muted max-w-md mx-auto">
            Share your protocol code with your submissive to establish the connection.
          </p>
        </div>
      )}
    </div>
  );
}
