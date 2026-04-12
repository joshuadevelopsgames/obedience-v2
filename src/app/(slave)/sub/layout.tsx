import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shared/AppShell";
import { pickActivePair } from "@/lib/activePair";

export default async function SubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  if (!profile || profile.role !== "slave") redirect("/dashboard");

  // Fetch ALL active pairs for this slave + the mistress display name
  const { data: pairs } = await supabase
    .from("pairs")
    .select("*, mistress:profiles!pairs_mistress_id_fkey(display_name)")
    .eq("slave_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const allPairs = (pairs || []).map((p: any) => ({
    ...p,
    mistressName: p.mistress?.display_name ?? "Unknown",
  }));

  const activePair = await pickActivePair(allPairs);

  const pairSwitcherData = allPairs.map((p: any) => ({
    pairId: p.id,
    mistressName: p.mistressName,
  }));

  return (
    <AppShell
      profile={profile}
      pairSwitcher={
        pairSwitcherData.length > 1
          ? { pairs: pairSwitcherData, activePairId: activePair?.id ?? "" }
          : undefined
      }
    >
      {children}
    </AppShell>
  );
}
