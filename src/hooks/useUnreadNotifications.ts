"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

/**
 * Returns the count of unread notifications for a user,
 * optionally filtered to a specific type (e.g. "message").
 * Updates in realtime when new notifications arrive.
 */
export function useUnreadNotifications(userId: string, type?: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    const fetchCount = async () => {
      let query = supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);
      if (type) query = query.eq("type", type);
      const { count: c } = await query;
      setCount(c ?? 0);
    };
    fetchCount();

    // Realtime: new notification inserted → re-fetch count
    const channel = supabase
      .channel(`unread-notifs-${userId}-${type ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchCount()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchCount()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, type]);

  return count;
}
