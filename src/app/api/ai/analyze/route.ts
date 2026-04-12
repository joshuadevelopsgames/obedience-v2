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
        { error: 'Only the mistress can access analysis' },
        { status: 403 }
      );
    }

    // Fetch comprehensive data
    const { data: slaveProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', pair.slave_id)
      .single();

    const { data: mistressProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', pair.mistress_id)
      .single();

    // Tasks (last 30)
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('title, category, status, difficulty, xp_reward, due_at')
      .eq('pair_id', pairId)
      .order('created_at', { ascending: false })
      .limit(30);

    // Mood history
    const { data: moodHistory } = await supabase
      .from('mood_checkins')
      .select('mood, created_at')
      .eq('pair_id', pairId)
      .eq('user_id', pair.slave_id)
      .order('created_at', { ascending: false })
      .limit(30);

    // Behavior log
    const { data: behaviorLog } = await supabase
      .from('behavior_log')
      .select('behavior_type, description, xp_change, created_at')
      .eq('pair_id', pairId)
      .order('created_at', { ascending: false })
      .limit(30);

    // Journal entries (last 10)
    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('prompt, content, created_at')
      .eq('pair_id', pairId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Streak data
    const streakCurrent = slaveProfile?.streak_current || 0;
    const streakBest = slaveProfile?.streak_best || 0;

    // Calculate task completion rate
    const totalTasks = tasksData?.length || 0;
    const completedTasks = tasksData?.filter(
      (t: any) => t.status === 'completed' || t.status === 'approved'
    ).length || 0;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Analyze mood trend
    const moodTrend =
      moodHistory && moodHistory.length > 0
        ? {
            current: moodHistory[0]?.mood,
            average: Math.round(
              moodHistory.reduce((sum: number, m: any) => sum + m.mood, 0) /
                moodHistory.length
            ),
            trend: calculateTrend(moodHistory),
          }
        : null;

    // Count behavior types
    const behaviorCounts = {
      positive: behaviorLog?.filter((b: any) => b.behavior_type === 'positive')
        .length || 0,
      negative: behaviorLog?.filter((b: any) => b.behavior_type === 'negative')
        .length || 0,
      neutral: behaviorLog?.filter((b: any) => b.behavior_type === 'neutral')
        .length || 0,
    };

    // Build context for Grok
    const analysisPrompt = `You are an experienced D/s relationship counselor analyzing the dynamic and progress of a submissive in a gamified task management system.

Submissive Profile:
- Level: ${slaveProfile?.level || 1}
- Current Streak: ${streakCurrent} days
- Best Streak: ${streakBest} days
- XP: ${slaveProfile?.xp || 0}

Dynamic Metrics:
- Task Completion Rate: ${completionRate}%
- Total Tasks Tracked: ${totalTasks}
- Mood Trend: ${moodTrend ? `Current: ${moodTrend.current}/5, Average: ${moodTrend.average}/5, Direction: ${moodTrend.trend}` : 'No mood data'}
- Recent Behavior: ${behaviorCounts.positive} positive, ${behaviorCounts.negative} negative, ${behaviorCounts.neutral} neutral actions

Mistress Tone Preference: ${mistressProfile?.tone_preference || 'nurturing'}

Recent Activities Summary:
${tasksData && tasksData.length > 0 ? `Recent tasks completed: ${tasksData.filter((t: any) => t.status === 'completed' || t.status === 'approved').map((t: any) => t.title).slice(0, 5).join(', ')}` : 'No recent completions'}

${journalEntries && journalEntries.length > 0 ? `Recent journal entries exist (${journalEntries.length})` : 'No journal entries'}

Analyze and provide insights on:
1. Overall dynamic health (score 1-10)
2. Mood trend analysis and patterns
3. Task completion patterns and areas for improvement
4. Behavioral patterns and growth areas
5. Recommendations for next focus areas
6. Streak performance and motivation indicators

Return ONLY a JSON object with this exact structure:
{
  "overall_health_score": 1-10,
  "mood_trend": "improving|stable|declining",
  "mood_analysis": "Brief analysis of mood patterns",
  "task_completion_rate": ${completionRate},
  "completion_analysis": "Analysis of task completion patterns",
  "behavioral_patterns": "Analysis of positive/negative behavior patterns",
  "suggested_focus_areas": ["area1", "area2", "area3"],
  "streak_analysis": "Analysis of current and best streak",
  "dynamic_observations": "Observations about the overall D/s dynamic",
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}`;

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
            content: analysisPrompt,
          },
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });

    if (!grokResponse.ok) {
      const error = await grokResponse.text();
      console.error('xAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate analysis from xAI' },
        { status: 500 }
      );
    }

    const grokData = await grokResponse.json();
    let analysisData: any;

    try {
      const content = grokData.choices[0].message.content;
      analysisData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse xAI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Log to ai_generations (analysis is not stored, just returned)
    const admin = await createAdminClient();
    await admin.from('ai_generations').insert({
      pair_id: pairId,
      generation_type: 'analysis',
      prompt: analysisPrompt.substring(0, 1000),
      response: JSON.stringify(analysisData),
      model: XAI_MODEL,
      tokens_used: grokData.usage?.total_tokens || 0,
    });

    return NextResponse.json({
      analysis: analysisData,
      metadata: {
        analyzed_at: new Date().toISOString(),
        data_points: {
          tasks_analyzed: totalTasks,
          mood_entries: moodHistory?.length || 0,
          behavior_entries: behaviorLog?.length || 0,
          journal_entries: journalEntries?.length || 0,
        },
      },
    });
  } catch (error) {
    console.error('Error generating analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateTrend(
  moodHistory: any[]
): 'improving' | 'stable' | 'declining' {
  if (!moodHistory || moodHistory.length < 2) {
    return 'stable';
  }

  // Compare first half average to second half average
  const midpoint = Math.floor(moodHistory.length / 2);
  const recentHalf = moodHistory.slice(0, midpoint);
  const olderHalf = moodHistory.slice(midpoint);

  const recentAvg =
    recentHalf.reduce((sum: number, m: any) => sum + m.mood, 0) /
    recentHalf.length;
  const olderAvg =
    olderHalf.reduce((sum: number, m: any) => sum + m.mood, 0) /
    olderHalf.length;

  const difference = recentAvg - olderAvg;

  if (difference > 0.5) {
    return 'improving';
  } else if (difference < -0.5) {
    return 'declining';
  } else {
    return 'stable';
  }
}
