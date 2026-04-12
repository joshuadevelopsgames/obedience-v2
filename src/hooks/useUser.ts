"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import type { User } from "@supabase/supabase-js";

// Stable singleton — don't recreate on every render
const supabase = createClient();

async function fetchProfile(): Promise<Profile | null> {
  try {
    const res = await fetch("/api/me");
    if (!res.ok) return null;
    const { profile } = await res.json();
    return profile;
  } catch {
    return null;
  }
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialised = useRef(false);

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on mount — use it as the
    // single source of truth so we don't race between getUser() and the event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const p = await fetchProfile();

          // If profile still null (e.g. trigger lag on brand-new account), retry once
          if (!p) {
            await new Promise((r) => setTimeout(r, 1200));
            const retry = await fetchProfile();
            setProfile(retry);
          } else {
            setProfile(p);
          }
        } else {
          setProfile(null);
        }

        // Only clear loading after the very first event
        if (!initialised.current) {
          initialised.current = true;
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, profile, loading, supabase };
}
