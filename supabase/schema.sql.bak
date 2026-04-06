-- ============================================================
--  BINDER - Supabase Schema
--  Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ────────────────────────────────────────────────
create table if not exists profiles (
  id             uuid references auth.users on delete cascade primary key,
  name           text        not null,
  age            integer     not null check (age >= 18),
  bio            text        default '',
  gender         text        check (gender in ('man','woman','nonbinary','other')),
  interested_in  text[]      default array['man','woman','nonbinary','other'],
  min_age        integer     default 18,
  max_age        integer     default 99,
  photos         text[]      default '{}',
  location       text        default '',
  is_setup       boolean     default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ── SWIPES ──────────────────────────────────────────────────
create table if not exists swipes (
  id          uuid        default uuid_generate_v4() primary key,
  swiper_id   uuid        references profiles(id) on delete cascade not null,
  swiped_id   uuid        references profiles(id) on delete cascade not null,
  direction   text        check (direction in ('like','dislike')) not null,
  created_at  timestamptz default now(),
  unique(swiper_id, swiped_id)
);

-- ── MATCHES ─────────────────────────────────────────────────
create table if not exists matches (
  id          uuid        default uuid_generate_v4() primary key,
  user1_id    uuid        references profiles(id) on delete cascade not null,
  user2_id    uuid        references profiles(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique(user1_id, user2_id)
);

-- ── MESSAGES ────────────────────────────────────────────────
create table if not exists messages (
  id          uuid        default uuid_generate_v4() primary key,
  match_id    uuid        references matches(id) on delete cascade not null,
  sender_id   uuid        references profiles(id) on delete cascade not null,
  content     text        not null,
  read        boolean     default false,
  created_at  timestamptz default now()
);

-- ── UPDATED_AT TRIGGER ──────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- ── MATCH DETECTION FUNCTION ────────────────────────────────
-- Called after a 'like' swipe; creates a match if mutual
create or replace function check_and_create_match(p_swiper uuid, p_swiped uuid)
returns uuid as $$
declare
  v_match_id uuid;
begin
  -- Check if the other person already liked us
  if exists (
    select 1 from swipes
    where swiper_id = p_swiped
      and swiped_id = p_swiper
      and direction = 'like'
  ) then
    -- Create match (order IDs so unique constraint works)
    insert into matches (user1_id, user2_id)
    values (least(p_swiper, p_swiped), greatest(p_swiper, p_swiped))
    on conflict do nothing
    returning id into v_match_id;

    -- If conflict (match already existed), fetch it
    if v_match_id is null then
      select id into v_match_id from matches
      where user1_id = least(p_swiper, p_swiped)
        and user2_id = greatest(p_swiper, p_swiped);
    end if;

    return v_match_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- ── ROW LEVEL SECURITY ──────────────────────────────────────
alter table profiles  enable row level security;
alter table swipes    enable row level security;
alter table matches   enable row level security;
alter table messages  enable row level security;

-- Profiles
create policy "profiles_select_all"   on profiles for select using (true);
create policy "profiles_insert_own"   on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"   on profiles for update using (auth.uid() = id);
create policy "profiles_delete_own"   on profiles for delete using (auth.uid() = id);

-- Swipes
create policy "swipes_insert_own"     on swipes for insert with check (auth.uid() = swiper_id);
create policy "swipes_select_own"     on swipes for select  using (auth.uid() = swiper_id);

-- Matches
create policy "matches_select_member" on matches for select using (auth.uid() = user1_id or auth.uid() = user2_id);
create policy "matches_insert_any"    on matches for insert with check (true); -- controlled by function

-- Messages
create policy "messages_select_match_member" on messages for select using (
  exists (select 1 from matches m where m.id = match_id and (m.user1_id = auth.uid() or m.user2_id = auth.uid()))
);
create policy "messages_insert_match_member" on messages for insert with check (
  auth.uid() = sender_id and
  exists (select 1 from matches m where m.id = match_id and (m.user1_id = auth.uid() or m.user2_id = auth.uid()))
);
create policy "messages_update_match_member" on messages for update using (
  exists (select 1 from matches m where m.id = match_id and (m.user1_id = auth.uid() or m.user2_id = auth.uid()))
);

-- ── STORAGE ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict do nothing;

create policy "avatars_public_read"    on storage.objects for select  using (bucket_id = 'avatars');
create policy "avatars_auth_insert"    on storage.objects for insert  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "avatars_auth_update"    on storage.objects for update  using (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "avatars_auth_delete"    on storage.objects for delete  using (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- ── REALTIME ────────────────────────────────────────────────
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table matches;
