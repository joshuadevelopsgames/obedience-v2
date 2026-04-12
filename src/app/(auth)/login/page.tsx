"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<"mistress" | "slave" | null>(null);

  const handleDemoLogin = async (role: "mistress" | "slave") => {
    setDemoLoading(role);
    setError("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const credentials =
        role === "mistress"
          ? { email: "demo_mistress@taskflow.local", password: "Demo1234!" }
          : { email: "demo_slave@taskflow.local", password: "Demo1234!" };

      const { error } = await supabase.auth.signInWithPassword(credentials);
      if (error) {
        setError("Demo login failed. Please try again.");
        setDemoLoading(null);
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setDemoLoading(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Import and create client only inside the handler — never during SSR
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const email = `${username.toLowerCase().trim()}@taskflow.local`;

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Invalid username or password"
            : error.message
        );
        setLoading(false);
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-accent">
            Taskflow Pro
          </h1>
          <p className="mt-2 text-sm text-muted">Welcome back</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder-muted/50 outline-none transition-colors focus:border-accent"
              placeholder="—"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 pr-10 text-sm text-foreground placeholder-muted/50 outline-none transition-colors focus:border-accent"
                placeholder="—"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="mx-auto animate-spin" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted">or try a demo</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleDemoLogin("mistress")}
              disabled={demoLoading !== null || loading}
              className="rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {demoLoading === "mistress" ? (
                <Loader2 size={14} className="mx-auto animate-spin" />
              ) : (
                "Demo Mistress"
              )}
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin("slave")}
              disabled={demoLoading !== null || loading}
              className="rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {demoLoading === "slave" ? (
                <Loader2 size={14} className="mx-auto animate-spin" />
              ) : (
                "Demo Slave"
              )}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent hover:text-accent-hover">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
