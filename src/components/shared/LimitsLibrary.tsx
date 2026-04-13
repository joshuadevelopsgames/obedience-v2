'use client';

import { useState, useMemo } from 'react';
import { AlertCircle, X, ShieldAlert, Shield, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Limit {
  id: string;
  name: string;
  description: string;
  category: 'hard' | 'soft';
  is_custom: boolean;
  created_by: string | null;
}

interface SelectedLimit {
  limit_id: string;
  category: 'hard' | 'soft';
}

interface LimitsLibraryProps {
  profileId: string;
  pairId: string;
  allLimits: Limit[];
  selectedLimits: SelectedLimit[];
  selectedKinkIds: string[];
  allKinksByName: Record<string, string>;
}

type CategoryType = 'all' | 'hard' | 'soft';

export default function LimitsLibrary({
  profileId,
  pairId,
  allLimits: initialAllLimits,
  selectedLimits: initialSelectedLimits,
  selectedKinkIds,
  allKinksByName,
}: LimitsLibraryProps) {
  const supabase = createClient();

  // ── Local state (no more window.location.reload) ─────────
  const [allLimits, setAllLimits]           = useState<Limit[]>(initialAllLimits);
  const [selected, setSelected]             = useState<SelectedLimit[]>(initialSelectedLimits);
  const [searchTerm, setSearchTerm]         = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [toggling, setToggling]             = useState<string | null>(null);
  const [pickingFor, setPickingFor]         = useState<string | null>(null);

  // Custom limit form
  const [customLimitName, setCustomLimitName]           = useState('');
  const [customLimitDescription, setCustomLimitDescription] = useState('');
  const [customLimitCategory, setCustomLimitCategory]   = useState<'hard' | 'soft'>('soft');
  const [addingCustom, setAddingCustom]                 = useState(false);

  // ── Derived ───────────────────────────────────────────────
  const selectedMap = useMemo(() => {
    const m: Record<string, 'hard' | 'soft'> = {};
    for (const sl of selected) m[sl.limit_id] = sl.category;
    return m;
  }, [selected]);

  const filteredLimits = useMemo(() => {
    return allLimits.filter((limit) => {
      const matchesSearch =
        limit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        limit.description.toLowerCase().includes(searchTerm.toLowerCase());
      const userCategory = selectedMap[limit.id];
      const effectiveCategory = userCategory ?? limit.category;
      const matchesCategory = activeCategory === 'all' || effectiveCategory === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allLimits, searchTerm, activeCategory, selectedMap]);

  const hardCount = selected.filter((l) => l.category === 'hard').length;
  const softCount = selected.filter((l) => l.category === 'soft').length;

  // ── Remove limit ──────────────────────────────────────────
  const removeLimit = async (limitId: string) => {
    if (toggling) return;
    setToggling(limitId);
    const { error } = await supabase
      .from('profile_limits')
      .delete()
      .eq('profile_id', profileId)
      .eq('limit_id', limitId)
      .eq('pair_id', pairId);

    if (!error) {
      setSelected((prev) => prev.filter((sl) => sl.limit_id !== limitId));
    } else {
      toast.error('Failed to remove limit');
    }
    setToggling(null);
  };

  // ── Add limit ─────────────────────────────────────────────
  const addLimit = async (limitId: string, category: 'hard' | 'soft') => {
    if (toggling) return;
    setPickingFor(null);
    setToggling(limitId);

    const { error } = await supabase.from('profile_limits').insert({
      profile_id: profileId,
      limit_id: limitId,
      pair_id: pairId,
      category,
    });

    if (!error) {
      setSelected((prev) => [...prev, { limit_id: limitId, category }]);

      // Remove conflicting kink if present
      const limit = allLimits.find((l) => l.id === limitId);
      if (limit) {
        const matchingKinkId = allKinksByName[limit.name];
        if (matchingKinkId && selectedKinkIds.includes(matchingKinkId)) {
          await supabase
            .from('profile_kinks')
            .delete()
            .eq('profile_id', profileId)
            .eq('kink_id', matchingKinkId);
        }
      }
    } else {
      toast.error('Failed to add limit');
    }
    setToggling(null);
  };

  // ── Add custom limit ──────────────────────────────────────
  const addCustomLimit = async () => {
    if (!customLimitName.trim()) return;
    setAddingCustom(true);

    const { data: limitData, error: insertError } = await supabase
      .from('limits_library')
      .insert({
        name: customLimitName.trim(),
        description: customLimitDescription.trim() || '',
        category: customLimitCategory,
        is_custom: true,
        created_by: profileId,
      })
      .select()
      .single();

    if (insertError || !limitData) {
      toast.error('Failed to add custom limit');
      setAddingCustom(false);
      return;
    }

    const { error: profileError } = await supabase.from('profile_limits').insert({
      profile_id: profileId,
      limit_id: limitData.id,
      pair_id: pairId,
      category: customLimitCategory,
    });

    if (!profileError) {
      setAllLimits((prev) => [...prev, limitData as Limit]);
      setSelected((prev) => [...prev, { limit_id: limitData.id, category: customLimitCategory }]);
      setCustomLimitName('');
      setCustomLimitDescription('');
      setCustomLimitCategory('soft');
      toast.success(`"${limitData.name}" added`);
    } else {
      toast.error('Failed to save custom limit');
    }
    setAddingCustom(false);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search limits…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/40 text-sm transition-colors"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'hard', 'soft'] as CategoryType[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-headline font-bold tracking-widest uppercase transition-colors ${
              activeCategory === cat
                ? cat === 'hard'
                  ? 'bg-danger/20 border border-danger/30 text-danger'
                  : cat === 'soft'
                  ? 'bg-warning/20 border border-warning/30 text-warning'
                  : 'bg-primary/10 border border-primary/20 text-primary'
                : 'bg-surface-container border border-outline-variant/10 text-muted hover:text-foreground'
            }`}
          >
            {cat === 'all' ? `All (${selected.length})` : cat === 'hard' ? `⚠ Hard (${hardCount})` : `Soft (${softCount})`}
          </button>
        ))}
      </div>

      {/* Limits Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filteredLimits.map((limit) => {
          const chosenCategory = selectedMap[limit.id];
          const isSelected     = chosenCategory !== undefined;
          const isPicking      = pickingFor === limit.id;
          const isToggling     = toggling === limit.id;

          return (
            <div key={limit.id} className="relative">
              {isSelected ? (
                /* Selected — show badge + remove */
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  chosenCategory === 'hard'
                    ? 'bg-danger/10 border-danger/30'
                    : 'bg-warning/10 border-warning/30'
                }`}>
                  {chosenCategory === 'hard'
                    ? <ShieldAlert size={12} className="text-danger flex-shrink-0" />
                    : <Shield size={12} className="text-warning flex-shrink-0" />
                  }
                  <span className={`text-xs font-headline font-bold flex-1 truncate ${
                    chosenCategory === 'hard' ? 'text-danger' : 'text-warning'
                  }`}>
                    {limit.name}
                  </span>
                  <span className={`text-[9px] font-label uppercase tracking-widest px-1.5 py-0.5 rounded border flex-shrink-0 ${
                    chosenCategory === 'hard'
                      ? 'text-danger border-danger/30 bg-danger/10'
                      : 'text-warning border-warning/30 bg-warning/10'
                  }`}>
                    {chosenCategory}
                  </span>
                  <button
                    onClick={() => removeLimit(limit.id)}
                    disabled={isToggling}
                    className="flex-shrink-0 p-0.5 text-zinc-500 hover:text-foreground transition-colors disabled:opacity-50"
                    title="Remove limit"
                  >
                    {isToggling ? <Loader2 size={11} className="animate-spin" /> : <X size={12} />}
                  </button>
                </div>
              ) : isPicking ? (
                /* Picker — choose hard or soft */
                <div className="flex flex-col gap-1 p-2 bg-surface-container-high border border-outline-variant/20 rounded-lg">
                  <p className="text-[10px] text-muted font-headline truncate px-1">{limit.name}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => addLimit(limit.id, 'hard')}
                      disabled={!!toggling}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-danger/10 border border-danger/30 text-danger rounded text-[9px] font-headline font-bold tracking-widest uppercase hover:bg-danger/20 transition-colors disabled:opacity-50"
                    >
                      {isToggling ? <Loader2 size={10} className="animate-spin" /> : <ShieldAlert size={10} />}
                      Hard
                    </button>
                    <button
                      onClick={() => addLimit(limit.id, 'soft')}
                      disabled={!!toggling}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-warning/10 border border-warning/30 text-warning rounded text-[9px] font-headline font-bold tracking-widest uppercase hover:bg-warning/20 transition-colors disabled:opacity-50"
                    >
                      {isToggling ? <Loader2 size={10} className="animate-spin" /> : <Shield size={10} />}
                      Soft
                    </button>
                    <button
                      onClick={() => setPickingFor(null)}
                      className="px-1.5 py-1.5 text-zinc-600 hover:text-foreground transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Unselected — click to enter picker mode */
                <button
                  onClick={() => setPickingFor(limit.id)}
                  disabled={!!toggling}
                  title={limit.description}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant/10 bg-surface-container text-xs font-headline text-left text-muted hover:text-foreground hover:border-outline-variant/30 hover:bg-surface-container-high transition-colors truncate disabled:opacity-50"
                >
                  {limit.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Limit Form */}
      <div className="border-t border-outline-variant/10 pt-6 space-y-3">
        <h3 className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted">Add Custom Limit</h3>
        <input
          type="text"
          placeholder="Limit name (e.g. 'No Public Play')"
          value={customLimitName}
          onChange={(e) => setCustomLimitName(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/40 text-sm transition-colors"
        />
        <textarea
          placeholder="Description (optional)…"
          value={customLimitDescription}
          onChange={(e) => setCustomLimitDescription(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/40 text-xs transition-colors"
          rows={2}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setCustomLimitCategory('hard')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[10px] font-headline font-bold tracking-widest uppercase transition-colors ${
              customLimitCategory === 'hard'
                ? 'bg-danger/10 border-danger/30 text-danger'
                : 'border-outline-variant/10 text-muted hover:text-foreground'
            }`}
          >
            <ShieldAlert size={11} /> Hard
          </button>
          <button
            onClick={() => setCustomLimitCategory('soft')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[10px] font-headline font-bold tracking-widest uppercase transition-colors ${
              customLimitCategory === 'soft'
                ? 'bg-warning/10 border-warning/30 text-warning'
                : 'border-outline-variant/10 text-muted hover:text-foreground'
            }`}
          >
            <Shield size={11} /> Soft
          </button>
        </div>
        <button
          onClick={addCustomLimit}
          disabled={!customLimitName.trim() || addingCustom}
          className="w-full py-2 btn-gradient rounded-lg text-[10px] font-headline font-bold tracking-widest uppercase disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {addingCustom && <Loader2 size={11} className="animate-spin" />}
          Add Custom Limit
        </button>
      </div>

      {/* Info note */}
      <div className="bg-surface-container border border-outline-variant/10 rounded-xl p-4 flex gap-3">
        <AlertCircle size={14} className="text-primary flex-shrink-0 mt-0.5" />
        <div className="text-xs text-muted space-y-1 leading-relaxed">
          <p><span className="text-danger font-bold">Hard limits</span> are absolute — completely off the table. AI will never suggest anything near these.</p>
          <p><span className="text-warning font-bold">Soft limits</span> are caution zones — approached slowly and with care.</p>
          <p>Click any suggestion to assign it as hard or soft. You choose the category, not the library.</p>
        </div>
      </div>
    </div>
  );
}
