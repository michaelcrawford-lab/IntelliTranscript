import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: teams } = await supabase
    .from('teams')
    .select('*, events(title, event_date_start), team_members(id)')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teams & Projects</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Archive of all hackathon teams and their projects
        </p>
      </div>

      {(!teams || teams.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
            <p className="font-medium">No teams yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Teams are added via the event detail page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {teams.map((team) => {
            const event = team.events as { title: string; event_date_start: string | null } | null
            const memberCount = (team.team_members as unknown[])?.length ?? 0

            return (
              <Link key={team.id} href={`/teams/${team.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {team.final_rank && (
                            <Badge variant="outline">#{team.final_rank}</Badge>
                          )}
                          {team.challenge_category && (
                            <Badge variant="secondary" className="text-xs">
                              {team.challenge_category}
                            </Badge>
                          )}
                        </div>
                        <h2 className="font-semibold">{team.team_name}</h2>
                        {team.project_name && (
                          <p className="text-sm text-muted-foreground">{team.project_name}</p>
                        )}
                        {team.project_summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {team.project_summary}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {event && <span>{event.title} · {event.event_date_start}</span>}
                          <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <Users className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
