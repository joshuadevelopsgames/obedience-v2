import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || 'grok-3';
const XAI_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

type PromptType = 'journal' | 'ritual' | 'aftercare';

export async function POST(req: Request) {
  try {
    const { pairId, type } = await req.json();

    if (!pairId || !type) {
      return NextResponse.json(
        { error: 'pairId and type are required' },
        { status: 400 }
      );
    }

    if (!['journal', 'ritual', 'aftercare'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be journal, ritual, or aftercare' },
        { status: 400 }
      );
    }

    // Auth check: get current user (either role can use this)
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

    // Verify user is part of the pair
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

    if (pair.mistress_id !== user.id && pair.slave_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not part of this pair' },
        { status: 403 }
      );
    }

    // Fetch context data
    const { data: mistressProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', pair.mistress_id)
      .single();

    const { data: slaveProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', pair.slave_id)
      .single();

    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('title, category, status')
      .eq('pair_id', pairId)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: recentJournalEntries } = await supabase
      .from('journal_entries')
      .select('prompt, content')
      .eq('pair_id', pairId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentPunishments } = await supabase
      .from('punishments')
      .select('title, severity')
      .eq('pair_id', pairId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    const admin = await createAdminClient();
    let response: any;

    if (type === 'journal') {
      response = await generateJournalPrompts(
        supabase,
        admin,
        pairId,
        recentTasks || [],
        recentJournalEntries || [],
        slaveProfile,
        mistressProfile
      );
    } else if (type === 'ritual') {
      response = await generateRitual(
        supabase,
        admin,
        pairId,
        slaveProfile,
        mistressProfile,
        recentTasks || []
      );
    } else if (type === 'aftercare') {
      response = await generateAftercare(
        supabase,
        admin,
        pairId,
        slaveProfile,
        recentPunishments || [],
        mistressProfile
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating prompts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateJournalPrompts(
  supabase: any,
  admin: any,
  pairId: string,
  recentTasks: any[],
  recentJournalEntries: any[],
  slaveProfile: any,
  mistressProfile: any
) {
  const recentTaskSummary =
    recentTasks && recentTasks.length > 0
      ? recentTasks.map((t: any) => `${t.title} (${t.category})`).join(', ')
      : 'No recent tasks';

  const previousPrompts =
    recentJournalEntries && recentJournalEntries.length > 0
      ? recentJournalEntries.map((e: any) => e.prompt).join('; ')
      : 'None yet';

  const prompt = `You are creating reflective journal prompts for a submissive in a D/s relationship.

Submissive's Profile:
- Level: ${slaveProfile?.level || 1}
- Tone preference of mistress: ${mistressProfile?.tone_preference || 'nurturing'}

Recent activities: ${recentTaskSummary}
Previous prompts used: ${previousPrompts}

Generate 3 thoughtful, introspective journal prompts that:
1. Avoid repeating previous prompts
2. Encourage reflection on recent activities and emotions
3. Are appropriate for the submissive's current level
4. Vary in focus (behavior, emotions, growth, dynamics, goals)
5. Are open-ended and encourage deeper thinking

Return ONLY a JSON array with this exact structure:
[
  {
    "prompt": "The journal prompt text here"
  }
]`;

  const grokResponse = await fetch(XAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    }),
  });

  if (!grokResponse.ok) {
    throw new Error('Failed to generate journal prompts from xAI');
  }

  const grokData = await grokResponse.json();
  let promptsData: any[] = [];

  try {
    const content = grokData.choices[0].message.content;
    promptsData = JSON.parse(content);
  } catch (parseError) {
    throw new Error('Failed to parse AI response');
  }

  if (!Array.isArray(promptsData)) {
    promptsData = [promptsData];
  }

  // Log to ai_generations (prompts are returned to the UI, not inserted as entries yet)
  await admin.from('ai_generations').insert({
    pair_id: pairId,
    type: 'journal_prompt',
    prompt_sent: prompt.substring(0, 1000),
    response: promptsData,
    model: XAI_MODEL,
  });

  return { prompts: promptsData };
}

async function generateRitual(
  supabase: any,
  admin: any,
  pairId: string,
  slaveProfile: any,
  mistressProfile: any,
  recentTasks: any[]
) {
  const recentTaskCategories =
    recentTasks && recentTasks.length > 0
      ? [...new Set(recentTasks.map((t: any) => t.category))].join(', ')
      : 'general';

  const prompt = `You are creating a daily or weekly ritual for a submissive in a D/s relationship.

Submissive's Profile:
- Level: ${slaveProfile?.level || 1}
- Tone preference of mistress: ${mistressProfile?.tone_preference || 'nurturing'}

Recent task categories: ${recentTaskCategories}

Generate a ritual that:
1. Is practical and achievable daily or weekly
2. Reinforces the D/s dynamic
3. Includes 3-6 specific steps
4. Varies in duration (30 seconds to 10 minutes per step)
5. Some steps may require proof (photo, text, checkin)
6. Includes timing and clear instructions

Return ONLY a JSON object with this exact structure:
{
  "title": "Ritual Name",
  "description": "Brief description of the ritual",
  "schedule": "daily|weekly",
  "steps": [
    {
      "order": 1,
      "instruction": "What to do",
      "duration_seconds": 120,
      "proof_required": false|true
    }
  ]
}`;

  const grokResponse = await fetch(XAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    }),
  });

  if (!grokResponse.ok) {
    throw new Error('Failed to generate ritual from xAI');
  }

  const grokData = await grokResponse.json();
  let ritualData: any;

  try {
    const content = grokData.choices[0].message.content;
    ritualData = JSON.parse(content);
  } catch (parseError) {
    throw new Error('Failed to parse AI response');
  }

  // Insert ritual
  const { data: insertedRitual } = await admin
    .from('rituals')
    .insert({
      pair_id: pairId,
      title: ritualData.title,
      description: ritualData.description,
      schedule: ritualData.schedule,
      steps: ritualData.steps,
      active: true,
      ai_generated: true,
    })
    .select();

  // Log to ai_generations
  await admin.from('ai_generations').insert({
    pair_id: pairId,
    type: 'ritual',
    prompt_sent: prompt.substring(0, 1000),
    response: ritualData,
    model: XAI_MODEL,
  });

  return { ritual: insertedRitual?.[0] || ritualData };
}

async function generateAftercare(
  supabase: any,
  admin: any,
  pairId: string,
  slaveProfile: any,
  recentPunishments: any[],
  mistressProfile: any
) {
  const recentPunishmentInfo =
    recentPunishments && recentPunishments.length > 0
      ? `Recent punishments: ${recentPunishments.map((p: any) => `${p.title} (severity ${p.severity})`).join(', ')}`
      : 'No recent punishments';

  const prompt = `You are creating aftercare suggestions for a submissive following intense activities or punishments in a D/s relationship.

Submissive's Profile:
- Level: ${slaveProfile?.level || 1}
- Tone preference of mistress: ${mistressProfile?.tone_preference || 'nurturing'}

${recentPunishmentInfo}

Generate 3-5 thoughtful aftercare suggestions that:
1. Address both physical and emotional recovery
2. Include concrete, actionable steps
3. Consider the intensity level of recent activities
4. Range from immediate care to longer-term recovery
5. Include timing recommendations
6. Are personalized to their dynamic tone

Return ONLY a JSON array with this exact structure:
[
  {
    "title": "Aftercare Suggestion Name",
    "description": "Detailed description of the aftercare activity",
    "timing": "immediate|1-2 hours|ongoing",
    "category": "physical|emotional|comfort|reassurance"
  }
]`;

  const grokResponse = await fetch(XAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    }),
  });

  if (!grokResponse.ok) {
    throw new Error('Failed to generate aftercare from xAI');
  }

  const grokData = await grokResponse.json();
  let aftercareData: any[] = [];

  try {
    const content = grokData.choices[0].message.content;
    aftercareData = JSON.parse(content);
  } catch (parseError) {
    throw new Error('Failed to parse AI response');
  }

  if (!Array.isArray(aftercareData)) {
    aftercareData = [aftercareData];
  }

  // Log to ai_generations (aftercare is mostly for display, not stored in separate table)
  await admin.from('ai_generations').insert({
    pair_id: pairId,
    type: 'aftercare',
    prompt_sent: prompt.substring(0, 1000),
    response: aftercareData,
    model: XAI_MODEL,
  });

  return { aftercare: aftercareData };
}
