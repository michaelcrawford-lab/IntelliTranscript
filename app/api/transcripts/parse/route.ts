import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseTranscript, chunkSegments, resolveSpeakers } from '@/lib/utils/transcript-parser'

export async function POST(request: Request) {
  try {
    const { mediaFileId, eventId, content, format } = await request.json()

    if (!mediaFileId || !eventId || !content || !format) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['srt', 'vtt', 'txt'].includes(format)) {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

    const segments = parseTranscript(content, format as 'srt' | 'vtt' | 'txt')

    if (segments.length === 0) {
      return NextResponse.json({ error: 'No segments parsed from file' }, { status: 422 })
    }

    const supabase = await createAdminClient()

    // Resolve speaker names → IDs (creates missing speakers)
    const speakerMap = await resolveSpeakers(segments, eventId, supabase)

    // Batch insert segments
    const BATCH = 500
    for (let i = 0; i < segments.length; i += BATCH) {
      const batch = segments.slice(i, i + BATCH).map((seg) => ({
        event_id: eventId,
        media_file_id: mediaFileId,
        start_time_seconds: seg.start_time_seconds,
        end_time_seconds: seg.end_time_seconds,
        transcript_text: seg.transcript_text,
        speaker_id: seg.speaker_name ? (speakerMap.get(seg.speaker_name) ?? null) : null,
        reviewed_status: 'pending' as const,
      }))

      const { error } = await supabase.from('transcript_segments').insert(batch)
      if (error) throw error
    }

    // Create RAG chunks (include speaker names for context)
    const chunks = chunkSegments(segments, 10)
    const chunkRows = chunks.map((c) => ({
      event_id: eventId,
      media_file_id: mediaFileId,
      chunk_text: c.chunk_text,
      start_time_seconds: c.start_time_seconds,
      end_time_seconds: c.end_time_seconds,
      speaker_names: c.speaker_names,
    }))

    for (let i = 0; i < chunkRows.length; i += BATCH) {
      const { error } = await supabase.from('transcript_chunks').insert(chunkRows.slice(i, i + BATCH))
      if (error) throw error
    }

    return NextResponse.json({
      segments: segments.length,
      chunks: chunks.length,
      speakers: speakerMap.size,
    })
  } catch (err) {
    console.error('Parse error:', err)
    return NextResponse.json(
      { error: (err as Error).message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
