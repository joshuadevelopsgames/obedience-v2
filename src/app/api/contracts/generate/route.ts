import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || 'grok-3';
const XAI_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

// POST /api/contracts/generate
// Drafts a contract based on pair context — does NOT save anything.
// Returns { expectations, rules, hard_limits, soft_limits, curiosities }
export async function POST(req: Request) {
  try {
    const { pairId } = await req.json();

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

    const admin = createAdminClient();

    // Pull pair context
    const [
      { data: mistress },
      { data: slave },
      { data: mistressLimits },
      { data: slaveLimits },
      { data: mistressKinks },
      { data: slaveKinks },
    ] = await Promise.all([
      admin.from('profiles').select('display_name, title, tone_preference').eq('id', user.id).single(),
      admin.from('profiles').select('display_name, collar_name, level').eq('id', pair.slave_id).single(),
      admin.from('profile_limits')
        .select('limits_library(name, category)')
        .eq('pair_id', pairId)
        .eq('profile_id', user.id),
      admin.from('profile_limits')
        .select('limits_library(name, category)')
        .eq('pair_id', pairId)
        .eq('profile_id', pair.slave_id),
      admin.from('profile_kinks')
        .select('kinks_library(name, category)')
        .eq('pair_id', pairId)
        .eq('profile_id', user.id),
      admin.from('profile_kinks')
        .select('kinks_library(name, category)')
        .eq('pair_id', pairId)
        .eq('profile_id', pair.slave_id),
    ]);

    const hardLimits = [
      ...(mistressLimits || []).filter((l: any) => l.limits_library?.category === 'hard').map((l: any) => l.limits_library?.name),
      ...(slaveLimits || []).filter((l: any) => l.limits_library?.category === 'hard').map((l: any) => l.limits_library?.name),
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i); // dedupe

    const softLimits = [
      ...(mistressLimits || []).filter((l: any) => l.limits_library?.category === 'soft').map((l: any) => l.limits_library?.name),
      ...(slaveLimits || []).filter((l: any) => l.limits_library?.category === 'soft').map((l: any) => l.limits_library?.name),
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

    const sharedKinks = [
      ...(mistressKinks || []).map((k: any) => k.kinks_library?.name),
      ...(slaveKinks || []).map((k: any) => k.kinks_library?.name),
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

    const toneMap: Record<string, string> = {
      strict: 'strict, commanding, formal',
      nurturing: 'warm, caring, nurturing',
      playful: 'playful, teasing, lighthearted',
      cold: 'cold, detached, minimal',
    };
    const tone = toneMap[mistress?.tone_preference || 'strict'];

    const mistressTitle = mistress?.title || 'Mistress';
    const mistressName = mistress?.display_name || 'the Mistress';
    const slaveName = slave?.collar_name || slave?.display_name || 'the Operative';

    if (!XAI_API_KEY) {
      // Fallback contract when no Grok key
      return NextResponse.json({
        contract: {
          expectations: `This contract establishes the terms of the dynamic between ${mistressName} and ${slaveName}. ${slaveName} agrees to serve with full obedience and devotion. ${mistressName} agrees to lead with intention and care for ${slaveName}'s wellbeing at all times.`,
          rules: [
            `${slaveName} must address ${mistressName} as "${mistressTitle}" at all times`,
            `${slaveName} must complete all assigned tasks within the specified timeframe`,
            `${slaveName} must check in daily with mood and status updates`,
            `${slaveName} must communicate openly if a limit is approaching`,
            `Safe words must be respected immediately without question`,
          ],
          hard_limits: hardLimits,
          soft_limits: softLimits,
          curiosities: sharedKinks.slice(0, 5),
        },
      });
    }

    const prompt = `You are drafting a D/s relationship contract between a Mistress and their submissive.
Write in a ${tone} tone.

Parties:
- Mistress: ${mistressName} (title: ${mistressTitle})
- Submissive: ${slaveName} (Level ${slave?.level || 1})

Shared interests/kinks: ${sharedKinks.length > 0 ? sharedKinks.join(', ') : 'not specified'}
Hard limits (NEVER allowed — must be in contract): ${hardLimits.length > 0 ? hardLimits.join(', ') : 'none specified'}
Soft limits (allowed with care): ${softLimits.length > 0 ? softLimits.join(', ') : 'none specified'}

Generate a contract draft. Keep it concise but meaningful — this is a real agreement between two people.

Respond ONLY with valid JSON:
{
  "expectations": "2-3 paragraph statement of mutual expectations and dynamic principles. Separate each paragraph with \\n\\n. Do NOT use bullet points or numbered lists.",
  "rules": ["rule 1", "rule 2", "rule 3", "rule 4", "rule 5"],
  "curiosities": ["thing 1 to explore", "thing 2 to explore", "thing 3 to explore"]
}

Rules should be 5-8 specific, actionable items.
Curiosities should be 3-5 things the pair could explore together (drawn from shared interests).
Do NOT include hard or soft limits in your output — those are handled separately.`;

    const aiResponse = await fetch(XAI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${XAI_API_KEY}` },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });

    const aiData = await aiResponse.json();
    const generated = JSON.parse(aiData.choices[0].message.content);

    return NextResponse.json({
      contract: {
        expectations: generated.expectations || '',
        rules: generated.rules || [],
        hard_limits: hardLimits,
        soft_limits: softLimits,
        curiosities: generated.curiosities || [],
      },
    });
  } catch (err: any) {
    console.error('Generate contract error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
