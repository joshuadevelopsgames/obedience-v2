import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/contracts/create
// Saves a contract and marks it as signed by the mistress.
// Slave will need to sign separately.
export async function POST(req: Request) {
  try {
    const { pairId, content } = await req.json();
    // content: { expectations, rules, hard_limits, soft_limits, curiosities }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify caller is the mistress for this pair
    const { data: pair } = await supabase
      .from('pairs')
      .select('*')
      .eq('id', pairId)
      .eq('mistress_id', user.id)
      .single();
    if (!pair) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    // Cancel any existing unsigned contracts for this pair
    await supabase
      .from('contracts')
      .update({ mistress_signed: false, slave_signed: false })
      .eq('pair_id', pairId)
      .eq('mistress_signed', false)
      .eq('slave_signed', false);

    // Get next version number
    const { count } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('pair_id', pairId);

    const version = (count ?? 0) + 1;

    // Calculate next review date (3 months from now)
    const nextReview = new Date();
    nextReview.setMonth(nextReview.getMonth() + 3);

    const { data: contract, error } = await supabase
      .from('contracts')
      .insert({
        pair_id: pairId,
        version,
        content,
        mistress_signed: true, // Mistress signs on creation
        slave_signed: false,
        next_review: nextReview.toISOString(),
        review_interval: 'quarterly',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ contract });
  } catch (err: any) {
    console.error('Create contract error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
