"use client";

import { useState, useMemo } from "react";
import { BookOpen, Sparkles, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Profile, Pair, JournalEntry, MoodCheckin } from "@/types/database";

interface Props {
  pair: Pair | null;
  profile: Profile;
  entries: JournalEntry[];
  moodCheckins: MoodCheckin[];
}

const moodEmojis = ["", "😢", "😔", "😐", "🙂", "😊"];
const reactionEmojis = ["❤️", "🔥", "⭐", "💜", "👑", "🌹"];

export function JournalView({
  pair,
  profile,
  entries,
  moodCheckins,
}: Props) {
  const [activeTab, setActiveTab] = useState<"journal" | "mood">("journal");
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const avgMood = useMemo(() => {
    if (moodCheckins.length === 0) return 0;
    return moodCheckins.reduce((sum, m) => sum + m.mood, 0) / moodCheckins.length;
  }, [moodCheckins]);

  const last14Days = useMemo(() => {
    const days: MoodCheckin[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayCheckins = moodCheckins.filter(
        (m) =>
          new Date(m.created_at).toDateString() === date.toDateString()
      );
      if (dayCheckins.length > 0) {
        days.push(dayCheckins[dayCheckins.length - 1]); // Latest for that day
      }
    }
    return days;
  }, [moodCheckins]);

  const handleGeneratePrompts = async () => {
    if (!pair) {
      toast.error("You need to be paired first");
      return;
    }
    setGenerating(true);

    try {
      const res = await fetch("/api/ai/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId: pair.id, type: "journal" }),
      });
      const data = await res.json();

      if (data.prompts) {
        toast.success(`Generated ${data.prompts.length} journal prompts`);
      } else {
        toast.error(data.error || "Failed to generate prompts");
      }
    } catch {
      toast.error("Failed to generate prompts");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveNote = async (entryId: string) => {
    setSavingNote(true);

    try {
      const { error } = await supabase
        .from("journal_entries")
        .update({
          mistress_note: editNote.trim() || null,
          mistress_emoji: selectedEmoji || null,
        })
        .eq("id", entryId);

      if (!error) {
        toast.success("Note saved");
        setEditingEntryId(null);
        setEditNote("");
        setSelectedEmoji(null);
        router.refresh();
      } else {
        toast.error("Failed to save note");
      }
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  const openEntryEditor = (entry: JournalEntry) => {
    setExpandedEntryId(null);
    setEditingEntryId(entry.id);
    setEditNote(entry.mistress_note || "");
    setSelectedEmoji(entry.mistress_emoji || null);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("journal")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "journal"
              ? "border-b-2 border-accent text-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          <BookOpen className="inline mr-2" size={16} />
          Journal Entries
        </button>
        <button
          onClick={() => setActiveTab("mood")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "mood"
              ? "border-b-2 border-accent text-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          <span className="text-lg">📊</span>
          <span className="ml-2">Mood Tracker</span>
        </button>
      </div>

      {/* Journal Tab */}
      {activeTab === "journal" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Journal Entries</h2>
            <button
              onClick={handleGeneratePrompts}
              disabled={generating || !pair}
              className="flex items-center gap-2 rounded-lg bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {generating ? "Generating..." : "Generate Prompts"}
            </button>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <p className="text-sm text-muted">
                No journal entries yet. Your submissive will share entries here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  {/* Entry Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-xs text-muted">
                        {new Date(entry.created_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </p>
                      {entry.prompt && (
                        <p className="text-sm italic text-purple mt-1">
                          "{entry.prompt}"
                        </p>
                      )}
                    </div>
                    {entry.is_private && (
                      <span className="text-xs bg-purple/20 text-purple px-2 py-1 rounded">
                        Private
                      </span>
                    )}
                  </div>

                  {/* Entry Content */}
                  <p
                    className={`text-sm text-foreground ${
                      expandedEntryId === entry.id
                        ? ""
                        : "line-clamp-3"
                    }`}
                  >
                    {entry.content}
                  </p>

                  {/* Expand/Collapse Button */}
                  {entry.content.length > 150 && expandedEntryId !== entry.id && (
                    <button
                      onClick={() => setExpandedEntryId(entry.id)}
                      className="text-xs text-accent hover:underline mt-2"
                    >
                      Read more
                    </button>
                  )}
                  {expandedEntryId === entry.id && (
                    <button
                      onClick={() => setExpandedEntryId(null)}
                      className="text-xs text-accent hover:underline mt-2"
                    >
                      Hide
                    </button>
                  )}

                  {/* Mistress Note Section */}
                  {editingEntryId === entry.id ? (
                    <div className="mt-4 space-y-3 p-3 bg-background rounded-lg">
                      <p className="text-xs font-medium text-muted">Add Your Note</p>
                      <textarea
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="Share your thoughts…"
                        className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                        rows={3}
                      />
                      <div className="flex gap-1 flex-wrap">
                        {reactionEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() =>
                              setSelectedEmoji(
                                selectedEmoji === emoji ? null : emoji
                              )
                            }
                            className={`text-xl p-1 rounded transition-colors ${
                              selectedEmoji === emoji
                                ? "bg-accent/20 scale-125"
                                : "hover:bg-card"
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveNote(entry.id)}
                          disabled={savingNote}
                          className="flex-1 rounded-lg bg-accent/20 border border-accent px-3 py-2 text-sm font-medium text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
                        >
                          {savingNote ? "Saving..." : "Save Note"}
                        </button>
                        <button
                          onClick={() => setEditingEntryId(null)}
                          className="flex-1 rounded-lg bg-muted/10 border border-muted px-3 py-2 text-sm font-medium text-muted hover:bg-muted/20 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-start justify-between">
                      {entry.mistress_note ? (
                        <div className="flex-1">
                          <p className="text-xs text-muted mb-1">Your note:</p>
                          <div className="flex items-start gap-2">
                            <p className="text-sm text-foreground bg-background rounded p-2 flex-1">
                              {entry.mistress_note}
                            </p>
                            {entry.mistress_emoji && (
                              <span className="text-xl">{entry.mistress_emoji}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted italic">No note yet</p>
                      )}
                      <button
                        onClick={() => openEntryEditor(entry)}
                        className="ml-2 text-xs text-accent hover:underline whitespace-nowrap"
                      >
                        {entry.mistress_note ? "Edit" : "Add Note"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mood Tab */}
      {activeTab === "mood" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Average Mood</h2>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <span className="text-3xl">
                {moodEmojis[Math.round(avgMood)]}
              </span>
              <div>
                <p className="text-sm text-muted">Overall mood (14 days)</p>
                <p className="text-lg font-semibold">
                  {avgMood.toFixed(1)} / 5
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted">Last 14 Days</h3>
            <div className="space-y-2">
              {last14Days.length === 0 ? (
                <p className="text-sm text-muted text-center py-6">
                  No mood check-ins yet
                </p>
              ) : (
                last14Days.map((checkin) => (
                  <div
                    key={checkin.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <span className="text-2xl min-w-8">
                      {moodEmojis[checkin.mood]}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs text-muted">
                        {new Date(checkin.created_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </p>
                      {checkin.note && (
                        <p className="text-sm text-foreground mt-1">
                          {checkin.note}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted">
                      {checkin.mood}/5
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
