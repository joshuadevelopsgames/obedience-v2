"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/types/database";
import {
  Crown,
  Heart,
  LayoutDashboard,
  ListTodo,
  BookOpen,
  Gift,
  Shield,
  MessageCircle,
  Settings,
  Sparkles,
  LogOut,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
  profile: Profile;
}

const mistressNav = [
  { href: "/mistress", icon: LayoutDashboard, label: "Command" },
  { href: "/mistress/discover", icon: Sparkles, label: "Discover" },
  { href: "/mistress/tasks", icon: ListTodo, label: "Directives" },
  { href: "/mistress/journal", icon: BookOpen, label: "Journal" },
  { href: "/mistress/messages", icon: MessageCircle, label: "Comms" },
  { href: "/mistress/settings", icon: Settings, label: "Settings" },
];

const slaveNav = [
  { href: "/sub", icon: LayoutDashboard, label: "Status" },
  { href: "/sub/tasks", icon: ListTodo, label: "Directives" },
  { href: "/sub/rituals", icon: Shield, label: "Rituals" },
  { href: "/sub/journal", icon: BookOpen, label: "Journal" },
  { href: "/sub/messages", icon: MessageCircle, label: "Comms" },
  { href: "/sub/rewards", icon: Gift, label: "Rewards" },
  { href: "/sub/settings", icon: Settings, label: "Settings" },
];

// Mobile bottom bar shows max 4 items + profile
const mistressMobileNav = [
  { href: "/mistress", icon: LayoutDashboard, label: "Home" },
  { href: "/mistress/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/mistress/messages", icon: MessageCircle, label: "Comms" },
  { href: "/mistress/settings", icon: User, label: "Profile" },
];

const slaveMobileNav = [
  { href: "/sub", icon: LayoutDashboard, label: "Home" },
  { href: "/sub/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/sub/messages", icon: MessageCircle, label: "Comms" },
  { href: "/sub/settings", icon: User, label: "Profile" },
];

export function AppShell({ children, profile }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isMistress = profile.role === "mistress";
  const nav = isMistress ? mistressNav : slaveNav;
  const mobileNav = isMistress ? mistressMobileNav : slaveMobileNav;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // XP progress to next level
  const xpForLevel = (lvl: number) => lvl * lvl * 25;
  const currentLevelXp = xpForLevel(profile.level);
  const nextLevelXp = xpForLevel(profile.level + 1);
  const xpProgress =
    ((profile.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  const clampedProgress = Math.max(2, Math.min(xpProgress, 100));

  return (
    <div className="flex min-h-screen">
      {/* ── Desktop Sidebar ───────────────────────── */}
      <aside className="fixed left-0 top-0 z-30 hidden md:flex h-screen w-16 flex-col items-center border-r border-border bg-card/80 backdrop-blur-sm py-5 lg:w-56">
        {/* Logo area */}
        <div className="mb-6 flex items-center gap-2.5 px-4">
          {isMistress ? (
            <Crown size={22} className="text-accent" />
          ) : (
            <Heart size={22} className="text-pink" />
          )}
          <span className="hidden font-tech text-xs tracking-widest text-foreground lg:block">
            The Protocol
          </span>
        </div>

        {/* Level ring (compact) */}
        <div className="mb-5 flex flex-col items-center px-2 w-full">
          <div className="relative w-11 h-11 mb-1.5">
            <svg className="w-full h-full" viewBox="0 0 44 44">
              <circle
                cx="22" cy="22" r="18"
                fill="none"
                stroke="var(--border)"
                strokeWidth="3"
              />
              <circle
                cx="22" cy="22" r="18"
                fill="none"
                stroke="url(#xpGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${113.1}`}
                strokeDashoffset={`${113.1 - (113.1 * clampedProgress) / 100}`}
                className="progress-ring-circle"
              />
              <defs>
                <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--pink)" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
              {profile.level}
            </span>
          </div>
          <span className="hidden text-[10px] text-muted lg:block">
            {profile.xp} / {nextLevelXp} XP
          </span>
          {profile.streak_current > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <span className="streak-flame text-xs">🔥</span>
              <span className="text-[10px] text-muted">
                {profile.streak_current}d
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-0.5 w-full px-2">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                  active
                    ? "nav-active-bar bg-accent/8 text-accent"
                    : "text-muted hover:bg-card-hover hover:text-foreground"
                }`}
              >
                <item.icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                <span className="hidden lg:block font-medium text-[13px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:text-danger transition-colors w-full mx-2"
        >
          <LogOut size={18} />
          <span className="hidden lg:block text-[13px]">Sign Out</span>
        </button>
      </aside>

      {/* ── Main content ──────────────────────────── */}
      <main className="flex-1 md:ml-16 lg:ml-56 pb-20 md:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">{children}</div>
      </main>

      {/* ── Mobile Bottom Tab Bar ─────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bottom-tab-bar">
        <div className="flex items-center justify-around px-2 py-1.5">
          {mobileNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                  active
                    ? "text-accent"
                    : "text-muted"
                }`}
              >
                <item.icon size={20} strokeWidth={active ? 2.2 : 1.6} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <span className="absolute -top-0.5 w-8 h-0.5 rounded-full bg-accent" style={{ boxShadow: '0 0 8px var(--accent-glow)' }} />
                )}
              </Link>
            );
          })}
        </div>
        {/* Safe area padding for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
