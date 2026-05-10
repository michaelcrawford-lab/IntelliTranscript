-- Create audio-uploads bucket for temporary transcription files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio-uploads',
  'audio-uploads',
  false,
  26214400, -- 25 MB
  array[
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/webm',
    'audio/x-m4a', 'audio/m4a', 'audio/ogg', 'audio/x-wav',
    'video/mp4', 'video/mpeg', 'video/webm'
  ]
)
on conflict (id) do nothing;

-- Allow authenticated users to upload into the temp/ prefix
create policy "auth users upload audio"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'audio-uploads' and (storage.foldername(name))[1] = 'temp');

-- Service role can do everything (used by API route to download + delete)
create policy "service role manages audio"
  on storage.objects for all
  to service_role
  using (bucket_id = 'audio-uploads');
