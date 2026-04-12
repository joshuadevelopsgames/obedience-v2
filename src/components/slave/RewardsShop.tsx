"use client";

import {
  Gift,
  Zap,
  Lock,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
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

export function RewardsShop({
  profile,
  pair,
  rewards,
  redemptions,
}: Props) {
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleRedeem = async (reward: Reward) => {
    if (profile.xp < reward.xp_cost) {
      toast.error("Not enough XP");
      return;
    }

    setRedeeming(reward.id);

    // Insert redemption
    const { error: redemptionError } = await supabase
      .from("redemptions")
      .insert({
        reward_id: reward.id,
        user_id: profile.id,
        status: "pending",
      });

    if (!redemptionError) {
      // Update profile XP
      const newXp = profile.xp - reward.xp_cost;
      await supabase
        .from("profiles")
        .update({ xp: newXp })
        .eq("id", profile.id);

      toast.success(`Redeemed "${reward.title}"! Your Mistress will fulfill it soon.`);
      router.refresh();
    } else {
      toast.error("Failed to redeem reward");
    }
    setRedeeming(null);
  };

  const activeRedemptions = redemptions.filter((r) =>
    ["pending", "approved"].includes(r.status)
  );
  const completedRedemptions = redemptions.filter((r) =>
    ["fulfilled", "denied"].includes(r.status)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Gift size={24} className="text-accent" />
          Rewards Shop
        </h1>
        <p className="text-sm text-muted">Redeem your XP for special rewards from your Mistress</p>
      </div>

      {/* XP Balance */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted mb-1">Available XP</p>
            <p className="text-4xl font-bold text-accent">{profile.xp}</p>
          </div>
          <Zap size={32} className="text-accent opacity-50" />
        </div>
      </div>

      {/* Available Rewards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Available Rewards</h2>
        {rewards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Gift size={24} className="mx-auto mb-2 text-muted" />
            <p className="text-sm text-muted">
              No rewards available yet. Your Mistress will create some soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rewards.map((reward) => {
              const canAfford = profile.xp >= reward.xp_cost;
              const isRedeeming = redeeming === reward.id;

              return (
                <div
                  key={reward.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col"
                >
                  <div className="flex-1">
                    <h3 className="text-sm font-medium">{reward.title}</h3>
                    {reward.description && (
                      <p className="text-xs text-muted mt-1 line-clamp-2">
                        {reward.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-1">
                      <Zap size={14} className="text-accent" />
                      <span className="text-sm font-bold text-accent">
                        {reward.xp_cost}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRedeem(reward)}
                      disabled={!canAfford || isRedeeming}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                        canAfford
                          ? "bg-accent text-black hover:bg-accent/90"
                          : "bg-border text-muted cursor-not-allowed opacity-50"
                      }`}
                    >
                      {isRedeeming ? (
                        <>
                          <Clock size={12} />
                          Redeeming...
                        </>
                      ) : (
                        <>
                          {!canAfford ? <Lock size={12} /> : "Redeem"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Redemptions */}
      {activeRedemptions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Pending Redemptions</h2>
          <div className="space-y-2">
            {activeRedemptions.map((redemption) => {
              const reward = rewards.find((r) => r.id === redemption.reward_id);
              return (
                <div
                  key={redemption.id}
                  className="rounded-xl border border-purple/30 bg-purple/5 p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Clock size={14} className="text-purple" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {reward?.title || "Unknown reward"}
                      </p>
                      <p className="text-xs text-muted">
                        {redemption.status === "pending"
                          ? "Waiting for approval"
                          : "Approved"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Redemptions */}
      {completedRedemptions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Redemption History</h2>
          <div className="space-y-2">
            {completedRedemptions.map((redemption) => {
              const reward = rewards.find((r) => r.id === redemption.reward_id);
              return (
                <div
                  key={redemption.id}
                  className={`rounded-xl border p-3 flex items-center justify-between ${
                    redemption.status === "fulfilled"
                      ? "border-success/30 bg-success/5"
                      : "border-danger/30 bg-danger/5"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    {redemption.status === "fulfilled" ? (
                      <CheckCircle2 size={14} className="text-success" />
                    ) : (
                      <AlertCircle size={14} className="text-danger" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {reward?.title || "Unknown reward"}
                      </p>
                      <p className="text-xs text-muted">
                        {redemption.status === "fulfilled"
                          ? "Fulfilled"
                          : "Request denied"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted ml-2">
                    {new Date(redemption.created_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
