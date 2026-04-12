import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarded, must_change_password")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Fallback: If auth user exists but profile trigger failed, create it manually
    await supabase.from("profiles").insert({
      id: user.id,
      display_name: user.user_metadata?.display_name || "User",
      role: user.user_metadata?.role || "slave",
    });

    const { data: retryProfile } = await supabase
      .from("profiles")
      .select("role, onboarded, must_change_password")
      .eq("id", user.id)
      .single();
      
    if (!retryProfile) redirect("/login");
    profile = retryProfile;
  }

  // Force password change if flagged
  if (profile.must_change_password) redirect("/change-password");

  if (!profile.onboarded) redirect("/onboard");

  if (profile.role === "mistress") {
    redirect("/mistress");
  } else {
    redirect("/sub");
  }
}
