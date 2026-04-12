import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || 'grok-3';
const XAI_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

export async function POST(req: Request) {
  try {
    const { pairId, taskId, reason } = await req.json();

    if (!pairId) {
      return NextResponse.json(
        { error: 'pairId is required' },
        { status: 400 }
      );
    }

    // Auth check: get current user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get pair and verify mistress
    const { data: pair, error: pairError } = await supabase
      .from('pairs')
      .select('*')
      .eq('id', pairId)
      .single();

    if (pairError || !pair) {
      return NextResponse.json(
        { error: 'Pair not found' },
        { status: 404 }
      );
    }

    if (pair.mistress_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the mistress can generate punishments' },
        { status: 403 }
      );
    }

    // Check safe word state - punishments not allowed on yellow or red
    if (pair.safe_word_state === 'yellow' || pair.safe_word_state === 'red') {
      return NextResponse.json(
        { error: 'Punishments are paused — safe word is active' },
        { status: 403 }
      );
    }

    // Fetch context data
    const { data: slaveProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', pair.slave_id)
      .single();

    const { data: mistressProfile } = await supabase
      .from('profiles')
      .select('tone_preference')
      .eq('id', pair.mistress_id)
      .single();

    const { data: limits } = await supabase
      .from('limits')
      .select('limit_text, category')
      .eq('pair_id', pairId)
      .eq('user_id', pair.slave_id);

    const { data: recentBehavior } = await supabase
      .from('behavior_log')
      .select('behavior_type, description')
      .eq('pair_id', pairId)
      .eq('user_id', pair.slave_id)
      .order('created_at', { ascending: false })
      .limit(5);

    let taskContext = '';
    if (taskId) {
      const { data: task } = await supabase
        .from('tasks')
        .select('title, status')
        .eq('id', taskId)
        .single();

      if (task) {
        taskContext = `\nPunishment reason: Failed task "${task.title}" (status: ${task.status})\n`;
      }
    }

    // Build prompt
    const hardLimits = limits
      ?.filter((l: any) => l.category === 'hard')
      .map((l: any) => l.limit_text)
      .join(', ') || 'None specified';

    const softLimits = limits
      ?.filter((l: any) => l.category === 'soft')
      .map((l: any) => l.limit_text)
      .join(', ') || 'None specified';

    const recentBehaviorText =
      recentBehavior && recentBehavior.length > 0
        ? recentBehavior.map((b: any) => `- ${b.behavior_type}: ${b.description}`).join('\n')
        : 'No recent behavior logged';

    const tonePreference = mistressProfile?.tone_preference || 'nurturing';

    let prompt = `You are a dominant mistress designing punishments for your submissive slave in a gamified D/s relationship management app.

Submissive's Profile:
- Level: ${slaveProfile?.level || 1}
- Current Streak: ${slaveProfile?.streak_current || 0} days

Tone: ${tonePreference}
Hard Limits (NEVER include these in punishments): ${hardLimits}
Soft Limits (be very cautious): ${softLimits}

Recent Behavior:
${recentBehaviorText}

${taskContext}${reason ? `Additional Context: ${reason}\n` : ''}

Generate 2-3 punishment suggestions that:
1. ABSOLUTELY RESPECT hard limits - never suggest anything involving hard limits
2. Consider soft limits carefully - can suggest if appropriate
3. Match the mistress's ${tonePreference} tone
4. Are proportionate and constructive
5. Include both mental and physical elements when appropriate
6. Vary in severity (1-5 scale)

Return ONLY a JSON array with this exact structure:
[
  {
    "title": "Punishment Name",
    "description": "Detailed description of the punishment",
    "severity": 1-5
  }
]`;

    // Call xAI API
    const grokResponse = await fetch(XAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });

    if (!grokResponse.ok) {
      const error = await grokResponse.text();
      console.error('xAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate punishments from xAI' },
        { status: 500 }
      );
    }

    const grokData = await grokResponse.json();
    let punishmentsData: any[] = [];

    try {
      const content = grokData.choices[0].message.content;
      punishmentsData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse xAI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    if (!Array.isArray(punishmentsData)) {
      punishmentsData = [punishmentsData];
    }

    // Insert punishments using admin client
    const admin = await createAdminClient();
    const punishmentsToInsert = punishmentsData.map((punishment: any) => ({
      pair_id: pairId,
      task_id: taskId || null,
      title: punishment.title,
      description: punishment.description,
      severity: punishment.severity,
      status: 'suggested',
      ai_generated: true,
    }));

    const { data: insertedPunishments, error: insertError } = await admin
      .from('punishments')
      .insert(punishmentsToInsert)
      .select();

    if (insertError) {
      console.error('Failed to insert punishments:', insertError);
      return NextResponse.json(
        { error: 'Failed to save punishments' },
        { status: 500 }
      );
    }

    // Log to ai_generations
    await admin.from('ai_generations').insert({
      pair_id: pairId,
      generation_type: 'punishment',
      prompt: prompt.substring(0, 1000),
      response: JSON.stringify(punishmentsData),
      model: XAI_MODEL,
      tokens_used: grokData.usage?.total_tokens || 0,
    });

    return NextResponse.json({
      punishments: insertedPunishments || punishmentsData,
    });
  } catch (error) {
    console.error('Error generating punishments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
