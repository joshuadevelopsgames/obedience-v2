import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || 'grok-3';
const XAI_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

// POST /api/rewards/generate
// Returns 5 reward ideas based on the pair's kinks — does NOT save anything.
export async function POST(req: Request) {
  try {
    const { pairId } = await req.json();

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

    const [{ data: slaveProfile }, { data: mistressKinks }, { data: slaveKinks }] = await Promise.all([
      admin.from('profiles').select('collar_name, display_name, level').eq('id', pair.slave_id).single(),
      admin.from('profile_kinks').select('kinks_library(name, category)').eq('pair_id', pairId).eq('profile_id', user.id),
      admin.from('profile_kinks').select('kinks_library(name, category)').eq('pair_id', pairId).eq('profile_id', pair.slave_id),
    ]);

    const sharedKinks = [
      ...(mistressKinks || []).map((k: any) => k.kinks_library?.name),
      ...(slaveKinks || []).map((k: any) => k.kinks_library?.name),
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

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

    const prompt = `You are generating reward ideas for a D/s dynamic. The submissive is named "${slaveName}" (Level ${slaveProfile?.level || 1}).

Shared kinks/interests: ${sharedKinks.length > 0 ? sharedKinks.join(', ') : 'not specified'}

Generate exactly 5 reward ideas the Mistress could offer for purchase with XP. Rewards should feel special, earned, and dynamic-appropriate — mix privileges, experiences, and indulgences. They should be things a submissive would genuinely want to spend XP on.

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
