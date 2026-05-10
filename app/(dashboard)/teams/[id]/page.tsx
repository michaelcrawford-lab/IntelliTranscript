import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button-link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Trophy } from 'lucide-react'

export default async function TeamProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: team } = await supabase
    .from('teams')
    .select('*, events(id, title, event_date_start), team_members(*), awards(*)')
    .eq('id', id)
    .single()

  if (!team) notFound()

  const event = team.events as { id: string; title: string; event_date_start: string | null } | null
  const members = (team.team_members as Array<{ id: string; full_name: string; role: string | null; email: string | null }>) ?? []
  const awards = (team.awards as Array<{ id: string; award_category: string; prize_amount: string | null }>) ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <ButtonLink href="/teams" variant="ghost" size="sm">
        ← Teams
      </ButtonLink>

      <div>
        <div className="flex items-center gap-2 mb-2">
          {team.final_rank && <Badge variant="outline">#{team.final_rank} Place</Badge>}
          {team.challenge_category && <Badge variant="secondary">{team.challenge_category}</Badge>}
        </div>
        <h1 className="text-2xl font-bold">{team.team_name}</h1>
        {team.project_name && <p className="text-lg text-muted-foreground">{team.project_name}</p>}
        {event && (
          <Link href={`/events/${event.id}`} className="text-sm text-primary hover:underline">
            {event.title} · {event.event_date_start}
          </Link>
        )}
      </div>

      {team.project_summary && (
        <Card>
          <CardHeader><CardTitle className="text-base">Project Summary</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{team.project_summary}</p>
            {team.technologies_used && (team.technologies_used as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(team.technologies_used as string[]).map((tech) => (
                  <Badge key={tech} variant="outline" className="text-xs">{tech}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members listed.</p>
          ) : (
            <div className="divide-y">
              {members.map((m) => (
                <div key={m.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{m.full_name}</p>
                    {m.role && <p className="text-xs text-muted-foreground">{m.role}</p>}
                  </div>
                  {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {awards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Awards Won
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {awards.map((award) => (
              <div key={award.id} className="flex items-center justify-between">
                <p className="text-sm font-medium">{award.award_category}</p>
                {award.prize_amount && <Badge variant="outline">{award.prize_amount}</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
