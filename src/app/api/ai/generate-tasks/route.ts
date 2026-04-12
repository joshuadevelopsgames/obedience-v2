import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || 'grok-3';
const XAI_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

export async function POST(req: Request) {
  try {
    const { pairId } = await req.json();

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
        { error: 'Only the mistress can generate tasks' },
        { status: 403 }
      );
    }

    // Check safe word state
    if (pair.safe_word_state === 'red') {
      return NextResponse.json(
        { error: 'Tasks paused — safe word is active' },
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

    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('title, category, status')
      .eq('pair_id', pairId)
      .in('status', ['completed', 'approved'])
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: moodHistory } = await supabase
      .from('mood_checkins')
      .select('mood, created_at')
      .eq('pair_id', pairId)
      .eq('user_id', pair.slave_id)
      .gte(
        'created_at',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order('created_at', { ascending: false })
      .limit(7);

    const { data: limits } = await supabase
      .from('limits')
      .select('description, category')
      .eq('pair_id', pairId)
      .eq('user_id', pair.slave_id);

    // Calculate level bonus
    const levelBonus = slaveProfile?.level ? Math.floor(slaveProfile.level / 5) : 0;

    // Build prompt
    const hardLimits = limits
      ?.filter((l: any) => l.category === 'hard')
      .map((l: any) => l.description)
      .join(', ') || 'None specified';

    const softLimits = limits
      ?.filter((l: any) => l.category === 'soft')
      .map((l: any) => l.description)
      .join(', ') || 'None specified';

    const recentTaskNames = recentTasks?.map((t: any) => t.title).join(', ') || 'None yet';

    const avgMood = moodHistory && moodHistory.length > 0
      ? Math.round(moodHistory.reduce((sum: number, m: any) => sum + m.mood, 0) / moodHistory.length)
      : 3;

    const tonePreference = mistressProfile?.tone_preference || 'nurturing';

    let prompt = `You are a dominant mistress designing tasks for your submissive slave in a gamified D/s relationship management app.

Submissive's Profile:
- Level: ${slaveProfile?.level || 1}
- Current Streak: ${slaveProfile?.streak_current || 0} days
- Best Streak: ${slaveProfile?.streak_best || 0} days
- Recent Mood (1-5 scale): ${avgMood}

Tone: ${tonePreference}
Hard Limits (NEVER include these): ${hardLimits}
Soft Limits (be cautious): ${softLimits}
Recently Completed Tasks: ${recentTaskNames}

${pair.safe_word_state === 'yellow' ? 'IMPORTANT: Safe word is YELLOW. Generate only gentle, light tasks that are confidence-building and enjoyable.' : ''}

Generate 3-5 tasks that:
1. Avoid repeating recent tasks
2. Respect hard limits absolutely
3. Vary across categories: service, obedience, training, self_care, creative, endurance, protocol
4. Match the mistress's ${tonePreference} tone
5. Consider the submissive's current mood and level

Return ONLY a JSON array with this exact structure:
[
  {
    "title": "Task Title",
    "description": "Clear, engaging description",
    "category": "service|obedience|training|self_care|creative|endurance|protocol",
    "difficulty": 1-5,
    "xp_reward": ${levelBonus ? `${10 + levelBonus}` : '10'} + (difficulty * 10),
    "proof_type": "photo|text|checkin"
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
        { error: 'Failed to generate tasks from xAI' },
        { status: 500 }
      );
    }

    const grokData = await grokResponse.json();
    let tasksData: any[] = [];

    try {
      const content = grokData.choices[0].message.content;
      tasksData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse xAI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    if (!Array.isArray(tasksData)) {
      tasksData = [tasksData];
    }

    // Insert tasks using admin client
    const admin = await createAdminClient();
    const tasksToInsert = tasksData.map((task: any) => ({
      pair_id: pairId,
      created_by: user.id,
      assigned_to: pair.slave_id,
      title: task.title,
      description: task.description,
      category: task.category,
      difficulty: task.difficulty,
      xp_reward: task.xp_reward,
      proof_type: task.proof_type,
      status: 'suggested',
      ai_generated: true,
      ai_context: { generated_at: new Date().toISOString() },
    }));

    const { data: insertedTasks, error: insertError } = await admin
      .from('tasks')
      .insert(tasksToInsert)
      .select();

    if (insertError) {
      console.error('Failed to insert tasks:', insertError);
      return NextResponse.json(
        { error: 'Failed to save tasks' },
        { status: 500 }
      );
    }

    // Log to ai_generations
    await admin.from('ai_generations').insert({
      pair_id: pairId,
      type: 'task',
      prompt_sent: prompt.substring(0, 1000),
      response: tasksData,
      model: XAI_MODEL,
    });

    return NextResponse.json({
      tasks: insertedTasks || tasksData,
    });
  } catch (error) {
    console.error('Error generating tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
