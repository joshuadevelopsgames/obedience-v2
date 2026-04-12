'use client';

import { useState, useEffect } from 'react';
import { Camera, Clock, X, Loader2, Zap, Pencil, Sparkles, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface PhotoDemandButtonProps {
  pairId: string;
  slaveId: string;
  slaveName: string;
}

interface PunishmentPreset {
  title: string;
  description: string;
  category: string;
  difficulty: number;
  xp_reward: number;
  proof_type: string;
  duration_minutes: number;
}

type PunishmentMode = 'auto' | 'custom' | 'generate';

const WINDOWS = [
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
];

const MODES: { id: PunishmentMode; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: 'auto',
    label: 'Auto',
    icon: <Zap size={11} />,
    desc: 'Grok generates a punishment on failure',
  },
  {
    id: 'custom',
    label: 'Write Mine',
    icon: <Pencil size={11} />,
    desc: 'You write the punishment now',
  },
  {
    id: 'generate',
    label: 'Generate & Approve',
    icon: <Sparkles size={11} />,
    desc: 'Preview & edit before locking in',
  },
];

export function PhotoDemandButton({ pairId, slaveId, slaveName }: PhotoDemandButtonProps) {
  const [open, setOpen] = useState(false);

  // Lock body scroll on mobile when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  const [prompt, setPrompt] = useState('');
  const [windowSeconds, setWindowSeconds] = useState(300);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [loading, setLoading] = useState(false);

  // Punishment mode
  const [punishmentMode, setPunishmentMode] = useState<PunishmentMode>('auto');

  // "Write mine" state
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  // "Generate & approve" state
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewPunishment, setPreviewPunishment] = useState<PunishmentPreset | null>(null);
  const [previewApproved, setPreviewApproved] = useState(false);
  const [editingPreview, setEditingPreview] = useState(false);

  const resetModal = () => {
    setPrompt('');
    setWindowSeconds(300);
    setUseCustomTime(false);
    setCustomHours(0);
    setCustomMinutes(30);
    setPunishmentMode('auto');
    setCustomTitle('');
    setCustomDescription('');
    setPreviewPunishment(null);
    setPreviewApproved(false);
    setEditingPreview(false);
  };

  const handleClose = () => {
    setOpen(false);
    resetModal();
  };

  const handleGeneratePreview = async () => {
    if (!prompt.trim()) { toast.error('Write the photo prompt first'); return; }
    setGeneratingPreview(true);
    setPreviewPunishment(null);
    setPreviewApproved(false);
    try {
      const res = await fetch('/api/demands/preview-punishment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairId, slaveId, demandPrompt: prompt.trim(), windowSeconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreviewPunishment(data.punishment);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate preview');
    } finally {
      setGeneratingPreview(false);
    }
  };

  const buildPreset = (): PunishmentPreset | null => {
    if (punishmentMode === 'auto') return null;

    if (punishmentMode === 'custom') {
      if (!customTitle.trim()) return null;
      return {
        title: customTitle.trim(),
        description: customDescription.trim() || `You failed to send a photo as demanded. ${customTitle.trim()}.`,
        category: 'obedience',
        difficulty: 3,
        xp_reward: 0,
        proof_type: 'photo',
        duration_minutes: 15,
      };
    }

    if (punishmentMode === 'generate' && previewApproved && previewPunishment) {
      return previewPunishment;
    }

    return null;
  };

  const canSend = () => {
    if (!prompt.trim()) return false;
    if (punishmentMode === 'custom' && !customTitle.trim()) return false;
    if (punishmentMode === 'generate' && !previewApproved) return false;
    return true;
  };

  const handleDemand = async () => {
    if (!canSend()) {
      if (punishmentMode === 'generate' && !previewApproved) {
        toast.error('Generate and approve a punishment first');
      } else {
        toast.error('Fill in all required fields');
      }
      return;
    }
    setLoading(true);
    try {
      const preset = buildPreset();
      const res = await fetch('/api/demands/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairId,
          slaveId,
          prompt: prompt.trim(),
          windowSeconds,
          punishmentPreset: preset,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`📸 Demand sent — ${slaveName} has ${windowSeconds / 60} min`);
      handleClose();
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
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm touch-none">
          <div className="bg-surface-low border border-outline-variant/20 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md mx-0 sm:mx-4 space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain touch-auto">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-[#ff67ad]" />
                <h2 className="text-sm font-headline font-bold tracking-widest uppercase">Photo Demand</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-muted hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <label className="text-[10px] font-label uppercase tracking-widest text-muted">
                What photo do you want?
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`e.g. "Show me your collar on" or "Mirror selfie, now"`}
                rows={3}
                className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-[#ff67ad]/40 resize-none transition-colors"
              />
            </div>

            {/* Time window */}
            <div className="space-y-2">
              <label className="text-[10px] font-label uppercase tracking-widest text-muted flex items-center gap-1.5">
                <Clock size={11} />
                Time limit
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {WINDOWS.map((w) => (
                  <button
                    key={w.seconds}
                    onClick={() => { setWindowSeconds(w.seconds); setUseCustomTime(false); }}
                    className={`py-2 rounded-lg text-xs font-headline font-bold tracking-widest uppercase transition-colors ${
                      !useCustomTime && windowSeconds === w.seconds
                        ? 'bg-[#ff67ad] text-white'
                        : 'bg-surface-container border border-outline-variant/20 text-muted hover:text-foreground'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
                <button
                  onClick={() => setUseCustomTime(true)}
                  className={`py-2 rounded-lg text-xs font-headline font-bold tracking-widest uppercase transition-colors ${
                    useCustomTime
                      ? 'bg-[#ff67ad] text-white'
                      : 'bg-surface-container border border-outline-variant/20 text-muted hover:text-foreground'
                  }`}
                >
                  Custom
                </button>
              </div>
              {/* Custom time inputs */}
              {useCustomTime && (
                <div className="flex items-center gap-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={customHours}
                      onChange={(e) => {
                        const h = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                        setCustomHours(h);
                        setWindowSeconds((h * 60 + customMinutes) * 60);
                      }}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-center text-foreground outline-none focus:border-[#ff67ad]/40 transition-colors"
                    />
                    <span className="text-[10px] font-label text-muted flex-shrink-0">hrs</span>
                  </div>
                  <span className="text-muted font-headline font-bold">:</span>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={customMinutes}
                      onChange={(e) => {
                        const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                        setCustomMinutes(m);
                        setWindowSeconds((customHours * 60 + m) * 60);
                      }}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-center text-foreground outline-none focus:border-[#ff67ad]/40 transition-colors"
                    />
                    <span className="text-[10px] font-label text-muted flex-shrink-0">min</span>
                  </div>
                  {(customHours > 0 || customMinutes > 0) && (
                    <span className="text-[10px] font-headline font-bold text-[#ff67ad] flex-shrink-0">
                      {customHours > 0 ? `${customHours}h ` : ''}{customMinutes > 0 ? `${customMinutes}m` : ''}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Punishment mode */}
            <div className="space-y-3">
              <label className="text-[10px] font-label uppercase tracking-widest text-muted flex items-center gap-1.5">
                <AlertTriangle size={11} />
                Failure punishment
              </label>

              {/* Mode tabs */}
              <div className="grid grid-cols-3 gap-1.5">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setPunishmentMode(m.id);
                      setPreviewPunishment(null);
                      setPreviewApproved(false);
                    }}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[9px] font-headline font-bold tracking-widest uppercase transition-all border ${
                      punishmentMode === m.id
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-surface-container border-outline-variant/20 text-muted hover:text-foreground'
                    }`}
                  >
                    {m.icon}
                    <span className="leading-none text-center">{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Mode description */}
              <p className="text-[10px] text-muted leading-relaxed">
                {MODES.find((m) => m.id === punishmentMode)?.desc}
              </p>

              {/* "Write mine" inputs */}
              {punishmentMode === 'custom' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-muted mb-1 block">
                      Punishment title *
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. 100 lines of apology"
                      maxLength={80}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-[#ff67ad]/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-label uppercase tracking-widest text-muted mb-1 block">
                      Description (optional)
                    </label>
                    <textarea
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Detail exactly what they must do to atone…"
                      rows={2}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-[#ff67ad]/40 resize-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* "Generate & approve" flow */}
              {punishmentMode === 'generate' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Generate button */}
                  {!previewPunishment && (
                    <button
                      onClick={handleGeneratePreview}
                      disabled={generatingPreview || !prompt.trim()}
                      className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-xl text-[10px] font-headline font-bold tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      {generatingPreview ? (
                        <><Loader2 size={12} className="animate-spin" /> Generating…</>
                      ) : (
                        <><Sparkles size={12} /> Generate Punishment Preview</>
                      )}
                    </button>
                  )}

                  {/* Preview card */}
                  {previewPunishment && (
                    <div className={`rounded-xl border p-4 space-y-2 transition-colors ${
                      previewApproved
                        ? 'bg-[#00ff9d]/5 border-[#00ff9d]/30'
                        : 'bg-surface-container border-outline-variant/20'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-label uppercase tracking-widest text-muted">
                          Generated Punishment
                        </span>
                        <div className="flex items-center gap-1.5">
                          {!previewApproved && (
                            <button
                              onClick={() => setEditingPreview(!editingPreview)}
                              className="text-[9px] font-label uppercase tracking-widest text-muted hover:text-foreground flex items-center gap-1 transition-colors"
                            >
                              <Pencil size={9} />
                              Edit
                            </button>
                          )}
                          {previewApproved && (
                            <button
                              onClick={() => { setPreviewApproved(false); setEditingPreview(true); }}
                              className="text-[9px] font-label uppercase tracking-widest text-muted hover:text-foreground flex items-center gap-1 transition-colors"
                            >
                              <Pencil size={9} />
                              Revise
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Editable title */}
                      {editingPreview ? (
                        <input
                          type="text"
                          value={previewPunishment.title}
                          onChange={(e) =>
                            setPreviewPunishment((p) => p ? { ...p, title: e.target.value } : p)
                          }
                          className="w-full bg-surface-low border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm font-headline font-bold text-foreground outline-none focus:border-primary/40 transition-colors"
                        />
                      ) : (
                        <p className="text-sm font-headline font-bold">{previewPunishment.title}</p>
                      )}

                      {/* Editable description */}
                      {editingPreview ? (
                        <textarea
                          value={previewPunishment.description}
                          onChange={(e) =>
                            setPreviewPunishment((p) => p ? { ...p, description: e.target.value } : p)
                          }
                          rows={3}
                          className="w-full bg-surface-low border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-muted outline-none focus:border-primary/40 resize-none transition-colors"
                        />
                      ) : (
                        <p className="text-xs text-muted leading-relaxed">{previewPunishment.description}</p>
                      )}

                      {/* Meta pills */}
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-[9px] font-label px-2 py-0.5 rounded bg-surface-low text-muted uppercase tracking-widest">
                          {previewPunishment.category}
                        </span>
                        <span className="text-[9px] font-label px-2 py-0.5 rounded bg-surface-low text-muted uppercase tracking-widest">
                          Diff {previewPunishment.difficulty}/5
                        </span>
                        <span className="text-[9px] font-label px-2 py-0.5 rounded bg-surface-low text-muted uppercase tracking-widest">
                          {previewPunishment.duration_minutes}min
                        </span>
                      </div>

                      {/* Approve / re-generate row */}
                      {!previewApproved ? (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => { setPreviewPunishment(null); setEditingPreview(false); }}
                            className="flex-1 py-2 border border-outline-variant/20 rounded-lg text-[9px] font-headline font-bold tracking-widest uppercase text-muted hover:text-foreground transition-colors"
                          >
                            Re-generate
                          </button>
                          <button
                            onClick={() => { setPreviewApproved(true); setEditingPreview(false); }}
                            className="flex-1 py-2 bg-[#00ff9d]/10 hover:bg-[#00ff9d]/20 border border-[#00ff9d]/30 text-[#00ff9d] rounded-lg text-[9px] font-headline font-bold tracking-widest uppercase flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <CheckCircle2 size={11} />
                            Looks Good
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 pt-1">
                          <CheckCircle2 size={13} className="text-[#00ff9d]" />
                          <span className="text-[10px] text-[#00ff9d] font-headline font-bold uppercase tracking-widest">
                            Approved — will be issued on failure
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Regenerate after approval */}
                  {previewPunishment && previewApproved && (
                    <button
                      onClick={handleGeneratePreview}
                      disabled={generatingPreview}
                      className="w-full py-2 text-[9px] font-label uppercase tracking-widest text-muted hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {generatingPreview ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      Generate different option
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleClose}
                className="flex-1 border border-outline-variant/20 py-2.5 rounded-sm text-[10px] font-headline font-bold tracking-widest uppercase text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDemand}
                disabled={loading || !canSend()}
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
