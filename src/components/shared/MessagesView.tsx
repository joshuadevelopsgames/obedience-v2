"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Profile, Pair, Message } from "@/types/database";

interface Props {
  pair: Pair | null;
  profile: Profile;
  partnerProfile: Profile | null;
  initialMessages: Message[];
}

export function MessagesView({ pair, profile, partnerProfile, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 0);
    }
  }, [messages]);

  useEffect(() => {
    if (!pair) return;
    const channel = supabase
      .channel(`messages:${pair.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `pair_id=eq.${pair.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pair, supabase]);

  const handleSend = async () => {
    if (!input.trim() || !pair || sending) return;
    setSending(true);
    const contentToSend = input.trim();
    setInput("");
    try {
      const { error } = await supabase.from("messages").insert({
        pair_id: pair.id,
        sender_id: profile.id,
        content: contentToSend,
        message_type: "text",
        media_url: null,
        read_at: null,
      });
      if (error) { toast.error("Failed to send message"); setInput(contentToSend); }
    } catch { toast.error("Failed to send message"); setInput(contentToSend); }
    setSending(false);
  };

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  const partnerName = partnerProfile?.collar_name || partnerProfile?.display_name || "your partner";
  const partnerInitial = (partnerProfile?.display_name || "?")[0].toUpperCase();

  if (!pair) {
    return (
      <div className="flex items-center justify-center bg-surface-container rounded-xl border border-outline-variant/10 p-12">
        <p className="text-center text-muted font-headline text-sm">Pair up to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-surface-low rounded-xl border border-outline-variant/10 overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center gap-3 bg-surface-container">
        <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-headline font-bold text-primary">
          {partnerInitial}
        </div>
        <div>
          <p className="text-sm font-headline font-bold tracking-tight">{partnerName}</p>
          <p className="text-[10px] font-label uppercase tracking-widest text-muted">
            {partnerProfile?.role === "mistress" ? "Commander" : "Operative"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-glow" />
          <span className="text-[10px] font-label uppercase tracking-widest text-success">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-5">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted font-headline text-center">No transmissions yet. Initiate contact.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === profile.id;
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-xl ${
                  isOwn
                    ? "bg-primary/15 border border-primary/30"
                    : "bg-surface-container border border-outline-variant/20"
                }`}>
                  <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                  <p className="text-[10px] font-label text-muted mt-1 text-right">{formatTime(msg.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/5 p-4 bg-surface-container flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={`Message ${partnerName}…`}
          disabled={sending}
          className="flex-1 bg-surface-container-high border border-outline-variant/20 rounded-sm px-4 py-2.5 text-sm text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/40 disabled:opacity-50 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="btn-gradient px-4 py-2.5 rounded-sm flex items-center gap-2 disabled:opacity-50"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
