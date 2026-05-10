import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Mic,
  Users,
  Trophy,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import type { DashboardStats, Event } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [statsResult, eventsResult] = await Promise.all([
    supabase.rpc('get_dashboard_stats'),
    supabase
      .from('events')
      .select('*')
      .order('event_date_start', { ascending: false })
      .limit(5),
  ])

  const stats: DashboardStats = statsResult.data ?? {
    events_count: 0,
    speakers_count: 0,
    teams_count: 0,
    awards_count: 0,
    segments_count: 0,
    approved_segments: 0,
    pending_segments: 0,
    media_files_count: 0,
  }

  const recentEvents: Event[] = eventsResult.data ?? []

  const metricCards = [
    { label: 'Events', value: stats.events_count, icon: Calendar, href: '/events', color: 'text-blue-600' },
    { label: 'Speakers', value: stats.speakers_count, icon: Mic, href: '/speakers', color: 'text-violet-600' },
    { label: 'Teams', value: stats.teams_count, icon: Users, href: '/teams', color: 'text-emerald-600' },
    { label: 'Awards', value: stats.awards_count, icon: Trophy, href: '/awards', color: 'text-amber-600' },
    { label: 'Transcript Lines', value: stats.segments_count.toLocaleString(), icon: FileText, href: '/search', color: 'text-sky-600' },
    { label: 'Media Files', value: stats.media_files_count, icon: Clock, href: '/uploads', color: 'text-rose-600' },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Intellibus Hackathon Archive overview
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metricCards.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-5 pb-4">
                <Icon className={`w-5 h-5 mb-2 ${color}`} />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Transcript status */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transcript Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Approved segments</span>
              </div>
              <span className="font-medium">{stats.approved_segments.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Pending review</span>
              </div>
              <span className="font-medium">{stats.pending_segments.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>Total segments</span>
              </div>
              <span className="font-medium">{stats.segments_count.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Events</CardTitle>
            <Link href="/events" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet. <Link href="/events/new" className="text-primary hover:underline">Create one.</Link></p>
            ) : (
              recentEvents.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} className="block">
                  <div className="flex items-center justify-between py-1.5 hover:bg-accent rounded px-2 -mx-2 transition-colors">
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.event_date_start ?? 'Date TBD'}
                      </p>
                    </div>
                    <Badge
                      variant={event.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs capitalize shrink-0"
                    >
                      {event.status}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
