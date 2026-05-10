-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.media_files enable row level security;
alter table public.speakers enable row level security;
alter table public.sessions enable row level security;
alter table public.transcript_segments enable row level security;
alter table public.transcript_chunks enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.awards enable row level security;
alter table public.saved_quotes enable row level security;
alter table public.chatbot_queries enable row level security;
alter table public.correction_logs enable row level security;

-- Helper function: get current user role
create or replace function public.current_user_role()
returns text language sql security definer stable as $$
  select role from public.users where id = auth.uid();
$$;

-- Helper function: is admin or above
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select role in ('super_admin', 'admin') from public.users where id = auth.uid();
$$;

-- Helper function: is editor or above
create or replace function public.is_editor()
returns boolean language sql security definer stable as $$
  select role in ('super_admin', 'admin', 'editor') from public.users where id = auth.uid();
$$;

-- ============================================================
-- USERS table
-- ============================================================
create policy "users: read own profile" on public.users
  for select using (id = auth.uid());

create policy "users: admins read all" on public.users
  for select using (public.is_admin());

create policy "users: update own profile" on public.users
  for update using (id = auth.uid());

create policy "users: admins manage all" on public.users
  for all using (public.is_admin());

-- ============================================================
-- EVENTS table
-- ============================================================
create policy "events: all authenticated can read active" on public.events
  for select using (
    auth.role() = 'authenticated'
    and (status = 'active' or public.is_editor())
  );

create policy "events: admins can write" on public.events
  for insert with check (public.is_admin());

create policy "events: admins can update" on public.events
  for update using (public.is_admin());

create policy "events: admins can delete" on public.events
  for delete using (public.is_admin());

-- ============================================================
-- MEDIA FILES
-- ============================================================
create policy "media_files: authenticated can read" on public.media_files
  for select using (auth.role() = 'authenticated');

create policy "media_files: editors can write" on public.media_files
  for all using (public.is_editor());

-- ============================================================
-- SPEAKERS
-- ============================================================
create policy "speakers: authenticated can read" on public.speakers
  for select using (auth.role() = 'authenticated');

create policy "speakers: editors can write" on public.speakers
  for all using (public.is_editor());

-- ============================================================
-- SESSIONS
-- ============================================================
create policy "sessions: authenticated can read" on public.sessions
  for select using (auth.role() = 'authenticated');

create policy "sessions: editors can write" on public.sessions
  for all using (public.is_editor());

-- ============================================================
-- TRANSCRIPT SEGMENTS
-- ============================================================
create policy "segments: viewers read approved" on public.transcript_segments
  for select using (
    auth.role() = 'authenticated'
    and (reviewed_status = 'approved' or public.is_editor())
  );

create policy "segments: editors can write" on public.transcript_segments
  for insert with check (public.is_editor());

create policy "segments: editors can update" on public.transcript_segments
  for update using (public.is_editor());

create policy "segments: admins can delete" on public.transcript_segments
  for delete using (public.is_admin());

-- ============================================================
-- TRANSCRIPT CHUNKS
-- ============================================================
create policy "chunks: authenticated can read" on public.transcript_chunks
  for select using (auth.role() = 'authenticated');

create policy "chunks: editors can write" on public.transcript_chunks
  for all using (public.is_editor());

-- ============================================================
-- TEAMS
-- ============================================================
create policy "teams: authenticated can read" on public.teams
  for select using (auth.role() = 'authenticated');

create policy "teams: editors can write" on public.teams
  for all using (public.is_editor());

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
create policy "team_members: authenticated can read" on public.team_members
  for select using (auth.role() = 'authenticated');

create policy "team_members: editors can write" on public.team_members
  for all using (public.is_editor());

-- ============================================================
-- AWARDS
-- ============================================================
create policy "awards: authenticated can read" on public.awards
  for select using (auth.role() = 'authenticated');

create policy "awards: editors can write" on public.awards
  for all using (public.is_editor());

-- ============================================================
-- SAVED QUOTES
-- ============================================================
create policy "saved_quotes: read own" on public.saved_quotes
  for select using (saved_by = auth.uid() or public.is_editor());

create policy "saved_quotes: authenticated can insert" on public.saved_quotes
  for insert with check (auth.role() = 'authenticated');

create policy "saved_quotes: delete own" on public.saved_quotes
  for delete using (saved_by = auth.uid() or public.is_admin());

-- ============================================================
-- CHATBOT QUERIES
-- ============================================================
create policy "chatbot_queries: read own" on public.chatbot_queries
  for select using (user_id = auth.uid() or public.is_admin());

create policy "chatbot_queries: authenticated can insert" on public.chatbot_queries
  for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- CORRECTION LOGS
-- ============================================================
create policy "correction_logs: editors can read" on public.correction_logs
  for select using (public.is_editor());

create policy "correction_logs: editors can insert" on public.correction_logs
  for insert with check (public.is_editor());
