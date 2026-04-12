import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/rewards/toggle — toggle available flag
// DELETE /api/rewards/toggle — delete a reward
export async function PATCH(req: Request) {
  try {
    const { rewardId, available } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify ownership via pair join
    const { data: reward } = await supabase
      .from('rewards')
      .select('id, pair_id')
      .eq('id', rewardId)
      .single();
    if (!reward) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: pair } = await supabase
      .from('pairs')
      .select('id')
      .eq('id', reward.pair_id)
      .eq('mistress_id', user.id)
      .single();
    if (!pair) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    await supabase.from('rewards').update({ available }).eq('id', rewardId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { rewardId } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: reward } = await supabase
      .from('rewards')
      .select('id, pair_id')
      .eq('id', rewardId)
      .single();
    if (!reward) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: pair } = await supabase
      .from('pairs')
      .select('id')
      .eq('id', reward.pair_id)
      .eq('mistress_id', user.id)
      .single();
    if (!pair) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    await supabase.from('rewards').delete().eq('id', rewardId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
