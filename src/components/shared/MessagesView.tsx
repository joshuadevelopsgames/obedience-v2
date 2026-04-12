"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Loader2, MessageCircle, Crown, Heart, Lock,
  Smile, Paperclip, X, Zap, Shield, Gift, CheckCircle2,
  AlertTriangle, Clock, ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Profile, Pair, Message } from "@/types/database";

// ─── Emoji data ────────────────────────────────────────────────────────────────
const EMOJI_CATEGORIES = [
  {
    label: "Favorites",
    emojis: ["❤️", "🖤", "💜", "💗", "🔥", "✨", "😈", "🙏", "💦", "🥵", "😍", "🫦", "💋", "⛓️", "🎀", "🌹"],
  },
  {
    label: "Faces",
    emojis: ["😊", "😇", "🥺", "😭", "😩", "🤤", "😳", "🫣", "😏", "🤫", "😤", "🥴", "😌", "🫠", "😋", "😘"],
  },
  {
    label: "Gestures",
    emojis: ["👏", "🙌", "🤲", "✋", "🤚", "👋", "🫶", "💪", "🦵", "🦶", "👅", "👁️", "💅", "🤌", "👌", "🫰"],
  },
  {
    label: "Objects",
    emojis: ["🎭", "🪢", "🔒", "🗝️", "🪄", "🧸", "🎁", "📿", "💎", "🩰", "👑", "🪖", "🌙", "⭐", "💫", "🌸"],
  },
];

// ─── Shared-item helpers ────────────────────────────────────────────────────────
type ShareType = "task" | "punishment" | "reward";

interface SharedItem {
  shareType: ShareType;
  id: string;
  title: string;
  xp?: number;
  xp_cost?: number;
  status?: string;
  severity?: number;
  category?: string;
}

function isSharedItem(content: string): SharedItem | null {
  try {
    if (!content.startsWith("{")) return null;
    const obj = JSON.parse(content);
    if (obj.shareType && obj.id && obj.title) return obj as SharedItem;
    return null;
  } catch {
    return null;
  }
}

// ─── Sidebar fetch types ────────────────────────────────────────────────────────
interface SidebarTask { id: string; title: string; xp_reward: number; status: string; category: string }
interface SidebarPunishment { id: string; title: string; severity: number; status: string }
interface SidebarReward { id: string; title: string; xp_cost: number; available: boolean }

// ─── Misc helpers ───────────────────────────────────────────────────────────────
interface PairWithPartner { pair: Pair; partnerProfile: Profile | null }
interface Props { currentProfile: Profile; pairsWithPartners: PairWithPartner[]; initialMessages: Message[] }

function getInitial(profile: Profile | null) {
  return (profile?.display_name || profile?.collar_name || "?")[0].toUpperCase();
}
function getPartnerName(profile: Profile | null) {
  return profile?.collar_name || profile?.display_name || "Unknown";
}
function getRoleLabel(profile: Profile | null) {
  if (!profile) return "";
  return profile.role === "mistress" ? "Dominant" : "Submissive";
}
function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
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

type GroupedItem = { type: "divider"; label: string } | { type: "message"; msg: Message };

function groupMessages(messages: Message[]): GroupedItem[] {
  const grouped: GroupedItem[] = [];
  let lastDate = "";
  for (const msg of messages) {
    const d = new Date(msg.created_at).toDateString();
    if (d !== lastDate) {
      grouped.push({ type: "divider", label: formatDateDivider(msg.created_at) });
      lastDate = d;
    }
    grouped.push({ type: "message", msg });
  }
  return grouped;
}

// ─── Shared Item Card (rendered inside chat) ────────────────────────────────────
function SharedItemCard({ item, isOwn }: { item: SharedItem; isOwn: boolean }) {
  const colors: Record<ShareType, { border: string; bg: string; text: string; icon: React.ReactNode }> = {
    task: {
      border: "border-primary/30",
      bg: "bg-primary/5",
      text: "text-primary",
      icon: <Zap size={12} className="text-primary" />,
    },
    punishment: {
      border: "border-[#ff3366]/30",
      bg: "bg-[#ff3366]/5",
      text: "text-[#ff3366]",
      icon: <Shield size={12} className="text-[#ff3366]" />,
    },
    reward: {
      border: "border-pink/30",
      bg: "bg-pink/5",
      text: "text-pink",
      icon: <Gift size={12} className="text-pink" />,
    },
  };
  const c = colors[item.shareType];
  const typeLabel = item.shareType.charAt(0).toUpperCase() + item.shareType.slice(1);

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden w-[220px]`}>
      <div className={`px-3 py-1.5 border-b ${c.border} flex items-center gap-1.5`}>
        {c.icon}
        <span className={`text-[9px] font-headline font-bold tracking-widest uppercase ${c.text}`}>
          {typeLabel}
        </span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-xs font-headline font-bold leading-snug">{item.title}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {item.xp !== undefined && (
            <span className="flex items-center gap-0.5 text-[10px] text-primary font-headline">
              <Zap size={9} /> {item.xp} XP
            </span>
          )}
          {item.xp_cost !== undefined && (
            <span className="flex items-center gap-0.5 text-[10px] text-primary font-headline">
              <Zap size={9} /> {item.xp_cost} XP
            </span>
          )}
          {item.status && (
            <span className="text-[9px] font-label uppercase tracking-wider text-muted">
              {item.status}
            </span>
          )}
          {item.severity !== undefined && (
            <span className="text-[9px] font-label uppercase tracking-wider text-[#ff3366]">
              Severity {item.severity}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Share Sidebar ──────────────────────────────────────────────────────────────
type SidebarTab = "tasks" | "punishments" | "rewards";

function ShareSidebar({
  pairId,
  onShare,
  onClose,
}: {
  pairId: string;
  onShare: (item: SharedItem) => void;
  onClose: () => void;
}) {
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

  const TABS: { id: SidebarTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "tasks", label: "Tasks", icon: <Zap size={11} />, count: tasks.length },
    { id: "punishments", label: "Punishments", icon: <Shield size={11} />, count: punishments.length },
    { id: "rewards", label: "Rewards", icon: <Gift size={11} />, count: rewards.length },
  ];

  return (
    <div className="flex flex-col h-full border-l border-white/5 bg-surface-container w-64 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-[10px] font-headline font-bold tracking-widest uppercase text-muted">Share</span>
        <button onClick={onClose} className="p-1 text-muted hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-headline font-bold tracking-widest uppercase transition-colors ${
              tab === t.id ? "text-primary border-b border-primary" : "text-muted hover:text-foreground border-b border-transparent"
            }`}
          >
            {t.icon}
            {t.label}
            {t.count > 0 && (
              <span className={`text-[8px] px-1 rounded-full ${tab === t.id ? "bg-primary/20 text-primary" : "bg-white/5 text-zinc-600"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={16} className="animate-spin text-muted" />
          </div>
        ) : (
          <>
            {tab === "tasks" && (
              tasks.length === 0 ? (
                <p className="text-[10px] text-zinc-600 text-center py-8 font-headline">No tasks yet</p>
              ) : tasks.map((task) => (
                <SidebarItem
                  key={task.id}
                  title={task.title}
                  meta={`${task.xp_reward} XP · ${task.status}`}
                  color="primary"
                  icon={<Zap size={11} className="text-primary" />}
                  onShare={() => onShare({ shareType: "task", id: task.id, title: task.title, xp: task.xp_reward, status: task.status, category: task.category })}
                />
              ))
            )}
            {tab === "punishments" && (
              punishments.length === 0 ? (
                <p className="text-[10px] text-zinc-600 text-center py-8 font-headline">No punishments yet</p>
              ) : punishments.map((p) => (
                <SidebarItem
                  key={p.id}
                  title={p.title}
                  meta={`Severity ${p.severity} · ${p.status}`}
                  color="danger"
                  icon={<Shield size={11} className="text-[#ff3366]" />}
                  onShare={() => onShare({ shareType: "punishment", id: p.id, title: p.title, severity: p.severity, status: p.status })}
                />
              ))
            )}
            {tab === "rewards" && (
              rewards.length === 0 ? (
                <p className="text-[10px] text-zinc-600 text-center py-8 font-headline">No rewards yet</p>
              ) : rewards.map((r) => (
                <SidebarItem
                  key={r.id}
                  title={r.title}
                  meta={`${r.xp_cost} XP · ${r.available ? "Available" : "Unavailable"}`}
                  color="pink"
                  icon={<Gift size={11} className="text-pink" />}
                  onShare={() => onShare({ shareType: "reward", id: r.id, title: r.title, xp_cost: r.xp_cost })}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SidebarItem({
  title,
  meta,
  icon,
  color,
  onShare,
}: {
  title: string;
  meta: string;
  icon: React.ReactNode;
  color: "primary" | "danger" | "pink";
  onShare: () => void;
}) {
  const borderMap = { primary: "border-primary/20 hover:border-primary/40", danger: "border-[#ff3366]/20 hover:border-[#ff3366]/40", pink: "border-pink/20 hover:border-pink/40" };
  return (
    <div className={`bg-surface-low rounded-lg border ${borderMap[color]} p-2.5 flex items-start gap-2 group transition-colors`}>
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-headline font-bold leading-snug truncate">{title}</p>
        <p className="text-[9px] text-muted font-label mt-0.5 truncate">{meta}</p>
      </div>
      <button
        onClick={onShare}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-foreground transition-all"
        title="Share in chat"
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ─── Emoji Picker ────────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 w-72 bg-surface-container border border-outline-variant/20 rounded-xl overflow-hidden shadow-xl z-20"
    >
      {/* Category tabs */}
      <div className="flex border-b border-white/5">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => setActiveCategory(i)}
            className={`flex-1 py-2 text-[9px] font-label uppercase tracking-wider transition-colors ${
              activeCategory === i ? "text-primary border-b border-primary" : "text-muted hover:text-foreground border-b border-transparent"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {/* Emoji grid */}
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-40 overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-white/5 transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export function MessagesView({ currentProfile, pairsWithPartners, initialMessages }: Props) {
  const supabase = createClient();

  const [selectedPairId, setSelectedPairId] = useState<string | null>(
    pairsWithPartners[0]?.pair.id ?? null
  );
  const [pairMessages, setPairMessages] = useState<Record<string, Message[]>>(() => {
    const first = pairsWithPartners[0]?.pair.id;
    if (!first) return {};
    return { [first]: initialMessages };
  });
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    }
  }, [pairMessages, selectedPairId]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedPairId) return;
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

  const loadPairMessages = useCallback(
    async (pairId: string) => {
      if (pairMessages[pairId]) return;
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
    setShowSidebar(false);
    loadPairMessages(pairId);
  };

  const sendMessage = async (content: string, type: "text" | "system" = "text") => {
    if (!content.trim() || !selectedPairId || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        pair_id: selectedPairId,
        sender_id: currentProfile.id,
        content,
        message_type: type,
        media_url: null,
        read_at: null,
      });
      if (error) toast.error("Failed to send");
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const contentToSend = input.trim();
    setInput("");
    await sendMessage(contentToSend, "text");
  };

  const handleShareItem = async (item: SharedItem) => {
    await sendMessage(JSON.stringify(item), "system");
    setShowSidebar(false);
    toast.success(`${item.shareType} shared in chat`);
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const selectedPairData = pairsWithPartners.find((p) => p.pair.id === selectedPairId);
  const partnerProfile = selectedPairData?.partnerProfile ?? null;
  const currentMessages = selectedPairId ? (pairMessages[selectedPairId] || []) : [];
  const grouped = groupMessages(currentMessages);
  const isMistress = currentProfile.role === "mistress";

  // ── No pairs ──────────────────────────────────────────────────────────────────
  if (pairsWithPartners.length === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <h1 className="text-4xl font-headline font-bold tracking-tighter leading-[0.9] mb-2">
            SECURE<br /><span className="text-pink italic">TRANSMISSIONS</span>
          </h1>
          <p className="text-muted text-sm">Encrypted channel between Dominant and Submissive.</p>
        </div>
        <div className="flex flex-col items-center justify-center bg-surface-low rounded-2xl border border-outline-variant/10 p-16 gap-4">
          <div className="w-16 h-16 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-center">
            <Lock size={24} className="text-zinc-600" />
          </div>
          <p className="text-sm text-muted font-headline text-center tracking-wide">No active pair — channel offline</p>
          <p className="text-xs text-zinc-600 font-headline text-center">Pair up to establish a secure transmission line.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Page header */}
      <div>
        <h1 className="text-4xl font-headline font-bold tracking-tighter leading-[0.9] mb-2">
          SECURE<br /><span className="text-pink italic">TRANSMISSIONS</span>
        </h1>
        <p className="text-muted text-sm">
          Encrypted channel.{" "}
          {pairsWithPartners.length > 1 ? `${pairsWithPartners.length} active pairings.` : "Active pairing."}
        </p>
      </div>

      {/* Pair tabs */}
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
                <span className="text-xs font-headline font-bold tracking-wider whitespace-nowrap">{getPartnerName(pp)}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Chat window */}
      <div
        className="flex rounded-2xl border border-outline-variant/10 overflow-hidden bg-surface-low"
        style={{ height: "calc(100vh - 14rem)", minHeight: "400px", boxShadow: "inset 0 0 60px rgba(168,85,247,0.03)" }}
      >
        {/* Main chat column */}
        <div className="flex flex-col flex-1 min-w-0">
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
              <p className="text-sm font-headline font-bold tracking-tight truncate">{getPartnerName(partnerProfile)}</p>
              <p className="text-[10px] font-label uppercase tracking-widest text-muted flex items-center gap-1.5">
                {partnerProfile?.role === "mistress" ? <Crown size={9} className="text-primary" /> : <Heart size={9} className="text-pink" />}
                {getRoleLabel(partnerProfile)} · Level {partnerProfile?.level ?? 1}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success" style={{ boxShadow: "0 0 6px rgba(0,255,157,0.8)" }} />
                <span className="text-[10px] font-label uppercase tracking-widest text-success hidden sm:block">Online</span>
              </div>
              {/* Share toggle */}
              <button
                onClick={() => setShowSidebar((v) => !v)}
                className={`p-2 rounded-lg transition-colors ${showSidebar ? "bg-primary/20 text-primary" : "text-muted hover:text-foreground hover:bg-white/5"}`}
                title="Share tasks, punishments, rewards"
              >
                <Paperclip size={15} />
              </button>
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
                <p className="text-sm text-muted font-headline text-center tracking-wide">No transmissions yet</p>
                <p className="text-xs text-zinc-600 font-headline text-center">Initiate contact, {isMistress ? "Dominant" : "Submissive"}.</p>
              </div>
            ) : (
              grouped.map((item, idx) => {
                if (item.type === "divider") {
                  return (
                    <div key={`div-${idx}`} className="flex items-center gap-4 py-3">
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-[9px] font-label uppercase tracking-[0.2em] text-zinc-600 flex-shrink-0">{item.label}</span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>
                  );
                }
                const msg = item.msg;
                const isOwn = msg.sender_id === currentProfile.id;
                const sharedItem = msg.message_type === "system" ? isSharedItem(msg.content) : null;

                return (
                  <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
                    {!isOwn && (
                      <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center font-headline font-bold text-xs mr-2 mt-auto border bg-primary/10 border-primary/20 text-primary self-end mb-0.5">
                        {getInitial(partnerProfile)}
                      </div>
                    )}
                    <div className={`max-w-[75%] sm:max-w-[65%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                      {sharedItem ? (
                        <SharedItemCard item={sharedItem} isOwn={isOwn} />
                      ) : (
                        <div className={`px-4 py-2.5 rounded-2xl ${
                          isOwn
                            ? "bg-primary/20 border border-primary/30 rounded-br-sm"
                            : "bg-surface-container border border-outline-variant/20 rounded-bl-sm"
                        }`}>
                          <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                        </div>
                      )}
                      <span className="text-[9px] font-label text-zinc-600 mt-1 px-1">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 border-t border-white/5 bg-surface-container px-4 py-3">
            <div className="relative flex items-end gap-2">
              {/* Emoji picker */}
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}

              {/* Emoji toggle */}
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={partnerProfile ? `Message ${getPartnerName(partnerProfile)}…` : "Select a channel…"}
                disabled={sending || !selectedPairId}
                className="flex-1 bg-surface-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/40 disabled:opacity-50 transition-colors"
              />

              <button
                onClick={handleSend}
                disabled={!input.trim() || sending || !selectedPairId}
                className="btn-gradient w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Share sidebar */}
        {showSidebar && selectedPairId && (
          <ShareSidebar
            pairId={selectedPairId}
            onShare={handleShareItem}
            onClose={() => setShowSidebar(false)}
          />
        )}
      </div>
    </div>
  );
}
