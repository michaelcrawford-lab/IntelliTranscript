import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/server'
import { parseTranscript, chunkSegments } from '@/lib/utils/transcript-parser'

export const maxDuration = 300 // 5 min — long enough for large transcriptions

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function diarizedJsonToSrt(data: Record<string, unknown>): string {
  const segments = (data.segments as Array<{
    start?: number
    end?: number
    speaker?: string
    text?: string
  }>) ?? []

  return segments
    .map((seg, i) => {
      const start = toSrtTs(seg.start ?? 0)
      const end = toSrtTs(seg.end ?? (seg.start ?? 0) + 1)
      const prefix = seg.speaker ? `[${seg.speaker}] ` : ''
      return `${i + 1}\n${start} --> ${end}\n${prefix}${(seg.text ?? '').trim()}`
    })
    .join('\n\n')
}

function toSrtTs(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.round((s % 1) * 1000)
  return `${pad(h)}:${pad(m)}:${pad(sec)},${ms.toString().padStart(3, '0')}`
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const storagePath = formData.get('storagePath') as string | null
    const mediaFileId = formData.get('mediaFileId') as string | null
    const eventId = formData.get('eventId') as string | null
    const model = (formData.get('model') as string) || 'gpt-4o-transcribe-diarize'

    if (!storagePath || !mediaFileId || !eventId) {
      return NextResponse.json({ error: 'storagePath, mediaFileId, and eventId are required' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Download file from Supabase Storage (bypasses Vercel body size limit)
    const { data: blob, error: downloadErr } = await supabase.storage
      .from('audio-uploads')
      .download(storagePath)
    if (downloadErr) throw new Error(`Storage download failed: ${downloadErr.message}`)

    const fileName = storagePath.split('/').pop() || 'audio.mp3'
    const file = new File([blob], fileName, { type: blob.type || 'audio/mpeg' })

    // Clean up storage immediately after download
    await supabase.storage.from('audio-uploads').remove([storagePath])

    // Mark media file as processing
    await supabase.from('media_files').update({ processing_status: 'processing' }).eq('id', mediaFileId)

    let srtContent: string

    if (model === 'gpt-4o-transcribe-diarize') {
      const response = await (openai.audio.transcriptions.create as Function)({
        model,
        file,
        response_format: 'diarized_json',
      })
      srtContent = diarizedJsonToSrt(response as unknown as Record<string, unknown>)
    } else {
      const response = await openai.audio.transcriptions.create({
        model,
        file,
        response_format: 'srt',
      })
      srtContent = response as unknown as string
    }

    // Parse SRT into segments
    const segments = parseTranscript(srtContent, 'srt')
    const chunks = chunkSegments(segments)

    // Insert segments
    if (segments.length > 0) {
      const rows = segments.map((seg) => ({
        event_id: eventId,
        media_file_id: mediaFileId,
        start_time_seconds: seg.start_time_seconds,
        end_time_seconds: seg.end_time_seconds,
        transcript_text: seg.transcript_text,
        reviewed_status: 'pending' as const,
      }))

      const BATCH = 200
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error } = await supabase.from('transcript_segments').insert(rows.slice(i, i + BATCH))
        if (error) throw error
      }
    }

    // Insert chunks for RAG
    if (chunks.length > 0) {
      const chunkRows = chunks.map((c) => ({
        event_id: eventId,
        media_file_id: mediaFileId,
        chunk_text: c.chunk_text,
        start_time_seconds: c.start_time_seconds,
        end_time_seconds: c.end_time_seconds,
      }))
      await supabase.from('transcript_chunks').insert(chunkRows)
    }

    // Mark completed
    await supabase.from('media_files').update({ processing_status: 'completed' }).eq('id', mediaFileId)

    return NextResponse.json({ segments: segments.length, chunks: chunks.length })
  } catch (err) {
    console.error('[transcribe]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
