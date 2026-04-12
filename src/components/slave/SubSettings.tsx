"use client";

import {
  Settings,
  Upload,
  AlertTriangle,
  AlertOctagon,
  Heart,
  Users,
  Shield,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Profile, Pair, Contract, MoodCheckin } from "@/types/database";

interface Props {
  profile: Profile;
  pair: Pair | null;
  contract: Contract | null;
  recentMood: MoodCheckin[];
}

export function SubSettings({
  profile,
  pair,
  contract,
  recentMood,
}: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [collarName, setCollarName] = useState(profile.collar_name || "");
  const [saving, setSaving] = useState(false);
  const [safeWordState, setSafeWordState] = useState<"yellow" | "red" | null>(null);
  const [showLimitsForm, setShowLimitsForm] = useState(false);
  const [newLimit, setNewLimit] = useState("");
  const [newLimitCategory, setNewLimitCategory] = useState<"hard" | "soft" | "curiosity">("hard");
  const [addingLimit, setAddingLimit] = useState(false);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleSaveProfile = async () => {
    if (!displayName.trim() && !collarName.trim()) {
      toast.error("Please fill in at least one name");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        collar_name: collarName.trim() || null,
      })
      .eq("id", profile.id);

    if (!error) {
      toast.success("Profile updated");
      router.refresh();
    } else {
      toast.error("Failed to update profile");
    }
    setSaving(false);
  };

  const handleTriggerSafeWord = async (level: "yellow" | "red") => {
    if (!pair) {
      toast.error("No active pair found");
      return;
    }

    await supabase
      .from("pairs")
      .update({
        safe_word_state: level,
        safe_word_at: new Date().toISOString(),
      })
      .eq("id", pair.id);

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
    if (!newLimit.trim() || !contract) {
      toast.error("Please enter a limit");
      return;
    }

    setAddingLimit(true);

    // Update contract content
    const limits = contract.content?.[
      newLimitCategory === "hard"
        ? "hard_limits"
        : newLimitCategory === "soft"
          ? "soft_limits"
          : "curiosities"
    ] || [];

    const updated = await supabase
      .from("contracts")
      .update({
        content: {
          ...contract.content,
          [newLimitCategory === "hard"
            ? "hard_limits"
            : newLimitCategory === "soft"
              ? "soft_limits"
              : "curiosities"]: [
            ...limits,
            newLimit.trim(),
          ],
        },
      })
      .eq("id", contract.id);

    if (!updated.error) {
      setNewLimit("");
      toast.success("Limit added");
      router.refresh();
    } else {
      toast.error("Failed to add limit");
    }
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Settings size={24} />
          Settings
        </h1>
        <p className="text-sm text-muted">Manage your profile and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Profile</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your public name"
              className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Collar Name</label>
            <input
              type="text"
              value={collarName}
              onChange={(e) => setCollarName(e.target.value)}
              placeholder="What does your Mistress call you?"
              className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Safe Word Section */}
      {pair && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield size={18} className="text-danger" />
            Safe Word
          </h2>

          <div className="space-y-2">
            <p className="text-sm text-muted">Current status:</p>
            <div
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                pair.safe_word_state === "red"
                  ? "bg-danger/10 text-danger"
                  : pair.safe_word_state === "yellow"
                    ? "bg-yellow-500/10 text-yellow-400"
                    : "bg-success/10 text-success"
              }`}
            >
              {pair.safe_word_state === "red"
                ? "🔴 Red — Full Stop"
                : pair.safe_word_state === "yellow"
                  ? "🟡 Yellow — Slow Down"
                  : "🟢 Green — Normal"}
            </div>
          </div>

          {pair.safe_word_state === "green" && (
            <div className="flex gap-2">
              <button
                onClick={() => handleTriggerSafeWord("yellow")}
                className="flex-1 rounded-lg border border-yellow-500/30 bg-yellow-500/5 py-2 text-xs font-medium text-yellow-400 hover:bg-yellow-500/10 transition-colors"
              >
                🟡 Slow Down
              </button>
              <button
                onClick={() => handleTriggerSafeWord("red")}
                className="flex-1 rounded-lg border border-danger/30 bg-danger/5 py-2 text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
              >
                🔴 Full Stop
              </button>
            </div>
          )}

          <p className="text-xs text-muted">
            Your Mistress will be notified immediately when you trigger a safe word.
          </p>
        </div>
      )}

      {/* Limits Section */}
      {contract && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Limits</h2>
            <button
              onClick={() => setShowLimitsForm(!showLimitsForm)}
              className="text-xs font-medium text-accent hover:text-accent/90"
            >
              {showLimitsForm ? "Cancel" : "+ Add"}
            </button>
          </div>

          {showLimitsForm && (
            <div className="rounded-lg bg-background p-3 space-y-2">
              <div>
                <label className="text-xs font-medium text-muted">Category</label>
                <select
                  value={newLimitCategory}
                  onChange={(e) =>
                    setNewLimitCategory(
                      e.target.value as "hard" | "soft" | "curiosity"
                    )
                  }
                  className="w-full mt-1 rounded-lg bg-card border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="hard">Hard Limit</option>
                  <option value="soft">Soft Limit</option>
                  <option value="curiosity">Curiosity</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Limit</label>
                <input
                  type="text"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  placeholder="Enter limit..."
                  className="w-full mt-1 rounded-lg bg-card border border-border px-2 py-1 text-xs text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <button
                onClick={handleAddLimit}
                disabled={addingLimit || !newLimit.trim()}
                className="w-full rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-black hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addingLimit ? "Adding..." : "Add Limit"}
              </button>
            </div>
          )}

          {/* Hard Limits */}
          {hardLimits.length > 0 && (
            <div>
              <p className="text-xs font-medium text-danger mb-2">Hard Limits</p>
              <div className="space-y-1">
                {hardLimits.map((limit, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-xs text-foreground flex items-center gap-2"
                  >
                    <AlertOctagon size={12} className="text-danger flex-shrink-0" />
                    {limit}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Soft Limits */}
          {softLimits.length > 0 && (
            <div>
              <p className="text-xs font-medium text-yellow-400 mb-2">Soft Limits</p>
              <div className="space-y-1">
                {softLimits.map((limit, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-xs text-foreground flex items-center gap-2"
                  >
                    <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0" />
                    {limit}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Curiosities */}
          {curiosities.length > 0 && (
            <div>
              <p className="text-xs font-medium text-purple mb-2">Curiosities</p>
              <div className="space-y-1">
                {curiosities.map((limit, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg bg-purple/10 border border-purple/30 px-3 py-2 text-xs text-foreground"
                  >
                    {limit}
                  </div>
                ))}
              </div>
            </div>
          )}

          {hardLimits.length === 0 &&
            softLimits.length === 0 &&
            curiosities.length === 0 && (
              <p className="text-xs text-muted text-center py-4">
                No limits set yet. Add some to establish boundaries with your Mistress.
              </p>
            )}
        </div>
      )}

      {/* Pair Info */}
      {pair && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={18} className="text-purple" />
            Pair Info
          </h2>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted mb-1">Status</p>
              <p className="text-sm font-medium capitalize">
                {pair.status === "active" && "🟢 Active"}
                {pair.status === "paused" && "🟡 Paused"}
                {pair.status === "ended" && "🔴 Ended"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted mb-1">Pair Code</p>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm text-muted font-mono">
                  {pair.id}
                </div>
                <button
                  onClick={copyPairCode}
                  className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-black hover:bg-accent/90 transition-colors flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check size={14} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted mt-1">
                Share this code with your Mistress to connect.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mood History */}
      {recentMood.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Heart size={18} className="text-pink-400" />
            Mood History
          </h2>

          <div className="space-y-2">
            {recentMood.slice(0, 5).map((checkin) => (
              <div
                key={checkin.id}
                className="flex items-center justify-between p-2 rounded-lg bg-background"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{checkin.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted">
                      {new Date(checkin.created_at).toLocaleDateString()}
                    </p>
                    {checkin.note && (
                      <p className="text-xs text-foreground">{checkin.note}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
