"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const POLL_INTERVAL = 60_000; // check every 60 seconds

export function useVersionCheck() {
  const baseline = useRef<string | null>(null);
  const notified = useRef(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { version } = await res.json();

        // First call — record the version the user loaded with
        if (!baseline.current) {
          baseline.current = version;
          return;
        }

        // Skip if version hasn't changed, already notified, or in local dev
        if (version === baseline.current || notified.current || version === "dev") return;

        notified.current = true;
        toast("Update available", {
          description: "A new version of The Protocol is ready.",
          duration: Infinity,
          action: {
            label: "Refresh",
            onClick: () => {
              // Hard reload — clears page cache, works on iOS home screen too
              window.location.href = window.location.href;
            },
          },
        });
      } catch {
        // Network blip — silently ignore
      }
    };

    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);
}
