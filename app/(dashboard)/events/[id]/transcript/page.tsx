import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TranscriptViewer } from '@/components/transcript/TranscriptViewer'

export default async function TranscriptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mediaId?: string; q?: string }>
}) {
  const { id } = await params
  const { mediaId, q } = await searchParams

  const supabase = await createClient()

  const [eventRes, segmentsRes, mediaRes] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase
      .from('transcript_segments')
      .select('*, speakers(id, full_name, role), events(title), media_files(title, youtube_video_id, source_url, source_type)')
      .eq('event_id', id)
      .eq(mediaId ? 'media_file_id' : 'event_id', mediaId ?? id)
      .order('start_time_seconds', { ascending: true })
      .limit(2000),
    mediaId
      ? supabase.from('media_files').select('*').eq('id', mediaId).single()
      : Promise.resolve({ data: null }),
  ])

  if (!eventRes.data) notFound()

  return (
    <TranscriptViewer
      event={eventRes.data}
      segments={segmentsRes.data ?? []}
      mediaFile={mediaRes.data}
      initialSearch={q}
    />
  )
}
