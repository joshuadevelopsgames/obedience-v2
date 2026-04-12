'use client';

import { useState } from 'react';
import {
  Gift, Sparkles, Plus, Trash2, Zap, Loader2,
  Eye, EyeOff, Check, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Reward } from '@/types/database';
import { DeliveryModeModal } from '@/components/mistress/DeliveryModeModal';

interface GeneratedReward {
  title: string;
  description: string;
  xp_cost: number;
  selected: boolean;
}

interface Props {
  pairId: string;
  rewards: Reward[];
}

export function RewardsManager({ pairId, rewards: initialRewards }: Props) {
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>(initialRewards);

  // Manual create
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newXpCost, setNewXpCost] = useState('200');
  const [creating, setCreating] = useState(false);

  // AI generate
  const [generating, setGenerating] = useState(false);
  const [generatedRewards, setGeneratedRewards] = useState<GeneratedReward[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  // Per-reward toggle/delete
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newTitle.trim()) { toast.error('Title required'); return; }
    const cost = parseInt(newXpCost, 10);
    if (isNaN(cost) || cost < 1) { toast.error('Enter a valid XP cost'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/rewards/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairId,
          rewards: [{ title: newTitle.trim(), description: newDescription.trim() || undefined, xp_cost: cost }],
          aiGenerated: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRewards((prev) => [...prev, ...data.rewards]);
      setNewTitle(''); setNewDescription(''); setNewXpCost('200');
      setShowAddForm(false);
      toast.success('Reward created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create reward');
    } finally {
      setCreating(false);
    }
  };

  const handleGenerate = async (deliveryMode: 'online' | 'in_person') => {
    setShowDeliveryModal(false);
    setGenerating(true);
    setGeneratedRewards([]);
    try {
      const res = await fetch('/api/rewards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairId, deliveryMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedRewards(data.rewards.map((r: any) => ({ ...r, selected: true })));
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveGenerated = async () => {
    const toSave = generatedRewards.filter((r) => r.selected);
    if (toSave.length === 0) { toast.error('Select at least one reward'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/rewards/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairId, rewards: toSave, aiGenerated: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRewards((prev) => [...prev, ...data.rewards]);
      setGeneratedRewards([]);
      toast.success(`${toSave.length} reward${toSave.length > 1 ? 's' : ''} added to the shop`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save rewards');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (reward: Reward) => {
    setTogglingId(reward.id);
    try {
      const res = await fetch('/api/rewards/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: reward.id, available: !reward.available }),
      });
      if (!res.ok) throw new Error();
      setRewards((prev) => prev.map((r) => r.id === reward.id ? { ...r, available: !r.available } : r));
    } catch {
      toast.error('Failed to update');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (rewardId: string) => {
    setDeletingId(rewardId);
    try {
      const res = await fetch('/api/rewards/toggle', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId }),
      });
      if (!res.ok) throw new Error();
      setRewards((prev) => prev.filter((r) => r.id !== rewardId));
      toast.success('Reward removed');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <DeliveryModeModal
        isOpen={showDeliveryModal}
        isLoading={generating}
        onSelect={handleGenerate}
        onClose={() => setShowDeliveryModal(false)}
      />

      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setShowAddForm((v) => !v); setGeneratedRewards([]); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg text-[10px] font-headline font-bold tracking-widest uppercase transition-colors"
        >
          <Plus size={12} />
          Add Reward
        </button>
        <button
          onClick={() => { setShowAddForm(false); setShowDeliveryModal(true); }}
          disabled={generating}
          className="flex items-center gap-1.5 px-4 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-muted hover:text-foreground rounded-lg text-[10px] font-headline font-bold tracking-widest uppercase transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {generating ? 'Generating…' : 'Generate Ideas'}
        </button>
      </div>

      {/* Manual add form */}
      {showAddForm && (
        <div className="bg-surface-container border border-outline-variant/10 rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-label uppercase tracking-widest text-muted">New Reward</p>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title…"
            className="w-full bg-surface-low border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-primary/40 transition-colors"
          />
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)…"
            className="w-full bg-surface-low border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-primary/40 transition-colors"
          />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Zap size={13} className="text-primary flex-shrink-0" />
              <input
                type="number"
                value={newXpCost}
                onChange={(e) => setNewXpCost(e.target.value)}
                min="1"
                placeholder="XP cost"
                className="w-full bg-surface-low border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-foreground placeholder-zinc-600 outline-none focus:border-primary/40 transition-colors"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
              className="btn-gradient px-4 py-2 rounded-lg text-[10px] font-headline font-bold tracking-widest uppercase flex items-center gap-1.5 disabled:opacity-50"
            >
              {creating ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-2 text-muted hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* AI-generated reward picker */}
      {generatedRewards.length > 0 && (
        <div className="bg-surface-container border border-primary/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-primary" />
              <p className="text-[10px] font-headline font-bold tracking-widest uppercase text-primary">
                AI-Generated Ideas
              </p>
            </div>
            <p className="text-[10px] text-muted font-label">
              {generatedRewards.filter((r) => r.selected).length} selected
            </p>
          </div>
          <div className="space-y-2">
            {generatedRewards.map((reward, i) => (
              <div
                key={i}
                onClick={() => setGeneratedRewards((prev) =>
                  prev.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r)
                )}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  reward.selected
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-surface-low border-outline-variant/10 opacity-50'
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border transition-colors ${
                  reward.selected ? 'bg-primary border-primary' : 'border-outline-variant/30'
                }`}>
                  {reward.selected && <Check size={10} className="text-black" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-headline font-bold">{reward.title}</p>
                  {reward.description && (
                    <p className="text-[10px] text-muted mt-0.5 leading-relaxed">{reward.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Zap size={10} className="text-primary" />
                  <span className="text-[10px] font-headline font-bold text-primary">{reward.xp_cost}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSaveGenerated}
              disabled={saving || generatedRewards.filter((r) => r.selected).length === 0}
              className="btn-gradient flex-1 py-2 rounded-lg text-[10px] font-headline font-bold tracking-widest uppercase flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Gift size={11} />}
              {saving ? 'Adding…' : 'Add to Shop'}
            </button>
            <button
              onClick={() => setGeneratedRewards([])}
              className="px-4 py-2 border border-outline-variant/20 rounded-lg text-[10px] font-headline font-bold tracking-widest uppercase text-muted hover:text-foreground transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Existing rewards list */}
      {rewards.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-outline-variant/10 rounded-xl">
          <Gift size={22} className="mx-auto mb-2 text-zinc-600" />
          <p className="text-xs text-muted font-headline">No rewards yet — add one or generate ideas above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className={`flex items-start gap-3 bg-surface-container rounded-xl border px-4 py-3 transition-all ${
                reward.available ? 'border-outline-variant/10' : 'border-outline-variant/5 opacity-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-headline font-bold">{reward.title}</p>
                  {reward.ai_generated && (
                    <span className="text-[8px] font-label uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      AI
                    </span>
                  )}
                  {!reward.available && (
                    <span className="text-[8px] font-label uppercase tracking-widest text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded">
                      Hidden
                    </span>
                  )}
                </div>
                {reward.description && (
                  <p className="text-[10px] text-muted mt-0.5 leading-relaxed line-clamp-2">{reward.description}</p>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <Zap size={10} className="text-primary" />
                  <span className="text-[10px] font-headline font-bold text-primary">{reward.xp_cost} XP</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Toggle visibility */}
                <button
                  onClick={() => handleToggle(reward)}
                  disabled={togglingId === reward.id}
                  className="p-1.5 rounded-lg text-muted hover:text-foreground transition-colors"
                  title={reward.available ? 'Hide from shop' : 'Show in shop'}
                >
                  {togglingId === reward.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : reward.available ? <Eye size={13} /> : <EyeOff size={13} />
                  }
                </button>
                {/* Delete */}
                <button
                  onClick={() => handleDelete(reward.id)}
                  disabled={deletingId === reward.id}
                  className="p-1.5 rounded-lg text-muted hover:text-[#ff3366] transition-colors"
                  title="Delete reward"
                >
                  {deletingId === reward.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Trash2 size={13} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
