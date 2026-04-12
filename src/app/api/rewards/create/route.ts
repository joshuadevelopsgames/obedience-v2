import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/rewards/create
// Creates one or more rewards for a pair. Only the mistress of the pair may call this.
export async function POST(req: Request) {
  try {
    const { pairId, rewards, aiGenerated = false } = await req.json();

    if (!pairId || !Array.isArray(rewards) || rewards.length === 0) {
      return NextResponse.json({ error: 'pairId and rewards[] required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify caller is mistress for this pair
    const { data: pair } = await supabase
      .from('pairs')
      .select('id')
      .eq('id', pairId)
      .eq('mistress_id', user.id)
      .single();
    if (!pair) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const rows = rewards.map((r: { title: string; description?: string; xp_cost: number }) => ({
      pair_id: pairId,
      title: r.title,
      description: r.description || null,
      xp_cost: r.xp_cost,
      available: true,
      ai_generated: aiGenerated,
    }));

    const { data, error } = await supabase.from('rewards').insert(rows).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ rewards: data });
  } catch (err: any) {
    console.error('Create rewards error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
