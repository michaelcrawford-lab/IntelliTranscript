-- Enable required extensions
create extension if not exists vector;
create extension if not exists pg_trgm;

-- ============================================================
-- USERS (extended profile mirroring auth.users)
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer'
    check (role in ('super_admin', 'admin', 'editor', 'viewer', 'restricted')),
  organization text,
  created_at timestamptz default now()
);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- EVENTS
-- ============================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  event_date_start date,
  event_date_end date,
  event_type text default 'hackathon'
    check (event_type in ('hackathon', 'awards_ceremony', 'workshop', 'keynote', 'demo_day', 'judging')),
  description text,
  location text,
  platform text,
  cover_image_url text,
  status text default 'draft'
    check (status in ('draft', 'active', 'archived')),
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- ============================================================
-- MEDIA FILES
-- ============================================================
create table public.media_files (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  title text,
  file_type text,
  source_type text
    check (source_type in ('upload', 'youtube', 'google_drive', 'zoom')),
  source_url text,
  youtube_video_id text,
  duration_seconds int,
  processing_status text default 'pending'
    check (processing_status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz default now()
);

-- ============================================================
-- SPEAKERS
-- ============================================================
create table public.speakers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text,
  organization text,
  bio text,
  photo_url text,
  created_at timestamptz default now()
);

-- ============================================================
-- SESSIONS (agenda blocks within an event)
-- ============================================================
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  title text not null,
  session_type text,
  start_time text,
  end_time text,
  description text
);

-- ============================================================
-- TRANSCRIPT SEGMENTS (one row per caption/utterance)
-- ============================================================
create table public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  media_file_id uuid references public.media_files(id) on delete cascade,
  session_id uuid references public.sessions(id),
  speaker_id uuid references public.speakers(id),
  start_time_seconds float not null,
  end_time_seconds float,
  transcript_text text not null,
  confidence_score float,
  reviewed_status text default 'pending'
    check (reviewed_status in ('pending', 'reviewed', 'approved')),
  fts tsvector generated always as (to_tsvector('english', transcript_text)) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_transcript_segments_fts on public.transcript_segments using gin(fts);
create index idx_transcript_segments_event on public.transcript_segments(event_id);
create index idx_transcript_segments_speaker on public.transcript_segments(speaker_id);
create index idx_transcript_segments_start_time on public.transcript_segments(start_time_seconds);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_transcript_segments_updated_at
  before update on public.transcript_segments
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- TRANSCRIPT CHUNKS (larger blocks for RAG/vector search)
-- ============================================================
create table public.transcript_chunks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  media_file_id uuid references public.media_files(id) on delete cascade,
  chunk_text text not null,
  start_time_seconds float,
  end_time_seconds float,
  speaker_names text[],
  embedding vector(384),
  created_at timestamptz default now()
);

create index idx_transcript_chunks_event on public.transcript_chunks(event_id);
create index idx_transcript_chunks_embedding
  on public.transcript_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ============================================================
-- TEAMS
-- ============================================================
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  team_name text not null,
  project_name text,
  challenge_category text,
  project_summary text,
  technologies_used text[],
  final_rank int,
  created_at timestamptz default now()
);

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  full_name text not null,
  role text,
  email text
);

-- ============================================================
-- AWARDS
-- ============================================================
create table public.awards (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  award_category text not null,
  winner_type text
    check (winner_type in ('team', 'individual', 'organization')),
  winner_name text,
  team_id uuid references public.teams(id),
  prize_amount text,
  announcer_speaker_id uuid references public.speakers(id),
  announcement_timestamp float,
  acceptance_timestamp float,
  sponsor_name text,
  notes text,
  confirmed_status boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- SAVED QUOTES
-- ============================================================
create table public.saved_quotes (
  id uuid primary key default gen_random_uuid(),
  transcript_segment_id uuid references public.transcript_segments(id) on delete cascade,
  quote_text text not null,
  saved_by uuid references public.users(id),
  tag text,
  created_at timestamptz default now()
);

-- ============================================================
-- CHATBOT QUERIES (audit log)
-- ============================================================
create table public.chatbot_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  query_text text not null,
  response_text text,
  event_filter uuid references public.events(id),
  created_at timestamptz default now()
);

-- ============================================================
-- CORRECTION LOGS
-- ============================================================
create table public.correction_logs (
  id uuid primary key default gen_random_uuid(),
  transcript_segment_id uuid references public.transcript_segments(id) on delete cascade,
  edited_by uuid references public.users(id),
  old_text text,
  new_text text,
  old_speaker_id uuid references public.speakers(id),
  new_speaker_id uuid references public.speakers(id),
  edit_reason text,
  created_at timestamptz default now()
);
