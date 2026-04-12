"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Shield, Zap } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center px-4 bg-surface-lowest relative overflow-hidden">
      {/* Floating atmosphere elements */}
      <div className="fixed top-40 -left-20 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="fixed bottom-40 -right-20 w-96 h-96 bg-pink/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-sm z-10">
        {/* Logo & Branding */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-headline font-bold tracking-tighter leading-[0.9] mb-4">
            THE <br />
            <span className="text-gradient">PROTOCOL</span>
          </h1>
          <p className="text-muted text-sm tracking-wide">
            Authenticate to access the void
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] font-label tracking-[0.2em] text-muted mb-2 uppercase">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-surface-container-high px-4 py-3 text-sm text-foreground placeholder-zinc-600 outline-none transition-all border-b-2 border-transparent focus:border-primary rounded-sm"
              placeholder="—"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-label tracking-[0.2em] text-muted mb-2 uppercase">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-high px-4 py-3 pr-10 text-sm text-foreground placeholder-zinc-600 outline-none transition-all border-b-2 border-transparent focus:border-primary rounded-sm"
                placeholder="—"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-danger/5 border-l-4 border-danger p-3 rounded-r-lg">
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-gradient w-full py-4 rounded-sm text-xs tracking-widest font-headline font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Execute Protocol <Zap size={14} />
              </>
            )}
          </button>
        </form>

        {/* Demo Divider */}
        <div className="mt-10">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="bg-surface-lowest px-3 font-label tracking-[0.2em] text-zinc-500 uppercase">
                Demo Access
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleDemoLogin("mistress")}
              disabled={demoLoading !== null || loading}
              className="p-4 bg-surface-container border border-outline-variant/10 rounded-2xl flex flex-col items-center gap-2 hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50"
            >
              {demoLoading === "mistress" ? (
                <Loader2 size={20} className="animate-spin text-primary" />
              ) : (
                <>
                  <Shield size={20} className="text-primary" />
                  <span className="font-headline font-bold text-[10px] uppercase tracking-widest">Commander</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin("slave")}
              disabled={demoLoading !== null || loading}
              className="p-4 bg-surface-container border border-outline-variant/10 rounded-2xl flex flex-col items-center gap-2 hover:bg-pink/5 transition-all active:scale-95 disabled:opacity-50"
            >
              {demoLoading === "slave" ? (
                <Loader2 size={20} className="animate-spin text-pink" />
              ) : (
                <>
                  <Zap size={20} className="text-pink" />
                  <span className="font-headline font-bold text-[10px] uppercase tracking-widest">Operative</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-500">
          New operative?{" "}
          <Link href="/signup" className="text-primary font-headline font-bold uppercase tracking-widest text-[10px] hover:text-pink transition-colors">
            Request Access
          </Link>
        </p>
      </div>
    </div>
  );
}
