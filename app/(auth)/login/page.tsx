'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    const supabase = createClient()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setInfo('Account created! You can now sign in.')
        setMode('signin')
      }
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">IntelliTranscript</h1>
          <p className="text-sm text-muted-foreground">
            Intellibus Hackathon Archive &amp; Search Platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{mode === 'signin' ? 'Sign in' : 'Create account'}</CardTitle>
            <CardDescription>
              {mode === 'signin' ? 'Enter your credentials to access the archive' : 'Create your Intellibus staff account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@intellibus.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
              )}
              {info && (
                <p className="text-sm text-emerald-700 bg-emerald-50 rounded-md px-3 py-2">{info}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Please wait…</>
                ) : mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                {mode === 'signin' ? (
                  <>No account?{' '}
                    <button type="button" onClick={() => { setMode('signup'); setError(null); setInfo(null) }} className="underline hover:text-foreground">
                      Create one
                    </button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button type="button" onClick={() => { setMode('signin'); setError(null); setInfo(null) }} className="underline hover:text-foreground">
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Access is restricted to Intellibus staff.
        </p>
      </div>
    </div>
  )
}
