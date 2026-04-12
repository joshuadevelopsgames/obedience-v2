import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || 'grok-3';
const XAI_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

// POST /api/demands/preview-punishment
// Generates a punishment preview without saving anything.
// Called when mistress selects "Generate & Approve" mode before sending the demand.
export async function POST(req: Request) {
  try {
    const { pairId, slaveId, demandPrompt, windowSeconds = 300 } = await req.json();

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

    if (!XAI_API_KEY) {
      // Fallback when no Grok key
      return NextResponse.json({
        punishment: {
          title: 'Disobedience Punishment',
          description: `You failed to send a photo within the time limit. This is your punishment for ignoring your Mistress's demand.`,
          category: 'obedience',
          difficulty: 3,
          xp_reward: 0,
          proof_type: 'photo',
          duration_minutes: 15,
        },
      });
    }

    const admin = createAdminClient();
    const { data: slaveProfile } = await admin.from('profiles').select('collar_name, display_name, level').eq('id', slaveId).single();
    const { data: mistressProfile } = await admin.from('profiles').select('tone_preference').eq('id', user.id).single();
    const { data: limits } = await admin.from('profile_limits')
      .select('limit_id, limits_library(name, category)')
      .eq('pair_id', pairId)
      .eq('profile_id', slaveId);

    const hardLimits = limits
      ?.filter((l: any) => l.limits_library?.category === 'hard')
      .map((l: any) => l.limits_library?.name)
      .join(', ') || 'None specified';
    const softLimits = limits
      ?.filter((l: any) => l.limits_library?.category === 'soft')
      .map((l: any) => l.limits_library?.name)
      .join(', ') || 'None specified';

    const toneMap: Record<string, string> = {
      strict: 'dominant, cold, and commanding',
      nurturing: 'firm but warm',
      playful: 'teasing and playful',
      cold: 'ice-cold and detached',
    };
    const tone = toneMap[mistressProfile?.tone_preference || 'strict'];
    const slaveName = slaveProfile?.collar_name || slaveProfile?.display_name || 'slave';

    const prompt = `You are a Mistress generating a punishment for your slave who will be punished if they FAIL to send a photo within ${Math.round(windowSeconds / 60)} minutes.

Photo demand: "${demandPrompt}"

Slave: ${slaveName} (Level ${slaveProfile?.level || 1})
Tone: ${tone}
Hard Limits (NEVER include): ${hardLimits}
Soft Limits (be cautious): ${softLimits}

Generate 1 punishment task for this potential disobedience. The punishment should reference the failure to send a photo on demand.

Respond ONLY with valid JSON:
{
  "title": "Short punishment title (max 60 chars)",
  "description": "2-3 sentences referencing the photo failure and what they must do to atone",
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

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('Grok preview error:', errText);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const aiData = await aiResponse.json();
    const punishment = JSON.parse(aiData.choices[0].message.content);

    return NextResponse.json({ punishment });
  } catch (err: any) {
    console.error('Preview punishment error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
