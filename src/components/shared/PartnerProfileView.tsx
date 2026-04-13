"use client";

import Link from "next/link";
import { ArrowLeft, Crown, Heart, Zap, Shield, AlertTriangle, AlertOctagon, Sparkles } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type { Profile, Pair, Kink, MoodCheckin } from "@/types/database";

interface Limit {
  id: string;
  name: string;
  description: string | null;
  category: "hard" | "soft";
}

interface ProfileKinkWithDetails {
  kink_id: string;
  kink: Kink;
}

interface Props {
  viewerProfile: Profile;
  partnerProfile: Profile;
  pair: Pair;
  partnerKinks: ProfileKinkWithDetails[];
  viewerKinkIds: Set<string>;
  partnerLimits: Limit[];
  recentMood: MoodCheckin[];
  backHref: string;
}

const moodEmoji: Record<number, string> = { 1: "😞", 2: "😕", 3: "😐", 4: "😊", 5: "😍" };

const kinkCategoryColors: Record<string, string> = {
  restraint: "border-primary/30 bg-primary/5 text-primary",
  impact: "border-[#ff3366]/30 bg-[#ff3366]/5 text-[#ff3366]",
  power_exchange: "border-pink/30 bg-pink/5 text-pink",
  roleplay: "border-blue-400/30 bg-blue-400/5 text-blue-400",
  fetish: "border-warning/30 bg-warning/5 text-warning",
  other: "border-zinc-600/30 bg-zinc-600/5 text-zinc-400",
  fluid: "border-cyan-400/30 bg-cyan-400/5 text-cyan-400",
  extreme: "border-red-500/30 bg-red-500/5 text-red-400",
};

export function PartnerProfileView({
  viewerProfile,
  partnerProfile,
  pair,
  partnerKinks,
  viewerKinkIds,
  partnerLimits,
  recentMood,
  backHref,
}: Props) {
  const isMistress = viewerProfile.role === "mistress";
  const partnerName = partnerProfile.collar_name || partnerProfile.display_name || "Partner";
  const partnerTitle = partnerProfile.title || (partnerProfile.role === "mistress" ? "Dominant" : "Submissive");

  const hardLimits = partnerLimits.filter((l) => l.category === "hard");
  const softLimits = partnerLimits.filter((l) => l.category === "soft");

  // Pair XP / level from pair table
  const pairLevel = pair.slave_level ?? 1;
  const pairXp = pair.slave_xp ?? 0;
  const xpInLevel = pairXp % 500;
  const progressPct = Math.max(2, Math.min((xpInLevel / 500) * 100, 100));

  // Days paired
  const daysPaired = Math.floor((Date.now() - new Date(pair.created_at).getTime()) / (1000 * 60 * 60 * 24));

  // Avg mood
  const avgMood = recentMood.length > 0
    ? Math.round(recentMood.reduce((s, m) => s + m.mood, 0) / recentMood.length)
    : null;

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Back */}
      <Link href={backHref} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 font-headline uppercase tracking-widest transition-colors w-fit">
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Hero card */}
      <div className="relative rounded-2xl overflow-hidden border border-white/5">
        {/* Gradient banner */}
        <div className={`h-28 w-full ${isMistress
          ? "bg-gradient-to-br from-pink/20 via-primary/10 to-transparent"
          : "bg-gradient-to-br from-primary/20 via-pink/10 to-transparent"
        }`} />

        {/* Avatar + info */}
        <div className="px-6 pb-6 bg-surface-low">
          <div className="flex items-end gap-5 -mt-12 mb-4">
            <UserAvatar
              profile={partnerProfile}
              className="w-24 h-24 rounded-2xl border-4 border-surface-low"
              fallbackClassName={`text-3xl font-headline font-bold bg-surface-container ${partnerProfile.role === "mistress" ? "text-primary" : "text-pink"}`}
            />
            <div className="pb-1">
              <div className="flex items-center gap-2 mb-1">
                {partnerProfile.role === "mistress"
                  ? <Crown size={14} className="text-primary" />
                  : <Heart size={14} className="text-pink" />}
                <span className={`text-[10px] font-headline font-bold tracking-widest uppercase ${partnerProfile.role === "mistress" ? "text-primary" : "text-pink"}`}>
                  {partnerTitle}
                </span>
              </div>
              <h1 className="text-2xl font-headline font-bold tracking-tight">{partnerName}</h1>
              {partnerProfile.display_name && partnerProfile.collar_name && (
                <p className="text-xs text-zinc-500 mt-0.5">{partnerProfile.display_name}</p>
              )}
            </div>
          </div>

          {/* Bio */}
          {partnerProfile.bio && (
            <p className="text-sm text-zinc-300 leading-relaxed mb-4 border-l-2 border-primary/30 pl-3">
              {partnerProfile.bio}
            </p>
          )}

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-container rounded-xl p-3 text-center">
              <p className="text-[10px] text-zinc-500 font-headline uppercase tracking-widest mb-1">Level</p>
              <p className="text-lg font-headline font-bold text-primary">{pairLevel}</p>
            </div>
            <div className="bg-surface-container rounded-xl p-3 text-center">
              <p className="text-[10px] text-zinc-500 font-headline uppercase tracking-widest mb-1">Streak</p>
              <p className="text-lg font-headline font-bold text-pink">{partnerProfile.streak_current || 0}d</p>
            </div>
            <div className="bg-surface-container rounded-xl p-3 text-center">
              <p className="text-[10px] text-zinc-500 font-headline uppercase tracking-widest mb-1">Days paired</p>
              <p className="text-lg font-headline font-bold">{daysPaired}</p>
            </div>
          </div>

          {/* XP progress (slave only) */}
          {partnerProfile.role === "slave" && (
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1.5">
                <span className="font-headline uppercase tracking-widest">XP progress</span>
                <span className="text-primary font-bold">{xpInLevel} / 500</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-pink rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {/* Mood */}
          {avgMood && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-headline uppercase tracking-widest">Recent mood</span>
              <span className="text-xl">{moodEmoji[avgMood]}</span>
              <div className="flex gap-1">
                {recentMood.slice(0, 7).map((m) => (
                  <span key={m.id} className="text-sm">{m.emoji || moodEmoji[m.mood]}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hard Limits */}
      {hardLimits.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertOctagon size={14} className="text-[#ff3366]" />
            <h2 className="text-xs font-headline font-bold tracking-widest uppercase text-[#ff3366]">Hard Limits</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {hardLimits.map((l) => (
              <span key={l.id} className="text-[10px] font-headline font-bold tracking-widest bg-[#ff3366]/10 text-[#ff3366] border border-[#ff3366]/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <AlertOctagon size={9} /> {l.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Soft Limits */}
      {softLimits.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-warning" />
            <h2 className="text-xs font-headline font-bold tracking-widest uppercase text-warning">Soft Limits</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {softLimits.map((l) => (
              <span key={l.id} className="text-[10px] font-headline font-bold tracking-widest bg-warning/10 text-warning border border-warning/20 px-3 py-1.5 rounded-lg">
                {l.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Kinks */}
      {partnerKinks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-primary" />
            <h2 className="text-xs font-headline font-bold tracking-widest uppercase">Their Kinks</h2>
            <span className="text-[10px] text-zinc-500 font-headline ml-auto">
              ✨ = you both share this
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {partnerKinks.map(({ kink_id, kink }) => {
              const isShared = viewerKinkIds.has(kink_id);
              const colorClass = kinkCategoryColors[kink.category] || "border-zinc-600/30 bg-zinc-600/5 text-zinc-400";
              return (
                <span
                  key={kink_id}
                  title={kink.description || kink.name}
                  className={`text-[10px] font-headline font-bold tracking-widest px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${colorClass} ${isShared ? "ring-1 ring-primary/40" : ""}`}
                >
                  {isShared && <span className="text-primary">✨</span>}
                  {kink.name}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {hardLimits.length === 0 && softLimits.length === 0 && partnerKinks.length === 0 && (
        <div className="bg-surface-container rounded-xl p-8 text-center border border-outline-variant/10">
          <Shield size={24} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-sm text-muted font-headline">
            {partnerName} hasn't set their kinks or limits yet.
          </p>
        </div>
      )}
    </div>
  );
}
