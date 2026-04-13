"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Send, Loader2, MessageCircle, Crown, Heart, Lock,
  Smile, Paperclip, X, Zap, Shield, Gift, ChevronRight,
  CornerUpLeft, AlertCircle, RotateCcw, ChevronDown, Check, CheckCheck,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Profile, Pair, Message, MessageReaction } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────────
type LocalMessage = Message & {
  _pending?: boolean;
  _failed?: boolean;
  _tempId?: string;
};

interface ReplyTarget { id: string; senderName: string; snippet: string }

function encodeReply(reply: ReplyTarget, text: string): string {
  return JSON.stringify({ _r: { id: reply.id, s: reply.senderName, c: reply.snippet }, t: text });
}

function decodeReply(content: string): { reply: ReplyTarget; text: string } | null {
  try {
    if (!content.startsWith("{")) return null;
    const obj = JSON.parse(content);
    if (obj._r && obj.t) return { reply: { id: obj._r.id, senderName: obj._r.s, snippet: obj._r.c }, text: obj.t };
    return null;
  } catch { return null; }
}

const EMOJI_CATEGORIES = [
  { label: "Faves", emojis: ["❤️", "🖤", "💜", "💗", "🔥", "✨", "😈", "🙏", "💦", "🥵", "😍", "🫦", "💋", "⛓️", "🎀", "🌹", "🧎‍♂️", "🙇‍♂️"] },
  { label: "Faces", emojis: ["😊", "😇", "🥺", "😭", "😩", "🤤", "😳", "🫣", "😏", "🤫", "😤", "🥴", "😌", "🫠", "😋", "😘"] },
  { label: "Gesture", emojis: ["👏", "🙌", "🤲", "✋", "🤚", "👋", "🫶", "💪", "🦵", "🦶", "👅", "👁️", "💅", "🤌", "👌", "🫰"] },
  { label: "Objects", emojis: ["🎭", "🪢", "🔒", "🗝️", "🪄", "🧸", "🎁", "📿", "💎", "🩰", "👑", "🪖", "🌙", "⭐", "💫", "🌸"] },
];

const QUICK_REACTIONS = ["❤️", "🔥", "🙏", "😈", "✅"];

type ShareType = "task" | "punishment" | "reward";
interface SharedItem { shareType: ShareType; id: string; title: string; xp?: number; xp_cost?: number; status?: string; severity?: number; category?: string }

function isSharedItem(content: string): SharedItem | null {
  try {
    if (!content.startsWith("{")) return null;
    const obj = JSON.parse(content);
    if (obj.shareType && obj.id && obj.title) return obj as SharedItem;
    return null;
  } catch { return null; }
}

interface SidebarTask { id: string; title: string; xp_reward: number; status: string; category: string }
interface SidebarPunishment { id: string; title: string; severity: number; status: string }
interface SidebarReward { id: string; title: string; xp_cost: number; available: boolean }
type SidebarTab = "tasks" | "punishments" | "rewards";

interface PairWithPartner { pair: Pair; partnerProfile: Profile | null }
interface Props { currentProfile: Profile; pairsWithPartners: PairWithPartner[]; initialMessages: Message[] }

// ─── Grouped message type ───────────────────────────────────────────────────────
type GroupedItem =
  | { type: "divider"; label: string }
  | { type: "message"; msg: LocalMessage; isFirst: boolean; isLast: boolean };

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getInitial(p: Profile | null) { return (p?.display_name || p?.collar_name || "?")[0].toUpperCase(); }
function getPartnerName(p: Profile | null) { return p?.collar_name || p?.display_name || "Unknown"; }
function getRoleLabel(p: Profile | null) { if (!p) return ""; return p.role === "mistress" ? "Dominant" : "Submissive"; }
function formatTime(d: string) { return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }); }
function formatDateDivider(d: string) {
  const date = new Date(d), today = new Date(), yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupMessages(messages: LocalMessage[]): GroupedItem[] {
  const items: GroupedItem[] = [];
  let lastDate = "";
  const WINDOW_MS = 5 * 60 * 1000;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const d = new Date(msg.created_at).toDateString();
    if (d !== lastDate) {
      items.push({ type: "divider", label: formatDateDivider(msg.created_at) });
      lastDate = d;
    }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const sameAsPrev = prev && prev.sender_id === msg.sender_id &&
      new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < WINDOW_MS;
    const sameAsNext = next && next.sender_id === msg.sender_id &&
      new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() < WINDOW_MS;
    items.push({ type: "message", msg, isFirst: !sameAsPrev, isLast: !sameAsNext });
  }
  return items;
}

// ─── Partner avatar ────────────────────────────────────────────────────────────
function PartnerAvatar({ profile, size = "sm" }: { profile: Profile | null; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-10 h-10 text-sm";
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={getPartnerName(profile)}
        className={`${dim} rounded-xl object-cover flex-shrink-0 border border-primary/20`}
      />
    );
  }
  return (
    <div className={`${dim} rounded-xl flex items-center justify-center font-headline font-bold border flex-shrink-0 bg-primary/10 border-primary/20 text-primary`}>
      {getInitial(profile)}
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl rounded-bl-sm bg-surface-container border border-outline-variant/20 w-fit">
      <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

// ─── Shared Item Card ──────────────────────────────────────────────────────────
function SharedItemCard({ item, isMistress }: { item: SharedItem; isMistress: boolean }) {
  const colors: Record<ShareType, { border: string; bg: string; text: string; icon: React.ReactNode }> = {
    task:       { border: "border-primary/30",    bg: "bg-primary/5",    text: "text-primary",    icon: <Zap size={12} className="text-primary" /> },
    punishment: { border: "border-[#ff3366]/30",  bg: "bg-[#ff3366]/5", text: "text-[#ff3366]",  icon: <Shield size={12} className="text-[#ff3366]" /> },
    reward:     { border: "border-pink/30",        bg: "bg-pink/5",       text: "text-pink",       icon: <Gift size={12} className="text-pink" /> },
  };
  const c = colors[item.shareType];
  const href = isMistress
    ? (item.shareType === "task" ? "/mistress/tasks" : item.shareType === "reward" ? "/mistress/rewards" : "/mistress/tasks")
    : (item.shareType === "task" ? "/sub/tasks" : item.shareType === "reward" ? "/sub/rewards" : "/sub/tasks");

  return (
    <Link href={href} className={`block rounded-xl border ${c.border} ${c.bg} overflow-hidden w-[220px] hover:brightness-110 transition-all`}>
      <div className={`px-3 py-1.5 border-b ${c.border} flex items-center gap-1.5`}>
        {c.icon}
        <span className={`text-[9px] font-headline font-bold tracking-widest uppercase ${c.text}`}>{item.shareType}</span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-xs font-headline font-bold leading-snug">{item.title}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {item.xp !== undefined && <span className="flex items-center gap-0.5 text-[10px] text-primary font-headline"><Zap size={9} />{item.xp} XP</span>}
          {item.xp_cost !== undefined && <span className="flex items-center gap-0.5 text-[10px] text-primary font-headline"><Zap size={9} />{item.xp_cost} XP</span>}
          {item.status && <span className="text-[9px] font-label uppercase tracking-wider text-muted">{item.status}</span>}
          {item.severity !== undefined && <span className="text-[9px] font-label uppercase tracking-wider text-[#ff3366]">Severity {item.severity}</span>}
        </div>
        <p className={`text-[9px] mt-2 font-label uppercase tracking-wider ${c.text} opacity-70`}>Tap to view →</p>
      </div>
    </Link>
  );
}

// ─── Share Sidebar ─────────────────────────────────────────────────────────────
function ShareSidebar({ pairId, onShare, onClose }: { pairId: string; onShare: (item: SharedItem) => void; onClose: () => void }) {
  const supabase = createClient();
  const [tab, setTab] = useState<SidebarTab>("tasks");
  const [tasks, setTasks] = useState<SidebarTask[]>([]);
  const [punishments, setPunishments] = useState<SidebarPunishment[]>([]);
  const [rewards, setRewards] = useState<SidebarReward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [t, p, r] = await Promise.all([
        supabase.from("tasks").select("id,title,xp_reward,status,category").eq("pair_id", pairId).order("created_at", { ascending: false }).limit(20),
        supabase.from("punishments").select("id,title,severity,status").eq("pair_id", pairId).order("created_at", { ascending: false }).limit(20),
        supabase.from("rewards").select("id,title,xp_cost,available").eq("pair_id", pairId).order("created_at", { ascending: false }).limit(20),
      ]);
      setTasks((t.data || []) as SidebarTask[]);
      setPunishments((p.data || []) as SidebarPunishment[]);
      setRewards((r.data || []) as SidebarReward[]);
      setLoading(false);
    };
    load();
  }, [pairId]);

  const TABS = [
    { id: "tasks" as SidebarTab, label: "Tasks", icon: <Zap size={11} />, count: tasks.length },
    { id: "punishments" as SidebarTab, label: "Punish", icon: <Shield size={11} />, count: punishments.length },
    { id: "rewards" as SidebarTab, label: "Rewards", icon: <Gift size={11} />, count: rewards.length },
  ];

  return (
    <div className="flex flex-col h-full border-l border-white/5 bg-surface-container w-64 flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-[10px] font-headline font-bold tracking-widest uppercase text-muted">Share</span>
        <button onClick={onClose} className="p-1 text-muted hover:text-foreground transition-colors"><X size={14} /></button>
      </div>
      <div className="flex border-b border-white/5">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-headline font-bold tracking-widest uppercase transition-colors ${tab === t.id ? "text-primary border-b border-primary" : "text-muted hover:text-foreground border-b border-transparent"}`}>
            {t.icon}{t.label}
            {t.count > 0 && <span className={`text-[8px] px-1 rounded-full ${tab === t.id ? "bg-primary/20 text-primary" : "bg-white/5 text-zinc-600"}`}>{t.count}</span>}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 size={16} className="animate-spin text-muted" /></div>
        ) : (
          <>
            {tab === "tasks" && (tasks.length === 0 ? <p className="text-[10px] text-zinc-600 text-center py-8 font-headline">No tasks yet</p> : tasks.map((t) => (
              <SidebarItem key={t.id} title={t.title} meta={`${t.xp_reward} XP · ${t.status}`} color="primary" icon={<Zap size={11} className="text-primary" />} onShare={() => onShare({ shareType: "task", id: t.id, title: t.title, xp: t.xp_reward, status: t.status, category: t.category })} />
            )))}
            {tab === "punishments" && (punishments.length === 0 ? <p className="text-[10px] text-zinc-600 text-center py-8 font-headline">No punishments yet</p> : punishments.map((p) => (
              <SidebarItem key={p.id} title={p.title} meta={`Severity ${p.severity} · ${p.status}`} color="danger" icon={<Shield size={11} className="text-[#ff3366]" />} onShare={() => onShare({ shareType: "punishment", id: p.id, title: p.title, severity: p.severity, status: p.status })} />
            )))}
            {tab === "rewards" && (rewards.length === 0 ? <p className="text-[10px] text-zinc-600 text-center py-8 font-headline">No rewards yet</p> : rewards.map((r) => (
              <SidebarItem key={r.id} title={r.title} meta={`${r.xp_cost} XP · ${r.available ? "Available" : "Hidden"}`} color="pink" icon={<Gift size={11} className="text-pink" />} onShare={() => onShare({ shareType: "reward", id: r.id, title: r.title, xp_cost: r.xp_cost })} />
            )))}
          </>
        )}
      </div>
    </div>
  );
}

function SidebarItem({ title, meta, icon, color, onShare }: { title: string; meta: string; icon: React.ReactNode; color: "primary" | "danger" | "pink"; onShare: () => void }) {
  const borderMap = { primary: "border-primary/20 hover:border-primary/40", danger: "border-[#ff3366]/20 hover:border-[#ff3366]/40", pink: "border-pink/20 hover:border-pink/40" };
  return (
    <div className={`bg-surface-low rounded-lg border ${borderMap[color]} p-2.5 flex items-start gap-2 group transition-colors`}>
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-headline font-bold leading-snug truncate">{title}</p>
        <p className="text-[9px] text-muted font-label mt-0.5 truncate">{meta}</p>
      </div>
      <button onClick={onShare} className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-foreground transition-all" title="Share in chat">
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ─── Emoji Picker ──────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute bottom-full left-0 mb-2 w-72 bg-surface-container border border-outline-variant/20 rounded-xl overflow-hidden shadow-xl z-20">
      <div className="flex border-b border-white/5">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button key={cat.label} onClick={() => setActiveCategory(i)} className={`flex-1 py-2 text-[9px] font-label uppercase tracking-wider transition-colors ${activeCategory === i ? "text-primary border-b border-primary" : "text-muted hover:text-foreground border-b border-transparent"}`}>{cat.label}</button>
        ))}
      </div>
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-40 overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
          <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }} className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-white/5 transition-colors">{emoji}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Reaction bar (floating quick-react toolbar) ────────────────────────────────
function ReactionBar({
  msgId, isOwn, existingReactions, userId,
  onReact, onReply, onClose,
}: {
  msgId: string; isOwn: boolean;
  existingReactions: MessageReaction[];
  userId: string;
  onReact: (msgId: string, emoji: string) => void;
  onReply: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`absolute -top-12 z-30 flex items-center gap-1 px-2 py-1.5 rounded-full bg-surface-container border border-outline-variant/20 shadow-xl backdrop-blur-sm ${isOwn ? "right-0" : "left-0"}`}
    >
      {QUICK_REACTIONS.map((emoji) => {
        const alreadyReacted = existingReactions.some((r) => r.user_id === userId && r.emoji === emoji);
        return (
          <button
            key={emoji}
            onClick={() => { onReact(msgId, emoji); onClose(); }}
            className={`w-8 h-8 flex items-center justify-center text-lg rounded-full transition-all hover:scale-125 ${alreadyReacted ? "bg-primary/20 ring-1 ring-primary/40" : "hover:bg-white/10"}`}
            title={alreadyReacted ? "Remove reaction" : `React with ${emoji}`}
          >
            {emoji}
          </button>
        );
      })}
      <div className="w-px h-4 bg-white/10 mx-0.5" />
      <button
        onClick={() => { onReply(); onClose(); }}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-muted hover:text-foreground"
        title="Reply"
      >
        <CornerUpLeft size={13} />
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function MessagesView({ currentProfile, pairsWithPartners, initialMessages }: Props) {
  const supabase = createClient();
  const isMistress = currentProfile.role === "mistress";

  const [selectedPairId, setSelectedPairId] = useState<string | null>(pairsWithPartners[0]?.pair.id ?? null);
  const [pairMessages, setPairMessages] = useState<Record<string, LocalMessage[]>>(() => {
    const first = pairsWithPartners[0]?.pair.id;
    if (!first) return {};
    return { [first]: initialMessages as LocalMessage[] };
  });
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Presence
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  // Reactions: messageId → array of reactions
  const [reactions, setReactions] = useState<Record<string, MessageReaction[]>>({});

  // Reaction bar overlay
  const [reactionBarMsgId, setReactionBarMsgId] = useState<string | null>(null);

  // Reply
  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(null);

  // Long-press
  const [pressingId, setPressingId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const lastTapRef = useRef<Record<string, number>>({});

  // Scroll-to-bottom FAB
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMsgCount, setNewMsgCount] = useState(0);

  // Heart animation (double-tap)
  const [heartAnimating, setHeartAnimating] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seenMessageIds = useRef<Set<string>>(new Set());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Seed seen IDs ────────────────────────────────────────────────────────────
  useEffect(() => {
    initialMessages.forEach((m) => seenMessageIds.current.add(m.id));
  }, []);

  // ── Mark notifications read ─────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("notifications").update({ read: true }).eq("user_id", currentProfile.id).eq("type", "message").eq("read", false).then(() => {});
  }, [currentProfile.id]);

  // ── Scroll detection ─────────────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 80;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
    setIsAtBottom(atBottom);
    if (atBottom) setNewMsgCount(0);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior }), 50);
    setNewMsgCount(0);
    setIsAtBottom(true);
  }, []);

  useEffect(() => {
    if (isAtBottom) scrollToBottom("smooth");
  }, [pairMessages, selectedPairId]);

  // ── Mark messages as read ────────────────────────────────────────────────────
  const markRead = useCallback(async (pairId: string, partnerId: string) => {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("pair_id", pairId)
      .eq("sender_id", partnerId)
      .is("read_at", null);
    // Update locally
    setPairMessages((prev) => ({
      ...prev,
      [pairId]: (prev[pairId] || []).map((m) =>
        m.sender_id === partnerId && !m.read_at
          ? { ...m, read_at: new Date().toISOString() }
          : m
      ),
    }));
  }, [supabase]);

  // ── Load reactions for a pair ────────────────────────────────────────────────
  const loadReactions = useCallback(async (pairId: string) => {
    const { data } = await supabase
      .from("message_reactions")
      .select("*")
      .eq("pair_id", pairId);
    if (!data) return;
    const byMsg: Record<string, MessageReaction[]> = {};
    for (const r of data) {
      if (!byMsg[r.message_id]) byMsg[r.message_id] = [];
      byMsg[r.message_id].push(r as MessageReaction);
    }
    setReactions(byMsg);
  }, [supabase]);

  // ── Realtime + Presence ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPairId) return;

    const selectedPair = pairsWithPartners.find((p) => p.pair.id === selectedPairId);
    const partnerId = selectedPair?.partnerProfile?.id;

    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }

    const channel = supabase
      .channel(`pair:${selectedPairId}`, { config: { presence: { key: currentProfile.id } } })
      // ── Messages ──
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `pair_id=eq.${selectedPairId}` }, (payload) => {
        const newMsg = payload.new as Message;
        if (seenMessageIds.current.has(newMsg.id)) return;
        seenMessageIds.current.add(newMsg.id);
        setPairMessages((prev) => ({ ...prev, [selectedPairId]: [...(prev[selectedPairId] || []), newMsg as LocalMessage] }));
        // If from partner, mark read and bump FAB count if not at bottom
        if (newMsg.sender_id !== currentProfile.id) {
          if (partnerId) markRead(selectedPairId, partnerId);
          setIsAtBottom((atBottom) => { if (!atBottom) setNewMsgCount((c) => c + 1); return atBottom; });
        }
      })
      // ── Message UPDATE (read receipts) ──
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `pair_id=eq.${selectedPairId}` }, (payload) => {
        const updated = payload.new as Message;
        setPairMessages((prev) => ({
          ...prev,
          [selectedPairId]: (prev[selectedPairId] || []).map((m) => m.id === updated.id ? { ...m, read_at: updated.read_at } : m),
        }));
      })
      // ── Reactions INSERT ──
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions", filter: `pair_id=eq.${selectedPairId}` }, (payload) => {
        const r = payload.new as MessageReaction;
        setReactions((prev) => ({
          ...prev,
          [r.message_id]: [...(prev[r.message_id] || []).filter((x) => !(x.user_id === r.user_id && x.emoji === r.emoji)), r],
        }));
      })
      // ── Reactions DELETE ──
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions", filter: `pair_id=eq.${selectedPairId}` }, (payload) => {
        const r = payload.old as MessageReaction;
        setReactions((prev) => ({
          ...prev,
          [r.message_id]: (prev[r.message_id] || []).filter((x) => x.id !== r.id),
        }));
      })
      // ── Presence sync ──
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ typing?: boolean }>();
        const partnerKey = Object.keys(state).find((k) => k !== currentProfile.id);
        if (partnerKey && state[partnerKey]?.length > 0) {
          setPartnerOnline(true);
          setPartnerTyping(state[partnerKey][0]?.typing === true);
        } else {
          setPartnerOnline(false);
          setPartnerTyping(false);
        }
      })
      .on("presence", { event: "join" }, ({ key }) => { if (key !== currentProfile.id) setPartnerOnline(true); })
      .on("presence", { event: "leave" }, ({ key }) => { if (key !== currentProfile.id) { setPartnerOnline(false); setPartnerTyping(false); } })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ typing: false });
        }
      });

    channelRef.current = channel;

    // Mark existing unread on mount
    if (partnerId) markRead(selectedPairId, partnerId);
    // Load reactions
    loadReactions(selectedPairId);

    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [selectedPairId]);

  const loadPairMessages = useCallback(async (pairId: string) => {
    if (pairMessages[pairId]) return;
    setLoadingMessages(true);
    try {
      const { data } = await supabase.from("messages").select("*").eq("pair_id", pairId).order("created_at", { ascending: true }).limit(100);
      (data || []).forEach((m) => seenMessageIds.current.add(m.id));
      setPairMessages((prev) => ({ ...prev, [pairId]: (data || []) as LocalMessage[] }));
    } catch { toast.error("Failed to load messages"); }
    finally { setLoadingMessages(false); }
  }, [pairMessages, supabase]);

  const handleSelectPair = (pairId: string) => {
    setSelectedPairId(pairId);
    setInput(""); setReplyingTo(null); setShowSidebar(false);
    setPartnerOnline(false); setPartnerTyping(false);
    loadPairMessages(pairId);
  };

  // ── Typing tracking ──────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (channelRef.current) {
      channelRef.current.track({ typing: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.track({ typing: false });
      }, 2000);
    }
  };

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    channelRef.current?.track({ typing: false });
  }, []);

  // ── Send ─────────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (content: string, type: "text" | "system" = "text") => {
    if (!content.trim() || !selectedPairId) return;
    const tempId = `temp_${crypto.randomUUID()}`;
    const tempMsg: LocalMessage = {
      id: tempId, pair_id: selectedPairId, sender_id: currentProfile.id,
      content, message_type: type, media_url: null, read_at: null,
      created_at: new Date().toISOString(), _pending: true, _tempId: tempId,
    };
    setPairMessages((prev) => ({ ...prev, [selectedPairId]: [...(prev[selectedPairId] || []), tempMsg] }));
    try {
      const { data: inserted, error } = await supabase
        .from("messages")
        .insert({ pair_id: selectedPairId, sender_id: currentProfile.id, content, message_type: type, media_url: null, read_at: null })
        .select().single();
      if (error) throw error;
      seenMessageIds.current.add(inserted.id);
      setPairMessages((prev) => ({
        ...prev,
        [selectedPairId]: (prev[selectedPairId] || []).map((m) => m._tempId === tempId ? (inserted as LocalMessage) : m),
      }));
    } catch {
      setPairMessages((prev) => ({
        ...prev,
        [selectedPairId]: (prev[selectedPairId] || []).map((m) => m._tempId === tempId ? { ...m, _pending: false, _failed: true } : m),
      }));
    }
  }, [selectedPairId, currentProfile.id, supabase]);

  const handleSend = () => {
    if (!input.trim() || !selectedPairId) return;
    let content = input.trim();
    setInput("");
    stopTyping();
    if (replyingTo) { content = encodeReply(replyingTo, content); setReplyingTo(null); }
    sendMessage(content, "text");
  };

  const handleResend = (msg: LocalMessage) => {
    if (!selectedPairId) return;
    setPairMessages((prev) => ({ ...prev, [selectedPairId]: (prev[selectedPairId] || []).filter((m) => m._tempId !== msg._tempId) }));
    sendMessage(msg.content, msg.message_type as "text" | "system");
  };

  const handleShareItem = async (item: SharedItem) => {
    await sendMessage(JSON.stringify(item), "system");
    setShowSidebar(false);
    toast.success(`${item.shareType} shared in chat`);
  };

  // ── Reactions ────────────────────────────────────────────────────────────────
  const handleReaction = useCallback(async (msgId: string, emoji: string) => {
    if (!selectedPairId) return;
    const existing = (reactions[msgId] || []).find((r) => r.user_id === currentProfile.id && r.emoji === emoji);
    if (existing) {
      // Toggle off
      setReactions((prev) => ({
        ...prev,
        [msgId]: (prev[msgId] || []).filter((r) => r.id !== existing.id),
      }));
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      // Add
      const tempReaction: MessageReaction = {
        id: `temp_${crypto.randomUUID()}`, message_id: msgId, pair_id: selectedPairId,
        user_id: currentProfile.id, emoji, created_at: new Date().toISOString(),
      };
      setReactions((prev) => ({
        ...prev,
        [msgId]: [...(prev[msgId] || []), tempReaction],
      }));
      const { data, error } = await supabase
        .from("message_reactions")
        .upsert({ message_id: msgId, pair_id: selectedPairId, user_id: currentProfile.id, emoji }, { onConflict: "message_id,user_id,emoji" })
        .select().single();
      if (!error && data) {
        setReactions((prev) => ({
          ...prev,
          [msgId]: (prev[msgId] || []).map((r) => r.id === tempReaction.id ? (data as MessageReaction) : r),
        }));
      }
    }
  }, [selectedPairId, currentProfile.id, reactions, supabase]);

  // ── Double-tap heart ─────────────────────────────────────────────────────────
  const handleLike = (msgId: string) => {
    setHeartAnimating((prev) => new Set(prev).add(msgId));
    setTimeout(() => setHeartAnimating((prev) => { const n = new Set(prev); n.delete(msgId); return n; }), 800);
    handleReaction(msgId, "❤️");
  };

  const handleMsgClick = (msgId: string) => {
    if (didLongPress.current) { didLongPress.current = false; return; }
    const now = Date.now();
    const last = lastTapRef.current[msgId] || 0;
    if (now - last < 350) handleLike(msgId);
    lastTapRef.current[msgId] = now;
  };

  // ── Long press → reaction bar ────────────────────────────────────────────────
  const startPress = (msg: LocalMessage) => {
    if (msg._pending || msg._failed) return;
    setPressingId(msg.id);
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setPressingId(null);
      setReactionBarMsgId(msg.id);
      if ("vibrate" in navigator) navigator.vibrate(30);
    }, 500);
  };

  const cancelPress = () => {
    setPressingId(null);
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const selectedPairData = pairsWithPartners.find((p) => p.pair.id === selectedPairId);
  const partnerProfile = selectedPairData?.partnerProfile ?? null;
  const currentMessages = selectedPairId ? (pairMessages[selectedPairId] || []) : [];
  const grouped = groupMessages(currentMessages);
  const partnerHref = isMistress ? "/mistress/partner" : "/sub/partner";

  // ── No pairs ─────────────────────────────────────────────────────────────────
  if (pairsWithPartners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center bg-surface-low rounded-2xl border border-outline-variant/10 p-16 gap-4 max-w-2xl">
        <div className="w-16 h-16 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-center"><Lock size={24} className="text-zinc-600" /></div>
        <p className="text-sm text-muted font-headline text-center tracking-wide">No active pair — channel offline</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes heartBurst { 0% { transform: scale(0); opacity: 1; } 40% { transform: scale(1.5); opacity: 1; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
        .heart-burst { animation: heartBurst 0.75s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }
        @keyframes replySlide { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .reply-slide { animation: replySlide 0.15s ease forwards; }
        @keyframes fabIn { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .fab-in { animation: fabIn 0.2s ease forwards; }
      `}</style>

      <div className="flex flex-col gap-4 max-w-4xl">
        {/* Pair tabs */}
        {pairsWithPartners.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mb-2 scrollbar-hide">
            {pairsWithPartners.map(({ pair, partnerProfile: pp }) => {
              const isActive = pair.id === selectedPairId;
              return (
                <button key={pair.id} onClick={() => handleSelectPair(pair.id)} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl flex-shrink-0 border transition-all duration-200 ${isActive ? "bg-primary/10 border-primary/30 text-foreground" : "bg-surface-low border-outline-variant/10 text-muted hover:text-foreground hover:border-white/10"}`}>
                  <PartnerAvatar profile={pp} size="sm" />
                  <span className="text-xs font-headline font-bold tracking-wider whitespace-nowrap">{getPartnerName(pp)}</span>
                  {isActive && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${partnerOnline ? "bg-success animate-pulse" : "bg-zinc-600"}`} />}
                </button>
              );
            })}
          </div>
        )}

        {/* Chat window */}
        <div className="flex rounded-2xl border border-outline-variant/10 overflow-hidden bg-surface-low" style={{ height: "calc(100vh - 12rem)", minHeight: "400px", boxShadow: "inset 0 0 60px rgba(168,85,247,0.03)" }}>
          <div className="flex flex-col flex-1 min-w-0">

            {/* Chat header */}
            <div className="flex items-center gap-4 px-5 py-4 bg-surface-container border-b border-white/5 flex-shrink-0">
              <Link href={partnerHref} className="relative group flex-shrink-0">
                <PartnerAvatar profile={partnerProfile} size="md" />
                {/* Online dot */}
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-container transition-colors ${partnerOnline ? "bg-success" : "bg-zinc-600"}`}
                  style={partnerOnline ? { boxShadow: "0 0 6px rgba(0,255,157,0.8)" } : undefined}
                />
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={partnerHref} className="group">
                  <p className="text-sm font-headline font-bold tracking-tight truncate group-hover:text-primary transition-colors">
                    {getPartnerName(partnerProfile)}
                  </p>
                </Link>
                <p className="text-[10px] font-label uppercase tracking-widest text-muted flex items-center gap-1.5 h-4">
                  {partnerTyping ? (
                    <span className="text-primary animate-pulse">typing…</span>
                  ) : partnerOnline ? (
                    <>
                      <span className="w-1 h-1 rounded-full bg-success inline-block" />
                      <span className="text-success">online</span>
                    </>
                  ) : (
                    <>
                      {partnerProfile?.role === "mistress" ? <Crown size={9} className="text-primary" /> : <Heart size={9} className="text-pink" />}
                      {getRoleLabel(partnerProfile)}
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={partnerHref} className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors" title="View profile">
                  <User size={15} />
                </Link>
                <button
                  onClick={() => setShowSidebar((v) => !v)}
                  className={`p-2 rounded-lg transition-colors ${showSidebar ? "bg-primary/20 text-primary" : "text-muted hover:text-foreground hover:bg-white/5"}`}
                  title="Share items"
                >
                  <Paperclip size={15} />
                </button>
              </div>
            </div>

            {/* Messages + FAB wrapper */}
            <div className="flex-1 overflow-hidden relative">
              <div ref={scrollRef} className="h-full overflow-y-auto p-4 sm:p-6 space-y-0.5 select-none">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full"><Loader2 size={20} className="animate-spin text-muted" /></div>
                ) : currentMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="w-14 h-14 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-center"><MessageCircle size={20} className="text-zinc-600" /></div>
                    <p className="text-sm text-muted font-headline text-center tracking-wide">No transmissions yet</p>
                    <p className="text-xs text-zinc-600 font-headline text-center">
                      {isMistress ? `Command ${getPartnerName(partnerProfile)}…` : `Speak to your Mistress…`}
                    </p>
                  </div>
                ) : (
                  <>
                    {grouped.map((item, idx) => {
                      if (item.type === "divider") {
                        return (
                          <div key={`div-${idx}`} className="flex items-center gap-4 py-4">
                            <div className="flex-1 h-px bg-white/5" />
                            <span className="text-[9px] font-label uppercase tracking-[0.2em] text-zinc-600 flex-shrink-0">{item.label}</span>
                            <div className="flex-1 h-px bg-white/5" />
                          </div>
                        );
                      }

                      const { msg, isFirst, isLast } = item;
                      const isOwn = msg.sender_id === currentProfile.id;
                      const sharedItem = msg.message_type === "system" ? isSharedItem(msg.content) : null;
                      const replyDecoded = !sharedItem ? decodeReply(msg.content) : null;
                      const displayContent = replyDecoded ? replyDecoded.text : msg.content;
                      const isHeartAnimating = heartAnimating.has(msg.id);
                      const isPressing = pressingId === msg.id;
                      const msgReactions = reactions[msg.id] || [];
                      const showReactionBar = reactionBarMsgId === msg.id;

                      // Group spacing: tighter between consecutive messages
                      const topMargin = isFirst ? "mt-3" : "mt-0.5";

                      return (
                        <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} ${topMargin}`}>
                          {/* Partner avatar — only on last of group */}
                          {!isOwn && (
                            <div className="w-7 flex-shrink-0 mr-2 self-end mb-0.5">
                              {isLast ? <PartnerAvatar profile={partnerProfile} size="sm" /> : null}
                            </div>
                          )}

                          <div className={`max-w-[75%] sm:max-w-[65%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                            {/* Bubble */}
                            <div
                              className="relative"
                              style={{ transform: isPressing ? "scale(0.96)" : "scale(1)", transition: "transform 0.1s ease" }}
                              onClick={() => handleMsgClick(msg.id)}
                              onMouseDown={() => startPress(msg)}
                              onMouseUp={cancelPress}
                              onMouseLeave={cancelPress}
                              onTouchStart={() => startPress(msg)}
                              onTouchEnd={cancelPress}
                              onTouchCancel={cancelPress}
                            >
                              {/* Reaction bar overlay */}
                              {showReactionBar && (
                                <ReactionBar
                                  msgId={msg.id}
                                  isOwn={isOwn}
                                  existingReactions={msgReactions}
                                  userId={currentProfile.id}
                                  onReact={handleReaction}
                                  onReply={() => {
                                    const senderName = isOwn ? (currentProfile.display_name || "You") : getPartnerName(partnerProfile);
                                    setReplyingTo({ id: msg.id, senderName, snippet: displayContent.slice(0, 80) });
                                  }}
                                  onClose={() => setReactionBarMsgId(null)}
                                />
                              )}

                              {sharedItem ? (
                                <SharedItemCard item={sharedItem} isMistress={isMistress} />
                              ) : (
                                <div className={`px-4 py-2.5 transition-opacity ${
                                  msg._pending ? "opacity-60" : msg._failed ? "opacity-50" : "opacity-100"
                                } ${isOwn
                                    ? `rounded-2xl rounded-br-sm border border-primary/30 ${isFirst ? "rounded-tr-2xl" : "rounded-tr-lg"}`
                                    : `rounded-2xl rounded-bl-sm border border-outline-variant/20 bg-surface-container ${isFirst ? "rounded-tl-2xl" : "rounded-tl-lg"}`
                                  }`}
                                  style={isOwn ? {
                                    background: "linear-gradient(135deg, rgba(168,85,247,0.28) 0%, rgba(236,72,153,0.12) 100%)",
                                  } : undefined}
                                >
                                  {/* Reply quote */}
                                  {replyDecoded && (
                                    <div className={`mb-2 pl-2 border-l-2 ${isOwn ? "border-primary/50" : "border-white/20"} opacity-70`}>
                                      <p className="text-[10px] font-headline font-bold text-primary/80">{replyDecoded.reply.senderName}</p>
                                      <p className="text-[10px] text-muted leading-relaxed line-clamp-2">{replyDecoded.reply.snippet}</p>
                                    </div>
                                  )}
                                  <p className="text-sm leading-relaxed break-words">{displayContent}</p>
                                </div>
                              )}

                              {/* Heart burst */}
                              {isHeartAnimating && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <span className="text-3xl heart-burst">❤️</span>
                                </div>
                              )}
                            </div>

                            {/* Reactions row */}
                            {msgReactions.length > 0 && (
                              <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                                {Object.entries(
                                  msgReactions.reduce<Record<string, { count: number; mine: boolean }>>((acc, r) => {
                                    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
                                    acc[r.emoji].count++;
                                    if (r.user_id === currentProfile.id) acc[r.emoji].mine = true;
                                    return acc;
                                  }, {})
                                ).map(([emoji, { count, mine }]) => (
                                  <button
                                    key={emoji}
                                    onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all ${mine ? "bg-primary/15 border-primary/30 text-primary" : "bg-surface-container border-outline-variant/10 text-muted hover:border-white/20"}`}
                                  >
                                    <span>{emoji}</span>
                                    {count > 1 && <span className="text-[10px] font-label">{count}</span>}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Meta row: time + status */}
                            {isLast && (
                              <div className={`flex items-center gap-1.5 px-1 mt-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                                <span className="text-[9px] font-label text-zinc-600">{formatTime(msg.created_at)}</span>
                                {/* Read receipt for own messages */}
                                {isOwn && !msg._pending && !msg._failed && (
                                  msg.read_at
                                    ? <CheckCheck size={11} className="text-primary" />
                                    : <Check size={11} className="text-zinc-600" />
                                )}
                                {msg._pending && <Loader2 size={9} className="animate-spin text-zinc-600" />}
                                {msg._failed && (
                                  <div className="flex items-center gap-1">
                                    <AlertCircle size={10} className="text-[#ff3366]" />
                                    <span className="text-[9px] text-[#ff3366] font-label">Failed</span>
                                    <span className="text-zinc-600 text-[9px]">·</span>
                                    <button onClick={() => handleResend(msg)} className="flex items-center gap-0.5 text-[9px] text-primary font-headline font-bold hover:underline">
                                      <RotateCcw size={9} />Resend?
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Typing indicator */}
                    {partnerTyping && (
                      <div className="flex items-end gap-2 mt-3">
                        <div className="w-7 flex-shrink-0 mr-2 self-end mb-0.5">
                          <PartnerAvatar profile={partnerProfile} size="sm" />
                        </div>
                        <TypingIndicator />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Scroll-to-bottom FAB */}
              {!isAtBottom && (
                <button
                  onClick={() => scrollToBottom("smooth")}
                  className="fab-in absolute bottom-4 right-4 flex items-center gap-1.5 pl-3 pr-2 py-2 bg-surface-container border border-outline-variant/20 rounded-full shadow-lg hover:border-primary/30 transition-all z-10"
                >
                  {newMsgCount > 0 && (
                    <span className="text-[10px] font-headline font-bold text-primary">{newMsgCount} new</span>
                  )}
                  <ChevronDown size={14} className="text-muted" />
                </button>
              )}
            </div>

            {/* Input bar */}
            <div className="flex-shrink-0 border-t border-white/5 bg-surface-container">
              {replyingTo && (
                <div className="reply-slide flex items-center gap-3 px-4 py-2 border-b border-primary/20 bg-primary/5">
                  <CornerUpLeft size={13} className="text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-headline font-bold text-primary leading-none mb-0.5">Replying to {replyingTo.senderName}</p>
                    <p className="text-[10px] text-muted truncate">{replyingTo.snippet}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 text-muted hover:text-foreground flex-shrink-0 transition-colors"><X size={12} /></button>
                </div>
              )}
              <div className="px-4 py-3">
                <div className="relative flex items-end gap-2">
                  {showEmojiPicker && (
                    <EmojiPicker
                      onSelect={(e) => { setInput((v) => v + e); inputRef.current?.focus(); }}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  )}
                  <button
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    className={`flex-shrink-0 p-2.5 rounded-xl transition-colors ${showEmojiPicker ? "text-primary bg-primary/10" : "text-muted hover:text-foreground hover:bg-white/5"}`}
                  >
                    <Smile size={18} />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={
                      !selectedPairId ? "Select a channel…"
                      : isMistress ? `Command ${getPartnerName(partnerProfile)}…`
                      : `Speak to your Mistress…`
                    }
                    disabled={!selectedPairId}
                    className="flex-1 bg-surface-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/40 disabled:opacity-50 transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || !selectedPairId}
                    className="btn-gradient w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Share sidebar */}
          {showSidebar && selectedPairId && (
            <ShareSidebar pairId={selectedPairId} onShare={handleShareItem} onClose={() => setShowSidebar(false)} />
          )}
        </div>
      </div>
    </>
  );
}
