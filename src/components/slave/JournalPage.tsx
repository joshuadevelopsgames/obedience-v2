"use client";

import { BookOpen, Heart, Plus, X, Lock } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Profile, Pair, JournalEntry, MoodCheckin } from "@/types/database";

interface Props {
  profile: Profile;
  pair: Pair | null;
  entries: JournalEntry[];
  moodCheckins: MoodCheckin[];
}

const moodEmojis = ["😢", "😔", "😐", "🙂", "😊"];
const moodLabels = ["Struggling", "Low", "Neutral", "Good", "Great"];

export function JournalPage({
  profile,
  pair,
  entries,
  moodCheckins,
}: Props) {
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [moodNote, setMoodNote] = useState("");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleSubmitEntry = async () => {
    if (!content.trim()) { toast.error("Please write something"); return; }
    if (!pair) { toast.error("No active pair found"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("journal_entries").insert({
      pair_id: pair.id,
      author_id: profile.id,
      content: content.trim(),
      is_private: isPrivate,
      prompt: null,
    });
    if (!error) {
      setContent("");
      setIsPrivate(false);
      setShowNewEntry(false);
      toast.success("Journal entry saved");
      router.refresh();
    } else { toast.error("Failed to save entry"); }
    setSubmitting(false);
  };

  const handleMoodCheckin = async () => {
    if (selectedMood === null) { toast.error("Please select a mood"); return; }
    if (!pair) { toast.error("No active pair found"); return; }
    const { error } = await supabase.from("mood_checkins").insert({
      pair_id: pair.id,
      user_id: profile.id,
      mood: selectedMood,
      emoji: moodEmojis[selectedMood],
      note: moodNote.trim() || null,
    });
    if (!error) {
      setSelectedMood(null);
      setMoodNote("");
      toast.success("Mood recorded");
      router.refresh();
    } else { toast.error("Failed to record mood"); }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
        <div className="md:col-span-8">
          <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tighter leading-[0.9] mb-3">
            INNER<br />
            <span className="text-pink italic">WORLD</span>
          </h1>
          <p className="text-muted text-lg max-w-md leading-relaxed">
            Your thoughts are witnessed. Write freely — your Mistress reads what you share.
          </p>
        </div>
        <div className="md:col-span-4">
          <div className="glass-panel border border-outline-variant/10 p-5 rounded-xl">
            <p className="text-[10px] font-label uppercase tracking-widest text-primary mb-3">Check-In</p>
            <p className="text-xs text-muted mb-3 font-headline">How are you feeling?</p>
            <div className="flex justify-between gap-1 mb-3">
              {moodEmojis.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedMood(idx)}
                  title={moodLabels[idx]}
                  className={`flex-1 text-xl py-2 rounded-lg transition-all ${
                    selectedMood === idx
                      ? "bg-primary/20 scale-110 border border-primary/40"
                      : "bg-surface-container border border-outline-variant/10 hover:border-primary/20"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {selectedMood !== null && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  placeholder="Optional note (private)"
                  className="w-full bg-transparent border-b border-outline-variant/30 px-0 py-1.5 text-xs text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={handleMoodCheckin}
                  className="w-full btn-gradient py-2 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase"
                >
                  Record
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New entry CTA */}
      <button
        onClick={() => setShowNewEntry(true)}
        className="w-full bg-surface-container rounded-xl border border-outline-variant/10 hover:border-primary/20 px-5 py-4 flex items-center gap-3 text-sm font-headline font-bold text-muted hover:text-foreground transition-all glow-border-primary"
      >
        <Plus size={16} />
        New Entry
      </button>

      {/* New entry modal */}
      {showNewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl glass-panel rounded-xl border border-outline-variant/10 p-6 mx-4 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-headline font-bold tracking-tight">New Entry</h2>
              <button
                onClick={() => { setShowNewEntry(false); setContent(""); setIsPrivate(false); }}
                className="text-muted hover:text-foreground transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your thoughts, feelings, and experiences…"
              className="w-full bg-surface-container rounded-lg border border-outline-variant/10 p-4 text-sm text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/40 min-h-48 resize-none transition-colors"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPrivate(!isPrivate)}
                className={`flex items-center gap-2 text-xs font-label uppercase tracking-widest transition-colors ${isPrivate ? "text-primary" : "text-muted hover:text-foreground"}`}
              >
                <Lock size={12} />
                {isPrivate ? "Private" : "Visible to Mistress"}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowNewEntry(false); setContent(""); setIsPrivate(false); }}
                className="flex-1 border border-outline-variant/20 py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEntry}
                disabled={submitting || !content.trim()}
                className="flex-1 btn-gradient py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entries list */}
      <div className="flex flex-col gap-3">
        {entries.length === 0 ? (
          <div className="bg-surface-container rounded-xl p-12 text-center border border-outline-variant/5">
            <BookOpen size={28} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-muted font-headline text-sm">Start writing to reflect on your journey</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="bg-surface-low rounded-xl border border-transparent hover:border-primary/20 transition-all duration-300 overflow-hidden glow-border-primary">
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer"
                onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[10px] font-label uppercase tracking-[0.2em] text-muted">
                    {new Date(entry.created_at).toLocaleDateString()}
                    {entry.is_private && " · 🔒 Private"}
                  </p>
                  <p className="text-sm text-foreground line-clamp-2 mt-1 leading-relaxed">{entry.content}</p>
                </div>
              </div>

              {expandedEntry === entry.id && (
                <div className="border-t border-white/5 px-5 py-5 bg-surface-container space-y-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{entry.content}</p>

                  {entry.mistress_note && (
                    <div className="bg-surface-container-high rounded-r-xl border-l-4 border-primary p-4">
                      <p className="text-[10px] font-headline font-bold uppercase text-primary tracking-widest mb-1">
                        Mistress's Note {entry.mistress_emoji && entry.mistress_emoji}
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">{entry.mistress_note}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Mood history */}
      {moodCheckins.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Heart size={16} className="text-pink" />
            <h2 className="text-xs font-label uppercase tracking-widest text-muted">Recent Check-ins</h2>
          </div>
          <div className="bg-surface-container rounded-xl border border-outline-variant/10 p-4 space-y-2">
            {moodCheckins.slice(0, 5).map((checkin) => (
              <div key={checkin.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <span className="text-lg w-7">{checkin.emoji}</span>
                  <p className="text-xs font-label uppercase tracking-widest text-muted">
                    {new Date(checkin.created_at).toLocaleDateString()}
                  </p>
                </div>
                {checkin.note && <span className="text-xs text-muted italic">{checkin.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
