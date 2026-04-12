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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
  profile: Profile;
}

const mistressNav = [
  { href: "/mistress", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/mistress/discover", icon: Sparkles, label: "Discover" },
  { href: "/mistress/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/mistress/journal", icon: BookOpen, label: "Journal" },
  { href: "/mistress/messages", icon: MessageCircle, label: "Messages" },
  { href: "/mistress/settings", icon: Settings, label: "Settings" },
];

const slaveNav = [
  { href: "/sub", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/sub/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/sub/rituals", icon: Shield, label: "Rituals" },
  { href: "/sub/journal", icon: BookOpen, label: "Journal" },
  { href: "/sub/messages", icon: MessageCircle, label: "Messages" },
  { href: "/sub/rewards", icon: Gift, label: "Rewards" },
  { href: "/sub/settings", icon: Settings, label: "Settings" },
];

export function AppShell({ children, profile }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const nav = profile.role === "mistress" ? mistressNav : slaveNav;

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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-16 flex-col items-center border-r border-border bg-card py-4 lg:w-56">
        {/* Logo */}
        <div className="mb-6 flex items-center gap-2 px-4">
          {profile.role === "mistress" ? (
            <Crown size={24} className="text-accent" />
          ) : (
            <Heart size={24} className="text-purple" />
          )}
          <span className="hidden text-sm font-bold lg:block">
            Taskflow Pro
          </span>
        </div>

        {/* Level badge */}
        <div className="mb-6 flex flex-col items-center px-2 w-full">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-accent">
              LV {profile.level}
            </span>
            <span className="hidden text-xs text-muted lg:block">
              {profile.xp} XP
            </span>
          </div>
          <div className="h-1 w-full max-w-[140px] rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-xp-bar xp-bar-fill"
              style={{ width: `${Math.max(2, Math.min(xpProgress, 100))}%` }}
            />
          </div>
          {profile.streak_current > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <span className="streak-flame text-xs">🔥</span>
              <span className="text-xs text-muted">
                {profile.streak_current}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 w-full px-2">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-card-hover hover:text-foreground"
                }`}
              >
                <item.icon size={18} />
                <span className="hidden lg:block">{item.label}</span>
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
          <span className="hidden lg:block">Sign Out</span>
        </button>
      </aside>

      {/* Main content */}
      <main className="ml-16 flex-1 lg:ml-56">
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
