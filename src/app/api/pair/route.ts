import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { pairCode } = await req.json();
    if (!pairCode || pairCode.length !== 8) {
      return NextResponse.json({ error: 'Invalid pair code' }, { status: 400 });
    }

    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    // Get caller's profile
    const { data: myProfile } = await admin
      .from('profiles')
      .select('role, onboarded')
      .eq('id', user.id)
      .single();
    if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Find partner by pair code (first 8 chars of UUID, case-insensitive)
    const { data: allProfiles } = await admin
      .from('profiles')
      .select('id, role, display_name')
      .neq('id', user.id);

    const partner = allProfiles?.find(
      (p) => p.id.slice(0, 8).toUpperCase() === pairCode.toUpperCase()
    );

    if (!partner) return NextResponse.json({ error: 'No user found with that pair code' }, { status: 404 });
    if (partner.role === myProfile.role) {
      return NextResponse.json({ error: 'You need to pair with someone in a different role' }, { status: 400 });
    }

    // Check not already paired together
    const mistressId = myProfile.role === 'mistress' ? user.id : partner.id;
    const slaveId    = myProfile.role === 'slave'    ? user.id : partner.id;

    const { data: existing } = await admin
      .from('pairs')
      .select('id')
      .eq('mistress_id', mistressId)
      .eq('slave_id', slaveId)
      .single();
    if (existing) return NextResponse.json({ error: 'Already paired' }, { status: 409 });

    // Create pair
    const { error: pairError } = await admin.from('pairs').insert({
      mistress_id: mistressId,
      slave_id: slaveId,
    });
    if (pairError) throw pairError;

    // Mark both as onboarded
    await admin.from('profiles').update({ onboarded: true, paired_with: partner.id }).eq('id', user.id);
    await admin.from('profiles').update({ onboarded: true, paired_with: user.id }).eq('id', partner.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Pair error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
