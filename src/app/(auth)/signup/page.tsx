"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Crown, Heart, Loader2 } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

type Role = "mistress" | "slave";

export default function SignupPage() {
  const [step, setStep] = useState<"details" | "role">("details");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const handleSignup = async () => {
    if (!role) return;
    setLoading(true);
    setError("");

    // Map username to internal email format
    const email = `${username.toLowerCase().trim()}@taskflow.local`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          display_name: displayName,
          username: username.toLowerCase().trim(),
        },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setError("That username is taken");
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      router.push("/onboard");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-accent">
            Taskflow Pro
          </h1>
          <p className="mt-2 text-sm text-muted">Create your account</p>
        </div>

        {step === "details" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep("role");
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder-muted/50 outline-none transition-colors focus:border-accent"
                placeholder="How you want to be known"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder-muted/50 outline-none transition-colors focus:border-accent"
                placeholder="Choose a username"
                required
                autoComplete="username"
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder-muted/50 outline-none transition-colors focus:border-accent"
                placeholder="At least 6 characters"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
            >
              Continue
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted mb-6">
              Choose your role
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRole("mistress")}
                className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
                  role === "mistress"
                    ? "border-accent bg-accent/10"
                    : "border-border bg-card hover:border-muted"
                }`}
              >
                <Crown
                  size={32}
                  className={
                    role === "mistress" ? "text-accent" : "text-muted"
                  }
                />
                <span className="text-sm font-medium">Dominant</span>
                <span className="text-xs text-muted text-center">
                  Guide, assign, curate
                </span>
              </button>

              <button
                onClick={() => setRole("slave")}
                className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
                  role === "slave"
                    ? "border-purple bg-purple/10"
                    : "border-border bg-card hover:border-muted"
                }`}
              >
                <Heart
                  size={32}
                  className={role === "slave" ? "text-purple" : "text-muted"}
                />
                <span className="text-sm font-medium">Submissive</span>
                <span className="text-xs text-muted text-center">
                  Serve, grow, earn
                </span>
              </button>
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <button
              onClick={handleSignup}
              disabled={!role || loading}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="mx-auto animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>

            <button
              onClick={() => setStep("details")}
              className="w-full text-center text-sm text-muted hover:text-foreground"
            >
              Back
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:text-accent-hover">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
