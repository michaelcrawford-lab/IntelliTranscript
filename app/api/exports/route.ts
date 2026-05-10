import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { segmentsToCSV, segmentsToTXT, segmentsToSRT, awardsToCSV } from '@/lib/utils/export'
import type { TranscriptSegment, Award } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('event')
  const mediaId = searchParams.get('media')
  const format = searchParams.get('format') ?? 'txt'
  const type = searchParams.get('type') ?? 'transcript'

  if (!eventId) {
    return NextResponse.json({ error: 'event param required' }, { status: 400 })
  }

  const supabase = await createClient()

  if (type === 'awards') {
    const { data } = await supabase
      .from('awards')
      .select('*, events(title), teams(team_name)')
      .eq('event_id', eventId)

    const csv = awardsToCSV((data ?? []) as unknown as Award[])
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="awards-${eventId}.csv"`,
      },
    })
  }

  // Transcript export
  let query = supabase
    .from('transcript_segments')
    .select('*, speakers(id, full_name)')
    .eq('event_id', eventId)
    .order('start_time_seconds')

  if (mediaId) {
    query = query.eq('media_file_id', mediaId)
  }

  const { data: segments } = await query

  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: 'No segments found' }, { status: 404 })
  }

  let content: string
  let mimeType: string
  let ext: string

  switch (format) {
    case 'csv':
      content = segmentsToCSV(segments as unknown as TranscriptSegment[])
      mimeType = 'text/csv'
      ext = 'csv'
      break
    case 'srt':
      content = segmentsToSRT(segments as unknown as TranscriptSegment[])
      mimeType = 'text/plain'
      ext = 'srt'
      break
    default:
      content = segmentsToTXT(segments as unknown as TranscriptSegment[])
      mimeType = 'text/plain'
      ext = 'txt'
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="transcript-${eventId}.${ext}"`,
    },
  })
}
