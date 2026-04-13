import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PartnerProfileView } from "@/components/shared/PartnerProfileView";

export default async function PartnerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "mistress") redirect("/dashboard");

  // Get active pair
  const { data: pair } = await supabase
    .from("pairs")
    .select("*")
    .eq("mistress_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pair) redirect("/mistress");

  // Partner (slave) profile
  const { data: partnerProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", pair.slave_id)
    .single();

  if (!partnerProfile) redirect("/mistress");

  // Partner kinks with full kink details
  const { data: rawPartnerKinks } = await supabase
    .from("profile_kinks")
    .select("kink_id, kinks(id, name, description, category, is_custom, created_by, created_at)")
    .eq("profile_id", pair.slave_id);

  const partnerKinks = (rawPartnerKinks || [])
    .filter((pk: any) => pk.kinks)
    .map((pk: any) => ({ kink_id: pk.kink_id, kink: pk.kinks }));

  // Viewer (mistress) kink IDs for shared highlighting
  const { data: viewerKinkRows } = await supabase
    .from("profile_kinks")
    .select("kink_id")
    .eq("profile_id", user.id);

  const viewerKinkIds = new Set<string>((viewerKinkRows || []).map((r: any) => r.kink_id));

  // Partner limits with details
  const { data: rawPartnerLimits } = await supabase
    .from("profile_limits")
    .select("limit_id, category, limits_library(id, name, description, category)")
    .eq("profile_id", pair.slave_id)
    .eq("pair_id", pair.id);

  const partnerLimits = (rawPartnerLimits || [])
    .filter((pl: any) => pl.limits_library && (pl.category === "hard" || pl.category === "soft"))
    .map((pl: any) => ({
      id: pl.limit_id,
      name: pl.limits_library.name,
      description: pl.limits_library.description,
      category: pl.category as "hard" | "soft",
    }));

  // Recent mood check-ins (last 7, for slave)
  const { data: recentMood } = await supabase
    .from("mood_checkins")
    .select("*")
    .eq("pair_id", pair.id)
    .eq("user_id", pair.slave_id)
    .order("created_at", { ascending: false })
    .limit(7);

  return (
    <PartnerProfileView
      viewerProfile={profile}
      partnerProfile={partnerProfile}
      pair={pair}
      partnerKinks={partnerKinks}
      viewerKinkIds={viewerKinkIds}
      partnerLimits={partnerLimits}
      recentMood={recentMood || []}
      backHref="/mistress/messages"
    />
  );
}
