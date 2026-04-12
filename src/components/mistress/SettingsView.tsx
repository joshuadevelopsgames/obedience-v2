"use client";

import { useState } from "react";
import {
  SlidersHorizontal,
  Copy,
  Check,
  AlertTriangle,
  LogOut,
  Zap,
  Shield,
  Users,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { KinkLibrary } from "@/components/shared/KinkLibrary";
import LimitsLibrary from "@/components/shared/LimitsLibrary";
import { ContractModal } from "@/components/mistress/ContractModal";
import type { Profile, Pair, Contract, TonePreference, AutopilotMode, Kink } from "@/types/database";

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
  subProfile: Profile | null;
  contract: Contract | null;
  userId: string;
  allKinks: Kink[];
  selectedKinkIds: string[];
  allLimits: Limit[];
  selectedLimitIds: string[];
  pairId?: string;
}

const toneDescriptions: Record<TonePreference, string> = {
  strict: "Firm commands, high expectations",
  nurturing: "Encouraging, warm guidance",
  playful: "Teasing, lighthearted",
  cold: "Detached, minimal praise",
};

export function SettingsView({
  profile,
  pair,
  subProfile,
  contract,
  userId,
  allKinks,
  selectedKinkIds,
  allLimits,
  selectedLimitIds,
  pairId,
}: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [title, setTitle] = useState(profile.title || "");
  const [tonePreference, setTonePreference] = useState<TonePreference>(profile.tone_preference);
  const [autopilot, setAutopilot] = useState(profile.autopilot);
  const [autopilotMode, setAutopilotMode] = useState<AutopilotMode>(profile.autopilot_mode);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);
  const [unpairing, setUnpairing] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const pairCode = userId.slice(0, 8).toUpperCase();

  const handleSaveProfile = async () => {
    if (!displayName.trim()) { toast.error("Display name is required"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        display_name: displayName.trim(),
        title: title.trim() || null,
        tone_preference: tonePreference,
        autopilot,
        autopilot_mode: autopilotMode,
      }).eq("id", profile.id);
      if (!error) { toast.success("Settings saved"); router.refresh(); }
      else { toast.error("Failed to save settings"); }
    } catch { toast.error("Failed to save settings"); }
    setSaving(false);
  };

  const handleCopyPairCode = () => {
    navigator.clipboard.writeText(pairCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnpair = async () => {
    if (!pair) return;
    setUnpairing(true);
    try {
      await supabase.from("pairs").update({ status: "ended" }).eq("id", pair.id);
      await supabase.from("profiles").update({ paired_with: null }).in("id", [pair.mistress_id, pair.slave_id]);
      toast.success("Pair ended");
      router.refresh();
    } catch { toast.error("Failed to end pair"); }
    setUnpairing(false);
    setShowUnpairConfirm(false);
  };

  const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-surface-low rounded-xl border border-outline-variant/10 p-6 ${className}`}>
      {children}
    </div>
  );

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[10px] font-label uppercase tracking-[0.2em] text-muted mb-1">{children}</p>
  );

  const UnderlineInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "—"}
      className="w-full bg-transparent border-b border-outline-variant/30 px-0 py-2 text-sm text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary transition-colors"
    />
  );

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Hero */}
      <div>
        <h1 className="text-4xl font-headline font-bold tracking-tighter leading-[0.9] mb-2">
          COMMAND<br />
          <span className="text-pink italic">PREFERENCES</span>
        </h1>
        <p className="text-muted text-sm">Configure your dominance profile and dynamic preferences.</p>
      </div>

      {/* Profile */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-5">
          <SlidersHorizontal size={16} className="text-primary" />
          <h2 className="text-sm font-headline font-bold tracking-widest uppercase">Profile</h2>
        </div>
        <div className="space-y-5">
          <div>
            <SectionLabel>Display Name</SectionLabel>
            <UnderlineInput value={displayName} onChange={setDisplayName} placeholder="Your commander name" />
          </div>
          <div>
            <SectionLabel>Title / Honorific</SectionLabel>
            <UnderlineInput value={title} onChange={setTitle} placeholder="Mistress, Goddess, Dominatrix…" />
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

      {/* Dynamic Preferences */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-5">
          <Zap size={16} className="text-primary" />
          <h2 className="text-sm font-headline font-bold tracking-widest uppercase">Dynamic Preferences</h2>
        </div>
        <div className="space-y-6">
          <div>
            <SectionLabel>Tone Preference</SectionLabel>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {(["strict", "nurturing", "playful", "cold"] as const).map((tone) => (
                <button
                  key={tone}
                  onClick={() => setTonePreference(tone)}
                  className={`rounded-sm border px-4 py-3 text-left transition-all ${
                    tonePreference === tone
                      ? "border-primary/40 bg-primary/10"
                      : "border-outline-variant/10 bg-surface-container hover:border-outline-variant/30"
                  }`}
                >
                  <p className={`text-xs font-headline font-bold uppercase tracking-widest ${tonePreference === tone ? "text-primary" : "text-foreground"}`}>
                    {tone}
                  </p>
                  <p className="text-[10px] text-muted mt-1">{toneDescriptions[tone]}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Autopilot toggle */}
          <div className="border-t border-white/5 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-headline font-bold tracking-tight">Autopilot Mode</p>
                <p className="text-xs text-muted mt-0.5">AI manages tasks and check-ins automatically</p>
              </div>
              <button
                onClick={() => setAutopilot(!autopilot)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autopilot ? "bg-primary" : "bg-zinc-700"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autopilot ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {autopilot && (
              <div className="mt-4">
                <SectionLabel>Autopilot Mode</SectionLabel>
                <select
                  value={autopilotMode}
                  onChange={(e) => setAutopilotMode(e.target.value as AutopilotMode)}
                  className="w-full mt-2 bg-surface-container border border-outline-variant/20 rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="light">Light (minimal interventions)</option>
                  <option value="full">Full (active management)</option>
                  <option value="custom">Custom (your preferences)</option>
                </select>
              </div>
            )}
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="btn-gradient px-5 py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </SectionCard>

      {/* Pair Info */}
      {pair && subProfile && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-5">
            <Users size={16} className="text-primary" />
            <h2 className="text-sm font-headline font-bold tracking-widest uppercase">Pair Information</h2>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <SectionLabel>Operative</SectionLabel>
                <p className="font-headline font-bold text-sm">{subProfile.collar_name || subProfile.display_name}</p>
                <p className="text-xs text-muted mt-0.5">Level {subProfile.level}</p>
              </div>
              <div>
                <SectionLabel>Status</SectionLabel>
                <p className={`font-headline font-bold text-sm capitalize ${pair.status === "active" ? "text-success" : "text-muted"}`}>
                  {pair.status}
                </p>
              </div>
            </div>

            <div>
              <SectionLabel>Your Pair Code</SectionLabel>
              <div className="flex gap-2 mt-2">
                <div className="flex-1 bg-surface-container border border-outline-variant/20 rounded-sm px-4 py-2.5">
                  <code className="text-sm font-mono text-primary">{pairCode}</code>
                </div>
                <button
                  onClick={handleCopyPairCode}
                  className="btn-gradient px-4 py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center gap-1"
                >
                  {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowUnpairConfirm(true)}
              className="w-full border border-[#ff3366]/30 bg-[#ff3366]/5 text-[#ff3366] py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-[#ff3366]/10 transition-colors"
            >
              <LogOut size={14} />
              End Pairing
            </button>
          </div>
        </SectionCard>
      )}

      {/* Contract */}
      {pair && contract && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-5">
            <Shield size={16} className="text-primary" />
            <h2 className="text-sm font-headline font-bold tracking-widest uppercase">Contract</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <SectionLabel>Version</SectionLabel>
                <p className="font-headline font-bold text-sm">{contract.version}</p>
              </div>
              <div>
                <SectionLabel>Status</SectionLabel>
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${contract.mistress_signed && contract.slave_signed ? "bg-success" : "bg-warning"}`} />
                  <p className="text-sm font-headline font-bold">{contract.mistress_signed && contract.slave_signed ? "Signed" : "Pending"}</p>
                </div>
              </div>
            </div>

            {contract.next_review && (
              <div>
                <SectionLabel>Next Review</SectionLabel>
                <p className="text-sm font-headline">
                  {new Date(contract.next_review).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )}

            {/* Limits */}
            {((contract.content.hard_limits?.length ?? 0) > 0 || (contract.content.soft_limits?.length ?? 0) > 0 || (contract.content.curiosities?.length ?? 0) > 0) && (
              <div className="border-t border-white/5 pt-4 space-y-4">
                {contract.content.hard_limits && (
                  <div>
                    <SectionLabel>Hard Limits</SectionLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {contract.content.hard_limits.map((limit, idx) => (
                        <span key={idx} className="text-[10px] font-headline font-bold tracking-widest bg-[#ff3366]/10 text-[#ff3366] border border-[#ff3366]/20 px-2 py-1 rounded">
                          {limit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {contract.content.soft_limits && (
                  <div>
                    <SectionLabel>Soft Limits</SectionLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {contract.content.soft_limits.map((limit, idx) => (
                        <span key={idx} className="text-[10px] font-headline font-bold tracking-widest bg-warning/10 text-warning border border-warning/20 px-2 py-1 rounded">
                          {limit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {contract.content.curiosities && (
                  <div>
                    <SectionLabel>Curiosities</SectionLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {contract.content.curiosities.map((item, idx) => (
                        <span key={idx} className="text-[10px] font-headline font-bold tracking-widest bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* No Contract CTA */}
      {pair && !contract && (
        <div className="bg-surface-container rounded-xl p-8 text-center border border-outline-variant/10 border-dashed">
          <Shield className="mx-auto mb-3 text-zinc-600" size={28} />
          <h3 className="font-headline font-bold mb-1 tracking-tight">No Contract Yet</h3>
          <p className="text-xs text-muted mb-5 max-w-xs mx-auto">
            Grok will draft one based on your kinks and limits — review and edit before signing.
          </p>
          <button
            onClick={() => setShowContractModal(true)}
            className="btn-gradient px-5 py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase"
          >
            Create Contract
          </button>
        </div>
      )}

      {showContractModal && pair && (
        <ContractModal
          pairId={pair.id}
          slaveName={subProfile?.collar_name || subProfile?.display_name || "operative"}
          onClose={() => setShowContractModal(false)}
        />
      )}

      {/* Kink Library */}
      <div className="bg-surface-low rounded-xl border border-outline-variant/10 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-primary" />
          <h2 className="text-xs font-headline font-bold tracking-widest uppercase">Kink Library</h2>
        </div>
        <p className="text-xs text-muted mb-5 leading-relaxed">
          Select kinks you're open to exploring. Grok reads both your list and your operative's to generate relevant, personalised punishments and tasks — nothing outside what you've both indicated.
        </p>
        <KinkLibrary
          profileId={userId}
          allKinks={allKinks}
          selectedKinkIds={selectedKinkIds}
        />
      </div>

      {/* Limits Library */}
      {pair && pairId && (
        <div className="bg-surface-low rounded-xl border border-outline-variant/10 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-primary" />
            <h2 className="text-xs font-headline font-bold tracking-widest uppercase">Limits & Boundaries</h2>
          </div>
          <p className="text-xs text-muted mb-5 leading-relaxed">
            Set hard and soft limits. Any limit that matches a kink will automatically remove that kink from your profile to prevent conflicts.
          </p>
          <LimitsLibrary
            profileId={userId}
            pairId={pairId}
            allLimits={allLimits}
            selectedLimitIds={selectedLimitIds}
            selectedKinkIds={selectedKinkIds}
            allKinksByName={Object.fromEntries(allKinks.map((k) => [k.name, k.id]))}
          />
        </div>
      )}

      {/* Unpair Confirm Modal */}
      {showUnpairConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-panel rounded-xl border border-[#ff3366]/20 p-6 max-w-sm mx-4 w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-[#ff3366]" size={20} />
              <h3 className="text-lg font-headline font-bold tracking-tight">End Pairing?</h3>
            </div>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              This will permanently end your pairing with{" "}
              <strong className="text-foreground">{subProfile?.collar_name || subProfile?.display_name}</strong>. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnpairConfirm(false)}
                className="flex-1 border border-outline-variant/20 py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnpair}
                disabled={unpairing}
                className="flex-1 border border-[#ff3366]/30 bg-[#ff3366]/10 text-[#ff3366] py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase hover:bg-[#ff3366]/20 disabled:opacity-50 transition-colors"
              >
                {unpairing ? "Ending..." : "End Pairing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
