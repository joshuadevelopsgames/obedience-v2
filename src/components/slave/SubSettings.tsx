"use client";

import {
  SlidersHorizontal,
  Upload,
  AlertTriangle,
  AlertOctagon,
  Heart,
  Users,
  Shield,
  Copy,
  Check,
  Sparkles,
  Pen,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { KinkLibrary } from "@/components/shared/KinkLibrary";
import LimitsLibrary from "@/components/shared/LimitsLibrary";
import { AvatarUploader } from "@/components/shared/AvatarUploader";
import type { Profile, Pair, Contract, MoodCheckin, Kink } from "@/types/database";

interface Limit {
  id: string;
  name: string;
  description: string;
  category: 'hard' | 'soft';
  is_custom: boolean;
  created_by: string | null;
}

interface Props {
  profile: Profile;
  pair: Pair | null;
  contract: Contract | null;
  recentMood: MoodCheckin[];
  allKinks: Kink[];
  selectedKinkIds: string[];
  allLimits: Limit[];
  selectedLimits: { limit_id: string; category: 'hard' | 'soft' }[];
  pairId?: string;
}

// Defined outside component so React doesn't remount them on every keystroke
function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-surface-low rounded-xl border border-outline-variant/10 p-6 ${className}`}>{children}</div>;
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="text-primary">{icon}</span>
      <h2 className="text-xs font-headline font-bold tracking-widest uppercase">{children}</h2>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-label uppercase tracking-[0.2em] text-muted mb-1">{children}</p>;
}

export function SubSettings({ profile, pair, contract, recentMood, allKinks, selectedKinkIds, allLimits, selectedLimits, pairId }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [collarName, setCollarName] = useState(profile.collar_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [saving, setSaving] = useState(false);
  const [safeWordState, setSafeWordState] = useState<"yellow" | "red" | null>(null);
  const [showLimitsForm, setShowLimitsForm] = useState(false);
  const [newLimit, setNewLimit] = useState("");
  const [newLimitCategory, setNewLimitCategory] = useState<"hard" | "soft" | "curiosity">("hard");
  const [addingLimit, setAddingLimit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signing, setSigning] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "dynamic">("profile");
  const supabase = createClient();
  const router = useRouter();

  const handleCountersign = async () => {
    if (!contract) return;
    setSigning(true);
    try {
      const res = await fetch('/api/contracts/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId: contract.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Contract signed — the dynamic is now in force.');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign contract');
    } finally {
      setSigning(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim() && !collarName.trim()) { toast.error("Please fill in at least one name"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim() || null,
      collar_name: collarName.trim() || null,
      bio: bio.trim() || null,
    }).eq("id", profile.id);
    if (!error) { toast.success("Profile updated"); router.refresh(); }
    else { toast.error("Failed to update profile"); }
    setSaving(false);
  };

  const handleTriggerSafeWord = async (level: "yellow" | "red") => {
    if (!pair) { toast.error("No active pair found"); return; }
    await supabase.from("pairs").update({
      safe_word_state: level,
      safe_word_at: new Date().toISOString(),
    }).eq("id", pair.id);
    setSafeWordState(level);
    toast(
      level === "yellow"
        ? "🟡 Yellow — slowing down. Your Dominant has been notified."
        : "🔴 Red — full stop. Your Dominant has been notified.",
      { duration: 5000 }
    );
    router.refresh();
  };

  const handleAddLimit = async () => {
    if (!newLimit.trim() || !contract) { toast.error("Please enter a limit"); return; }
    setAddingLimit(true);
    const key = newLimitCategory === "hard" ? "hard_limits" : newLimitCategory === "soft" ? "soft_limits" : "curiosities";
    const limits = contract.content?.[key] || [];
    const updated = await supabase.from("contracts").update({
      content: { ...contract.content, [key]: [...limits, newLimit.trim()] },
    }).eq("id", contract.id);
    if (!updated.error) { setNewLimit(""); toast.success("Limit added"); router.refresh(); }
    else { toast.error("Failed to add limit"); }
    setAddingLimit(false);
  };

  const copyPairCode = () => {
    if (pair?.id) {
      navigator.clipboard.writeText(pair.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hardLimits = contract?.content?.hard_limits || [];
  const softLimits = contract?.content?.soft_limits || [];
  const curiosities = contract?.content?.curiosities || [];


  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Hero */}
      <div>
        <h1 className="text-4xl font-headline font-bold tracking-tighter leading-[0.9] mb-2">
          SUBMISSIVE<br />
          <span className="text-pink italic">PREFERENCES</span>
        </h1>
        <p className="text-muted text-sm">Manage your profile, limits, and safe word protocols.</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-6 border-b border-white/5">
        {(["profile", "dynamic"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSettingsTab(tab)}
            className={`font-label text-xs font-bold uppercase tracking-widest pb-3 transition-colors ${
              settingsTab === tab
                ? "text-primary border-b-2 border-primary/40 -mb-px"
                : "text-zinc-500 hover:text-foreground"
            }`}
          >
            {tab === "profile" ? "Profile" : "Dynamic"}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {settingsTab === "profile" && (<>

      {/* Profile */}
      <SectionCard>
        <SectionHeading icon={<SlidersHorizontal size={14} />}>Profile</SectionHeading>
        <div className="flex gap-6 items-start mb-6">
          <AvatarUploader
            userId={profile.id}
            currentAvatarUrl={profile.avatar_url}
            displayName={profile.display_name || profile.collar_name}
            size="lg"
          />
          <div className="flex-1 space-y-4">
            <div>
              <SectionLabel>Display Name</SectionLabel>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your public name"
                className="w-full bg-transparent border-b border-outline-variant/30 px-0 py-2 text-sm text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <SectionLabel>Collar Name</SectionLabel>
              <input
                type="text"
                value={collarName}
                onChange={(e) => setCollarName(e.target.value)}
                placeholder="What does your Mistress call you?"
                className="w-full bg-transparent border-b border-outline-variant/30 px-0 py-2 text-sm text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <SectionLabel>About You</SectionLabel>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short description visible to your Mistress…"
              rows={3}
              maxLength={300}
              className="w-full bg-transparent border-b border-outline-variant/30 px-0 py-2 text-sm text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary transition-colors resize-none"
            />
            <p className="text-[10px] text-zinc-600 mt-1">{bio.length}/300</p>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="btn-gradient px-5 py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </SectionCard>

      {/* Safe Word */}
      {pair && (
        <SectionCard>
          <SectionHeading icon={<Shield size={14} />}>Safe Word</SectionHeading>
          <div className="space-y-4">
            <div>
              <SectionLabel>Current Status</SectionLabel>
              <div className={`rounded-xl px-4 py-3 text-sm font-headline font-bold tracking-tight ${
                pair.safe_word_state === "red"
                  ? "bg-[#ff3366]/10 text-[#ff3366] border border-[#ff3366]/20"
                  : pair.safe_word_state === "yellow"
                    ? "bg-warning/10 text-warning border border-warning/20"
                    : "bg-success/10 text-success border border-success/20"
              }`}>
                {pair.safe_word_state === "red" ? "🔴 Red — Full Stop"
                  : pair.safe_word_state === "yellow" ? "🟡 Yellow — Slow Down"
                  : "🟢 Green — Normal"}
              </div>
            </div>

            {pair.safe_word_state === "green" && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleTriggerSafeWord("yellow")}
                  className="flex-1 border border-warning/30 bg-warning/5 text-warning py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase hover:bg-warning/10 transition-colors safe-word-pulse"
                >
                  🟡 Slow Down
                </button>
                <button
                  onClick={() => handleTriggerSafeWord("red")}
                  className="flex-1 border border-[#ff3366]/30 bg-[#ff3366]/5 text-[#ff3366] py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase hover:bg-[#ff3366]/10 transition-colors safe-word-pulse"
                >
                  🔴 Full Stop
                </button>
              </div>
            )}

            <p className="text-xs text-muted">Your Mistress is notified immediately when a safe word is triggered.</p>
          </div>
        </SectionCard>
      )}

      {/* Limits */}
      {/* Unsigned contract banner */}
      {contract && !contract.slave_signed && (
        <div className="bg-warning/5 border border-warning/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Pen size={16} className="text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-headline font-bold tracking-tight">Contract awaiting your signature</p>
              <p className="text-xs text-muted mt-0.5">Your Mistress has created and signed a contract. Review the terms in your Preferences, then countersign to make it binding.</p>
            </div>
          </div>
          <button
            onClick={handleCountersign}
            disabled={signing}
            className="btn-gradient px-5 py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center gap-2 disabled:opacity-50 flex-shrink-0"
          >
            {signing ? <Loader2 size={12} className="animate-spin" /> : <Pen size={12} />}
            {signing ? 'Signing…' : 'Countersign'}
          </button>
        </div>
      )}

      {contract && (
        <SectionCard>
          <div className="flex items-center justify-between mb-5">
            <SectionHeading icon={<AlertOctagon size={14} />}>Limits</SectionHeading>
            <button
              onClick={() => setShowLimitsForm(!showLimitsForm)}
              className="text-[10px] font-headline font-bold tracking-widest uppercase text-primary hover:underline"
            >
              {showLimitsForm ? "Cancel" : "+ Add"}
            </button>
          </div>

          {showLimitsForm && (
            <div className="bg-surface-container rounded-xl p-4 mb-4 space-y-3 border border-outline-variant/10">
              <div>
                <SectionLabel>Category</SectionLabel>
                <select
                  value={newLimitCategory}
                  onChange={(e) => setNewLimitCategory(e.target.value as "hard" | "soft" | "curiosity")}
                  className="w-full mt-1 bg-surface-container-high border border-outline-variant/20 rounded-sm px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="hard">Hard Limit</option>
                  <option value="soft">Soft Limit</option>
                  <option value="curiosity">Curiosity</option>
                </select>
              </div>
              <div>
                <SectionLabel>Limit</SectionLabel>
                <input
                  type="text"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  placeholder="Enter limit…"
                  className="w-full bg-transparent border-b border-outline-variant/30 px-0 py-1.5 text-xs text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <button
                onClick={handleAddLimit}
                disabled={addingLimit || !newLimit.trim()}
                className="btn-gradient w-full py-2 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase disabled:opacity-50"
              >
                {addingLimit ? "Adding..." : "Add Limit"}
              </button>
            </div>
          )}

          <div className="space-y-4">
            {hardLimits.length > 0 && (
              <div>
                <SectionLabel>Hard Limits</SectionLabel>
                <div className="space-y-1.5 mt-2">
                  {hardLimits.map((limit, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#ff3366]/5 border border-[#ff3366]/20 rounded-xl px-3 py-2 text-xs text-foreground">
                      <AlertOctagon size={10} className="text-[#ff3366] flex-shrink-0" />
                      {limit}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {softLimits.length > 0 && (
              <div>
                <SectionLabel>Soft Limits</SectionLabel>
                <div className="space-y-1.5 mt-2">
                  {softLimits.map((limit, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-warning/5 border border-warning/20 rounded-xl px-3 py-2 text-xs text-foreground">
                      <AlertTriangle size={10} className="text-warning flex-shrink-0" />
                      {limit}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {curiosities.length > 0 && (
              <div>
                <SectionLabel>Curiosities</SectionLabel>
                <div className="space-y-1.5 mt-2">
                  {curiosities.map((limit, idx) => (
                    <div key={idx} className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 text-xs text-foreground">
                      {limit}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {hardLimits.length === 0 && softLimits.length === 0 && curiosities.length === 0 && (
              <p className="text-xs text-muted text-center py-4">No limits set yet. Add some to establish boundaries.</p>
            )}
          </div>
        </SectionCard>
      )}

      {/* Pair Info */}
      {pair && (
        <SectionCard>
          <SectionHeading icon={<Users size={14} />}>Pair Info</SectionHeading>
          <div className="space-y-4">
            <div>
              <SectionLabel>Status</SectionLabel>
              <p className={`text-sm font-headline font-bold ${pair.status === "active" ? "text-success" : "text-muted"}`}>
                {pair.status === "active" && "🟢 Active"}
                {pair.status === "paused" && "🟡 Paused"}
                {pair.status === "ended" && "🔴 Ended"}
              </p>
            </div>
            <div>
              <SectionLabel>Pair Code</SectionLabel>
              <div className="flex gap-2 mt-2">
                <div className="flex-1 bg-surface-container border border-outline-variant/20 rounded-sm px-4 py-2.5">
                  <code className="text-sm font-mono text-primary">{pair.id}</code>
                </div>
                <button
                  onClick={copyPairCode}
                  className="btn-gradient px-4 py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center gap-1"
                >
                  {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
              <p className="text-xs text-muted mt-2">Share this with your Mistress to connect.</p>
            </div>
          </div>
        </SectionCard>
      )}

      </>)} {/* end settingsTab === "profile" */}

      {/* Dynamic Tab */}
      {settingsTab === "dynamic" && (<>

      {/* Kink Library */}
      <SectionCard>
        <SectionHeading icon={<Sparkles size={14} />}>Kink Library</SectionHeading>
        <p className="text-xs text-muted mb-5 leading-relaxed -mt-3">
          Select kinks you're open to. Your list is private — only Grok reads it alongside your Mistress's selections to generate relevant content for your dynamic.
        </p>
        <KinkLibrary
          profileId={profile.id}
          allKinks={allKinks}
          selectedKinkIds={selectedKinkIds}
        />
      </SectionCard>

      {/* Limits Library */}
      {pair && pairId && (
        <SectionCard>
          <SectionHeading icon={<Shield size={14} />}>Limits & Boundaries</SectionHeading>
          <p className="text-xs text-muted mb-5 leading-relaxed -mt-3">
            Set hard and soft limits. Any limit that matches a kink will automatically remove that kink from your profile to prevent conflicts.
          </p>
          <LimitsLibrary
            profileId={profile.id}
            pairId={pairId}
            allLimits={allLimits}
            selectedLimits={selectedLimits}
            selectedKinkIds={selectedKinkIds}
            allKinksByName={Object.fromEntries(allKinks.map((k) => [k.name, k.id]))}
          />
        </SectionCard>
      )}

      {/* Mood History */}
      {recentMood.length > 0 && (
        <SectionCard>
          <SectionHeading icon={<Heart size={14} />}>Mood History</SectionHeading>
          <div className="space-y-2">
            {recentMood.slice(0, 5).map((checkin) => (
              <div key={checkin.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <span className="text-xl w-7 text-center">{checkin.emoji}</span>
                <div className="flex-1">
                  <p className="text-[10px] font-label uppercase tracking-widest text-muted">
                    {new Date(checkin.created_at).toLocaleDateString()}
                  </p>
                  {checkin.note && <p className="text-xs text-foreground mt-0.5">{checkin.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      </>)} {/* end settingsTab === "dynamic" */}
    </div>
  );
}
