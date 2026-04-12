"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
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
  SlidersHorizontal,
  Sparkles,
  LogOut,
  Lock,
  HelpCircle,
  Terminal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PairSwitcher } from "@/components/slave/PairSwitcher";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { NotificationBell } from "@/components/shared/NotificationBell";

interface PairSwitcherData {
  pairs: { pairId: string; mistressName: string }[];
  activePairId: string;
}

interface AppShellProps {
  children: React.ReactNode;
  profile: Profile;
  pairSwitcher?: PairSwitcherData;
}

const mistressNav = [
  { href: "/mistress", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/mistress/discover", icon: Sparkles, label: "Discover" },
  { href: "/mistress/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/mistress/journal", icon: BookOpen, label: "Journal" },
  { href: "/mistress/messages", icon: MessageCircle, label: "Comms" },
  { href: "/mistress/settings", icon: SlidersHorizontal, label: "Preferences" },
];

const slaveNav = [
  { href: "/sub", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/sub/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/sub/rituals", icon: Shield, label: "Chamber" },
  { href: "/sub/journal", icon: BookOpen, label: "Journal" },
  { href: "/sub/messages", icon: MessageCircle, label: "Comms" },
  { href: "/sub/rewards", icon: Gift, label: "Vault" },
  { href: "/sub/settings", icon: SlidersHorizontal, label: "Preferences" },
];

// Mobile bottom bar — Comms moved to floating FAB
const mistressMobileNav = [
  { href: "/mistress", icon: LayoutDashboard, label: "Home" },
  { href: "/mistress/discover", icon: Sparkles, label: "Discover" },
  { href: "/mistress/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/mistress/journal", icon: BookOpen, label: "Journal" },
  { href: "/mistress/settings", icon: SlidersHorizontal, label: "Prefs" },
];

const slaveMobileNav = [
  { href: "/sub", icon: LayoutDashboard, label: "Home" },
  { href: "/sub/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/sub/journal", icon: BookOpen, label: "Journal" },
  { href: "/sub/rituals", icon: Shield, label: "Chamber" },
  { href: "/sub/settings", icon: SlidersHorizontal, label: "Prefs" },
];

export function AppShell({ children, profile, pairSwitcher }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  useVersionCheck();
  const supabase = createClient();
  const isMistress = profile.role === "mistress";
  const nav = isMistress ? mistressNav : slaveNav;
  const mobileNav = isMistress ? mistressMobileNav : slaveMobileNav;
  const unreadMessages = useUnreadNotifications(profile.id, "message");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Global photo demand listener — fires wherever Jay is in the app
  useEffect(() => {
    if (isMistress) return;

    const channel = supabase
      .channel('global-photo-demand')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'photo_demands', filter: `slave_id=eq.${profile.id}` },
        (payload) => {
          const demand = payload.new as { status: string; prompt: string };
          if (demand.status === 'pending') {
            toast.error('📸 Photo demanded!', {
              description: demand.prompt,
              duration: 10000,
              action: {
                label: 'Respond',
                onClick: () => router.push('/sub/tasks'),
              },
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile.id, isMistress, supabase, router]);

  // XP
  const xpForLevel = (lvl: number) => lvl * lvl * 25;
  const nextLevelXp = xpForLevel(profile.level + 1);

  const tierLabel = isMistress ? "DOMINANT" : "SUBMISSIVE";
  const tierRank = `Rank: Level ${profile.level}`;

  return (
    <div className="min-h-screen bg-surface-lowest text-foreground">
      {/* ── Top Navigation Bar ─────────────────────── */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 lg:px-10 bg-black/80 backdrop-blur-xl"
        style={{
          boxShadow: "0 0 30px rgba(168,85,247,0.06)",
          paddingTop: "max(1.25rem, env(safe-area-inset-top))",
          paddingBottom: "1.25rem",
          height: "auto",
          minHeight: "5rem",
        }}>
        <div className="flex items-center gap-4 lg:gap-8">
          <span className="text-2xl font-bold tracking-tighter text-gradient font-headline">
            THE PROTOCOL
          </span>
          {/* Pair switcher for slaves with multiple mistresses */}
          {pairSwitcher && (
            <PairSwitcher
              pairs={pairSwitcher.pairs}
              activePairId={pairSwitcher.activePairId}
            />
          )}
          {/* Desktop inline nav links */}
          <nav className="hidden xl:flex items-center gap-6">
            {nav.slice(0, 4).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`font-headline font-medium text-xs uppercase tracking-widest transition-colors duration-300 ${
                    active ? "text-primary" : "text-zinc-500 hover:text-pink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell userId={profile.id} isMistress={isMistress} />
          {/* Mobile-only logout */}
          <button
            onClick={handleLogout}
            className="lg:hidden text-zinc-500 hover:text-zinc-300 transition-colors duration-300"
            aria-label="Sign out"
          >
            <LogOut size={20} />
          </button>
          <div className="hidden lg:flex items-center gap-3 pl-6 border-l border-white/10">
            <div className="text-right">
              <p className="text-xs font-bold font-headline tracking-wider">{tierLabel}</p>
              <p className="text-[10px] text-primary">Level {profile.level}</p>
            </div>
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-primary/30 bg-surface-container flex items-center justify-center overflow-hidden">
                {isMistress ? (
                  <Crown size={18} className="text-primary" />
                ) : (
                  <Heart size={18} className="text-pink" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-black flex items-center justify-center">
                <span className="text-[8px] font-bold text-black">{String(profile.level).padStart(2, "0")}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex" style={{ paddingTop: "max(5rem, calc(5rem + env(safe-area-inset-top, 0px) - 1.25rem))" }}>
        {/* ── Desktop Side Navigation ──────────────── */}
        <aside className="hidden lg:flex h-[calc(100vh-5rem)] w-72 flex-col bg-surface-lowest border-r border-white/5 py-8 gap-8 font-headline sticky top-20">
          {/* Operative/Commander Badge */}
          <div className="px-8 mb-4">
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                {isMistress ? (
                  <Crown size={20} className="text-primary" />
                ) : (
                  <Shield size={20} className="text-primary" />
                )}
              </div>
              <div>
                <p className="uppercase tracking-widest text-xs font-bold">{tierLabel}</p>
                <p className="text-[10px] text-zinc-500">{tierRank}</p>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col gap-1 px-4 flex-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-4 py-3 transition-all duration-200 ${
                    active
                      ? "text-primary border-r-2 border-purple bg-gradient-to-r from-purple/10 to-transparent"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 hover:translate-x-1"
                  }`}
                >
                  <item.icon size={18} strokeWidth={1.8} />
                  <span className="uppercase tracking-widest text-xs">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* CTA Button */}
          <div className="px-8">
            <button className="btn-gradient w-full py-4 rounded-sm text-xs tracking-widest font-headline font-bold uppercase">
              {isMistress ? "Initiate Protocol" : "Report In"}
            </button>
          </div>

          {/* Bottom links */}
          <div className="px-4 pb-8 flex flex-col gap-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 px-4 py-2 text-zinc-500 hover:text-zinc-300 transition-all duration-200"
            >
              <LogOut size={16} />
              <span className="uppercase tracking-widest text-[10px]">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ── Main Content ─────────────────────────── */}
        <main className="flex-1 min-h-[calc(100vh-5rem)] bg-surface-lowest relative overflow-y-auto pb-24 lg:pb-0">
          {/* Ambient background glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative z-10 p-6 md:p-10 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* ── Floating Comms Button (mobile only) ───── */}
      <Link
        href={isMistress ? "/mistress/messages" : "/sub/messages"}
        className={`lg:hidden fixed z-50 w-12 h-12 rounded-full btn-gradient flex items-center justify-center shadow-lg active:scale-90 transition-transform ${
          pathname.endsWith("/messages") ? "opacity-0 pointer-events-none" : ""
        }`}
        style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))", right: "1rem" }}
        aria-label="Messages"
      >
        <MessageCircle size={20} />
        {unreadMessages > 0 && !pathname.endsWith("/messages") && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-pink text-[9px] font-bold text-white flex items-center justify-center leading-none">
            <span className="absolute inset-0 rounded-full bg-pink animate-ping opacity-75" />
            <span className="relative">{unreadMessages > 9 ? "9+" : unreadMessages}</span>
          </span>
        )}
      </Link>

      {/* ── Mobile Bottom Tab Bar ──────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full flex justify-around items-end px-4 z-50 bottom-tab-bar"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))", paddingTop: "0.5rem", height: "auto" }}>
        {mobileNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-end py-2 transition-all active:scale-90 duration-200 ${
                active
                  ? "text-primary"
                  : "text-zinc-600 hover:text-pink"
              }`}
              style={active ? { filter: "drop-shadow(0 0 8px rgba(168,85,247,0.8))" } : {}}
            >
              <item.icon size={22} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[10px] uppercase tracking-widest mt-1 font-headline">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
