import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { RewardsManager } from "@/components/mistress/RewardsManager";
import { RedemptionInbox } from "@/components/mistress/RedemptionInbox";
import { Gift, Inbox } from "lucide-react";

export default async function MistressRewardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pair } = await supabase
    .from("pairs")
    .select("*")
    .eq("mistress_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pair) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <Gift size={32} className="mx-auto mb-4 text-zinc-600" />
        <p className="text-muted font-headline">No active pairing found.</p>
      </div>
    );
  }

  const admin = createAdminClient();

  const { data: rewards } = await supabase
    .from("rewards")
    .select("*")
    .eq("pair_id", pair.id)
    .order("created_at", { ascending: false });

  // Fetch all redemptions for this pair's rewards, with slave profile info
  const allRewardIds = (rewards || []).map((r) => r.id);
  const { data: redemptions } = allRewardIds.length > 0
    ? await admin
        .from("redemptions")
        .select("*, profiles(collar_name, display_name)")
        .in("reward_id", allRewardIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const pendingCount = (redemptions || []).filter((r) => r.status === "pending").length;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-10 py-8 px-4 lg:px-0">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">REWARDS</h1>
        <p className="text-sm text-muted mt-1">Manage your submissive's reward store and redemption requests</p>
      </div>

      {/* Redemption Inbox */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Inbox size={14} className="text-primary" />
          <h2 className="text-sm font-headline font-bold tracking-widest uppercase">
            Redemption Inbox
          </h2>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-warning/10 border border-warning/20 text-warning text-[9px] font-headline font-bold tracking-widest">
              {pendingCount} pending
            </span>
          )}
        </div>
        <RedemptionInbox
          pairId={pair.id}
          redemptions={redemptions || []}
          rewards={rewards || []}
        />
      </section>

      {/* Reward Store Manager */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Gift size={14} className="text-primary" />
          <h2 className="text-sm font-headline font-bold tracking-widest uppercase">
            Reward Store
          </h2>
          <span className="text-[9px] font-label text-muted">
            {(rewards || []).filter((r) => r.available).length} active
          </span>
        </div>
        <RewardsManager pairId={pair.id} rewards={rewards || []} />
      </section>
    </div>
  );
}
