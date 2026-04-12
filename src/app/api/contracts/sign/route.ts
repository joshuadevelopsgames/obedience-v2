import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/contracts/sign
// Called by the slave to countersign the contract.
export async function POST(req: Request) {
  try {
    const { contractId } = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch contract and verify slave is in this pair
    const { data: contract } = await supabase
      .from('contracts')
      .select('*, pairs!inner(slave_id)')
      .eq('id', contractId)
      .single();

    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    if ((contract as any).pairs.slave_id !== user.id) {
      return NextResponse.json({ error: 'Only the slave can countersign' }, { status: 403 });
    }

    const { error } = await supabase
      .from('contracts')
      .update({ slave_signed: true, signed_at: new Date().toISOString() })
      .eq('id', contractId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Sign contract error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
