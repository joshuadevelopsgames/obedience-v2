-- ============================================
-- PHOTO DEMANDS
-- ============================================

create type photo_demand_status as enum ('pending', 'fulfilled', 'expired', 'cancelled');

create table photo_demands (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid not null references pairs(id) on delete cascade,
  mistress_id uuid not null references profiles(id) on delete cascade,
  slave_id uuid not null references profiles(id) on delete cascade,
  prompt text not null default 'Send me a photo now',
  window_seconds integer not null default 300,
  expires_at timestamptz not null,
  status photo_demand_status not null default 'pending',
  punishment_preset jsonb,
  photo_url text,
  caption text,
  fulfilled_at timestamptz,
  auto_punishment_issued boolean default false,
  punishment_id uuid references tasks(id) on delete set null,
  created_at timestamptz default now()
);

create index idx_photo_demands_pair_id on photo_demands(pair_id);
create index idx_photo_demands_slave_id on photo_demands(slave_id);
create index idx_photo_demands_status on photo_demands(status);

alter table photo_demands enable row level security;

-- Mistress can create demands for their own pairs
create policy "Mistress can create demands"
  on photo_demands for insert
  with check (
    auth.uid() = mistress_id
    and exists (
      select 1 from pairs
      where pairs.id = pair_id
      and pairs.mistress_id = auth.uid()
    )
  );

-- Both pair members can view demands
create policy "Pair members can view demands"
  on photo_demands for select
  using (
    auth.uid() = mistress_id or auth.uid() = slave_id
  );

-- Both pair members can update demands (slave fulfills, either side expires/cancels)
create policy "Pair members can update demands"
  on photo_demands for update
  using (
    auth.uid() = mistress_id or auth.uid() = slave_id
  );
