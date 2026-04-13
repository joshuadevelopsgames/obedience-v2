"use client";

import {
  CheckCircle2,
  Clock,
  Brain,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Zap,
  ArrowRight,
  Camera,
  X,
  FileCheck,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import { PhotoDemandButton } from "@/components/mistress/PhotoDemandButton";
import type { Profile, Pair, Task, Proof, MoodCheckin } from "@/types/database";

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
  proofs: Proof[];
  suggestions: Task[];
  recentMood: MoodCheckin[];
  activeDemand: PhotoDemand | null;
}

import { Frown, Meh, Smile, SmilePlus } from "lucide-react";

const moodIcons = [
  null,
  <Frown size={16} className="text-[#ff3366]" key="1" />,
  <Frown size={16} className="text-orange-400" key="2" />,
  <Meh size={16} className="text-zinc-400" key="3" />,
  <Smile size={16} className="text-[#00ff9d]" key="4" />,
  <SmilePlus size={16} className="text-primary" key="5" />,
];

export function MistressDashboard({
  profile,
  subProfile,
  pair,
  tasks,
  proofs,
  suggestions,
  recentMood,
  activeDemand: initialDemand,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [demand, setDemand] = useState<PhotoDemand | null>(initialDemand);
  const [demandSecondsLeft, setDemandSecondsLeft] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

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
    const { error } = await supabase.from('photo_demands').update({ status: 'cancelled' }).eq('id', demand.id);
    if (!error) { setDemand(null); toast.success('Demand cancelled'); }
  };

  // Inline approve: award XP + update status
  const handleApproveProof = async (task: Task) => {
    setApprovingId(task.id);
    try {
      const { error } = await supabase.from("tasks").update({ status: "approved" }).eq("id", task.id);
      if (!error) {
        // Credit pair XP
        if (pair) {
          const { data: currentPair } = await supabase.from("pairs").select("slave_xp").eq("id", pair.id).single();
          const newXp = (currentPair?.slave_xp ?? 0) + task.xp_reward;
          const newLevel = Math.min(100, Math.floor(newXp / 500) + 1);
          await supabase.from("pairs").update({ slave_xp: newXp, slave_level: newLevel }).eq("id", pair.id);
        }
        setLocalTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: "approved" as const } : t));
        toast.success(`Approved! +${task.xp_reward} XP awarded`);
      } else {
        toast.error("Failed to approve");
      }
    } catch { toast.error("Error approving"); }
    setApprovingId(null);
  };

  // Inline reject: update task status to rejected
  const handleRejectProof = async (taskId: string) => {
    setRejectingId(taskId);
    try {
      const { error } = await supabase.from("tasks").update({ status: "rejected" }).eq("id", taskId);
      if (!error) {
        setLocalTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "rejected" as const } : t));
        toast.success("Submission rejected");
      } else {
        toast.error("Failed to reject");
      }
    } catch { toast.error("Error rejecting"); }
    setRejectingId(null);
  };

  const pendingProofs = localTasks.filter((t) => t.status === "proof_submitted");
  const activeTasks = localTasks.filter((t) => ["assigned", "in_progress"].includes(t.status));
  const completedToday = localTasks.filter(
    (t) => t.status === "completed" && new Date(t.updated_at).toDateString() === new Date().toDateString()
  );

  const avgMood = recentMood.length > 0
    ? recentMood.reduce((sum, m) => sum + m.mood, 0) / recentMood.length
    : 0;

  // Sub XP ring — use pair slave_xp if available, fall back to profile.xp
  const pairData = pair as any;
  const subXp = pairData?.slave_xp ?? subProfile?.xp ?? 0;
  const subLevel = pairData?.slave_level ?? subProfile?.level ?? 0;
  const xpInLevel = subXp % 500;
  const subProgress = Math.max(2, Math.min((xpInLevel / 500) * 100, 100));

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
        </p>
      </div>

      {/* ── Proof Action Centre (shown only when there are pending submissions) ── */}
      {pendingProofs.length > 0 && (
        <section className="bg-warning/5 border border-warning/20 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-warning/10">
            <div className="flex items-center gap-3">
              <FileCheck size={18} className="text-warning" />
              <h2 className="font-headline font-bold tracking-tight text-warning uppercase text-sm">
                {pendingProofs.length} Submission{pendingProofs.length !== 1 ? "s" : ""} Awaiting Review
              </h2>
            </div>
            <Link
              href="/mistress/tasks"
              className="text-[10px] font-headline uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              View all <ExternalLink size={10} />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {pendingProofs.map((task) => {
              const proof = proofs.find((p) => p.task_id === task.id);
              const isApproving = approvingId === task.id;
              const isRejecting = rejectingId === task.id;
              return (
                <div key={task.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-bold text-sm tracking-tight truncate">{task.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-zinc-500 font-headline uppercase tracking-wider">
                      <span>{task.category.replace("_", " ")}</span>
                      <span>·</span>
                      <span>+{task.xp_reward} XP</span>
                      {proof && (
                        <>
                          <span>·</span>
                          <span className="text-warning">{proof.proof_type} proof</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href="/mistress/tasks"
                      className="px-3 py-1.5 text-[10px] font-headline font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-200 border border-white/10 rounded transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleRejectProof(task.id)}
                      disabled={isRejecting || isApproving}
                      className="p-2 rounded bg-[#ff3366]/10 text-[#ff3366] border border-[#ff3366]/20 hover:bg-[#ff3366]/20 disabled:opacity-50 transition-colors"
                      title="Reject"
                    >
                      {isRejecting ? <Loader2 size={14} className="animate-spin" /> : <ThumbsDown size={14} />}
                    </button>
                    <button
                      onClick={() => handleApproveProof(task)}
                      disabled={isApproving || isRejecting}
                      className="p-2 rounded bg-success/10 text-success border border-success/20 hover:bg-success/20 disabled:opacity-50 transition-colors"
                      title="Approve"
                    >
                      {isApproving ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
                    <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">to next</p>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 ring-gradient opacity-20 blur-xl rounded-full" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">XP this level</span>
                  <span className="text-primary">{(xpInLevel).toLocaleString()} / 500</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${subProgress}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-[10px] text-zinc-500 mb-1">Done Today</p>
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
              <Link
                href="/mistress/tasks"
                className="btn-gradient flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs font-headline font-bold tracking-widest uppercase"
              >
                <Brain size={14} />
                Command Center
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {activeTasks.slice(0, 2).map((task, i) => (
              <Link
                key={task.id}
                href="/mistress/tasks"
                className={`bg-surface-container-high p-5 rounded-xl border-l-4 ${i === 0 ? "border-primary" : "border-pink"} hover:bg-surface-bright transition-all cursor-pointer group`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 ${i === 0 ? "bg-primary/10" : "bg-pink/10"} rounded-lg`}>
                    <Zap size={18} className={i === 0 ? "text-primary" : "text-pink"} />
                  </div>
                  <span className="text-[8px] font-bold text-primary font-headline">ACTIVE</span>
                </div>
                <h3 className={`font-headline font-bold text-sm mb-1 group-hover:${i === 0 ? "text-primary" : "text-pink"} transition-colors`}>
                  {task.title.toUpperCase()}
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                  {task.description || `${task.category.replace("_", " ")} • +${task.xp_reward} XP`}
                </p>
                <div className={`mt-4 flex items-center ${i === 0 ? "text-primary" : "text-pink"} gap-2 group-hover:gap-4 transition-all`}>
                  <span className="text-xs font-bold uppercase tracking-widest font-headline">View</span>
                  <ArrowRight size={14} />
                </div>
              </Link>
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
