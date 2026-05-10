import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ButtonLink } from '@/components/ui/button-link'
import { Calendar, FileText, Mic, Users, Trophy, Upload } from 'lucide-react'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [eventRes, mediaRes, speakersRes, teamsRes, awardsRes] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('media_files').select('*').eq('event_id', id).order('created_at'),
    supabase
      .from('transcript_segments')
      .select('speaker_id, speakers(id, full_name, role, organization)')
      .eq('event_id', id)
      .not('speaker_id', 'is', null),
    supabase.from('teams').select('*, team_members(*)').eq('event_id', id),
    supabase.from('awards').select('*').eq('event_id', id),
  ])

  if (!eventRes.data) notFound()

  const event = eventRes.data
  const mediaFiles = mediaRes.data ?? []
  const teams = teamsRes.data ?? []
  const awards = awardsRes.data ?? []

  // Deduplicate speakers
  const speakerMap = new Map<string, { id: string; full_name: string; role: string | null; organization: string | null }>()
  for (const seg of speakersRes.data ?? []) {
    const sp = (seg as Record<string, unknown>).speakers as { id: string; full_name: string; role: string | null; organization: string | null } | null
    if (sp) speakerMap.set(sp.id, sp)
  }
  const speakers = Array.from(speakerMap.values())

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <ButtonLink href="/events" variant="ghost" size="sm">
        ← Events
      </ButtonLink>

      {/* Event header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="capitalize">
              {event.event_type?.replace('_', ' ')}
            </Badge>
            <Badge variant={event.status === 'active' ? 'default' : 'secondary'} className="capitalize">
              {event.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          {event.description && (
            <p className="text-muted-foreground mt-2 text-sm max-w-2xl">{event.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            {event.event_date_start && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {event.event_date_start}
                {event.event_date_end && event.event_date_end !== event.event_date_start
                  ? ` – ${event.event_date_end}`
                  : ''}
              </span>
            )}
          </div>
        </div>
        <ButtonLink href="/uploads">
          <Upload className="w-4 h-4 mr-2" />
          Upload Transcript
        </ButtonLink>
      </div>

      <Tabs defaultValue="transcripts">
        <TabsList>
          <TabsTrigger value="transcripts">
            <FileText className="w-4 h-4 mr-2" />
            Transcripts ({mediaFiles.length})
          </TabsTrigger>
          <TabsTrigger value="speakers">
            <Mic className="w-4 h-4 mr-2" />
            Speakers ({speakers.length})
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Users className="w-4 h-4 mr-2" />
            Teams ({teams.length})
          </TabsTrigger>
          <TabsTrigger value="awards">
            <Trophy className="w-4 h-4 mr-2" />
            Awards ({awards.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcripts" className="mt-4 space-y-3">
          {mediaFiles.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No transcripts yet.{' '}
                <Link href="/uploads" className="text-primary hover:underline">Upload one.</Link>
              </CardContent>
            </Card>
          ) : (
            mediaFiles.map((mf) => (
              <Card key={mf.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{mf.title ?? 'Untitled recording'}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {mf.source_type} · {mf.processing_status}
                    </p>
                  </div>
                  <ButtonLink href={`/events/${id}/transcript?mediaId=${mf.id}`} variant="outline" size="sm">
                    View Transcript
                  </ButtonLink>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="speakers" className="mt-4">
          {speakers.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No speakers identified yet.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {speakers.map((sp) => (
                <Link key={sp.id} href={`/speakers/${sp.id}`}>
                  <Card className="hover:shadow-sm cursor-pointer transition-shadow">
                    <CardContent className="py-3">
                      <p className="font-medium text-sm">{sp.full_name}</p>
                      {sp.role && <p className="text-xs text-muted-foreground">{sp.role}</p>}
                      {sp.organization && <p className="text-xs text-muted-foreground">{sp.organization}</p>}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="teams" className="mt-4 space-y-3">
          {teams.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No teams added yet.</CardContent></Card>
          ) : (
            teams.map((team) => (
              <Link key={team.id} href={`/teams/${team.id}`}>
                <Card className="hover:shadow-sm cursor-pointer transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{team.team_name}</p>
                        {team.project_name && <p className="text-xs text-muted-foreground">{team.project_name}</p>}
                      </div>
                      {team.final_rank && <Badge variant="outline">#{team.final_rank}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="awards" className="mt-4 space-y-3">
          {awards.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No awards recorded yet.</CardContent></Card>
          ) : (
            awards.map((award) => (
              <Card key={award.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{award.award_category}</p>
                    <p className="text-xs text-muted-foreground">{award.winner_name ?? 'TBD'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {award.prize_amount && <Badge variant="outline">{award.prize_amount}</Badge>}
                    <Badge variant={award.confirmed_status ? 'default' : 'secondary'}>
                      {award.confirmed_status ? 'Confirmed' : 'Pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
