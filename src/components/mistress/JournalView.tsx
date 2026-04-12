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
        (m) => new Date(m.created_at).toDateString() === date.toDateString()
      );
      if (dayCheckins.length > 0) {
        days.push(dayCheckins[dayCheckins.length - 1]);
      }
    }
    return days;
  }, [moodCheckins]);

  const handleGeneratePrompts = async () => {
    if (!pair) { toast.error("You need to be paired first"); return; }
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
    } catch { toast.error("Failed to generate prompts"); }
    setGenerating(false);
  };

  const handleSaveNote = async (entryId: string) => {
    setSavingNote(true);
    try {
      const { error } = await supabase
        .from("journal_entries")
        .update({ mistress_note: editNote.trim() || null, mistress_emoji: selectedEmoji || null })
        .eq("id", entryId);
      if (!error) {
        toast.success("Note saved");
        setEditingEntryId(null);
        setEditNote("");
        setSelectedEmoji(null);
        router.refresh();
      } else { toast.error("Failed to save note"); }
    } catch { toast.error("Failed to save note"); }
    setSavingNote(false);
  };

  const openEntryEditor = (entry: JournalEntry) => {
    setExpandedEntryId(null);
    setEditingEntryId(entry.id);
    setEditNote(entry.mistress_note || "");
    setSelectedEmoji(entry.mistress_emoji || null);
  };

  const tabItems = [
    { value: "journal" as const, label: "Journal", icon: <BookOpen size={14} /> },
    { value: "mood" as const, label: "Mood Data", icon: <span className="text-sm">📊</span> },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Hero Header */}
      <div>
        <h1 className="text-4xl font-headline font-bold tracking-tighter leading-[0.9] mb-2">
          SUBMISSIVE<br />
          <span className="text-pink italic">JOURNAL</span>
        </h1>
        <p className="text-muted text-sm leading-relaxed max-w-md">
          Monitor your submissive's inner state. Leave notes, read between the lines.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-white/5">
        {tabItems.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-2 font-label text-xs font-bold uppercase tracking-widest pb-3 transition-colors ${
              activeTab === tab.value
                ? "text-primary border-b-2 border-primary/30"
                : "text-zinc-500 hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Journal Tab ─────────────────────────────────── */}
      {activeTab === "journal" && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-widest text-muted">
              {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
            </span>
            <button
              onClick={handleGeneratePrompts}
              disabled={generating || !pair}
              className="btn-gradient px-4 py-2 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center gap-2 disabled:opacity-50"
            >
              {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {generating ? "Generating..." : "Generate Prompts"}
            </button>
          </div>

          {entries.length === 0 ? (
            <div className="bg-surface-container rounded-xl p-12 text-center border border-outline-variant/5">
              <BookOpen size={28} className="mx-auto mb-4 text-zinc-600" />
              <p className="text-muted font-headline text-sm">No entries yet — your submissive will share here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {entries.map((entry) => (
                <div key={entry.id} className="bg-surface-low rounded-xl border border-transparent hover:border-primary/20 transition-all duration-300 overflow-hidden glow-border-primary">
                  {/* Entry Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-[10px] font-label uppercase tracking-[0.2em] text-muted mb-1">
                          {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        {entry.prompt && (
                          <p className="text-xs italic text-primary mt-1">"{entry.prompt}"</p>
                        )}
                      </div>
                      {entry.is_private && (
                        <span className="text-[10px] font-headline font-bold tracking-widest bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">PRIVATE</span>
                      )}
                    </div>

                    <p className={`text-sm text-foreground leading-relaxed ${expandedEntryId === entry.id ? "" : "line-clamp-3"}`}>
                      {entry.content}
                    </p>

                    {entry.content.length > 150 && (
                      <button
                        onClick={() => setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)}
                        className="text-xs text-primary hover:underline mt-2"
                      >
                        {expandedEntryId === entry.id ? "Hide" : "Read more"}
                      </button>
                    )}
                  </div>

                  {/* Note area */}
                  <div className="border-t border-white/5 bg-surface-container px-5 py-4">
                    {editingEntryId === entry.id ? (
                      <div className="space-y-3">
                        <p className="text-[10px] font-label uppercase tracking-[0.2em] text-muted">Your Dominant Note</p>
                        <textarea
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Share your thoughts on this entry…"
                          className="w-full bg-surface-container-high border-b border-primary/40 px-0 py-1.5 text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary resize-none"
                          rows={3}
                        />
                        <div className="flex gap-1 flex-wrap">
                          {reactionEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => setSelectedEmoji(selectedEmoji === emoji ? null : emoji)}
                              className={`text-xl p-1.5 rounded transition-all ${selectedEmoji === emoji ? "bg-primary/20 scale-125" : "hover:bg-surface-container-high"}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveNote(entry.id)}
                            disabled={savingNote}
                            className="flex-1 btn-gradient py-2 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase disabled:opacity-50"
                          >
                            {savingNote ? "Saving..." : "Save Note"}
                          </button>
                          <button
                            onClick={() => setEditingEntryId(null)}
                            className="flex-1 border border-outline-variant/20 py-2 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase text-muted hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        {entry.mistress_note ? (
                          <div className="flex-1">
                            <p className="text-[10px] font-label uppercase tracking-[0.2em] text-muted mb-2">Your note</p>
                            <div className="flex items-start gap-2">
                              <p className="text-sm text-foreground bg-surface-container-high rounded px-3 py-2 flex-1 border-l-4 border-primary">
                                {entry.mistress_note}
                              </p>
                              {entry.mistress_emoji && <span className="text-xl">{entry.mistress_emoji}</span>}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-600 italic">No note added yet</p>
                        )}
                        <button
                          onClick={() => openEntryEditor(entry)}
                          className="text-[10px] font-headline font-bold tracking-widest uppercase text-primary hover:underline whitespace-nowrap flex-shrink-0"
                        >
                          {entry.mistress_note ? "Edit" : "Add Note"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Mood Tab ─────────────────────────────────────── */}
      {activeTab === "mood" && (
        <div className="flex flex-col gap-6">
          {/* Average mood */}
          <div className="bg-surface-low rounded-xl border border-outline-variant/10 p-6">
            <p className="text-[10px] font-label uppercase tracking-[0.2em] text-muted mb-3">14-Day Average</p>
            <div className="flex items-center gap-4">
              <span className="text-4xl">{moodEmojis[Math.round(avgMood)]}</span>
              <div>
                <p className="text-3xl font-headline font-bold tracking-tight">{avgMood.toFixed(1)}<span className="text-muted text-lg font-normal"> / 5</span></p>
                <p className="text-xs text-muted font-label">submissive emotional state</p>
              </div>
            </div>
          </div>

          {/* Day-by-day */}
          <div>
            <p className="text-[10px] font-label uppercase tracking-[0.2em] text-muted mb-4">Last 14 Days</p>
            {last14Days.length === 0 ? (
              <div className="bg-surface-container rounded-xl p-8 text-center border border-outline-variant/5">
                <p className="text-muted text-sm font-headline">No mood check-ins yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {last14Days.map((checkin) => (
                  <div key={checkin.id} className="flex items-center gap-4 bg-surface-low rounded-xl px-5 py-3 border border-outline-variant/10">
                    <span className="text-2xl w-8 text-center">{moodEmojis[checkin.mood]}</span>
                    <div className="flex-1">
                      <p className="text-[10px] font-label uppercase tracking-widest text-muted">
                        {new Date(checkin.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      {checkin.note && <p className="text-sm text-foreground mt-0.5">{checkin.note}</p>}
                    </div>
                    <span className="text-xs font-headline font-bold text-primary">{checkin.mood}/5</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
