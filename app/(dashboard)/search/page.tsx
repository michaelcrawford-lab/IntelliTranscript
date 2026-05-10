'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button-link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Clock, User, Calendar } from 'lucide-react'
import { formatTimestamp } from '@/lib/utils/transcript-parser'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function SearchContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [results, setResults] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)
    router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false })

    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=50`)
    const data = await res.json()
    setResults(data.results ?? [])
    setLoading(false)
  }, [query, router])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Advanced Search</h1>
        <p className="text-sm text-muted-foreground mt-1">Search across all hackathon transcripts</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder='Search: "AI ethics", speaker name, team, topic…'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </Button>
      </form>

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No results found</p>
            <p className="text-sm mt-1">Try different keywords or check the spelling.</p>
          </CardContent>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
          </p>
          {results.map((r) => {
            const speaker = r.speakers as { full_name: string } | null
            const event = r.events as { id: string; title: string; event_date_start: string | null } | null

            return (
              <Card key={r.id as string} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed">{r.transcript_text as string}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(r.start_time_seconds as number)}
                        </span>
                        {speaker && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {speaker.full_name}
                          </span>
                        )}
                        {event && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {event.title}
                          </span>
                        )}
                        <Badge
                          variant={(r.reviewed_status as string) === 'approved' ? 'default' : 'secondary'}
                          className="text-xs capitalize"
                        >
                          {r.reviewed_status as string}
                        </Badge>
                      </div>
                    </div>
                    {event && (
                      <ButtonLink
                        href={`/events/${event.id}/transcript?q=${encodeURIComponent(query)}`}
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                      >
                        View
                      </ButtonLink>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  )
}
