'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Clock, Upload, X, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface PhotoDemand {
  id: string;
  pair_id: string;
  prompt: string;
  window_seconds: number;
  expires_at: string;
  status: 'pending' | 'fulfilled' | 'expired' | 'cancelled';
}

interface PhotoDemandBannerProps {
  userId: string;
  initialDemand: PhotoDemand | null;
}

export function PhotoDemandBanner({ userId, initialDemand }: PhotoDemandBannerProps) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [demand, setDemand] = useState<PhotoDemand | null>(initialDemand);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);
  const expireCalledRef = useRef(false);

  // Calculate seconds left from expires_at
  const calcSecondsLeft = useCallback((expiresAt: string) => {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  }, []);

  // Fetch initial demand if not provided
  useEffect(() => {
    const fetchActiveDemand = async () => {
      if (demand) return;

      const { data } = await supabase
        .from('photo_demands')
        .select('*')
        .eq('slave_id', userId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setDemand(data);
      }
    };

    fetchActiveDemand();
  }, [userId, supabase, demand]);

  // Subscribe to realtime demand updates
  useEffect(() => {
    const channel = supabase
      .channel('photo-demand')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'photo_demands', filter: `slave_id=eq.${userId}` },
        (payload) => {
          const newDemand = payload.new as PhotoDemand;
          if (newDemand.status === 'pending') {
            setDemand(newDemand);
            setExpired(false);
            expireCalledRef.current = false;
            toast.error('📸 Photo demand received!', { duration: 6000 });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'photo_demands', filter: `slave_id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as PhotoDemand;
          if (demand?.id === updated.id) {
            if (updated.status !== 'pending') {
              setDemand(null);
            } else {
              setDemand(updated);
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, demand?.id, supabase]);

  // Countdown timer
  useEffect(() => {
    if (!demand || demand.status !== 'pending') return;

    const secs = calcSecondsLeft(demand.expires_at);
    setSecondsLeft(secs);

    if (secs <= 0) {
      handleExpire();
      return;
    }

    const interval = setInterval(() => {
      const remaining = calcSecondsLeft(demand.expires_at);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        handleExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [demand?.id, demand?.expires_at]);

  const handleExpire = async () => {
    if (!demand || expireCalledRef.current) return;
    expireCalledRef.current = true;
    setExpired(true);

    try {
      await fetch('/api/demands/expire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demandId: demand.id }),
      });
      toast.error('⚡ Time up — a punishment has been issued', { duration: 8000 });
      setTimeout(() => { setDemand(null); router.refresh(); }, 3000);
    } catch {}
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file || !demand) return;
    setSubmitting(true);

    try {
      // Upload to Supabase storage
      const ext = file.name.split('.').pop();
      const filePath = `${userId}/demand-${demand.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('proofs').upload(filePath, file);
      if (uploadError) throw uploadError;

      // Fulfill via API
      const res = await fetch('/api/demands/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demandId: demand.id, photoUrl: filePath, caption }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('📸 Photo submitted!');
      setDemand(null);
      setFile(null);
      setPreview(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit photo');
    } finally {
      setSubmitting(false);
    }
  };

  if (!demand) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const pct = demand ? (secondsLeft / demand.window_seconds) * 100 : 0;
  const isUrgent = secondsLeft <= 60 && secondsLeft > 0;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${
      expired
        ? 'border-[#ff3366]/40 bg-[#ff3366]/5'
        : isUrgent
        ? 'border-[#ff3366]/60 bg-[#ff3366]/10 animate-pulse'
        : 'border-[#ff67ad]/30 bg-[#ff67ad]/5'
    } p-5 space-y-4`}>
      {/* Glow bar at top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-surface-container overflow-hidden rounded-t-2xl">
        <div
          className={`h-full transition-all duration-1000 ${pct > 30 ? 'bg-[#ff67ad]' : 'bg-[#ff3366]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={16} className={expired ? 'text-[#ff3366]' : 'text-[#ff67ad]'} />
          <span className="text-[10px] font-headline font-bold tracking-widest uppercase text-[#ff67ad]">
            {expired ? 'Demand Expired' : 'Photo Demanded'}
          </span>
        </div>
        {!expired && (
          <div className={`flex items-center gap-1.5 font-mono font-bold text-lg tabular-nums ${
            isUrgent ? 'text-[#ff3366]' : 'text-foreground'
          }`}>
            <Clock size={14} className={isUrgent ? 'text-[#ff3366]' : 'text-muted'} />
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Prompt */}
      <p className="text-sm font-headline font-bold leading-snug">{demand.prompt}</p>

      {expired ? (
        <div className="flex items-center gap-2 text-xs text-muted">
          <AlertTriangle size={13} className="text-[#ff3366]" />
          <span>You didn't respond in time. A punishment has been issued.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
          />

          {!file ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#ff67ad]/30 hover:border-[#ff67ad]/60 bg-[#ff67ad]/5 hover:bg-[#ff67ad]/10 rounded-xl py-6 text-sm font-headline font-bold text-[#ff67ad] transition-all"
            >
              <Camera size={18} />
              Take or Choose Photo
            </button>
          ) : (
            <div className="space-y-3">
              {/* Preview */}
              <div className="relative rounded-xl overflow-hidden h-40 sm:h-56 bg-surface-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview!} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Caption */}
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a note (optional)…"
                className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-[#ff67ad]/40 transition-colors"
              />

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full btn-gradient py-3 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Submit Photo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
