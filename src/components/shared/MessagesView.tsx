"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, MessageCircle, Crown, Heart, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Profile, Pair, Message } from "@/types/database";

interface PairWithPartner {
  pair: Pair;
  partnerProfile: Profile | null;
}

interface Props {
  currentProfile: Profile;
  pairsWithPartners: PairWithPartner[];
  initialMessages: Message[];
}

function getInitial(profile: Profile | null) {
  return (profile?.display_name || profile?.collar_name || "?")[0].toUpperCase();
}

function getPartnerName(profile: Profile | null) {
  return profile?.collar_name || profile?.display_name || "Unknown";
}

function getRoleLabel(profile: Profile | null) {
  if (!profile) return "";
  return profile.role === "mistress" ? "Commander" : "Operative";
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateDivider(dateString: string) {
  const d = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Group messages with date dividers
function groupMessages(messages: Message[]) {
  const grouped: { type: "divider"; label: string } | { type: "message"; msg: Message }[] = [];
  let lastDate = "";
  for (const msg of messages) {
    const d = new Date(msg.created_at).toDateString();
    if (d !== lastDate) {
      // @ts-ignore
      grouped.push({ type: "divider", label: formatDateDivider(msg.created_at) });
      lastDate = d;
    }
    // @ts-ignore
    grouped.push({ type: "message", msg });
  }
  return grouped;
}

export function MessagesView({ currentProfile, pairsWithPartners, initialMessages }: Props) {
  const supabase = createClient();

  const [selectedPairId, setSelectedPairId] = useState<string | null>(
    pairsWithPartners[0]?.pair.id ?? null
  );
  // Messages keyed by pair id
  const [pairMessages, setPairMessages] = useState<Record<string, Message[]>>(() => {
    const first = pairsWithPartners[0]?.pair.id;
    if (!first) return {};
    return { [first]: initialMessages };
  });
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Auto-scroll to bottom when messages change in selected pair
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    }
  }, [pairMessages, selectedPairId]);

  // Subscribe to realtime for the selected pair
  useEffect(() => {
    if (!selectedPairId) return;

    // Tear down previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`messages:${selectedPairId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `pair_id=eq.${selectedPairId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setPairMessages((prev) => ({
            ...prev,
            [selectedPairId]: [...(prev[selectedPairId] || []), newMsg],
          }));
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [selectedPairId]);

  // Load messages for a pair if not yet loaded
  const loadPairMessages = useCallback(
    async (pairId: string) => {
      if (pairMessages[pairId]) return; // already loaded
      setLoadingMessages(true);
      try {
        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("pair_id", pairId)
          .order("created_at", { ascending: true })
          .limit(100);
        setPairMessages((prev) => ({ ...prev, [pairId]: data || [] }));
      } catch {
        toast.error("Failed to load messages");
      } finally {
        setLoadingMessages(false);
      }
    },
    [pairMessages, supabase]
  );

  const handleSelectPair = (pairId: string) => {
    setSelectedPairId(pairId);
    setInput("");
    loadPairMessages(pairId);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedPairId || sending) return;
    const contentToSend = input.trim();
    setInput("");
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        pair_id: selectedPairId,
        sender_id: currentProfile.id,
        content: contentToSend,
        message_type: "text",
        media_url: null,
        read_at: null,
      });
      if (error) {
        toast.error("Failed to send");
        setInput(contentToSend);
      }
    } catch {
      toast.error("Failed to send");
      setInput(contentToSend);
    } finally {
      setSending(false);
    }
  };

  const selectedPairData = pairsWithPartners.find((p) => p.pair.id === selectedPairId);
  const partnerProfile = selectedPairData?.partnerProfile ?? null;
  const currentMessages = selectedPairId ? (pairMessages[selectedPairId] || []) : [];
  const grouped = groupMessages(currentMessages);
  const isMistress = currentProfile.role === "mistress";

  // ── No pairs ─────────────────────────────────────────────────────────────
  if (pairsWithPartners.length === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <h1 className="text-4xl font-headline font-bold tracking-tighter leading-[0.9] mb-2">
            SECURE<br />
            <span className="text-pink italic">TRANSMISSIONS</span>
          </h1>
          <p className="text-muted text-sm">End-to-end encrypted channel between Commander and Operative.</p>
        </div>
        <div className="flex flex-col items-center justify-center bg-surface-low rounded-2xl border border-outline-variant/10 p-16 gap-4">
          <div className="w-16 h-16 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-center">
            <Lock size={24} className="text-zinc-600" />
          </div>
          <p className="text-sm text-muted font-headline text-center tracking-wide">
            No active pair — channel offline
          </p>
          <p className="text-xs text-zinc-600 font-headline text-center">
            Pair up to establish a secure transmission line.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* ── Page header ─────────────────────────────── */}
      <div>
        <h1 className="text-4xl font-headline font-bold tracking-tighter leading-[0.9] mb-2">
          SECURE<br />
          <span className="text-pink italic">TRANSMISSIONS</span>
        </h1>
        <p className="text-muted text-sm">Encrypted channel. {pairsWithPartners.length > 1 ? `${pairsWithPartners.length} active pairings.` : "Active pairing."}</p>
      </div>

      {/* ── Pair tabs (only when > 1 pair) ──────────── */}
      {pairsWithPartners.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-2 scrollbar-hide">
          {pairsWithPartners.map(({ pair, partnerProfile: pp }) => {
            const isActive = pair.id === selectedPairId;
            return (
              <button
                key={pair.id}
                onClick={() => handleSelectPair(pair.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl flex-shrink-0 border transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 border-primary/30 text-foreground"
                    : "bg-surface-low border-outline-variant/10 text-muted hover:text-foreground hover:border-white/10"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-headline font-bold border flex-shrink-0 ${
                  isActive ? "bg-primary/20 border-primary/30 text-primary" : "bg-surface-container border-outline-variant/10 text-muted"
                }`}>
                  {getInitial(pp)}
                </div>
                <span className="text-xs font-headline font-bold tracking-wider whitespace-nowrap">
                  {getPartnerName(pp)}
                </span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Chat window ─────────────────────────────── */}
      <div
        className="flex flex-col rounded-2xl border border-outline-variant/10 overflow-hidden bg-surface-low"
        style={{
          height: "calc(100vh - 14rem)",
          minHeight: "400px",
          boxShadow: "inset 0 0 60px rgba(168,85,247,0.03)",
        }}
      >
        {/* Chat header */}
        <div className="flex items-center gap-4 px-5 py-4 bg-surface-container border-b border-white/5 flex-shrink-0">
          <div className="relative">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-headline font-bold text-sm border flex-shrink-0 ${
              isMistress ? "bg-pink/10 border-pink/20 text-pink" : "bg-primary/10 border-primary/20 text-primary"
            }`}>
              {getInitial(partnerProfile)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-surface-container" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-headline font-bold tracking-tight truncate">
              {getPartnerName(partnerProfile)}
            </p>
            <p className="text-[10px] font-label uppercase tracking-widest text-muted flex items-center gap-1.5">
              {partnerProfile?.role === "mistress" ? (
                <Crown size={9} className="text-primary" />
              ) : (
                <Heart size={9} className="text-pink" />
              )}
              {getRoleLabel(partnerProfile)} · Level {partnerProfile?.level ?? 1}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-success" style={{ boxShadow: "0 0 6px rgba(0,255,157,0.8)" }} />
            <span className="text-[10px] font-label uppercase tracking-widest text-success hidden sm:block">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={20} className="animate-spin text-muted" />
            </div>
          ) : currentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-14 h-14 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-center">
                <MessageCircle size={20} className="text-zinc-600" />
              </div>
              <p className="text-sm text-muted font-headline text-center tracking-wide">
                No transmissions yet
              </p>
              <p className="text-xs text-zinc-600 font-headline text-center">
                Initiate contact, {isMistress ? "Commander" : "Operative"}.
              </p>
            </div>
          ) : (
            grouped.map((item, idx) => {
              if (item.type === "divider") {
                return (
                  <div key={`div-${idx}`} className="flex items-center gap-4 py-3">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-[9px] font-label uppercase tracking-[0.2em] text-zinc-600 flex-shrink-0">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                );
              }
              const msg = item.msg;
              const isOwn = msg.sender_id === currentProfile.id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
                  {!isOwn && (
                    <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center font-headline font-bold text-xs mr-2 mt-auto border bg-primary/10 border-primary/20 text-primary self-end mb-0.5">
                      {getInitial(partnerProfile)}
                    </div>
                  )}
                  <div className={`max-w-[75%] sm:max-w-[65%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    <div className={`px-4 py-2.5 rounded-2xl ${
                      isOwn
                        ? "bg-primary/20 border border-primary/30 rounded-br-sm"
                        : "bg-surface-container border border-outline-variant/20 rounded-bl-sm"
                    }`}>
                      <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                    </div>
                    <span className="text-[9px] font-label text-zinc-600 mt-1 px-1">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 border-t border-white/5 bg-surface-container px-4 py-3 flex items-end gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={partnerProfile ? `Message ${getPartnerName(partnerProfile)}…` : "Select a channel…"}
            disabled={sending || !selectedPairId}
            className="flex-1 bg-surface-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/40 disabled:opacity-50 transition-colors resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || !selectedPairId}
            className="btn-gradient w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
