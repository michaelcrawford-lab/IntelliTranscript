import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button-link'
import { Plus, Calendar, MapPin, FileText } from 'lucide-react'
import type { Event } from '@/types'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('event_date_start', { ascending: false })

  const typeLabels: Record<string, string> = {
    hackathon: 'Hackathon',
    awards_ceremony: 'Awards',
    workshop: 'Workshop',
    keynote: 'Keynote',
    demo_day: 'Demo Day',
    judging: 'Judging',
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All archived Intellibus hackathons and ceremonies
          </p>
        </div>
        <ButtonLink href="/events/new">
          <Plus className="w-4 h-4 mr-2" />
          New Event
        </ButtonLink>
      </div>

      {(!events || events.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No events yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first event to start uploading transcripts.
            </p>
            <ButtonLink href="/events/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </ButtonLink>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(events as Event[]).map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs capitalize shrink-0">
                          {typeLabels[event.event_type] ?? event.event_type}
                        </Badge>
                        <Badge
                          variant={event.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs capitalize shrink-0"
                        >
                          {event.status}
                        </Badge>
                      </div>
                      <h2 className="font-semibold text-base leading-tight">{event.title}</h2>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {event.event_date_start && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {event.event_date_start}
                            {event.event_date_end && event.event_date_end !== event.event_date_start
                              ? ` – ${event.event_date_end}`
                              : ''}
                          </span>
                        )}
                        {(event.location || event.platform) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location ?? event.platform}
                          </span>
                        )}
                      </div>
                    </div>
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
