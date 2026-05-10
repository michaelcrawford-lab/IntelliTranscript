'use client'

import { useState, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button-link'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Download } from 'lucide-react'
import { TranscriptLine } from './TranscriptLine'
import { VideoPlayer } from './VideoPlayer'
import { segmentsToCSV, segmentsToTXT, downloadBlob } from '@/lib/utils/export'
import type { TranscriptSegment, Event, MediaFile } from '@/types'

interface Props {
  event: Event
  segments: TranscriptSegment[]
  mediaFile: MediaFile | null
  initialSearch?: string
}

export function TranscriptViewer({ event, segments, mediaFile, initialSearch }: Props) {
  const [search, setSearch] = useState(initialSearch ?? '')
  const [currentTime, setCurrentTime] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const filtered = search.trim()
    ? segments.filter((s) =>
        s.transcript_text.toLowerCase().includes(search.toLowerCase()) ||
        (s.speaker as unknown as { full_name: string } | null)?.full_name?.toLowerCase().includes(search.toLowerCase())
      )
    : segments

  const handleTimestampClick = useCallback((seconds: number) => {
    setCurrentTime(seconds)
  }, [])

  const exportCSV = () => {
    downloadBlob(segmentsToCSV(segments), `${event.slug}-transcript.csv`, 'text/csv')
  }

  const exportTXT = () => {
    downloadBlob(segmentsToTXT(segments), `${event.slug}-transcript.txt`, 'text/plain')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <ButtonLink href={`/events/${event.id}`} variant="ghost" size="sm">
            ← {event.title}
          </ButtonLink>
          <h1 className="text-xl font-bold truncate mt-1">
            {mediaFile?.title ?? 'Transcript Viewer'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {segments.length.toLocaleString()} segments
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={exportTXT}>
            <Download className="w-4 h-4 mr-1" />
            TXT
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* Video player */}
        <div className="sticky top-4">
          <VideoPlayer
            mediaFile={mediaFile}
            seekTo={currentTime}
            iframeRef={iframeRef}
          />
        </div>

        {/* Transcript panel */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search within transcript…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <Badge variant="secondary" className="absolute right-2 top-2 text-xs">
                {filtered.length} results
              </Badge>
            )}
          </div>

          <ScrollArea className="h-[calc(100vh-280px)] rounded-md border bg-card">
            <div className="p-4 space-y-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {search ? 'No matching segments.' : 'No transcript segments.'}
                </p>
              ) : (
                filtered.map((segment) => (
                  <TranscriptLine
                    key={segment.id}
                    segment={segment}
                    searchTerm={search}
                    isActive={
                      currentTime >= segment.start_time_seconds &&
                      currentTime < (segment.end_time_seconds ?? segment.start_time_seconds + 5)
                    }
                    onTimestampClick={handleTimestampClick}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
