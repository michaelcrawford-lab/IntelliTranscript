export interface ParsedSegment {
  start_time_seconds: number
  end_time_seconds: number
  transcript_text: string
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

export function parseSRT(content: string): ParsedSegment[] {
  const segments: ParsedSegment[] = []
  const blocks = content.trim().split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    // Skip sequence number line
    const timeLine = lines.find((l) => l.includes('-->'))
    if (!timeLine) continue

    const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim())
    const textLines = lines.slice(lines.indexOf(timeLine) + 1)
    const text = textLines.join(' ').replace(/<[^>]+>/g, '').trim()

    if (!text) continue

    segments.push({
      start_time_seconds: srtTimeToSeconds(startStr),
      end_time_seconds: srtTimeToSeconds(endStr),
      transcript_text: text,
    })
  }

  return segments
}

export function parseVTT(content: string): ParsedSegment[] {
  const segments: ParsedSegment[] = []
  // Strip WEBVTT header and NOTE blocks
  const body = content.replace(/^WEBVTT.*$/m, '').replace(/NOTE[\s\S]*?(?=\n\n)/g, '')
  const blocks = body.trim().split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.trim().split('\n').filter(Boolean)
    const timeLine = lines.find((l) => l.includes('-->'))
    if (!timeLine) continue

    const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim().split(' ')[0])
    const textLines = lines.slice(lines.indexOf(timeLine) + 1)
    const text = textLines.join(' ').replace(/<[^>]+>/g, '').trim()

    if (!text) continue

    segments.push({
      start_time_seconds: vttTimeToSeconds(startStr),
      end_time_seconds: vttTimeToSeconds(endStr),
      transcript_text: text,
    })
  }

  return segments
}

export function parsePlainText(content: string): ParsedSegment[] {
  // Each line becomes a segment with estimated timestamps
  const lines = content.split('\n').filter((l) => l.trim())
  return lines.map((line, i) => ({
    start_time_seconds: i * 5,
    end_time_seconds: (i + 1) * 5,
    transcript_text: line.trim(),
  }))
}

export function parseTranscript(
  content: string,
  format: 'srt' | 'vtt' | 'txt'
): ParsedSegment[] {
  switch (format) {
    case 'srt':
      return parseSRT(content)
    case 'vtt':
      return parseVTT(content)
    case 'txt':
      return parsePlainText(content)
  }
}

// Group segments into chunks of ~10 for RAG
export function chunkSegments(
  segments: ParsedSegment[],
  chunkSize = 10
): Array<{ chunk_text: string; start_time_seconds: number; end_time_seconds: number }> {
  const chunks = []
  for (let i = 0; i < segments.length; i += chunkSize) {
    const slice = segments.slice(i, i + chunkSize)
    chunks.push({
      chunk_text: slice.map((s) => s.transcript_text).join(' '),
      start_time_seconds: slice[0].start_time_seconds,
      end_time_seconds: slice[slice.length - 1].end_time_seconds,
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
