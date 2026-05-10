import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Mic } from 'lucide-react'

export default async function SpeakersPage() {
  const supabase = await createClient()
  const { data: speakers } = await supabase
    .from('speakers')
    .select('*')
    .order('full_name')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Speaker Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everyone who spoke at an Intellibus hackathon
        </p>
      </div>

      {(!speakers || speakers.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Mic className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
            <p className="font-medium">No speakers yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Speakers are added when transcripts are imported and reviewed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {speakers.map((sp) => (
            <Link key={sp.id} href={`/speakers/${sp.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-5 pb-4 flex flex-col items-center text-center gap-2">
                  <Avatar className="w-12 h-12">
                    {sp.photo_url ? (
                      <img src={sp.photo_url} alt={sp.full_name} className="rounded-full object-cover" />
                    ) : (
                      <AvatarFallback className="text-sm">
                        {sp.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm leading-tight">{sp.full_name}</p>
                    {sp.role && <p className="text-xs text-muted-foreground mt-0.5">{sp.role}</p>}
                    {sp.organization && (
                      <p className="text-xs text-muted-foreground">{sp.organization}</p>
                    )}
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
