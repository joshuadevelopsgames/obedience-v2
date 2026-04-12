"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Plus, X, Info, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Kink, KinkCategory } from "@/types/database";

interface Props {
  profileId: string;
  allKinks: Kink[];
  selectedKinkIds: string[];
}

const CATEGORY_LABELS: Record<KinkCategory, string> = {
  restraint:      "Restraint & Bondage",
  impact:         "Impact & Sensation",
  power_exchange: "Power Exchange",
  roleplay:       "Role Play & Fantasy",
  fetish:         "Body & Object Fetishes",
  other:          "Other",
  fluid:          "Fluid & Bathroom Play",
  extreme:        "Extreme Play",
};

const CATEGORY_ORDER: KinkCategory[] = [
  "restraint", "impact", "power_exchange", "roleplay",
  "fetish", "other", "fluid", "extreme",
];

// Risk indicator for categories that warrant a heads-up
const HIGH_RISK_CATEGORIES = new Set<KinkCategory>(["fluid", "extreme"]);
const HIGH_RISK_KINK_NAMES = new Set([
  "Breath Play", "Erotic Asphyxiation", "Suspension", "Needle Play",
  "CNC (Consensual Non-Consent)", "Knife Play / Blood Play",
  "Anal Prolapse / Rosebud", "Long-Term Anal Training", "Ass to Mouth (ATM)",
]);

export function KinkLibrary({ profileId, allKinks, selectedKinkIds }: Props) {
  const supabase = createClient();

  // ── Local state ──────────────────────────────────────────
  const [selected, setSelected]         = useState<Set<string>>(new Set(selectedKinkIds));
  const [query, setQuery]               = useState("");
  const [activeCategory, setActiveCategory] = useState<KinkCategory | "all">("all");
  const [kinks, setKinks]               = useState<Kink[]>(allKinks);
  const [hoveredKink, setHoveredKink]   = useState<Kink | null>(null);
  const [tooltipPos, setTooltipPos]     = useState({ top: 0, left: 0 });
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName]     = useState("");
  const [customDesc, setCustomDesc]     = useState("");
  const [customCategory, setCustomCategory] = useState<KinkCategory>("other");
  const [addingCustom, setAddingCustom] = useState(false);
  const [toggling, setToggling]         = useState<string | null>(null);
  const tooltipRef                      = useRef<HTMLDivElement>(null);

  // ── Filtered + grouped kinks ─────────────────────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return kinks.filter((k) => {
      const matchesQuery = !q || k.name.toLowerCase().includes(q) || (k.description?.toLowerCase().includes(q) ?? false);
      const matchesCat   = activeCategory === "all" || k.category === activeCategory;
      return matchesQuery && matchesCat;
    });
  }, [kinks, query, activeCategory]);

  const grouped = useMemo(() => {
    if (activeCategory !== "all") {
      return { [activeCategory]: filtered } as Record<string, Kink[]>;
    }
    const groups: Partial<Record<KinkCategory, Kink[]>> = {};
    for (const cat of CATEGORY_ORDER) {
      const items = filtered.filter((k) => k.category === cat);
      if (items.length) groups[cat] = items;
    }
    return groups;
  }, [filtered, activeCategory]);

  // ── Tooltip positioning ──────────────────────────────────
  const handleMouseEnter = (kink: Kink, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ top: rect.top - 10, left: rect.right + 8 });
    setHoveredKink(kink);
  };

  // ── Toggle selection ─────────────────────────────────────
  const handleToggle = async (kinkId: string) => {
    if (toggling) return;
    setToggling(kinkId);

    const isSelected = selected.has(kinkId);
    if (isSelected) {
      const { error } = await supabase
        .from("profile_kinks")
        .delete()
        .eq("profile_id", profileId)
        .eq("kink_id", kinkId);
      if (!error) {
        setSelected((prev) => { const n = new Set(prev); n.delete(kinkId); return n; });
      } else {
        toast.error("Failed to remove kink");
      }
    } else {
      const { error } = await supabase
        .from("profile_kinks")
        .insert({ profile_id: profileId, kink_id: kinkId });
      if (!error) {
        setSelected((prev) => new Set([...prev, kinkId]));
      } else {
        toast.error("Failed to add kink");
      }
    }
    setToggling(null);
  };

  // ── Add custom kink ──────────────────────────────────────
  const handleAddCustom = async () => {
    if (!customName.trim()) { toast.error("Name is required"); return; }
    setAddingCustom(true);

    // Insert into global kink library
    const { data: newKink, error: kinkError } = await supabase
      .from("kinks")
      .insert({
        name: customName.trim(),
        description: customDesc.trim() || null,
        category: customCategory,
        is_custom: true,
        created_by: profileId,
      })
      .select()
      .single();

    if (kinkError || !newKink) {
      toast.error("Failed to create custom kink");
      setAddingCustom(false);
      return;
    }

    // Immediately select it
    await supabase.from("profile_kinks").insert({ profile_id: profileId, kink_id: newKink.id });
    setKinks((prev) => [...prev, newKink]);
    setSelected((prev) => new Set([...prev, newKink.id]));
    setCustomName("");
    setCustomDesc("");
    setCustomCategory("other");
    setShowCustomForm(false);
    toast.success(`"${newKink.name}" added to the library`);
    setAddingCustom(false);
  };

  const selectedCount = selected.size;

  return (
    <div className="flex flex-col gap-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-label uppercase tracking-[0.2em] text-muted mb-0.5">
            {selectedCount} selected
          </p>
          <p className="text-xs text-zinc-500">
            Grok uses your selections to craft personalised tasks and punishments.
          </p>
        </div>
        <button
          onClick={() => setShowCustomForm(!showCustomForm)}
          className="flex items-center gap-1.5 text-[10px] font-headline font-bold tracking-widest uppercase text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={12} />
          Custom Kink
        </button>
      </div>

      {/* Custom kink form */}
      {showCustomForm && (
        <div className="bg-surface-container rounded-xl border border-primary/20 p-4 space-y-3">
          <p className="text-[10px] font-label uppercase tracking-[0.2em] text-primary">Add Custom Kink</p>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Kink name"
            maxLength={60}
            className="w-full bg-transparent border-b border-outline-variant/30 px-0 py-1.5 text-sm text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary transition-colors"
          />
          <textarea
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            placeholder="Short description (optional)"
            rows={2}
            className="w-full bg-transparent border-b border-outline-variant/30 px-0 py-1.5 text-sm text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary resize-none transition-colors"
          />
          <div className="flex gap-2 items-end">
            <select
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value as KinkCategory)}
              className="flex-1 bg-surface-container-high border border-outline-variant/20 rounded-sm px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              {CATEGORY_ORDER.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
            <button
              onClick={handleAddCustom}
              disabled={addingCustom || !customName.trim()}
              className="btn-gradient px-4 py-2 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center gap-1.5 disabled:opacity-50"
            >
              {addingCustom ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
              Add
            </button>
            <button
              onClick={() => setShowCustomForm(false)}
              className="px-3 py-2 border border-outline-variant/20 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search kinks…"
          className="w-full bg-surface-container border border-outline-variant/20 rounded-sm pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/40 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", ...CATEGORY_ORDER] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase transition-all ${
              activeCategory === cat
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-surface-container text-muted border border-outline-variant/10 hover:border-outline-variant/30 hover:text-foreground"
            }`}
          >
            {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Kink badge grid — grouped by category */}
      <div className="flex flex-col gap-8">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            {/* Category heading (only shown in "all" mode) */}
            {activeCategory === "all" && (
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[10px] font-label uppercase tracking-[0.25em] text-muted whitespace-nowrap">
                  {CATEGORY_LABELS[cat as KinkCategory]}
                </p>
                {HIGH_RISK_CATEGORIES.has(cat as KinkCategory) && (
                  <span className="text-[9px] font-headline font-bold tracking-widest text-warning border border-warning/20 bg-warning/5 px-1.5 py-0.5 rounded">
                    ⚠ HIGH RISK
                  </span>
                )}
                <div className="flex-1 h-px bg-white/5" />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {(items as Kink[]).map((kink) => {
                const isSelected = selected.has(kink.id);
                const isToggling = toggling === kink.id;
                const isHighRisk = HIGH_RISK_KINK_NAMES.has(kink.name);

                return (
                  <button
                    key={kink.id}
                    onClick={() => handleToggle(kink.id)}
                    onMouseEnter={(e) => handleMouseEnter(kink, e)}
                    onMouseLeave={() => setHoveredKink(null)}
                    disabled={isToggling}
                    className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[11px] font-headline font-bold tracking-wider border transition-all duration-200 select-none ${
                      isSelected
                        ? "bg-primary/15 text-primary border-primary/40 shadow-[0_0_8px_rgba(204,151,255,0.2)]"
                        : "bg-surface-container text-muted border-outline-variant/10 hover:border-outline-variant/30 hover:text-foreground"
                    } ${isHighRisk && !isSelected ? "border-warning/20 text-warning/60 hover:text-warning hover:border-warning/40" : ""} disabled:opacity-60`}
                  >
                    {isToggling ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : isSelected ? (
                      <Check size={10} className="flex-shrink-0" />
                    ) : null}
                    {kink.name}
                    {kink.is_custom && (
                      <span className="text-[8px] text-zinc-500 font-label">custom</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-muted text-sm font-headline">No kinks match your search.</p>
            <button
              onClick={() => { setQuery(""); setShowCustomForm(true); }}
              className="text-xs text-primary hover:underline mt-2"
            >
              Add "{query}" as a custom kink?
            </button>
          </div>
        )}
      </div>

      {/* Floating tooltip — fixed position, portal-like via high z-index */}
      {hoveredKink && hoveredKink.description && (
        <div
          ref={tooltipRef}
          className="fixed z-[300] max-w-xs glass-panel border border-outline-variant/20 rounded-xl px-4 py-3 pointer-events-none"
          style={{ top: tooltipPos.top, left: tooltipPos.left, transform: "translateY(-50%)" }}
        >
          <div className="flex items-start gap-2">
            <Info size={12} className="text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-headline font-bold tracking-tight text-foreground mb-0.5">{hoveredKink.name}</p>
              <p className="text-[11px] text-muted leading-relaxed">{hoveredKink.description}</p>
              {HIGH_RISK_KINK_NAMES.has(hoveredKink.name) && (
                <p className="text-[10px] text-warning font-headline font-bold mt-1.5">⚠ High risk — research thoroughly before attempting</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
