"use client";

import { useState, useRef } from "react";
import { Link2, Loader2, ExternalLink, Trash2, ShoppingBag, Heart, Plus, X, Check, PackageCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface WishlistItem {
  id: string;
  pair_id: string;
  added_by: string;
  url: string;
  title: string | null;
  image_url: string | null;
  price: string | null;
  domain: string | null;
  notes: string | null;
  status: "wanted" | "purchased";
  created_at: string;
}

interface Props {
  items: WishlistItem[];
  pairId: string;
  currentUserId: string;
  isMistress: boolean;
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function WishlistView({ items: initialItems, pairId, currentUserId, isMistress }: Props) {
  const supabase = createClient();
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [preview, setPreview] = useState<{ title: string; imageUrl: string | null; price: string | null; domain: string | null } | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "wanted" | "purchased">("all");
  const urlInputRef = useRef<HTMLInputElement>(null);

  const filtered = items.filter((i) => filter === "all" || i.status === filter);
  const wantedCount = items.filter((i) => i.status === "wanted").length;
  const purchasedCount = items.filter((i) => i.status === "purchased").length;

  const handleFetchMeta = async () => {
    if (!url.trim()) return;
    setFetching(true);
    setPreview(null);
    try {
      const res = await fetch("/api/wishlist/fetch-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPreview({ title: data.title || getDomain(url), imageUrl: data.imageUrl || null, price: data.price || null, domain: data.domain || getDomain(url) });
    } catch {
      toast.error("Couldn't fetch link preview — you can still save it manually.");
      setPreview({ title: getDomain(url), imageUrl: null, price: null, domain: getDomain(url) });
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!url.trim() || !preview) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("wishlist_items")
        .insert({
          pair_id: pairId,
          added_by: currentUserId,
          url: url.trim(),
          title: preview.title,
          image_url: preview.imageUrl,
          price: preview.price,
          domain: preview.domain,
          notes: notes.trim() || null,
          status: "wanted",
        })
        .select()
        .single();
      if (error) throw error;
      setItems((prev) => [data as WishlistItem, ...prev]);
      setUrl(""); setPreview(null); setNotes(""); setShowAdd(false);
      toast.success("Added to wishlist");
    } catch {
      toast.error("Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
    if (error) { toast.error("Failed to remove item"); setDeletingId(null); return; }
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
  };

  const handleTogglePurchased = async (item: WishlistItem) => {
    setPurchasingId(item.id);
    const newStatus = item.status === "purchased" ? "wanted" : "purchased";
    const { error } = await supabase.from("wishlist_items").update({ status: newStatus }).eq("id", item.id);
    if (error) { toast.error("Failed to update"); setPurchasingId(null); return; }
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: newStatus } : i));
    if (newStatus === "purchased") toast.success("Marked as purchased 🎁");
    setPurchasingId(null);
  };

  const handleReset = () => {
    setUrl(""); setPreview(null); setNotes(""); setShowAdd(false);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          {(["all", "wanted", "purchased"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-headline font-bold tracking-widest uppercase flex-shrink-0 border transition-all ${
                filter === f
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-surface-low border-outline-variant/10 text-muted hover:text-foreground"
              }`}
            >
              {f === "all" ? `All ${items.length}` : f === "wanted" ? `Wanted ${wantedCount}` : `Purchased ${purchasedCount}`}
            </button>
          ))}
        </div>
        {isMistress && (
          <button
            onClick={() => { setShowAdd(true); setTimeout(() => urlInputRef.current?.focus(), 50); }}
            className="btn-gradient flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-headline font-bold tracking-widest uppercase flex-shrink-0"
          >
            <Plus size={12} /> Add Item
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && isMistress && (
        <div className="bg-surface-container border border-primary/20 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-headline font-bold tracking-widest uppercase text-primary">Add to Wishlist</span>
            <button onClick={handleReset} className="p-1 text-muted hover:text-foreground transition-colors"><X size={14} /></button>
          </div>

          {/* URL input */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-surface-low border border-outline-variant/20 rounded-xl px-4 py-3 focus-within:border-primary/40 transition-colors">
              <Link2 size={14} className="text-muted flex-shrink-0" />
              <input
                ref={urlInputRef}
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setPreview(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleFetchMeta(); }}
                placeholder="Paste a product URL…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder-zinc-600 outline-none"
              />
            </div>
            <button
              onClick={handleFetchMeta}
              disabled={!url.trim() || fetching}
              className="px-4 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-[10px] font-headline font-bold tracking-widest uppercase disabled:opacity-40 hover:bg-primary/20 transition-colors flex-shrink-0 flex items-center gap-1.5"
            >
              {fetching ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
              {fetching ? "Fetching…" : "Fetch"}
            </button>
          </div>

          {/* Preview card */}
          {preview && (
            <div className="flex gap-3 bg-surface-low rounded-xl border border-outline-variant/10 overflow-hidden">
              {preview.imageUrl ? (
                <img src={preview.imageUrl} alt={preview.title || "Product"} className="w-24 h-24 sm:w-28 sm:h-28 object-cover flex-shrink-0" />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-surface-container flex items-center justify-center flex-shrink-0">
                  <ShoppingBag size={20} className="text-zinc-600" />
                </div>
              )}
              <div className="flex-1 min-w-0 p-3">
                <p className="text-[9px] font-label text-zinc-500 uppercase tracking-widest mb-1">{preview.domain}</p>
                <p className="text-sm font-headline font-bold leading-snug line-clamp-2">{preview.title}</p>
                {preview.price && <p className="text-primary font-headline font-bold text-sm mt-1">{preview.price}</p>}
              </div>
            </div>
          )}

          {/* Notes */}
          {preview && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Add a note (optional)…"
              className="w-full bg-surface-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-primary/40 resize-none transition-colors"
            />
          )}

          {preview && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-gradient flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-headline font-bold tracking-widest uppercase disabled:opacity-50"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Heart size={12} />}
                Save to Wishlist
              </button>
              <button onClick={handleReset} className="px-4 py-3 rounded-xl border border-outline-variant/20 text-[10px] font-headline font-bold text-muted hover:text-foreground uppercase tracking-widest transition-colors">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center bg-surface-low rounded-2xl border border-outline-variant/10 p-12 gap-3">
          <ShoppingBag size={24} className="text-zinc-600" />
          <p className="text-sm text-muted font-headline text-center">
            {filter === "all"
              ? isMistress ? "Nothing on the wishlist yet — add something you desire." : "The wishlist is empty."
              : `No ${filter} items.`}
          </p>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`relative flex flex-col rounded-2xl border overflow-hidden bg-surface-low transition-all group ${
                item.status === "purchased"
                  ? "border-success/20 opacity-70"
                  : "border-outline-variant/10 hover:border-primary/20"
              }`}
            >
              {/* Image */}
              <div className="relative aspect-square bg-surface-container overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title || "Product"} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag size={28} className="text-zinc-700" />
                  </div>
                )}

                {/* Purchased overlay */}
                {item.status === "purchased" && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-success/20 border border-success/40 flex items-center justify-center">
                      <PackageCheck size={18} className="text-success" />
                    </div>
                  </div>
                )}

                {/* Action buttons — shown on hover (desktop) or always visible (mobile) */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {/* Mark purchased / undo */}
                  <button
                    onClick={() => handleTogglePurchased(item)}
                    disabled={purchasingId === item.id}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                      item.status === "purchased"
                        ? "bg-success/20 border-success/40 text-success"
                        : "bg-black/60 border-white/20 text-white hover:bg-success/30 hover:border-success/50 hover:text-success"
                    }`}
                    title={item.status === "purchased" ? "Mark as wanted" : "Mark as purchased"}
                  >
                    {purchasingId === item.id
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Check size={11} />}
                  </button>

                  {/* Delete — mistress only */}
                  {isMistress && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="w-7 h-7 rounded-lg bg-black/60 border border-white/20 text-white hover:bg-[#ff3366]/30 hover:border-[#ff3366]/50 hover:text-[#ff3366] flex items-center justify-center transition-all"
                      title="Remove from wishlist"
                    >
                      {deletingId === item.id
                        ? <Loader2 size={11} className="animate-spin" />
                        : <Trash2 size={11} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-3 flex flex-col gap-1.5 flex-1">
                {item.domain && (
                  <p className="text-[9px] font-label text-zinc-500 uppercase tracking-widest truncate">{item.domain}</p>
                )}
                <p className="text-xs font-headline font-bold leading-snug line-clamp-2 flex-1">
                  {item.title || item.url}
                </p>
                {item.price && (
                  <p className="text-primary font-headline font-bold text-sm">{item.price}</p>
                )}
                {item.notes && (
                  <p className="text-[10px] text-zinc-500 italic line-clamp-2">{item.notes}</p>
                )}

                {/* Open link */}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 text-[10px] font-headline font-bold text-primary hover:text-pink transition-colors uppercase tracking-widest"
                >
                  <ExternalLink size={10} /> View listing
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
