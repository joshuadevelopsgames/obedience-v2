import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { demandId, photoUrl, caption } = await req.json();

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch the demand and verify slave ownership
    const { data: demand } = await supabase
      .from('photo_demands')
      .select('*')
      .eq('id', demandId)
      .eq('slave_id', user.id)
      .single();

    if (!demand) return NextResponse.json({ error: 'Demand not found' }, { status: 404 });
    if (demand.status !== 'pending') return NextResponse.json({ error: 'Demand is no longer active' }, { status: 400 });

    // Check if expired
    if (new Date(demand.expires_at) < new Date()) {
      await supabase.from('photo_demands').update({ status: 'expired' }).eq('id', demandId);
      return NextResponse.json({ error: 'Demand has expired' }, { status: 400 });
    }

    // Mark fulfilled
    const { error: updateError } = await supabase
      .from('photo_demands')
      .update({
        status: 'fulfilled',
        photo_url: photoUrl,
        caption: caption || null,
        fulfilled_at: new Date().toISOString(),
      })
      .eq('id', demandId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Fulfill demand error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
