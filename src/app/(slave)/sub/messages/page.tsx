import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessagesView } from "@/components/shared/MessagesView";

export default async function SubMessagesPage() {
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

  // Get the pair
  const { data: pair } = await supabase
    .from("pairs")
    .select("*")
    .eq("slave_id", user.id)
    .eq("status", "active")
    .single();

  // Fetch messages
  const { data: messages } = pair
    ? await supabase
        .from("messages")
        .select("*")
        .eq("pair_id", pair.id)
        .order("created_at", { ascending: true })
        .limit(100)
    : { data: [] };

  // Fetch partner profile
  let partnerProfile = null;
  if (pair) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", pair.mistress_id)
      .single();
    partnerProfile = data;
  }

  return (
    <MessagesView
      pair={pair}
      profile={profile}
      partnerProfile={partnerProfile}
      initialMessages={messages || []}
    />
  );
}
