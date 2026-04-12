import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || 'grok-3';
const XAI_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

export async function POST(req: Request) {
  try {
    const { demandId } = await req.json();

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch the demand - either the slave or mistress can trigger expiry
    const { data: demand } = await supabase
      .from('photo_demands')
      .select('*')
      .eq('id', demandId)
      .or(`slave_id.eq.${user.id},mistress_id.eq.${user.id}`)
      .single();

    if (!demand) return NextResponse.json({ error: 'Demand not found' }, { status: 404 });
    if (demand.status !== 'pending') return NextResponse.json({ error: 'Demand already resolved' }, { status: 400 });

    // Mark as expired
    await supabase.from('photo_demands').update({ status: 'expired' }).eq('id', demandId);

    // Use admin client for full context
    const admin = createAdminClient();

    // ── Fast path: mistress pre-approved a punishment preset ────────────────
    if (demand.punishment_preset) {
      const preset = demand.punishment_preset as {
        title: string;
        description: string;
        category?: string;
        difficulty?: number;
        xp_reward?: number;
        proof_type?: string;
        duration_minutes?: number;
      };

      const { data: punishment } = await admin.from('tasks').insert({
        pair_id: demand.pair_id,
        assigned_to: demand.slave_id,
        assigned_by: demand.mistress_id,
        title: preset.title,
        description: preset.description,
        category: preset.category || 'obedience',
        difficulty: preset.difficulty ?? 3,
        xp_reward: 0,
        proof_type: preset.proof_type || 'photo',
        duration_minutes: preset.duration_minutes ?? 15,
        is_punishment: true,
        status: 'assigned',
      }).select().single();

      if (punishment) {
        await admin.from('photo_demands')
          .update({ auto_punishment_issued: true, punishment_id: punishment.id })
          .eq('id', demandId);
      }

      return NextResponse.json({ success: true, punishment });
    }
    // ── Slow path: call Grok to generate punishment ─────────────────────────

    if (!XAI_API_KEY) return NextResponse.json({ success: true, punishment: null });

    const { data: pair } = await admin.from('pairs').select('*').eq('id', demand.pair_id).single();
    const { data: slaveProfile } = await admin.from('profiles').select('*').eq('id', demand.slave_id).single();
    const { data: mistressProfile } = await admin.from('profiles').select('tone_preference').eq('id', demand.mistress_id).single();
    const { data: limits } = await admin.from('limits').select('description, category').eq('pair_id', demand.pair_id).eq('user_id', demand.slave_id);

    const hardLimits = limits?.filter((l: any) => l.category === 'hard').map((l: any) => l.description).join(', ') || 'None specified';
    const softLimits = limits?.filter((l: any) => l.category === 'soft').map((l: any) => l.description).join(', ') || 'None specified';

    const toneMap: Record<string, string> = {
      strict: 'dominant, cold, and commanding',
      nurturing: 'firm but warm',
      playful: 'teasing and playful',
      cold: 'ice-cold and detached',
    };
    const tone = toneMap[mistressProfile?.tone_preference || 'strict'];

    const prompt = `You are a Mistress generating a punishment for your slave who FAILED to send a photo within ${Math.round(demand.window_seconds / 60)} minutes when demanded.

Demand issued: "${demand.prompt}"

Slave profile:
- Name: ${slaveProfile?.collar_name || slaveProfile?.display_name || 'slave'}
- Level: ${slaveProfile?.level || 1}

Tone: ${tone}
Hard Limits (NEVER include): ${hardLimits}
Soft Limits (be cautious): ${softLimits}

Generate 1 punishment task for this disobedience. The punishment should directly reference the failure to send a photo on demand.

Respond ONLY with valid JSON in this exact format:
{
  "title": "Short punishment title",
  "description": "2-3 sentence punishment description referencing the photo failure",
  "category": "obedience",
  "difficulty": 3,
  "xp_reward": 0,
  "proof_type": "photo",
  "duration_minutes": 15
}`;

    const aiResponse = await fetch(XAI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${XAI_API_KEY}` },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) return NextResponse.json({ success: true, punishment: null });

    const aiData = await aiResponse.json();
    const punishmentData = JSON.parse(aiData.choices[0].message.content);

    // Create the punishment task
    const { data: punishment } = await admin.from('tasks').insert({
      pair_id: demand.pair_id,
      assigned_to: demand.slave_id,
      assigned_by: demand.mistress_id,
      title: punishmentData.title,
      description: punishmentData.description,
      category: punishmentData.category || 'obedience',
      difficulty: punishmentData.difficulty || 3,
      xp_reward: 0,
      proof_type: punishmentData.proof_type || 'photo',
      duration_minutes: punishmentData.duration_minutes || 15,
      is_punishment: true,
      status: 'assigned',
    }).select().single();

    // Link punishment to the demand
    if (punishment) {
      await admin.from('photo_demands')
        .update({ auto_punishment_issued: true, punishment_id: punishment.id })
        .eq('id', demandId);
    }

    return NextResponse.json({ success: true, punishment });
  } catch (err: any) {
    console.error('Expire demand error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
