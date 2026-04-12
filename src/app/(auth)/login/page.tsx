"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Dynamically import to avoid SSR issues
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const email = `${username.toLowerCase().trim()}@taskflow.local`;

      const { error } = await supabase.auth.signInWithPassword({ email, password });

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
    <div className="flex min-h-screen items-center justify-center px-4 bg-surface-lowest relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed top-40 -left-20 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="fixed bottom-40 -right-20 w-96 h-96 bg-pink/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-sm z-10">
        {/* Branding */}
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
              autoComplete="username"
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
                autoComplete="current-password"
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
              <>Execute Protocol <Zap size={14} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
