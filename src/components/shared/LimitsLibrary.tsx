'use client';

import { useState, useMemo } from 'react';
import { Sparkles, AlertCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Limit {
  id: string;
  name: string;
  description: string;
  category: 'hard' | 'soft';
  is_custom: boolean;
  created_by: string | null;
}

interface LimitsLibraryProps {
  profileId: string;
  pairId: string;
  allLimits: Limit[];
  selectedLimitIds: string[];
  selectedKinkIds: string[];
  allKinksByName: Record<string, string>; // Map of kink name to kink id
}

type CategoryType = 'all' | 'hard' | 'soft';

export default function LimitsLibrary({
  profileId,
  pairId,
  allLimits,
  selectedLimitIds,
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
  const [hoveredLimit, setHoveredLimit] = useState<string | null>(null);

  // Filter limits by search and category
  const filteredLimits = useMemo(() => {
    return allLimits.filter((limit) => {
      const matchesSearch =
        limit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        limit.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || limit.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allLimits, searchTerm, selectedCategory]);

  // Group limits by category for counting
  const limitsByCategory = useMemo(() => {
    return {
      hard: allLimits.filter((l) => l.category === 'hard'),
      soft: allLimits.filter((l) => l.category === 'soft'),
    };
  }, [allLimits]);

  const toggleLimit = async (limitId: string, isSelected: boolean) => {
    setIsLoading(true);
    try {
      const limit = allLimits.find((l) => l.id === limitId);
      if (!limit) return;

      if (isSelected) {
        // Removing limit - can optionally re-add kink
        await supabase
          .from('profile_limits')
          .delete()
          .eq('profile_id', profileId)
          .eq('limit_id', limitId)
          .eq('pair_id', pairId);
      } else {
        // Adding limit - need to sync: remove corresponding kink if it exists
        await supabase
          .from('profile_limits')
          .insert({
            profile_id: profileId,
            limit_id: limitId,
            pair_id: pairId,
          });

        // Check if there's a matching kink and remove it
        const matchingKinkId = allKinksByName[limit.name];
        if (matchingKinkId && selectedKinkIds.includes(matchingKinkId)) {
          await supabase
            .from('profile_kinks')
            .delete()
            .eq('profile_id', profileId)
            .eq('kink_id', matchingKinkId);
        }
      }

      // Trigger a refresh by reloading the page or updating parent state
      window.location.reload();
    } catch (error) {
      console.error('Error toggling limit:', error);
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

      // Add to profile_limits
      await supabase.from('profile_limits').insert({
        profile_id: profileId,
        limit_id: limitData.id,
        pair_id: pairId,
      });

      // Clear form and reload
      setCustomLimitName('');
      setCustomLimitDescription('');
      setCustomLimitCategory('soft');
      window.location.reload();
    } catch (error) {
      console.error('Error adding custom limit:', error);
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
          placeholder="Search limits by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-surface-container border border-outline-variant text-label placeholder-outline-variant focus:outline-none focus:border-primary"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-label"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'hard', 'soft'] as CategoryType[]).map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 rounded-full text-label text-sm font-label transition ${
              selectedCategory === category
                ? 'bg-primary text-surface-high'
                : 'bg-surface-container border border-outline-variant hover:bg-surface-high'
            }`}
          >
            {category === 'all' ? 'All' : category === 'hard' ? '⚠ Hard' : 'Soft'}
            {category !== 'all' && ` (${(category === 'hard' ? limitsByCategory.hard : limitsByCategory.soft).length})`}
          </button>
        ))}
      </div>

      {/* Limits Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {filteredLimits.map((limit) => {
          const isSelected = selectedLimitIds.includes(limit.id);
          const isHardLimit = limit.category === 'hard';

          return (
            <div key={limit.id} className="relative">
              <button
                onClick={() => toggleLimit(limit.id, isSelected)}
                onMouseEnter={() => setHoveredLimit(limit.id)}
                onMouseLeave={() => setHoveredLimit(null)}
                disabled={isLoading}
                className={`w-full px-3 py-2 rounded-lg text-label text-xs font-label transition whitespace-nowrap overflow-hidden text-ellipsis ${
                  isSelected
                    ? isHardLimit
                      ? 'bg-error text-surface-high'
                      : 'bg-warning text-surface-high'
                    : 'bg-surface-container border border-outline-variant hover:bg-surface-high'
                }`}
              >
                {isHardLimit && !isSelected && '⚠ '}
                {limit.name}
              </button>

              {/* Tooltip */}
              {hoveredLimit === limit.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-surface-high border border-outline-variant rounded-lg p-3 shadow-lg z-50">
                  <div className="flex items-start gap-2 mb-2">
                    <p className="font-label text-label text-sm font-semibold flex-1">{limit.name}</p>
                    {isHardLimit && <AlertCircle size={14} className="text-error flex-shrink-0 mt-0.5" />}
                  </div>
                  <p className="text-label text-xs opacity-75 mb-2">{limit.description}</p>
                  <div className="flex gap-2 text-xs">
                    <span className={`px-2 py-1 rounded ${isHardLimit ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'}`}>
                      {isHardLimit ? 'Hard Limit' : 'Soft Limit'}
                    </span>
                    {limit.is_custom && <span className="px-2 py-1 rounded bg-primary/20 text-primary">Custom</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Limit Form */}
      <div className="border-t border-outline-variant pt-6 space-y-4">
        <h3 className="text-label text-xs font-label uppercase tracking-wider opacity-75">Add Custom Limit</h3>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Limit name (e.g., 'No Public Play')"
            value={customLimitName}
            onChange={(e) => setCustomLimitName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-surface-container border border-outline-variant text-label placeholder-outline-variant focus:outline-none focus:border-primary"
          />

          <textarea
            placeholder="Description of this limit..."
            value={customLimitDescription}
            onChange={(e) => setCustomLimitDescription(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-surface-container border border-outline-variant text-label placeholder-outline-variant focus:outline-none focus:border-primary text-xs"
            rows={2}
          />

          <select
            value={customLimitCategory}
            onChange={(e) => setCustomLimitCategory(e.target.value as 'hard' | 'soft')}
            className="w-full px-4 py-2 rounded-lg bg-surface-container border border-outline-variant text-label focus:outline-none focus:border-primary"
          >
            <option value="soft">Soft Limit (Go Slow)</option>
            <option value="hard">Hard Limit (Off Table)</option>
          </select>

          <button
            onClick={addCustomLimit}
            disabled={!customLimitName.trim() || isLoading}
            className="w-full px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-surface-high rounded-lg font-label text-sm transition"
          >
            Add Custom Limit
          </button>
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-surface-container border border-outline-variant rounded-lg p-4 space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-primary flex-shrink-0 mt-0.5" />
          <div className="text-label text-xs space-y-1">
            <p className="font-label">
              <strong>⚠ Hard Limits</strong> are absolute boundaries — off the table entirely.
            </p>
            <p className="opacity-75">
              <strong>Soft Limits</strong> are areas to approach with care and communication.
            </p>
            <p className="opacity-75 mt-2">
              When you set a limit, any matching kink is automatically removed from your profile to avoid conflicts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
