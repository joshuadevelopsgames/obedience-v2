"use client";

import { useState } from "react";
import { Clock, CheckCircle2, XCircle, Gift, Zap, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Reward } from "@/types/database";

interface Redemption {
  id: string;
  reward_id: string;
  user_id: string;
  status: "pending" | "approved" | "fulfilled" | "denied";
  created_at: string;
  profiles?: { collar_name: string | null; display_name: string | null };
}

interface Props {
  pairId: string;
  redemptions: Redemption[];
  rewards: Reward[];
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function RedemptionInbox({ pairId, redemptions: initial, rewards }: Props) {
  const supabase = createClient();
  const [redemptions, setRedemptions] = useState<Redemption[]>(initial);
  const [acting, setActing] = useState<string | null>(null);

  const pending = redemptions.filter((r) => r.status === "pending");
  const approved = redemptions.filter((r) => r.status === "approved");
  const history = redemptions.filter((r) => ["fulfilled", "denied"].includes(r.status));

  const act = async (redemptionId: string, newStatus: "approved" | "fulfilled" | "denied") => {
    setActing(redemptionId);
    const { error } = await supabase
      .from("redemptions")
      .update({ status: newStatus })
      .eq("id", redemptionId);

    if (error) {
      toast.error("Failed to update redemption");
    } else {
      setRedemptions((prev) =>
        prev.map((r) => r.id === redemptionId ? { ...r, status: newStatus } : r)
      );
      const labels: Record<string, string> = {
        approved: "Redemption approved",
        fulfilled: "Marked as fulfilled ✓",
        denied: "Redemption denied",
      };
      toast.success(labels[newStatus]);
    }
    setActing(null);
  };

  if (pending.length === 0 && approved.length === 0 && history.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-outline-variant/10 rounded-xl">
        <Gift size={22} className="mx-auto mb-2 text-zinc-600" />
        <p className="text-xs text-muted font-headline">No redemptions yet</p>
      </div>
    );
  }

  const RedemptionCard = ({ r, actions }: { r: Redemption; actions: React.ReactNode }) => {
    const reward = rewards.find((rw) => rw.id === r.reward_id);
    const slaveName = r.profiles?.collar_name || r.profiles?.display_name || "submissive";
    const isActing = acting === r.id;
    return (
      <div className="flex items-start gap-3 bg-surface-container border border-outline-variant/10 rounded-xl px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Gift size={13} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-headline font-bold truncate">{reward?.title ?? "Unknown reward"}</p>
          <p className="text-[10px] text-muted font-label mt-0.5">
            {slaveName} · <span className="text-zinc-500">{timeAgo(r.created_at)}</span>
          </p>
          {reward && (
            <div className="flex items-center gap-1 mt-1">
              <Zap size={9} className="text-primary" />
              <span className="text-[9px] font-headline font-bold text-primary">{reward.xp_cost} XP</span>
            </div>
          )}
        </div>
        <div className="flex gap-1.5 items-center flex-shrink-0">
          {isActing ? (
            <Loader2 size={14} className="animate-spin text-muted" />
          ) : actions}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Pending — needs action */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-warning" />
            <p className="text-[10px] font-headline font-bold tracking-widest uppercase text-warning">
              Awaiting Action ({pending.length})
            </p>
          </div>
          {pending.map((r) => (
            <RedemptionCard
              key={r.id}
              r={r}
              actions={
                <>
                  <button
                    onClick={() => act(r.id, "approved")}
                    className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-lg text-[9px] font-headline font-bold tracking-widest uppercase hover:bg-primary/20 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => act(r.id, "denied")}
                    className="p-1.5 text-zinc-600 hover:text-[#ff3366] transition-colors rounded-lg"
                    title="Deny"
                  >
                    <XCircle size={15} />
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}

      {/* Approved — awaiting fulfilment */}
      {approved.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Star size={12} className="text-success" />
            <p className="text-[10px] font-headline font-bold tracking-widest uppercase text-success">
              Approved — Fulfill When Ready ({approved.length})
            </p>
          </div>
          {approved.map((r) => (
            <RedemptionCard
              key={r.id}
              r={r}
              actions={
                <button
                  onClick={() => act(r.id, "fulfilled")}
                  className="px-2.5 py-1 bg-success/10 border border-success/20 text-success rounded-lg text-[9px] font-headline font-bold tracking-widest uppercase hover:bg-success/20 transition-colors"
                >
                  Mark Fulfilled
                </button>
              }
            />
          ))}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-label uppercase tracking-widest text-zinc-600">History</p>
          {history.map((r) => {
            const reward = rewards.find((rw) => rw.id === r.reward_id);
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 bg-surface-low border border-outline-variant/5 rounded-xl opacity-60">
                {r.status === "fulfilled"
                  ? <CheckCircle2 size={13} className="text-success flex-shrink-0" />
                  : <XCircle size={13} className="text-[#ff3366] flex-shrink-0" />
                }
                <p className="text-xs font-headline truncate flex-1">{reward?.title ?? "Unknown"}</p>
                <span className={`text-[8px] font-headline font-bold tracking-widest px-1.5 py-0.5 rounded border ${
                  r.status === "fulfilled"
                    ? "text-success bg-success/10 border-success/20"
                    : "text-[#ff3366] bg-[#ff3366]/10 border-[#ff3366]/20"
                }`}>
                  {r.status.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
