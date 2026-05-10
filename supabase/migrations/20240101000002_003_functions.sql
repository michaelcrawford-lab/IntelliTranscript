-- ============================================================
-- VECTOR SEARCH: match_chunks
-- Returns transcript chunks ordered by cosine similarity
-- ============================================================
create or replace function public.match_chunks(
  query_embedding vector(384),
  match_threshold float default 0.5,
  match_count int default 8,
  filter_event uuid default null
)
returns table (
  id uuid,
  chunk_text text,
  event_id uuid,
  media_file_id uuid,
  start_time_seconds float,
  end_time_seconds float,
  speaker_names text[],
  similarity float
)
language plpgsql as $$
begin
  return query
  select
    tc.id,
    tc.chunk_text,
    tc.event_id,
    tc.media_file_id,
    tc.start_time_seconds,
    tc.end_time_seconds,
    tc.speaker_names,
    1 - (tc.embedding <=> query_embedding) as similarity
  from public.transcript_chunks tc
  where
    (filter_event is null or tc.event_id = filter_event)
    and tc.embedding is not null
    and 1 - (tc.embedding <=> query_embedding) > match_threshold
  order by tc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ============================================================
-- FULL TEXT SEARCH: search_segments
-- Returns transcript segments matching a keyword query
-- ============================================================
create or replace function public.search_segments(
  search_query text,
  filter_event uuid default null,
  filter_speaker uuid default null,
  result_limit int default 50
)
returns table (
  id uuid,
  event_id uuid,
  media_file_id uuid,
  speaker_id uuid,
  start_time_seconds float,
  end_time_seconds float,
  transcript_text text,
  reviewed_status text,
  rank float
)
language plpgsql as $$
begin
  return query
  select
    ts.id,
    ts.event_id,
    ts.media_file_id,
    ts.speaker_id,
    ts.start_time_seconds,
    ts.end_time_seconds,
    ts.transcript_text,
    ts.reviewed_status,
    ts_rank(ts.fts, plainto_tsquery('english', search_query)) as rank
  from public.transcript_segments ts
  where
    ts.fts @@ plainto_tsquery('english', search_query)
    and (filter_event is null or ts.event_id = filter_event)
    and (filter_speaker is null or ts.speaker_id = filter_speaker)
  order by rank desc
  limit result_limit;
end;
$$;

-- ============================================================
-- DASHBOARD: get_dashboard_stats
-- Returns aggregate counts for the dashboard
-- ============================================================
create or replace function public.get_dashboard_stats()
returns json
language plpgsql security definer as $$
declare
  result json;
begin
  select json_build_object(
    'events_count', (select count(*) from public.events),
    'speakers_count', (select count(*) from public.speakers),
    'teams_count', (select count(*) from public.teams),
    'awards_count', (select count(*) from public.awards),
    'segments_count', (select count(*) from public.transcript_segments),
    'approved_segments', (select count(*) from public.transcript_segments where reviewed_status = 'approved'),
    'pending_segments', (select count(*) from public.transcript_segments where reviewed_status = 'pending'),
    'media_files_count', (select count(*) from public.media_files)
  ) into result;
  return result;
end;
$$;
