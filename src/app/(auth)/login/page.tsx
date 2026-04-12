"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
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
      const supabase = createClient();
      const credentials =
        role === "mistress"
          ? { email: "demo_mistress@taskflow.local", password: "Demo1234!" }
          : { email: "demo_slave@taskflow.local", password: "Demo1234!" };

      let { error } = await supabase.auth.signInWithPassword(credentials);

      if (error && error.message.includes("Invalid login credentials")) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: {
            data: {
              role: role,
              display_name: role === "mistress" ? "Demo Mistress" : "Demo Slave"
            }
          }
        });

        if (!signUpError) {
          const { error: loginError } = await supabase.auth.signInWithPassword(credentials);
          error = loginError;
        } else {
          error = signUpError;
        }
      }

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setError("Please disable 'Confirm email' in Supabase Auth -> Providers.");
        } else {
          setError(
            error.message === "Invalid login credentials"
              ? "Demo login failed. Users might not be seeded."
              : error.message
          );
        }
        setDemoLoading(null);
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      console.error("Demo login error:", err);
      setError("Something went wrong. Please try again.");
      setDemoLoading(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
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
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Subtle radial glow behind the card */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(155,109,255,0.08) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo & Branding */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-xl border border-border-glow bg-card flex items-center justify-center">
            <Shield size={24} className="text-accent" />
          </div>
          <h1 className="font-tech text-2xl tracking-widest text-glow-purple text-foreground">
            The Protocol
          </h1>
          <p className="mt-2 text-xs text-muted tracking-wide">
            Authenticate to continue
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-tech tracking-wider text-muted mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-border bg-card/80 px-3.5 py-2.5 text-sm text-foreground placeholder-muted/40 outline-none transition-all focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
              placeholder="—"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-tech tracking-wider text-muted mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-card/80 px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder-muted/40 outline-none transition-all focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                placeholder="—"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2">
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-neon w-full rounded-lg px-4 py-2.5 text-sm font-tech tracking-wider disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="mx-auto animate-spin" />
            ) : (
              "Initiate Protocol"
            )}
          </button>
        </form>

        {/* Demo Divider */}
        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="bg-background px-3 font-tech tracking-wider text-muted">
                Demo Access
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleDemoLogin("mistress")}
              disabled={demoLoading !== null || loading}
              className="rounded-lg border border-border bg-card/60 px-4 py-2.5 text-xs font-medium text-foreground transition-all hover:border-accent/40 hover:text-accent hover:shadow-[0_0_12px_rgba(155,109,255,0.1)] disabled:opacity-50"
            >
              {demoLoading === "mistress" ? (
                <Loader2 size={14} className="mx-auto animate-spin" />
              ) : (
                <span className="font-tech tracking-wide text-[10px]">Commander</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin("slave")}
              disabled={demoLoading !== null || loading}
              className="rounded-lg border border-border bg-card/60 px-4 py-2.5 text-xs font-medium text-foreground transition-all hover:border-pink/40 hover:text-pink hover:shadow-[0_0_12px_rgba(255,77,141,0.1)] disabled:opacity-50"
            >
              {demoLoading === "slave" ? (
                <Loader2 size={14} className="mx-auto animate-spin" />
              ) : (
                <span className="font-tech tracking-wide text-[10px]">Operative</span>
              )}
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          New operative?{" "}
          <Link href="/signup" className="text-accent hover:text-accent-hover transition-colors">
            Request access
          </Link>
        </p>
      </div>
    </div>
  );
}
