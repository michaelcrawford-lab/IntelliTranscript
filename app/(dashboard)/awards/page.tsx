import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button-link'
import { Trophy, Download } from 'lucide-react'

export default async function AwardsPage() {
  const supabase = await createClient()

  const { data: awards } = await supabase
    .from('awards')
    .select('*, events(id, title, event_date_start), teams(id, team_name)')
    .order('created_at', { ascending: false })

  // Group by event
  const byEvent = new Map<string, {
    event: { id: string; title: string; event_date_start: string | null }
    awards: typeof awards
  }>()

  for (const award of awards ?? []) {
    const ev = award.events as { id: string; title: string; event_date_start: string | null } | null
    if (!ev) continue
    if (!byEvent.has(ev.id)) byEvent.set(ev.id, { event: ev, awards: [] })
    byEvent.get(ev.id)!.awards!.push(award)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Awards</h1>
        <p className="text-sm text-muted-foreground mt-1">Winners across all Intellibus hackathons</p>
      </div>

      {byEvent.size === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
            <p className="font-medium">No awards recorded yet</p>
            <p className="text-sm text-muted-foreground mt-1">Awards are added via the event detail page.</p>
          </CardContent>
        </Card>
      ) : (
        Array.from(byEvent.values()).map(({ event, awards: evAwards }) => (
          <Card key={event.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">
                <Link href={`/events/${event.id}`} className="hover:underline text-primary">
                  {event.title}
                </Link>
                {event.event_date_start && (
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    {event.event_date_start}
                  </span>
                )}
              </CardTitle>
              <ButtonLink
                href={`/api/exports?event=${event.id}&type=awards&format=csv`}
                variant="outline"
                size="sm"
                download="awards.csv"
              >
                <Download className="w-3 h-3 mr-1" />
                CSV
              </ButtonLink>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {(evAwards ?? []).map((award) => {
                const team = award.teams as { id: string; team_name: string } | null
                return (
                  <div key={award.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{award.award_category}</p>
                        <p className="text-xs text-muted-foreground">
                          {team ? (
                            <Link href={`/teams/${team.id}`} className="hover:underline text-primary">
                              {team.team_name}
                            </Link>
                          ) : (
                            award.winner_name ?? 'TBD'
                          )}
                          {award.sponsor_name && ` · Sponsored by ${award.sponsor_name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {award.prize_amount && <Badge variant="outline" className="text-xs">{award.prize_amount}</Badge>}
                      <Badge variant={award.confirmed_status ? 'default' : 'secondary'} className="text-xs">
                        {award.confirmed_status ? 'Confirmed' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
