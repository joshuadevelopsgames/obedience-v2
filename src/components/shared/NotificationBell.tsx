"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, MessageCircle, CheckCircle2, Zap, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Notification } from "@/types/database";

const supabase = createClient();

const typeIcon: Record<string, React.ReactNode> = {
  message:  <MessageCircle size={14} className="text-primary" />,
  task:     <Zap size={14} className="text-warning" />,
  approved: <CheckCircle2 size={14} className="text-success" />,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  userId: string;
  isMistress: boolean;
}

export function NotificationBell({ userId, isMistress }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const unread = notifications.filter((n) => !n.read).length;

  // Initial fetch
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (data) setNotifications(data);
    };
    fetch();
  }, [userId]);

  // Realtime: new notifications pushed to this user
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!unreadIds.length) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) markAllRead();
  };

  const handleNotificationClick = (n: Notification) => {
    setOpen(false);
    const data = n.data as any;
    if (n.type === "message" && data?.pair_id) {
      router.push(isMistress ? "/mistress/messages" : "/sub/messages");
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className={`relative transition-colors duration-300 ${unread > 0 ? 'text-pink' : 'text-zinc-500 hover:text-pink'}`}
        aria-label="Notifications"
      >
        <Bell
          size={20}
          className={unread > 0 ? 'animate-[wiggle_0.5s_ease-in-out]' : ''}
          style={unread > 0 ? { filter: 'drop-shadow(0 0 6px rgba(255,51,102,0.7))' } : {}}
        />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-pink text-[9px] font-bold text-white flex items-center justify-center leading-none">
            <span className="absolute inset-0 rounded-full bg-pink animate-ping opacity-75" />
            <span className="relative">{unread > 9 ? "9+" : unread}</span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-3 w-80 max-h-[420px] flex flex-col rounded-2xl border border-white/10 bg-surface-container shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-xs font-headline font-bold uppercase tracking-widest">
              Notifications
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={24} className="mx-auto mb-3 text-zinc-700" />
                <p className="text-xs text-zinc-500 font-headline">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center">
                    {typeIcon[n.type] ?? <Bell size={14} className="text-zinc-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-headline font-medium leading-snug ${!n.read ? "text-foreground" : "text-zinc-400"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-600 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
