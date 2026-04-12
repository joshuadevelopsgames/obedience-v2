import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarded, must_change_password")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Force password change if flagged
  if (profile.must_change_password) redirect("/change-password");

  if (!profile.onboarded) redirect("/onboard");

  if (profile.role === "mistress") {
    redirect("/mistress");
  } else {
    redirect("/sub");
  }
}
