'use client';

import { useState } from 'react';
import { Camera, Clock, X, Loader2, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface PhotoDemandButtonProps {
  pairId: string;
  slaveId: string;
  slaveName: string;
}

const WINDOWS = [
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
];

export function PhotoDemandButton({ pairId, slaveId, slaveName }: PhotoDemandButtonProps) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [windowSeconds, setWindowSeconds] = useState(300);
  const [loading, setLoading] = useState(false);

  const handleDemand = async () => {
    if (!prompt.trim()) { toast.error('Write what photo you want'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/demands/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairId, slaveId, prompt: prompt.trim(), windowSeconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`📸 Demand sent — ${slaveName} has ${windowSeconds / 60} minutes`);
      setOpen(false);
      setPrompt('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send demand');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#ff67ad]/10 hover:bg-[#ff67ad]/20 border border-[#ff67ad]/30 text-[#ff67ad] rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase transition-colors"
      >
        <Camera size={14} />
        Demand Photo
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-surface-low border border-outline-variant/20 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md mx-0 sm:mx-4 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-[#ff67ad]" />
                <h2 className="text-sm font-headline font-bold tracking-widest uppercase">Photo Demand</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Prompt input */}
            <div className="space-y-2">
              <label className="text-[10px] font-label uppercase tracking-widest text-muted">
                What photo do you want?
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`e.g. "Show me your collar on" or "Send me a mirror selfie now"`}
                rows={3}
                className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-[#ff67ad]/40 resize-none transition-colors"
              />
            </div>

            {/* Time window */}
            <div className="space-y-2">
              <label className="text-[10px] font-label uppercase tracking-widest text-muted flex items-center gap-1.5">
                <Clock size={11} />
                Time limit — failure triggers auto-punishment
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WINDOWS.map((w) => (
                  <button
                    key={w.seconds}
                    onClick={() => setWindowSeconds(w.seconds)}
                    className={`py-2 rounded-lg text-xs font-headline font-bold tracking-widest uppercase transition-colors ${
                      windowSeconds === w.seconds
                        ? 'bg-[#ff67ad] text-white'
                        : 'bg-surface-container border border-outline-variant/20 text-muted hover:text-foreground'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Warning note */}
            <div className="bg-[#ff3366]/5 border border-[#ff3366]/20 rounded-xl p-3 flex items-start gap-2">
              <Zap size={13} className="text-[#ff3366] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted leading-relaxed">
                If <strong className="text-foreground">{slaveName}</strong> doesn't submit within the time limit, Grok will automatically issue a punishment task.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-outline-variant/20 py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDemand}
                disabled={loading || !prompt.trim()}
                className="flex-1 btn-gradient py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                Send Demand
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
