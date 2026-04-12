"use client";

import { Gift, Zap, Lock, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Profile, Pair, Reward } from "@/types/database";

interface Redemption {
  id: string;
  reward_id: string;
  user_id: string;
  status: "pending" | "approved" | "fulfilled" | "denied";
  created_at: string;
}

interface Props {
  profile: Profile;
  pair: Pair | null;
  rewards: Reward[];
  redemptions: Redemption[];
}

export function RewardsShop({ profile, pair, rewards, redemptions }: Props) {
  const [redeeming, setRedeeming] = useState<string | null>(null);
  // Track pair XP locally so balance updates instantly on redemption
  const [pairXp, setPairXp] = useState<number>(pair?.slave_xp ?? 0);
  const supabase = createClient();
  const router = useRouter();

  const handleRedeem = async (reward: Reward) => {
    if (!pair) { toast.error("Not paired"); return; }
    if (pairXp < reward.xp_cost) { toast.error("Not enough XP"); return; }

    setRedeeming(reward.id);
    const { error: redemptionError } = await supabase.from("redemptions").insert({
      reward_id: reward.id,
      user_id: profile.id,
      status: "pending",
    });
    if (!redemptionError) {
      const newXp = pairXp - reward.xp_cost;
      const newLevel = Math.min(100, Math.floor(newXp / 500) + 1);
      await supabase
        .from("pairs")
        .update({ slave_xp: newXp, slave_level: newLevel })
        .eq("id", pair.id);
      setPairXp(newXp); // instant UI update
      toast.success(`Redeemed "${reward.title}"! Your Mistress will fulfill it soon.`);
      router.refresh();
    } else { toast.error("Failed to redeem reward"); }
    setRedeeming(null);
  };

  const activeRedemptions = redemptions.filter((r) => ["pending", "approved"].includes(r.status));
  const completedRedemptions = redemptions.filter((r) => ["fulfilled", "denied"].includes(r.status));

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
        <div className="md:col-span-8">
          <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tighter leading-[0.9] mb-3">
            REWARDS<br />
            <span className="text-pink italic">EXCHANGE</span>
          </h1>
          <p className="text-muted text-lg max-w-md leading-relaxed">
            Your obedience has value. Redeem your earned XP for privileges from your Mistress.
          </p>
        </div>
        <div className="md:col-span-4">
          <div className="glass-panel border border-outline-variant/10 p-6 rounded-xl">
            <p className="text-[10px] font-label uppercase tracking-widest text-primary mb-2">Available Balance</p>
            <p className="text-4xl font-headline font-bold tracking-tight text-primary" style={{ textShadow: "0 0 20px rgba(204,151,255,0.4)" }}>
              {pairXp.toLocaleString()}
            </p>
            <p className="text-xs text-muted mt-1 font-label">XP available</p>
          </div>
        </div>
      </div>

      {/* Available Rewards */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-headline font-bold tracking-widest uppercase flex items-center gap-2">
              <Gift size={14} className="text-primary" />
              Available Rewards
            </h2>
            <p className="text-[10px] font-label uppercase tracking-widest text-muted mt-1">
              {rewards.length} reward{rewards.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>

        {rewards.length === 0 ? (
          <div className="bg-surface-container rounded-xl p-12 text-center border border-outline-variant/5">
            <Gift size={28} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-muted font-headline text-sm">No rewards yet — your Mistress will create some.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewards.map((reward) => {
              const canAfford = pairXp >= reward.xp_cost;
              const isRedeeming = redeeming === reward.id;

              return (
                <div key={reward.id} className={`bg-surface-low rounded-xl border transition-all duration-300 overflow-hidden flex flex-col ${canAfford ? "border-transparent hover:border-primary/20 glow-border-primary" : "border-outline-variant/5 opacity-60"}`}>
                  <div className="p-5 flex-1">
                    <h3 className="font-headline font-bold text-sm tracking-tight mb-1">{reward.title}</h3>
                    {reward.description && (
                      <p className="text-xs text-muted leading-relaxed line-clamp-2">{reward.description}</p>
                    )}
                  </div>
                  <div className="border-t border-white/5 px-5 py-3 bg-surface-container flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Zap size={14} className="text-primary" />
                      <span className="text-sm font-headline font-bold text-primary">{reward.xp_cost.toLocaleString()}</span>
                      <span className="text-xs text-muted font-label">XP</span>
                    </div>
                    <button
                      onClick={() => handleRedeem(reward)}
                      disabled={!canAfford || !!isRedeeming}
                      className={`px-4 py-1.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center gap-1.5 transition-colors ${
                        canAfford
                          ? "btn-gradient"
                          : "bg-surface-container-high text-muted border border-outline-variant/20 cursor-not-allowed"
                      }`}
                    >
                      {isRedeeming ? (
                        <><Clock size={10} /> Redeeming…</>
                      ) : !canAfford ? (
                        <><Lock size={10} /> Locked</>
                      ) : "Redeem"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Active Redemptions */}
      {activeRedemptions.length > 0 && (
        <section>
          <h2 className="text-xs font-label uppercase tracking-widest text-muted mb-4">Pending Redemptions</h2>
          <div className="flex flex-col gap-2">
            {activeRedemptions.map((redemption) => {
              const reward = rewards.find((r) => r.id === redemption.reward_id);
              return (
                <div key={redemption.id} className="bg-surface-low rounded-xl border border-primary/20 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-headline font-bold tracking-tight">{reward?.title || "Unknown reward"}</p>
                      <p className="text-[10px] font-label uppercase tracking-widest text-muted">
                        {redemption.status === "pending" ? "Awaiting approval" : "Approved"}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-headline font-bold tracking-widest px-2 py-0.5 rounded border ${
                    redemption.status === "approved"
                      ? "text-success bg-success/10 border-success/20"
                      : "text-primary bg-primary/10 border-primary/20"
                  }`}>
                    {redemption.status.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Redemption History */}
      {completedRedemptions.length > 0 && (
        <section>
          <h2 className="text-xs font-label uppercase tracking-widest text-muted mb-4">Redemption History</h2>
          <div className="flex flex-col gap-2">
            {completedRedemptions.map((redemption) => {
              const reward = rewards.find((r) => r.id === redemption.reward_id);
              return (
                <div key={redemption.id} className={`bg-surface-low rounded-xl border px-5 py-3 flex items-center justify-between ${
                  redemption.status === "fulfilled" ? "border-success/20" : "border-[#ff3366]/20"
                }`}>
                  <div className="flex items-center gap-3">
                    {redemption.status === "fulfilled"
                      ? <CheckCircle2 size={14} className="text-success flex-shrink-0" />
                      : <AlertCircle size={14} className="text-[#ff3366] flex-shrink-0" />
                    }
                    <div>
                      <p className="text-sm font-headline font-bold tracking-tight">{reward?.title || "Unknown reward"}</p>
                      <p className="text-[10px] font-label uppercase tracking-widest text-muted">
                        {redemption.status === "fulfilled" ? "Fulfilled" : "Denied"} · {new Date(redemption.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
