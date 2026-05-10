import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const eventId = searchParams.get('event') || null
  const speakerId = searchParams.get('speaker') || null
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], total: 0 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('search_segments', {
    search_query: q,
    filter_event: eventId,
    filter_speaker: speakerId,
    result_limit: limit,
  })

  if (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with speaker and event names
  const segmentIds = (data ?? []).map((r: Record<string, unknown>) => r.id)
  let enriched = data ?? []

  if (segmentIds.length > 0) {
    const { data: full } = await supabase
      .from('transcript_segments')
      .select('id, speaker_id, event_id, media_file_id, speakers(id, full_name, role), events(id, title, event_date_start), media_files(id, title, youtube_video_id)')
      .in('id', segmentIds)

    const map = new Map((full ?? []).map((r: Record<string, unknown>) => [r.id, r]))
    enriched = (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      ...(map.get(r.id as string) ?? {}),
    }))
  }

  return NextResponse.json({ results: enriched, total: enriched.length })
}
