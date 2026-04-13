"use client";

import { useState, useCallback } from "react";
import { Image as ImageIcon, Video, X, ChevronLeft, ChevronRight, Check, Clock, XCircle, Filter, ZoomIn } from "lucide-react";

export type GalleryProof = {
  id: string;
  proof_type: "photo" | "video";
  signedUrl: string;
  text_content: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  task_title: string | null;
  task_category: string | null;
};

type FilterType = "all" | "photo" | "video" | "pending" | "approved";

interface Props {
  proofs: GalleryProof[];
  isOwner: boolean; // slave viewing their own gallery
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const statusConfig = {
  pending:  { icon: Clock,    color: "text-warning",     bg: "bg-warning/10 border-warning/20",     label: "Pending"  },
  approved: { icon: Check,    color: "text-success",     bg: "bg-success/10 border-success/20",     label: "Approved" },
  rejected: { icon: XCircle,  color: "text-[#ff3366]",   bg: "bg-[#ff3366]/10 border-[#ff3366]/20", label: "Rejected" },
};

export function GalleryView({ proofs, isOwner }: Props) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const filtered = proofs.filter((p) => {
    if (filter === "photo")    return p.proof_type === "photo";
    if (filter === "video")    return p.proof_type === "video";
    if (filter === "pending")  return p.status === "pending";
    if (filter === "approved") return p.status === "approved";
    return true;
  });

  const openLightbox = useCallback((idx: number) => setLightboxIdx(idx), []);
  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevItem = useCallback(() => setLightboxIdx((i) => (i !== null ? Math.max(0, i - 1) : null)), []);
  const nextItem = useCallback(() => setLightboxIdx((i) => (i !== null ? Math.min(filtered.length - 1, i + 1) : null)), [filtered.length]);

  const photoCount = proofs.filter((p) => p.proof_type === "photo").length;
  const videoCount = proofs.filter((p) => p.proof_type === "video").length;
  const pendingCount = proofs.filter((p) => p.status === "pending").length;

  const FILTERS: { id: FilterType; label: string; count?: number }[] = [
    { id: "all",      label: "All",      count: proofs.length  },
    { id: "photo",    label: "Photos",   count: photoCount     },
    { id: "video",    label: "Videos",   count: videoCount     },
    { id: "pending",  label: "Pending",  count: pendingCount   },
    { id: "approved", label: "Approved"                        },
  ];

  const currentItem = lightboxIdx !== null ? filtered[lightboxIdx] : null;

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Filter size={12} className="text-zinc-500 flex-shrink-0" />
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-headline font-bold tracking-widest uppercase flex-shrink-0 border transition-all ${
              filter === f.id
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-surface-low border-outline-variant/10 text-muted hover:text-foreground hover:border-white/10"
            }`}
          >
            {f.label}
            {f.count !== undefined && (
              <span className={`text-[9px] px-1 rounded-full ${filter === f.id ? "bg-primary/20 text-primary" : "bg-white/5 text-zinc-600"}`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center bg-surface-low rounded-2xl border border-outline-variant/10 p-16 gap-4">
          <div className="w-14 h-14 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-center">
            <ImageIcon size={20} className="text-zinc-600" />
          </div>
          <p className="text-sm text-muted font-headline text-center tracking-wide">
            {filter === "all"
              ? isOwner ? "Nothing submitted yet" : "No media submitted yet"
              : `No ${filter} items`}
          </p>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
          {filtered.map((proof, idx) => {
            const statusCfg = statusConfig[proof.status];
            const StatusIcon = statusCfg.icon;
            return (
              <div
                key={proof.id}
                className="break-inside-avoid group relative cursor-pointer rounded-xl overflow-hidden border border-outline-variant/10 hover:border-primary/30 transition-all"
                onClick={() => openLightbox(idx)}
              >
                {/* Media */}
                {proof.proof_type === "photo" ? (
                  <img
                    src={proof.signedUrl}
                    alt={proof.task_title || "Proof"}
                    className="w-full object-cover block"
                    loading="lazy"
                  />
                ) : (
                  <div className="relative bg-surface-container aspect-video flex items-center justify-center">
                    <video
                      src={proof.signedUrl}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center">
                        <Video size={16} className="text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <ZoomIn size={20} className="text-white drop-shadow" />
                </div>

                {/* Status badge */}
                <div className="absolute top-2 right-2">
                  <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-headline font-bold border ${statusCfg.bg} ${statusCfg.color}`}>
                    <StatusIcon size={8} />
                    {statusCfg.label}
                  </span>
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform">
                  {proof.task_title && (
                    <p className="text-[10px] font-headline font-bold text-white truncate">{proof.task_title}</p>
                  )}
                  <p className="text-[9px] text-zinc-400 font-label">{formatDate(proof.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {currentItem && lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[210] bg-black/95 flex flex-col"
          onClick={closeLightbox}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col">
              {currentItem.task_title && (
                <p className="text-sm font-headline font-bold text-white">{currentItem.task_title}</p>
              )}
              <p className="text-[10px] text-zinc-500 font-label">{formatDate(currentItem.created_at)}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Status */}
              {(() => {
                const cfg = statusConfig[currentItem.status];
                const Icon = cfg.icon;
                return (
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-headline font-bold border ${cfg.bg} ${cfg.color}`}>
                    <Icon size={10} /> {cfg.label}
                  </span>
                );
              })()}
              <span className="text-[10px] text-zinc-500 font-label">{lightboxIdx + 1} / {filtered.length}</span>
              <button onClick={closeLightbox} className="p-2 text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Media */}
          <div className="flex-1 flex items-center justify-center px-16 min-h-0" onClick={(e) => e.stopPropagation()}>
            {currentItem.proof_type === "photo" ? (
              <img
                src={currentItem.signedUrl}
                alt={currentItem.task_title || "Proof"}
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            ) : (
              <video
                src={currentItem.signedUrl}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-lg"
              />
            )}
          </div>

          {/* Note */}
          {currentItem.text_content && (
            <div className="px-6 py-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs text-zinc-400 text-center italic">"{currentItem.text_content}"</p>
            </div>
          )}

          {/* Prev / next */}
          {lightboxIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevItem(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white transition-all"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {lightboxIdx < filtered.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextItem(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white transition-all"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
