"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { Loader2, Link2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function OnboardPage() {
  const { user, profile, loading, supabase } = useUser();
  const [pairCode, setPairCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Always show spinner while loading — never redirect during this phase
  if (loading || !user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  const generatePairCode = () => {
    return user.id.slice(0, 8).toUpperCase();
  };

  const handlePair = async () => {
    setSubmitting(true);

    // Find the partner by their pair code (first 8 chars of their user id)
    const { data: partners } = await supabase
      .from("profiles")
      .select("id, role")
      .neq("id", user.id);

    const partner = partners?.find(
      (p) => p.id.slice(0, 8).toUpperCase() === pairCode.toUpperCase()
    );

    if (!partner) {
      toast.error("No user found with that pair code");
      setSubmitting(false);
      return;
    }

    if (partner.role === profile.role) {
      toast.error("You need to pair with someone in a different role");
      setSubmitting(false);
      return;
    }

    const mistressId =
      profile.role === "mistress" ? user.id : partner.id;
    const slaveId =
      profile.role === "slave" ? user.id : partner.id;

    const { error } = await supabase.from("pairs").insert({
      mistress_id: mistressId,
      slave_id: slaveId,
    });

    if (error) {
      toast.error("Failed to create pair: " + error.message);
      setSubmitting(false);
      return;
    }

    // Update both profiles
    await supabase
      .from("profiles")
      .update({ paired_with: partner.id, onboarded: true })
      .eq("id", user.id);

    await supabase
      .from("profiles")
      .update({ paired_with: user.id, onboarded: true })
      .eq("id", partner.id);

    toast.success("Paired successfully!");
    window.location.href = "/dashboard";
  };

  const handleSkip = async () => {
    setSubmitting(true);
    await supabase
      .from("profiles")
      .update({ onboarded: true })
      .eq("id", user.id);
    window.location.href = "/dashboard";
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Sparkles size={32} className="mx-auto mb-3 text-accent" />
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {profile.display_name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            You&apos;re a{" "}
            <span
              className={
                profile.role === "mistress" ? "text-accent" : "text-purple"
              }
            >
              {profile.role === "mistress" ? "Dominant" : "Submissive"}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 mb-4">
          <h2 className="text-sm font-semibold mb-1">Your Pair Code</h2>
          <p className="text-xs text-muted mb-3">
            Share this with your partner so they can connect
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-background p-3 font-mono text-lg tracking-widest text-accent">
            <Link2 size={16} className="text-muted" />
            {generatePairCode()}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <h2 className="text-sm font-semibold mb-1">
            Enter Partner&apos;s Code
          </h2>
          <p className="text-xs text-muted mb-3">
            Paste the code your partner shared with you
          </p>
          <input
            type="text"
            value={pairCode}
            onChange={(e) => setPairCode(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono tracking-widest text-foreground placeholder-muted/50 outline-none transition-colors focus:border-accent"
            placeholder="XXXXXXXX"
            maxLength={8}
          />
        </div>

        <button
          onClick={handlePair}
          disabled={pairCode.length < 8 || submitting}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-50 mb-3"
        >
          {submitting ? (
            <Loader2 size={16} className="mx-auto animate-spin" />
          ) : (
            "Connect"
          )}
        </button>

        <button
          onClick={handleSkip}
          disabled={submitting}
          className="w-full text-center text-sm text-muted hover:text-foreground"
        >
          Skip for now — pair later
        </button>
      </div>
    </div>
  );
}
