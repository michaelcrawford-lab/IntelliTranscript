export interface ParsedSegment {
  start_time_seconds: number
  end_time_seconds: number
  transcript_text: string
  speaker_name?: string  // extracted from [Speaker] prefix or "Name: " pattern
}

// Convert SRT timestamp (HH:MM:SS,mmm) to seconds
function srtTimeToSeconds(ts: string): number {
  const [time, ms] = ts.split(',')
  const [h, m, s] = time.split(':').map(Number)
  return h * 3600 + m * 60 + s + Number(ms) / 1000
}

// Convert VTT timestamp (HH:MM:SS.mmm or MM:SS.mmm) to seconds
function vttTimeToSeconds(ts: string): number {
  const parts = ts.split(':')
  if (parts.length === 3) {
    const [h, m, s] = parts.map(parseFloat)
    return h * 3600 + m * 60 + s
  }
  const [m, s] = parts.map(parseFloat)
  return m * 60 + s
}

// Extract speaker name from text lines like "[SPEAKER_00] text" or "John: text"
function extractSpeaker(text: string): { speaker_name?: string; clean_text: string } {
  // Pattern: [Speaker Name] text  (from diarization)
  const bracketMatch = text.match(/^\[([^\]]+)\]\s*(.+)$/)
  if (bracketMatch) {
    return { speaker_name: bracketMatch[1].trim(), clean_text: bracketMatch[2].trim() }
  }
  // Pattern: Speaker Name: text  (manual transcripts)
  const colonMatch = text.match(/^([A-Z][^:]{1,40}):\s+(.+)$/)
  if (colonMatch) {
    return { speaker_name: colonMatch[1].trim(), clean_text: colonMatch[2].trim() }
  }
  return { clean_text: text }
}

export function parseSRT(content: string): ParsedSegment[] {
  const segments: ParsedSegment[] = []
  const blocks = content.trim().split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    const timeLine = lines.find((l) => l.includes('-->'))
    if (!timeLine) continue

    const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim())
    const textLines = lines.slice(lines.indexOf(timeLine) + 1)
    const rawText = textLines.join(' ').replace(/<[^>]+>/g, '').trim()

    if (!rawText) continue

    const { speaker_name, clean_text } = extractSpeaker(rawText)

    segments.push({
      start_time_seconds: srtTimeToSeconds(startStr),
      end_time_seconds: srtTimeToSeconds(endStr),
      transcript_text: clean_text,
      speaker_name,
    })
  }

  return segments
}

export function parseVTT(content: string): ParsedSegment[] {
  const segments: ParsedSegment[] = []
  const body = content.replace(/^WEBVTT.*$/m, '').replace(/NOTE[\s\S]*?(?=\n\n)/g, '')
  const blocks = body.trim().split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.trim().split('\n').filter(Boolean)
    const timeLine = lines.find((l) => l.includes('-->'))
    if (!timeLine) continue

    const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim().split(' ')[0])
    const textLines = lines.slice(lines.indexOf(timeLine) + 1)
    const rawText = textLines.join(' ').replace(/<[^>]+>/g, '').trim()

    if (!rawText) continue

    const { speaker_name, clean_text } = extractSpeaker(rawText)

    segments.push({
      start_time_seconds: vttTimeToSeconds(startStr),
      end_time_seconds: vttTimeToSeconds(endStr),
      transcript_text: clean_text,
      speaker_name,
    })
  }

  return segments
}

export function parsePlainText(content: string): ParsedSegment[] {
  const lines = content.split('\n').filter((l) => l.trim())
  return lines.map((line, i) => {
    const { speaker_name, clean_text } = extractSpeaker(line.trim())
    return {
      start_time_seconds: i * 5,
      end_time_seconds: (i + 1) * 5,
      transcript_text: clean_text,
      speaker_name,
    }
  })
}

export function parseTranscript(
  content: string,
  format: 'srt' | 'vtt' | 'txt'
): ParsedSegment[] {
  switch (format) {
    case 'srt': return parseSRT(content)
    case 'vtt': return parseVTT(content)
    case 'txt': return parsePlainText(content)
  }
}

// Resolve speaker names → speaker IDs, creating records for new speakers
export async function resolveSpeakers(
  segments: ParsedSegment[],
  eventId: string,
  supabase: import('@supabase/supabase-js').SupabaseClient
): Promise<Map<string, string>> {
  const names = [...new Set(segments.map((s) => s.speaker_name).filter(Boolean))] as string[]
  const nameToId = new Map<string, string>()
  if (names.length === 0) return nameToId

  // Fetch existing speakers by name
  const { data: existing } = await supabase
    .from('speakers')
    .select('id, full_name')
    .in('full_name', names)

  for (const sp of existing ?? []) {
    nameToId.set(sp.full_name, sp.id)
  }

  // Create any missing speakers
  const missing = names.filter((n) => !nameToId.has(n))
  if (missing.length > 0) {
    const { data: created } = await supabase
      .from('speakers')
      .insert(missing.map((n) => ({ full_name: n })))
      .select('id, full_name')
    for (const sp of created ?? []) {
      nameToId.set(sp.full_name, sp.id)
    }
  }

  return nameToId
}

// Group segments into chunks of ~10 for RAG
export function chunkSegments(
  segments: ParsedSegment[],
  chunkSize = 10
): Array<{ chunk_text: string; start_time_seconds: number; end_time_seconds: number; speaker_names: string[] }> {
  const chunks = []
  for (let i = 0; i < segments.length; i += chunkSize) {
    const slice = segments.slice(i, i + chunkSize)
    const speaker_names = [...new Set(slice.map((s) => s.speaker_name).filter(Boolean))] as string[]
    chunks.push({
      chunk_text: slice
        .map((s) => (s.speaker_name ? `[${s.speaker_name}] ${s.transcript_text}` : s.transcript_text))
        .join(' '),
      start_time_seconds: slice[0].start_time_seconds,
      end_time_seconds: slice[slice.length - 1].end_time_seconds,
      speaker_names,
    })
  }
  return chunks
}

// Format seconds as HH:MM:SS or MM:SS
export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
