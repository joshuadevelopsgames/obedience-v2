import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || 'grok-3';
const XAI_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

// POST /api/rewards/generate
// Returns 5 reward ideas based on the pair's kinks, limits, and delivery mode — does NOT save anything.
export async function POST(req: Request) {
  try {
    const { pairId, deliveryMode = 'online' } = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only mistress for this pair
    const { data: pair } = await supabase
      .from('pairs')
      .select('*')
      .eq('id', pairId)
      .eq('mistress_id', user.id)
      .single();
    if (!pair) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const admin = createAdminClient();

    const [{ data: slaveProfile }, { data: mistressKinks }, { data: slaveKinks }, { data: slaveLimits }, { data: mistressLimits }] = await Promise.all([
      admin.from('profiles').select('collar_name, display_name, level').eq('id', pair.slave_id).single(),
      admin.from('profile_kinks').select('kinks_library(name, category)').eq('pair_id', pairId).eq('profile_id', user.id),
      admin.from('profile_kinks').select('kinks_library(name, category)').eq('pair_id', pairId).eq('profile_id', pair.slave_id),
      admin.from('profile_limits').select('limits_library(name, category)').eq('pair_id', pairId).eq('profile_id', pair.slave_id),
      admin.from('profile_limits').select('limits_library(name, category)').eq('pair_id', pairId).eq('profile_id', user.id),
    ]);

    const sharedKinks = [
      ...(mistressKinks || []).map((k: any) => k.kinks_library?.name),
      ...(slaveKinks || []).map((k: any) => k.kinks_library?.name),
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

    // Combine all limits from both parties — hard limits absolutely off-table, soft are cautions
    const allLimits = [
      ...(slaveLimits || []).map((l: any) => ({ name: l.limits_library?.name, category: l.limits_library?.category })),
      ...(mistressLimits || []).map((l: any) => ({ name: l.limits_library?.name, category: l.limits_library?.category })),
    ].filter((l) => l.name);

    const hardLimits = [...new Set(allLimits.filter((l) => l.category === 'hard').map((l) => l.name))];
    const softLimits = [...new Set(allLimits.filter((l) => l.category === 'soft').map((l) => l.name))];

    const slaveName = slaveProfile?.collar_name || slaveProfile?.display_name || 'the operative';

    // Fallback when no API key
    if (!XAI_API_KEY) {
      return NextResponse.json({
        rewards: [
          { title: 'Extended Free Time', description: 'One hour of unstructured time with no tasks or check-ins required.', xp_cost: 200 },
          { title: 'Praise Session', description: 'A dedicated session of affirmation and praise from your Mistress.', xp_cost: 150 },
          { title: 'Choose Tonight\'s Activity', description: 'Pick one allowed activity for the evening.', xp_cost: 300 },
          { title: 'Rest Day', description: 'A full day exempt from tasks and protocols.', xp_cost: 500 },
          { title: 'Special Treat', description: 'A treat or indulgence of your Mistress\'s choosing.', xp_cost: 250 },
        ],
      });
    }

    const isInPerson = deliveryMode === 'in_person';
    const deliveryContext = isInPerson
      ? 'Delivery mode: IN PERSON — rewards should involve real-world physical privileges, time together, or tangible experiences that can only happen when physically present (e.g. being held, special outings, physical touch, chosen activities together, cooking a meal together, etc.).'
      : 'Delivery mode: ONLINE — rewards must be things that can be granted or experienced remotely (e.g. extra free time, messages of praise, choosing a movie/playlist together remotely, relaxed check-in schedule, getting to skip a task, etc.).';

    const limitsContext = [
      hardLimits.length > 0 ? `HARD LIMITS (never suggest anything related to these): ${hardLimits.join(', ')}` : '',
      softLimits.length > 0 ? `Soft limits (proceed with great caution, do not feature prominently): ${softLimits.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const prompt = `You are generating reward ideas for a D/s dynamic. The submissive is named "${slaveName}" (Level ${slaveProfile?.level || 1}).

Shared kinks/interests: ${sharedKinks.length > 0 ? sharedKinks.join(', ') : 'not specified'}

${deliveryContext}

${limitsContext}

Generate exactly 5 reward ideas the Mistress could offer for purchase with XP. Rewards should feel special, earned, and dynamic-appropriate — mix privileges, experiences, and indulgences. They should be things a submissive would genuinely want to spend XP on. Ensure all rewards are appropriate for the delivery mode above.

Respond ONLY with valid JSON:
{
  "rewards": [
    { "title": "short title", "description": "1-2 sentence description", "xp_cost": number },
    ...
  ]
}

XP costs should range from 100–800 depending on how valuable/rare the reward is. Keep titles concise (3-5 words max).`;

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

    if (!aiResponse.ok) return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });

    const aiData = await aiResponse.json();
    const generated = JSON.parse(aiData.choices[0].message.content);

    return NextResponse.json({ rewards: generated.rewards || [] });
  } catch (err: any) {
    console.error('Generate rewards error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
