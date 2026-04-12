"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, ChevronDown } from "lucide-react";

interface PairOption {
  pairId: string;
  mistressName: string;
}

interface PairSwitcherProps {
  pairs: PairOption[];
  activePairId: string;
}

export function PairSwitcher({ pairs, activePairId }: PairSwitcherProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (pairs.length <= 1) return null;

  const active = pairs.find((p) => p.pairId === activePairId);

  const handleSwitch = async (pairId: string) => {
    if (pairId === activePairId) {
      setOpen(false);
      return;
    }
    await fetch("/api/set-pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairId }),
    });
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs font-headline uppercase tracking-widest"
      >
        <Crown size={12} className="text-primary" />
        <span className="text-zinc-300">{active?.mistressName ?? "Select"}</span>
        <ChevronDown
          size={12}
          className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute top-full mt-1 left-0 z-50 min-w-[160px] rounded-lg border border-white/10 bg-surface-container shadow-xl overflow-hidden">
            {pairs.map((p) => (
              <button
                key={p.pairId}
                onClick={() => handleSwitch(p.pairId)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-headline uppercase tracking-widest transition-colors ${
                  p.pairId === activePairId
                    ? "text-primary bg-primary/10"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                }`}
              >
                <Crown size={12} />
                {p.mistressName}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
