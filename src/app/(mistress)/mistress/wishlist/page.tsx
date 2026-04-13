import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { WishlistView } from "@/components/shared/WishlistView";

export default async function WishlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "mistress") redirect("/dashboard");

  const { data: pair } = await supabase
    .from("pairs")
    .select("id")
    .eq("mistress_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pair) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl">
        <div>
          <h1 className="text-4xl font-headline font-bold tracking-tighter leading-[0.9] mb-2">
            WISHLIST<br /><span className="text-pink italic">& DESIRES</span>
          </h1>
          <p className="text-muted text-sm">Share what you want — link it, they'll find it.</p>
        </div>
        <div className="flex flex-col items-center justify-center bg-surface-low rounded-2xl border border-outline-variant/10 p-16 gap-4">
          <ShoppingBag size={24} className="text-zinc-600" />
          <p className="text-sm text-muted font-headline">No active pair yet.</p>
        </div>
      </div>
    );
  }

  const { data: items } = await supabase
    .from("wishlist_items")
    .select("*")
    .eq("pair_id", pair.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-4xl font-headline font-bold tracking-tighter leading-[0.9] mb-2">
          WISHLIST<br /><span className="text-pink italic">& DESIRES</span>
        </h1>
        <p className="text-muted text-sm">Paste a link — it'll pull the photo and title automatically.</p>
      </div>

      <WishlistView
        items={items || []}
        pairId={pair.id}
        currentUserId={user.id}
        isMistress={true}
      />
    </div>
  );
}
