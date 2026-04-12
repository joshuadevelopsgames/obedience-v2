"use client";

import { X } from "lucide-react";

interface DeliveryModeModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onSelect: (mode: "online" | "in_person") => void;
  onClose: () => void;
}

export function DeliveryModeModal({
  isOpen,
  isLoading,
  onSelect,
  onClose,
}: DeliveryModeModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <div className="bg-surface-container rounded-2xl border border-white/10 p-8 space-y-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-headline font-bold tracking-tight">
              Protocol Mode
            </h2>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-sm text-zinc-400">
            Choose how you want to interact with your submissive for these protocols.
          </p>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onSelect("online")}
              disabled={isLoading}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-cyan-400/30 bg-cyan-400/5 hover:border-cyan-400/60 hover:bg-cyan-400/10 transition-all disabled:opacity-50"
            >
              <span className="text-3xl">🌐</span>
              <span className="font-headline font-bold text-sm uppercase tracking-widest text-cyan-400">
                Online
              </span>
              <span className="text-[10px] text-zinc-500 text-center leading-tight">
                Digital tasks & proofs
              </span>
            </button>

            <button
              onClick={() => onSelect("in_person")}
              disabled={isLoading}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-pink/30 bg-pink/5 hover:border-pink/60 hover:bg-pink/10 transition-all disabled:opacity-50"
            >
              <span className="text-3xl">🤝</span>
              <span className="font-headline font-bold text-sm uppercase tracking-widest text-pink">
                In Person
              </span>
              <span className="text-[10px] text-zinc-500 text-center leading-tight">
                Physical interaction
              </span>
            </button>
          </div>

          {/* Footer note */}
          <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
            Tasks will be tailored to work best for your chosen mode. You can create tasks in different modes anytime.
          </p>
        </div>
      </div>
    </>
  );
}
