"use client";

import { useState } from "react";
import {
  Settings,
  Copy,
  Check,
  AlertTriangle,
  LogOut,
  Zap,
  Shield,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Profile, Pair, Contract, TonePreference, AutopilotMode } from "@/types/database";

interface Props {
  profile: Profile;
  pair: Pair | null;
  subProfile: Profile | null;
  contract: Contract | null;
  userId: string;
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
}: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [title, setTitle] = useState(profile.title || "");
  const [tonePreference, setTonePreference] = useState<TonePreference>(
    profile.tone_preference
  );
  const [autopilot, setAutopilot] = useState(profile.autopilot);
  const [autopilotMode, setAutopilotMode] = useState<AutopilotMode>(
    profile.autopilot_mode
  );
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);
  const [unpairing, setUnpairing] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const pairCode = userId.slice(0, 8).toUpperCase();

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          title: title.trim() || null,
          tone_preference: tonePreference,
          autopilot,
          autopilot_mode: autopilotMode,
        })
        .eq("id", profile.id);

      if (!error) {
        toast.success("Settings saved");
        router.refresh();
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
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
      // Update pair status to ended
      await supabase
        .from("pairs")
        .update({ status: "ended" })
        .eq("id", pair.id);

      // Clear paired_with on both profiles
      await supabase
        .from("profiles")
        .update({ paired_with: null })
        .in("id", [pair.mistress_id, pair.slave_id]);

      toast.success("Pair ended");
      router.refresh();
    } catch {
      toast.error("Failed to end pair");
    } finally {
      setUnpairing(false);
      setShowUnpairConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={18} className="text-accent" />
          <h2 className="text-lg font-semibold">Profile</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted block mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="—"
              className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted block mb-2">
              Title / Honorific
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mistress, Goddess, Dominatrix…"
              className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full rounded-lg bg-accent/20 border border-accent px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Dynamic Preferences Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-accent" />
          <h2 className="text-lg font-semibold">Dynamic Preferences</h2>
        </div>

        <div className="space-y-4">
          {/* Tone Preference */}
          <div>
            <label className="text-sm font-medium text-muted block mb-3">
              Tone Preference
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["strict", "nurturing", "playful", "cold"] as const).map(
                (tone) => (
                  <button
                    key={tone}
                    onClick={() => setTonePreference(tone)}
                    className={`rounded-lg border px-4 py-3 text-sm transition-all ${
                      tonePreference === tone
                        ? "border-accent bg-accent/10 text-accent font-medium"
                        : "border-border bg-background hover:border-accent/50"
                    }`}
                  >
                    <p className="font-medium capitalize">{tone}</p>
                    <p className="text-xs text-muted mt-1">
                      {toneDescriptions[tone]}
                    </p>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Autopilot Toggle */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Autopilot Mode</p>
                <p className="text-xs text-muted mt-1">
                  AI manages tasks and check-ins
                </p>
              </div>
              <button
                onClick={() => setAutopilot(!autopilot)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autopilot ? "bg-accent" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autopilot ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Autopilot Mode Selector */}
            {autopilot && (
              <div className="mt-3 space-y-2">
                <label className="text-xs font-medium text-muted block">
                  Mode
                </label>
                <select
                  value={autopilotMode}
                  onChange={(e) => setAutopilotMode(e.target.value as AutopilotMode)}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
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
            className="w-full rounded-lg bg-accent/20 border border-accent px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>

      {/* Pair Info Section */}
      {pair && subProfile && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-purple" />
            <h2 className="text-lg font-semibold">Pair Information</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted mb-1">Submissive</p>
                <p className="font-medium">
                  {subProfile.collar_name || subProfile.display_name}
                </p>
                <p className="text-xs text-muted mt-1">
                  Level {subProfile.level}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Pair Status</p>
                <p className="font-medium capitalize text-success">
                  {pair.status}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted mb-2">Your Pair Code</p>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg bg-background border border-border px-4 py-2.5">
                  <code className="text-sm font-mono text-accent">
                    {pairCode}
                  </code>
                </div>
                <button
                  onClick={handleCopyPairCode}
                  className="rounded-lg bg-accent/20 border border-accent px-4 py-2.5 text-accent hover:bg-accent/30 transition-colors"
                  title="Copy pair code"
                >
                  {copied ? (
                    <Check size={16} />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowUnpairConfirm(true)}
              className="w-full rounded-lg bg-danger/10 border border-danger px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/20 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              End Pairing
            </button>
          </div>
        </div>
      )}

      {/* Contract Section */}
      {pair && contract && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-accent" />
            <h2 className="text-lg font-semibold">Contract</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted mb-1">Version</p>
                <p className="font-medium">{contract.version}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      contract.mistress_signed && contract.slave_signed
                        ? "bg-success"
                        : "bg-yellow-400"
                    }`}
                  />
                  <p className="text-sm font-medium">
                    {contract.mistress_signed && contract.slave_signed
                      ? "Signed"
                      : "Pending"}
                  </p>
                </div>
              </div>
            </div>

            {contract.next_review && (
              <div>
                <p className="text-xs text-muted mb-1">Next Review</p>
                <p className="text-sm">
                  {new Date(contract.next_review).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" }
                  )}
                </p>
              </div>
            )}

            {/* Limits Display */}
            {(contract.content.hard_limits ||
              contract.content.soft_limits ||
              contract.content.curiosities) && (
              <div className="border-t border-border pt-4 space-y-3">
                {contract.content.hard_limits && (
                  <div>
                    <p className="text-xs font-medium text-danger mb-2">
                      Hard Limits
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {contract.content.hard_limits.map((limit, idx) => (
                        <span
                          key={idx}
                          className="inline-block bg-danger/10 text-danger text-xs px-2 py-1 rounded"
                        >
                          {limit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {contract.content.soft_limits && (
                  <div>
                    <p className="text-xs font-medium text-yellow-400 mb-2">
                      Soft Limits
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {contract.content.soft_limits.map((limit, idx) => (
                        <span
                          key={idx}
                          className="inline-block bg-yellow-400/10 text-yellow-400 text-xs px-2 py-1 rounded"
                        >
                          {limit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {contract.content.curiosities && (
                  <div>
                    <p className="text-xs font-medium text-purple mb-2">
                      Curiosities
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {contract.content.curiosities.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-block bg-purple/10 text-purple text-xs px-2 py-1 rounded"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Contract CTA */}
      {pair && !contract && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
          <Shield className="mx-auto mb-3 text-muted" size={24} />
          <h3 className="font-semibold mb-2">No Contract Yet</h3>
          <p className="text-sm text-muted mb-4">
            Create a contract to establish boundaries, limits, and expectations.
          </p>
          <button className="rounded-lg bg-accent/20 border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent/30 transition-colors">
            Create Contract
          </button>
        </div>
      )}

      {/* Unpair Confirmation Modal */}
      {showUnpairConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl border border-border bg-card p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-danger" size={20} />
              <h3 className="text-lg font-semibold">End Pairing?</h3>
            </div>
            <p className="text-sm text-muted mb-6">
              This will permanently end your pairing with{" "}
              <strong>{subProfile?.collar_name || subProfile?.display_name}</strong>.
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnpairConfirm(false)}
                className="flex-1 rounded-lg bg-muted/10 border border-muted px-4 py-2.5 text-sm font-medium text-muted hover:bg-muted/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnpair}
                disabled={unpairing}
                className="flex-1 rounded-lg bg-danger/20 border border-danger px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/30 transition-colors disabled:opacity-50"
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
