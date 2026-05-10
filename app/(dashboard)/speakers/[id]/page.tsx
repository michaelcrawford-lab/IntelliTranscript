import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button-link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import { formatTimestamp } from '@/lib/utils/transcript-parser'

export default async function SpeakerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [speakerRes, segmentsRes] = await Promise.all([
    supabase.from('speakers').select('*').eq('id', id).single(),
    supabase
      .from('transcript_segments')
      .select('id, transcript_text, start_time_seconds, media_file_id, event_id, events(id, title, event_date_start)')
      .eq('speaker_id', id)
      .order('start_time_seconds')
      .limit(100),
  ])

  if (!speakerRes.data) notFound()

  const speaker = speakerRes.data
  const segments = segmentsRes.data ?? []

  // Group by event
  const byEvent = new Map<string, { event: { id: string; title: string; event_date_start: string | null }; segments: typeof segments }>()
  for (const seg of segments) {
    const ev = seg.events as unknown as { id: string; title: string; event_date_start: string | null } | null
    if (!ev) continue
    const eid = ev.id
    if (!byEvent.has(eid)) byEvent.set(eid, { event: ev, segments: [] })
    byEvent.get(eid)!.segments.push(seg)
  }

  const initials = speaker.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ButtonLink href="/speakers" variant="ghost" size="sm">
        ← Speakers
      </ButtonLink>

      <Card>
        <CardContent className="py-6 flex items-start gap-5">
          <Avatar className="w-16 h-16">
            {speaker.photo_url ? (
              <img src={speaker.photo_url} alt={speaker.full_name} className="rounded-full object-cover" />
            ) : (
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{speaker.full_name}</h1>
            {speaker.role && <p className="text-muted-foreground">{speaker.role}</p>}
            {speaker.organization && <p className="text-sm text-muted-foreground">{speaker.organization}</p>}
            {speaker.bio && <p className="text-sm mt-3">{speaker.bio}</p>}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="font-medium">{segments.length}</span>
              <span className="text-muted-foreground">segments</span>
              <span className="font-medium">{byEvent.size}</span>
              <span className="text-muted-foreground">events</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {Array.from(byEvent.values()).map(({ event, segments: evSegs }) => (
        <Card key={event.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Link href={`/events/${event.id}`} className="hover:underline text-primary">
                {event.title}
              </Link>
              {event.event_date_start && (
                <span className="text-xs text-muted-foreground font-normal">{event.event_date_start ?? ''}</span>
              )}
              <Badge variant="secondary" className="ml-auto text-xs">{evSegs.length} segments</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {evSegs.slice(0, 20).map((seg) => (
              <div key={seg.id} className="flex gap-3 py-1.5 border-b last:border-0">
                <Link
                  href={`/events/${seg.event_id}/transcript?mediaId=${seg.media_file_id}`}
                  className="font-mono text-xs text-primary hover:underline shrink-0 mt-0.5"
                >
                  {formatTimestamp(seg.start_time_seconds)}
                </Link>
                <p className="text-sm text-muted-foreground line-clamp-2">{seg.transcript_text}</p>
              </div>
            ))}
            {evSegs.length > 20 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{evSegs.length - 20} more segments
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {segments.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No transcript segments found for this speaker.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
