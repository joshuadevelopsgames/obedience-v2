import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { pickActivePair } from "@/lib/activePair";
import { WishlistView } from "@/components/shared/WishlistView";

export default async function SubWishlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "slave") redirect("/dashboard");

  const { data: allPairs } = await supabase
    .from("pairs")
    .select("*")
    .eq("slave_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const activePair = await pickActivePair(allPairs || []);
  if (!activePair) redirect("/sub");

  const { data: items } = await supabase
    .from("wishlist_items")
    .select("*")
    .eq("pair_id", activePair.id)
    .order("created_at", { ascending: false });

  // Get mistress name for the heading
  const { data: mistress } = await supabase
    .from("profiles")
    .select("display_name, collar_name")
    .eq("id", activePair.mistress_id)
    .single();

  const mistressName = mistress?.display_name || "Mistress";

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-4xl font-headline font-bold tracking-tighter leading-[0.9] mb-2">
          {mistressName.toUpperCase()}<br /><span className="text-primary italic">WISHLIST</span>
        </h1>
        <p className="text-muted text-sm">Things she desires — mark them purchased when you've taken care of it.</p>
      </div>

      <WishlistView
        items={items || []}
        pairId={activePair.id}
        currentUserId={user.id}
        isMistress={false}
      />
    </div>
  );
}
