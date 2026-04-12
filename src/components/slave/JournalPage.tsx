"use client";

import {
  BookOpen,
  Heart,
  Plus,
  X,
} from "lucide-react";
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
    if (!content.trim()) {
      toast.error("Please write something");
      return;
    }
    if (!pair) {
      toast.error("No active pair found");
      return;
    }

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
    } else {
      toast.error("Failed to save entry");
    }
    setSubmitting(false);
  };

  const handleMoodCheckin = async () => {
    if (selectedMood === null) {
      toast.error("Please select a mood");
      return;
    }
    if (!pair) {
      toast.error("No active pair found");
      return;
    }

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
      toast.success("Mood check-in recorded");
      router.refresh();
    } else {
      toast.error("Failed to record mood");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <BookOpen size={24} className="text-pink-400" />
          Journal
        </h1>
        <p className="text-sm text-muted">Reflect on your journey with your Mistress</p>
      </div>

      {/* Mood check-in widget */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium">How are you feeling?</p>
        <div className="flex justify-between gap-2">
          {moodEmojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedMood(idx)}
              className={`flex-1 text-2xl py-2 rounded-lg transition-all ${
                selectedMood === idx
                  ? "bg-purple/20 scale-110 border border-purple"
                  : "bg-background border border-border hover:bg-background/80"
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
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={handleMoodCheckin}
              className="w-full rounded-lg bg-accent px-3 py-2 text-xs font-medium text-black hover:bg-accent/90 transition-colors"
            >
              Record Check-in
            </button>
          </div>
        )}
      </div>

      {/* New entry button */}
      <button
        onClick={() => setShowNewEntry(true)}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground hover:bg-card-hover transition-colors"
      >
        <Plus size={16} />
        New Entry
      </button>

      {/* New entry form modal */}
      {showNewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">New Journal Entry</h2>
              <button
                onClick={() => {
                  setShowNewEntry(false);
                  setContent("");
                  setIsPrivate(false);
                }}
                className="text-muted hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your thoughts, feelings, and experiences..."
              className="w-full rounded-lg bg-background border border-border p-3 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent min-h-64"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="private"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded border border-border"
              />
              <label htmlFor="private" className="text-sm text-muted">
                Private (only you can see this)
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNewEntry(false);
                  setContent("");
                  setIsPrivate(false);
                }}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEntry}
                disabled={submitting || !content.trim()}
                className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Saving..." : "Save Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entries list */}
      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <BookOpen size={24} className="mx-auto mb-2 text-muted" />
            <p className="text-sm text-muted">
              Start writing to reflect on your journey
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-card-hover transition-colors"
                onClick={() =>
                  setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
                }
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-foreground line-clamp-2 mt-1">
                    {entry.content}
                  </p>
                </div>
                {entry.is_private && (
                  <span className="ml-2 text-xs text-muted">🔒</span>
                )}
              </div>

              {expandedEntry === entry.id && (
                <div className="border-t border-border px-4 py-4 bg-card/50 space-y-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {entry.content}
                  </p>

                  {entry.mistress_note && (
                    <div className="rounded-lg bg-purple/10 border border-purple/30 p-3">
                      <p className="text-xs font-medium text-purple mb-1">
                        💬 Mistress's Note {entry.mistress_emoji && entry.mistress_emoji}
                      </p>
                      <p className="text-sm text-foreground">
                        {entry.mistress_note}
                      </p>
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
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Heart size={18} className="text-pink-400" />
            Recent Check-ins
          </h2>
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-2">
            {moodCheckins.slice(0, 5).map((checkin) => (
              <div
                key={checkin.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{checkin.emoji}</span>
                  <span className="text-muted">
                    {new Date(checkin.created_at).toLocaleDateString()}
                  </span>
                </div>
                {checkin.note && (
                  <span className="text-xs text-muted">{checkin.note}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
