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

export function MessagesView({
  pair,
  profile,
  partnerProfile,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 0);
    }
  }, [messages]);

  useEffect(() => {
    if (!pair) return;

    const channel = supabase
      .channel(`messages:${pair.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `pair_id=eq.${pair.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

      if (error) {
        toast.error("Failed to send message");
        setInput(contentToSend);
      }
    } catch {
      toast.error("Failed to send message");
      setInput(contentToSend);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const partnerName =
    partnerProfile?.collar_name ||
    partnerProfile?.display_name ||
    "your partner";

  if (!pair) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12">
        <p className="text-center text-muted">
          Pair up to start messaging
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-purple/20 flex items-center justify-center text-sm font-bold text-purple">
          {(partnerProfile?.display_name || "?")[0].toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium">{partnerName}</p>
          <p className="text-xs text-muted">
            {partnerProfile?.role === "mistress" ? "Dominant" : "Submissive"}
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-sm text-muted">
              No messages yet. Start the conversation.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === profile.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwn
                      ? "bg-accent/20 border border-accent/30 text-foreground"
                      : "bg-purple/10 border border-purple/30 text-foreground"
                  }`}
                >
                  <p className="text-sm break-words">{msg.content}</p>
                  <p className="text-xs text-muted mt-1 text-right">
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 flex gap-2">
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
          placeholder={`Message ${partnerName}…`}
          disabled={sending}
          className="flex-1 rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="rounded-lg bg-accent/20 border border-accent/30 px-4 py-2.5 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </div>
  );
}
