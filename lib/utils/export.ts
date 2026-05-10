import type { TranscriptSegment, Award, Team } from '@/types'
import { formatTimestamp } from './transcript-parser'

export function segmentsToCSV(segments: TranscriptSegment[]): string {
  const header = 'timestamp_start,timestamp_end,speaker,text,reviewed_status'
  const rows = segments.map((s) => {
    const speaker = s.speaker?.full_name ?? ''
    const text = `"${s.transcript_text.replace(/"/g, '""')}"`
    return [
      formatTimestamp(s.start_time_seconds),
      s.end_time_seconds ? formatTimestamp(s.end_time_seconds) : '',
      speaker,
      text,
      s.reviewed_status,
    ].join(',')
  })
  return [header, ...rows].join('\n')
}

export function segmentsToTXT(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => {
      const ts = formatTimestamp(s.start_time_seconds)
      const speaker = s.speaker?.full_name ? `${s.speaker.full_name}: ` : ''
      return `[${ts}] ${speaker}${s.transcript_text}`
    })
    .join('\n')
}

export function segmentsToSRT(segments: TranscriptSegment[]): string {
  return segments
    .map((s, i) => {
      const start = secondsToSRTTime(s.start_time_seconds)
      const end = secondsToSRTTime(s.end_time_seconds ?? s.start_time_seconds + 3)
      return `${i + 1}\n${start} --> ${end}\n${s.transcript_text}\n`
    })
    .join('\n')
}

export function awardsToCSV(awards: Award[]): string {
  const header =
    'event,award_category,winner_type,winner_name,prize_amount,sponsor,confirmed'
  const rows = awards.map((a) => [
    `"${a.event?.title ?? ''}"`,
    `"${a.award_category}"`,
    a.winner_type ?? '',
    `"${a.winner_name ?? ''}"`,
    `"${a.prize_amount ?? ''}"`,
    `"${a.sponsor_name ?? ''}"`,
    a.confirmed_status ? 'yes' : 'no',
  ].join(','))
  return [header, ...rows].join('\n')
}

function secondsToSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

export function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
