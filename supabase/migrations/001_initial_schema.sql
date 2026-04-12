-- Taskflow Pro: Initial Database Schema
-- Run this in Supabase SQL Editor

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

create type user_role as enum ('mistress', 'slave');
create type tone_preference as enum ('strict', 'nurturing', 'playful', 'cold');
create type autopilot_mode as enum ('light', 'full', 'custom');
create type task_category as enum ('service', 'obedience', 'training', 'self_care', 'creative', 'endurance', 'protocol');
create type task_status as enum ('suggested', 'assigned', 'in_progress', 'proof_submitted', 'approved', 'rejected', 'completed', 'expired');
create type proof_type as enum ('photo', 'video', 'text', 'checkin', 'location');
create type proof_status as enum ('pending', 'approved', 'rejected');
create type pair_status as enum ('active', 'paused', 'ended');
create type safe_word_state as enum ('green', 'yellow', 'red');
create type redemption_status as enum ('pending', 'approved', 'fulfilled', 'denied');
create type punishment_status as enum ('suggested', 'assigned', 'in_progress', 'completed');
create type limit_category as enum ('hard', 'soft', 'curiosity');
create type ai_generation_type as enum ('task', 'punishment', 'reward', 'journal_prompt', 'ritual', 'aftercare', 'contract', 'analysis');
create type behavior_type as enum ('positive', 'negative', 'neutral');
create type permission_status as enum ('pending', 'approved', 'denied');
create type message_type as enum ('text', 'voice', 'image', 'system');
create type protocol_context as enum ('greeting', 'public', 'bedtime', 'punishment', 'custom');

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null,
  display_name text,
  collar_name text,
  title text,
  avatar_url text,
  banner_url text,
  tone_preference tone_preference default 'strict',
  level int default 1,
  xp int default 0,
  streak_current int default 0,
  streak_best int default 0,
  paired_with uuid references profiles(id),
  autopilot boolean default false,
  autopilot_mode autopilot_mode default 'light',
  onboarded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PAIRS (relationship links)
-- ============================================

create table pairs (
  id uuid primary key default uuid_generate_v4(),
  mistress_id uuid not null references profiles(id) on delete cascade,
  slave_id uuid not null references profiles(id) on delete cascade,
  status pair_status default 'active',
  safe_word_state safe_word_state default 'green',
  safe_word_at timestamptz,
  cooldown_until timestamptz,
  created_at timestamptz default now(),
  unique(mistress_id, slave_id)
);

-- ============================================
-- TASKS
-- ============================================

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  created_by uuid references profiles(id),
  assigned_to uuid references profiles(id),
  title text not null,
  description text,
  category task_category default 'obedience',
  difficulty int default 1 check (difficulty between 1 and 5),
  xp_reward int default 10,
  status task_status default 'suggested',
  proof_type proof_type default 'text',
  due_at timestamptz,
  ai_generated boolean default false,
  ai_context jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PROOFS
-- ============================================

create table proofs (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  submitted_by uuid not null references profiles(id),
  proof_type proof_type not null,
  content_url text,
  text_content text,
  status proof_status default 'pending',
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- REWARDS
-- ============================================

create table rewards (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  title text not null,
  description text,
  xp_cost int not null default 100,
  available boolean default true,
  ai_generated boolean default false,
  created_at timestamptz default now()
);

create table redemptions (
  id uuid primary key default uuid_generate_v4(),
  reward_id uuid not null references rewards(id) on delete cascade,
  redeemed_by uuid not null references profiles(id),
  status redemption_status default 'pending',
  created_at timestamptz default now()
);

-- ============================================
-- PUNISHMENTS
-- ============================================

create table punishments (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  task_id uuid references tasks(id),
  title text not null,
  description text,
  severity int default 1 check (severity between 1 and 5),
  status punishment_status default 'suggested',
  ai_generated boolean default false,
  aftercare_sent boolean default false,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- ============================================
-- RITUALS
-- ============================================

create table rituals (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  title text not null,
  description text,
  schedule text, -- 'daily:morning', 'daily:evening', 'weekly:monday'
  steps jsonb default '[]', -- [{order, instruction, duration_seconds, proof_required}]
  active boolean default true,
  ai_generated boolean default false,
  created_at timestamptz default now()
);

create table ritual_completions (
  id uuid primary key default uuid_generate_v4(),
  ritual_id uuid not null references rituals(id) on delete cascade,
  completed_by uuid not null references profiles(id),
  proof_url text,
  notes text,
  completed_at timestamptz default now()
);

-- ============================================
-- PROTOCOLS
-- ============================================

create table protocols (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  title text not null,
  context protocol_context default 'custom',
  rules jsonb default '[]', -- [{order, rule_text}]
  active boolean default true,
  time_based boolean default false,
  active_hours jsonb, -- {start: '22:00', end: '06:00'}
  created_at timestamptz default now()
);

-- ============================================
-- JOURNAL
-- ============================================

create table journal_entries (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  author_id uuid not null references profiles(id),
  prompt text,
  content text not null,
  is_private boolean default false,
  mistress_note text,
  mistress_emoji text,
  ai_generated_prompt boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- MOOD CHECK-INS
-- ============================================

create table mood_checkins (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  user_id uuid not null references profiles(id),
  mood int not null check (mood between 1 and 5),
  emoji text,
  note text,
  created_at timestamptz default now()
);

-- ============================================
-- MESSAGES
-- ============================================

create table messages (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  content text not null,
  message_type message_type default 'text',
  media_url text,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- CONTRACTS
-- ============================================

create table contracts (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  version int default 1,
  content jsonb not null default '{}', -- {hard_limits, soft_limits, curiosities, expectations, rules}
  mistress_signed boolean default false,
  slave_signed boolean default false,
  signed_at timestamptz,
  review_interval text default 'quarterly',
  next_review timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- LIMITS
-- ============================================

create table limits (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  user_id uuid not null references profiles(id),
  category limit_category not null,
  description text not null,
  created_at timestamptz default now()
);

-- ============================================
-- ACHIEVEMENTS
-- ============================================

create table achievements (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  description text,
  icon text,
  secret boolean default false,
  condition jsonb -- {type: 'streak', value: 7}
);

create table user_achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  unlocked_at timestamptz default now(),
  unique(user_id, achievement_id)
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null, -- discreet: "Task reminder"
  body text,
  data jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- AI GENERATION LOG
-- ============================================

create table ai_generations (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  type ai_generation_type not null,
  prompt_sent text,
  response jsonb,
  model text default 'grok-3',
  accepted boolean,
  created_at timestamptz default now()
);

-- ============================================
-- ASSESSMENTS
-- ============================================

create table assessments (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  assessed_by uuid not null references profiles(id),
  obedience int check (obedience between 1 and 10),
  effort int check (effort between 1 and 10),
  attitude int check (attitude between 1 and 10),
  growth int check (growth between 1 and 10),
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- BEHAVIOR LOG
-- ============================================

create table behavior_log (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  logged_by uuid not null references profiles(id),
  type behavior_type default 'neutral',
  description text not null,
  created_at timestamptz default now()
);

-- ============================================
-- PERMISSION REQUESTS
-- ============================================

create table permission_requests (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  requested_by uuid not null references profiles(id),
  permission text not null,
  status permission_status default 'pending',
  response_note text,
  created_at timestamptz default now(),
  responded_at timestamptz
);

-- ============================================
-- RULES
-- ============================================

create table rules (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  content text not null,
  sort_order int default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- CHECK-IN TEMPLATES & RESPONSES
-- ============================================

create table checkin_templates (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  schedule text default 'weekly',
  questions jsonb default '[]', -- [{for_role, question}]
  created_at timestamptz default now()
);

create table checkin_responses (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references checkin_templates(id) on delete cascade,
  pair_id uuid not null references pairs(id) on delete cascade,
  user_id uuid not null references profiles(id),
  answers jsonb not null default '{}',
  ai_summary text,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_tasks_pair_id on tasks(pair_id);
create index idx_tasks_status on tasks(status);
create index idx_tasks_assigned_to on tasks(assigned_to);
create index idx_proofs_task_id on proofs(task_id);
create index idx_proofs_status on proofs(status);
create index idx_messages_pair_id on messages(pair_id);
create index idx_messages_created_at on messages(pair_id, created_at desc);
create index idx_journal_pair_id on journal_entries(pair_id);
create index idx_mood_pair_id on mood_checkins(pair_id);
create index idx_mood_created_at on mood_checkins(user_id, created_at desc);
create index idx_notifications_user on notifications(user_id, read, created_at desc);
create index idx_ai_gen_pair on ai_generations(pair_id, created_at desc);
create index idx_ritual_completions on ritual_completions(ritual_id, completed_at desc);
create index idx_punishments_pair on punishments(pair_id, status);
create index idx_behavior_log_pair on behavior_log(pair_id, created_at desc);
create index idx_permission_requests_pair on permission_requests(pair_id, status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table pairs enable row level security;
alter table tasks enable row level security;
alter table proofs enable row level security;
alter table rewards enable row level security;
alter table redemptions enable row level security;
alter table punishments enable row level security;
alter table rituals enable row level security;
alter table ritual_completions enable row level security;
alter table protocols enable row level security;
alter table journal_entries enable row level security;
alter table mood_checkins enable row level security;
alter table messages enable row level security;
alter table contracts enable row level security;
alter table limits enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table notifications enable row level security;
alter table ai_generations enable row level security;
alter table assessments enable row level security;
alter table behavior_log enable row level security;
alter table permission_requests enable row level security;
alter table rules enable row level security;
alter table checkin_templates enable row level security;
alter table checkin_responses enable row level security;

-- Profiles: users can read/update their own profile and their partner's
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can view partner profile"
  on profiles for select using (
    id in (select paired_with from profiles where id = auth.uid())
  );

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Pairs: members can view their own pairs
create policy "Pair members can view"
  on pairs for select using (
    auth.uid() = mistress_id or auth.uid() = slave_id
  );

create policy "Pair members can update"
  on pairs for update using (
    auth.uid() = mistress_id or auth.uid() = slave_id
  );

create policy "Authenticated users can create pairs"
  on pairs for insert with check (
    auth.uid() = mistress_id or auth.uid() = slave_id
  );

-- Helper function: check if user belongs to a pair
create or replace function user_in_pair(p_pair_id uuid)
returns boolean as $$
  select exists (
    select 1 from pairs
    where id = p_pair_id
    and (mistress_id = auth.uid() or slave_id = auth.uid())
  );
$$ language sql security definer;

-- Tasks: pair members can view, mistress can manage
create policy "Pair members can view tasks"
  on tasks for select using (user_in_pair(pair_id));

create policy "Pair members can insert tasks"
  on tasks for insert with check (user_in_pair(pair_id));

create policy "Pair members can update tasks"
  on tasks for update using (user_in_pair(pair_id));

-- Proofs: pair members can view, sub can insert
create policy "Pair members can view proofs"
  on proofs for select using (
    task_id in (select id from tasks where user_in_pair(pair_id))
  );

create policy "Users can submit proofs"
  on proofs for insert with check (auth.uid() = submitted_by);

create policy "Pair members can update proofs"
  on proofs for update using (
    task_id in (select id from tasks where user_in_pair(pair_id))
  );

-- Generic pair-scoped policies for remaining tables
-- Rewards
create policy "Pair members can view rewards" on rewards for select using (user_in_pair(pair_id));
create policy "Pair members can manage rewards" on rewards for insert with check (user_in_pair(pair_id));
create policy "Pair members can update rewards" on rewards for update using (user_in_pair(pair_id));

-- Redemptions
create policy "Users can view own redemptions" on redemptions for select using (auth.uid() = redeemed_by);
create policy "Users can create redemptions" on redemptions for insert with check (auth.uid() = redeemed_by);
create policy "Pair can update redemptions" on redemptions for update using (
  reward_id in (select id from rewards where user_in_pair(pair_id))
);

-- Punishments
create policy "Pair view punishments" on punishments for select using (user_in_pair(pair_id));
create policy "Pair manage punishments" on punishments for insert with check (user_in_pair(pair_id));
create policy "Pair update punishments" on punishments for update using (user_in_pair(pair_id));

-- Rituals
create policy "Pair view rituals" on rituals for select using (user_in_pair(pair_id));
create policy "Pair manage rituals" on rituals for insert with check (user_in_pair(pair_id));
create policy "Pair update rituals" on rituals for update using (user_in_pair(pair_id));

-- Ritual Completions
create policy "Pair view ritual completions" on ritual_completions for select using (
  ritual_id in (select id from rituals where user_in_pair(pair_id))
);
create policy "Users complete rituals" on ritual_completions for insert with check (auth.uid() = completed_by);

-- Protocols
create policy "Pair view protocols" on protocols for select using (user_in_pair(pair_id));
create policy "Pair manage protocols" on protocols for insert with check (user_in_pair(pair_id));
create policy "Pair update protocols" on protocols for update using (user_in_pair(pair_id));

-- Journal Entries (with privacy)
create policy "Authors can view own entries" on journal_entries for select using (auth.uid() = author_id);
create policy "Mistress can view non-private entries" on journal_entries for select using (
  user_in_pair(pair_id) and (is_private = false or auth.uid() = author_id)
);
create policy "Users can write entries" on journal_entries for insert with check (auth.uid() = author_id);
create policy "Pair can update entries" on journal_entries for update using (user_in_pair(pair_id));

-- Mood Check-ins
create policy "Pair view moods" on mood_checkins for select using (user_in_pair(pair_id));
create policy "Users log moods" on mood_checkins for insert with check (auth.uid() = user_id);

-- Messages
create policy "Pair view messages" on messages for select using (user_in_pair(pair_id));
create policy "Pair send messages" on messages for insert with check (user_in_pair(pair_id) and auth.uid() = sender_id);
create policy "Pair update messages" on messages for update using (user_in_pair(pair_id));

-- Contracts
create policy "Pair view contracts" on contracts for select using (user_in_pair(pair_id));
create policy "Pair manage contracts" on contracts for insert with check (user_in_pair(pair_id));
create policy "Pair update contracts" on contracts for update using (user_in_pair(pair_id));

-- Limits
create policy "Pair view limits" on limits for select using (user_in_pair(pair_id));
create policy "Users manage own limits" on limits for insert with check (auth.uid() = user_id);
create policy "Users update own limits" on limits for update using (auth.uid() = user_id);
create policy "Users delete own limits" on limits for delete using (auth.uid() = user_id);

-- Achievements (public read)
create policy "Anyone can view achievements" on achievements for select using (true);

-- User Achievements
create policy "Users view own achievements" on user_achievements for select using (auth.uid() = user_id);
create policy "System grants achievements" on user_achievements for insert with check (auth.uid() = user_id);

-- Notifications
create policy "Users view own notifications" on notifications for select using (auth.uid() = user_id);
create policy "System creates notifications" on notifications for insert with check (auth.uid() = user_id);
create policy "Users update own notifications" on notifications for update using (auth.uid() = user_id);

-- AI Generations (mistress only)
create policy "Pair view ai generations" on ai_generations for select using (user_in_pair(pair_id));
create policy "System logs generations" on ai_generations for insert with check (user_in_pair(pair_id));

-- Assessments
create policy "Pair view assessments" on assessments for select using (user_in_pair(pair_id));
create policy "Users create assessments" on assessments for insert with check (auth.uid() = assessed_by);

-- Behavior Log
create policy "Pair view behavior" on behavior_log for select using (user_in_pair(pair_id));
create policy "Users log behavior" on behavior_log for insert with check (auth.uid() = logged_by);

-- Permission Requests
create policy "Pair view permissions" on permission_requests for select using (user_in_pair(pair_id));
create policy "Users request permissions" on permission_requests for insert with check (auth.uid() = requested_by);
create policy "Pair update permissions" on permission_requests for update using (user_in_pair(pair_id));

-- Rules
create policy "Pair view rules" on rules for select using (user_in_pair(pair_id));
create policy "Pair manage rules" on rules for insert with check (user_in_pair(pair_id));
create policy "Pair update rules" on rules for update using (user_in_pair(pair_id));

-- Check-in Templates
create policy "Pair view templates" on checkin_templates for select using (user_in_pair(pair_id));
create policy "Pair manage templates" on checkin_templates for insert with check (user_in_pair(pair_id));

-- Check-in Responses
create policy "Pair view responses" on checkin_responses for select using (user_in_pair(pair_id));
create policy "Users submit responses" on checkin_responses for insert with check (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, role, display_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'slave'),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger tasks_updated_at before update on tasks
  for each row execute function update_updated_at();

-- Grant XP on task completion
create or replace function grant_xp_on_task_complete()
returns trigger as $$
begin
  if new.status = 'completed' and old.status != 'completed' then
    update profiles
    set
      xp = xp + new.xp_reward,
      streak_current = streak_current + 1,
      streak_best = greatest(streak_best, streak_current + 1),
      level = greatest(1, floor(sqrt(xp + new.xp_reward) / 5)::int)
    where id = new.assigned_to;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_task_completed
  after update on tasks
  for each row execute function grant_xp_on_task_complete();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

insert into storage.buckets (id, name, public) values ('proofs', 'proofs', false);
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- Storage policies
create policy "Users can upload proofs"
  on storage.objects for insert
  with check (bucket_id = 'proofs' and auth.uid() is not null);

create policy "Pair members can view proofs"
  on storage.objects for select
  using (bucket_id = 'proofs' and auth.uid() is not null);

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid() is not null);

create policy "Users can update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid() is not null);

-- ============================================
-- REALTIME
-- ============================================

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table tasks;

-- ============================================
-- SEED: Default Achievements
-- ============================================

insert into achievements (slug, title, description, icon, secret, condition) values
  ('first_task', 'First Step', 'Completed your first task', '🎯', false, '{"type": "tasks_completed", "value": 1}'),
  ('streak_7', 'Week Warrior', '7-day completion streak', '🔥', false, '{"type": "streak", "value": 7}'),
  ('streak_30', 'Devoted Month', '30-day completion streak', '💎', false, '{"type": "streak", "value": 30}'),
  ('level_10', 'Initiate Complete', 'Reached level 10', '⭐', false, '{"type": "level", "value": 10}'),
  ('level_25', 'Devoted', 'Reached level 25', '🌟', false, '{"type": "level", "value": 25}'),
  ('level_50', 'Bound', 'Reached level 50', '💫', false, '{"type": "level", "value": 50}'),
  ('level_75', 'Surrendered', 'Reached level 75', '✨', false, '{"type": "level", "value": 75}'),
  ('level_100', 'Transcendent', 'Reached level 100', '👑', false, '{"type": "level", "value": 100}'),
  ('journal_7', 'Reflective', 'Wrote 7 journal entries', '📖', false, '{"type": "journal_count", "value": 7}'),
  ('journal_30', 'Deep Thinker', 'Wrote 30 journal entries', '📚', false, '{"type": "journal_count", "value": 30}'),
  ('perfect_week', 'Perfect Obedience', 'Completed all tasks in a week', '🏆', false, '{"type": "perfect_week", "value": 1}'),
  ('first_ritual', 'Ritualist', 'Completed your first ritual', '🕯️', false, '{"type": "rituals_completed", "value": 1}'),
  ('ritual_streak_7', 'Ritual Devotee', '7-day ritual streak', '🙏', false, '{"type": "ritual_streak", "value": 7}'),
  ('safe_word_used', 'Brave Voice', 'Used your safe word (courage is strength)', '🛡️', true, '{"type": "safe_word_used", "value": 1}'),
  ('hundred_tasks', 'Centurion', 'Completed 100 tasks', '💯', false, '{"type": "tasks_completed", "value": 100}');
