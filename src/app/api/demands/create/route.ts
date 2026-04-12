import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { pairId, slaveId, prompt, windowSeconds = 300 } = await req.json();

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify caller is the mistress for this pair
    const { data: pair } = await supabase
      .from('pairs')
      .select('*')
      .eq('id', pairId)
      .eq('mistress_id', user.id)
      .single();
    if (!pair) return NextResponse.json({ error: 'Pair not found or unauthorized' }, { status: 403 });

    // Cancel any existing pending demand for this pair (only one active at a time)
    await supabase
      .from('photo_demands')
      .update({ status: 'cancelled' })
      .eq('pair_id', pairId)
      .eq('status', 'pending');

    const expiresAt = new Date(Date.now() + windowSeconds * 1000).toISOString();

    const { data: demand, error: insertError } = await supabase
      .from('photo_demands')
      .insert({
        pair_id: pairId,
        mistress_id: user.id,
        slave_id: slaveId,
        prompt: prompt || 'Send me a photo now',
        window_seconds: windowSeconds,
        expires_at: expiresAt,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ demand });
  } catch (err: any) {
    console.error('Create demand error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
