'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button-link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, Trophy } from 'lucide-react'

export default function ReportsPage() {
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>([])
  const [selectedEvent, setSelectedEvent] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('events').select('id, title').order('created_at', { ascending: false })
      .then(({ data }) => setEvents(data ?? []))
  }, [])

  const reports = [
    {
      id: 'transcript-txt',
      label: 'Full Transcript (TXT)',
      description: 'Complete timestamped transcript as plain text.',
      icon: FileText,
      path: (id: string) => `/api/exports?event=${id}&format=txt`,
      filename: 'transcript.txt',
    },
    {
      id: 'transcript-csv',
      label: 'Full Transcript (CSV)',
      description: 'All segments with timestamp, speaker, text columns.',
      icon: FileText,
      path: (id: string) => `/api/exports?event=${id}&format=csv`,
      filename: 'transcript.csv',
    },
    {
      id: 'transcript-srt',
      label: 'Transcript Captions (SRT)',
      description: 'Export transcript as SRT caption file.',
      icon: FileText,
      path: (id: string) => `/api/exports?event=${id}&format=srt`,
      filename: 'transcript.srt',
    },
    {
      id: 'awards-csv',
      label: 'Awards Report (CSV)',
      description: 'All award categories, winners, prizes, and sponsors.',
      icon: Trophy,
      path: (id: string) => `/api/exports?event=${id}&type=awards&format=csv`,
      filename: 'awards.csv',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Exports</h1>
        <p className="text-sm text-muted-foreground mt-1">Download transcripts, awards data, and reports</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Select Event</CardTitle></CardHeader>
        <CardContent>
          <Select value={selectedEvent} onValueChange={(v) => setSelectedEvent(v ?? '')}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Choose an event…" />
            </SelectTrigger>
            <SelectContent>
              {events.map((ev) => (
                <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {reports.map(({ id, label, description, icon: Icon, path, filename }) => (
          <Card key={id} className={!selectedEvent ? 'opacity-60' : ''}>
            <CardContent className="py-5 flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <Icon className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>
              {selectedEvent ? (
                <ButtonLink
                  href={path(selectedEvent)}
                  variant="outline"
                  size="sm"
                  download={filename}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </ButtonLink>
              ) : (
                <span className="inline-flex items-center h-7 px-2.5 text-[0.8rem] rounded-[min(var(--radius-md),12px)] border-border bg-background border text-muted-foreground opacity-50">
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Coming Soon</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {['PDF Report', 'Speaker Participation Report', 'Judge Feedback Report', 'Sponsor Mentions', 'Social Media Pack'].map((r) => (
            <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
