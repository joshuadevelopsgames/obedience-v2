'use client';

import { useState, useMemo } from 'react';
import { AlertCircle, X, ShieldAlert, Shield } from 'lucide-react';
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
  selectedLimits: SelectedLimit[];        // replaces selectedLimitIds
  selectedKinkIds: string[];
  allKinksByName: Record<string, string>;
}

type CategoryType = 'all' | 'hard' | 'soft';

export default function LimitsLibrary({
  profileId,
  pairId,
  allLimits,
  selectedLimits,
  selectedKinkIds,
  allKinksByName,
}: LimitsLibraryProps) {
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [customLimitName, setCustomLimitName] = useState('');
  const [customLimitDescription, setCustomLimitDescription] = useState('');
  const [customLimitCategory, setCustomLimitCategory] = useState<'hard' | 'soft'>('soft');
  // Track which limit is in "picker" mode (choose hard vs soft)
  const [pickingFor, setPickingFor] = useState<string | null>(null);

  // Map for quick lookup: limitId → chosen category
  const selectedMap = useMemo(() => {
    const m: Record<string, 'hard' | 'soft'> = {};
    for (const sl of selectedLimits) m[sl.limit_id] = sl.category;
    return m;
  }, [selectedLimits]);

  const filteredLimits = useMemo(() => {
    return allLimits.filter((limit) => {
      const matchesSearch =
        limit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        limit.description.toLowerCase().includes(searchTerm.toLowerCase());
      const userCategory = selectedMap[limit.id];
      const effectiveCategory = userCategory ?? limit.category;
      const matchesCategory = selectedCategory === 'all' || effectiveCategory === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allLimits, searchTerm, selectedCategory, selectedMap]);

  const hardCount = selectedLimits.filter((l) => l.category === 'hard').length;
  const softCount = selectedLimits.filter((l) => l.category === 'soft').length;

  const removeLimit = async (limitId: string) => {
    setIsLoading(true);
    try {
      await supabase
        .from('profile_limits')
        .delete()
        .eq('profile_id', profileId)
        .eq('limit_id', limitId)
        .eq('pair_id', pairId);
      window.location.reload();
    } catch {
      toast.error('Failed to remove limit');
    } finally {
      setIsLoading(false);
    }
  };

  const addLimit = async (limitId: string, category: 'hard' | 'soft') => {
    setIsLoading(true);
    setPickingFor(null);
    try {
      const limit = allLimits.find((l) => l.id === limitId);
      await supabase.from('profile_limits').insert({
        profile_id: profileId,
        limit_id: limitId,
        pair_id: pairId,
        category,
      });

      // Remove matching kink if it conflicts
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
      window.location.reload();
    } catch {
      toast.error('Failed to add limit');
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomLimit = async () => {
    if (!customLimitName.trim()) return;
    setIsLoading(true);
    try {
      const { data: limitData, error: insertError } = await supabase
        .from('limits_library')
        .insert({
          name: customLimitName,
          description: customLimitDescription,
          category: customLimitCategory,
          is_custom: true,
          created_by: profileId,
        })
        .select()
        .single();

      if (insertError || !limitData) throw insertError;

      await supabase.from('profile_limits').insert({
        profile_id: profileId,
        limit_id: limitData.id,
        pair_id: pairId,
        category: customLimitCategory,
      });

      setCustomLimitName('');
      setCustomLimitDescription('');
      setCustomLimitCategory('soft');
      window.location.reload();
    } catch {
      toast.error('Failed to add custom limit');
    } finally {
      setIsLoading(false);
    }
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
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-headline font-bold tracking-widest uppercase transition-colors ${
              selectedCategory === cat
                ? cat === 'hard'
                  ? 'bg-danger/20 border border-danger/30 text-danger'
                  : cat === 'soft'
                  ? 'bg-warning/20 border border-warning/30 text-warning'
                  : 'bg-primary/10 border border-primary/20 text-primary'
                : 'bg-surface-container border border-outline-variant/10 text-muted hover:text-foreground'
            }`}
          >
            {cat === 'all' ? `All (${selectedLimits.length})` : cat === 'hard' ? `⚠ Hard (${hardCount})` : `Soft (${softCount})`}
          </button>
        ))}
      </div>

      {/* Limits Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filteredLimits.map((limit) => {
          const selectedCategory = selectedMap[limit.id];
          const isSelected = selectedCategory !== undefined;
          const isPicking = pickingFor === limit.id;

          return (
            <div key={limit.id} className="relative">
              {/* Selected state — show category badge + remove button */}
              {isSelected ? (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  selectedCategory === 'hard'
                    ? 'bg-danger/10 border-danger/30'
                    : 'bg-warning/10 border-warning/30'
                }`}>
                  {selectedCategory === 'hard'
                    ? <ShieldAlert size={12} className="text-danger flex-shrink-0" />
                    : <Shield size={12} className="text-warning flex-shrink-0" />
                  }
                  <span className={`text-xs font-headline font-bold flex-1 truncate ${
                    selectedCategory === 'hard' ? 'text-danger' : 'text-warning'
                  }`}>
                    {limit.name}
                  </span>
                  <span className={`text-[9px] font-label uppercase tracking-widest px-1.5 py-0.5 rounded border flex-shrink-0 ${
                    selectedCategory === 'hard'
                      ? 'text-danger border-danger/30 bg-danger/10'
                      : 'text-warning border-warning/30 bg-warning/10'
                  }`}>
                    {selectedCategory}
                  </span>
                  <button
                    onClick={() => removeLimit(limit.id)}
                    disabled={isLoading}
                    className="flex-shrink-0 p-0.5 text-zinc-500 hover:text-foreground transition-colors"
                    title="Remove limit"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : isPicking ? (
                /* Picker state — choose hard or soft */
                <div className="flex flex-col gap-1 p-2 bg-surface-container-high border border-outline-variant/20 rounded-lg">
                  <p className="text-[10px] text-muted font-headline truncate px-1">{limit.name}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => addLimit(limit.id, 'hard')}
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-danger/10 border border-danger/30 text-danger rounded text-[9px] font-headline font-bold tracking-widest uppercase hover:bg-danger/20 transition-colors"
                    >
                      <ShieldAlert size={10} />
                      Hard
                    </button>
                    <button
                      onClick={() => addLimit(limit.id, 'soft')}
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-warning/10 border border-warning/30 text-warning rounded text-[9px] font-headline font-bold tracking-widest uppercase hover:bg-warning/20 transition-colors"
                    >
                      <Shield size={10} />
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
                  disabled={isLoading}
                  title={limit.description}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant/10 bg-surface-container text-xs font-headline text-left text-muted hover:text-foreground hover:border-outline-variant/30 hover:bg-surface-container-high transition-colors truncate"
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
          disabled={!customLimitName.trim() || isLoading}
          className="w-full py-2 btn-gradient rounded-lg text-[10px] font-headline font-bold tracking-widest uppercase disabled:opacity-50"
        >
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
